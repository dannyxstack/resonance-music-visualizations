package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

func (a *app) stripePost(path string, form url.Values) (map[string]any, error) {
	req, err := http.NewRequest("POST", "https://api.stripe.com/v1/"+path, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(a.stripeKey, "")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	client := &http.Client{Timeout: 15 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	var out map[string]any
	if err = json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&out); err != nil {
		return nil, err
	}
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("Stripe request failed (%d)", res.StatusCode)
	}
	return out, nil
}
func (a *app) stripeGet(path string) (map[string]any, error) {
	req, err := http.NewRequest("GET", "https://api.stripe.com/v1/"+path, nil)
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(a.stripeKey, "")
	res, err := (&http.Client{Timeout: 15 * time.Second}).Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("Stripe request failed (%d)", res.StatusCode)
	}
	var out map[string]any
	err = json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(&out)
	return out, err
}
func subscriptionEnd(obj map[string]any) int64 {
	if v, ok := obj["current_period_end"].(float64); ok {
		return int64(v)
	}
	if items, ok := obj["items"].(map[string]any); ok {
		if data, ok := items["data"].([]any); ok && len(data) > 0 {
			if item, ok := data[0].(map[string]any); ok {
				if v, ok := item["current_period_end"].(float64); ok {
					return int64(v)
				}
			}
		}
	}
	return 0
}
func subscriptionHasPrice(obj map[string]any, priceID string) bool {
	items, ok := obj["items"].(map[string]any)
	if !ok {
		return false
	}
	data, ok := items["data"].([]any)
	if !ok {
		return false
	}
	for _, entry := range data {
		item, ok := entry.(map[string]any)
		if !ok {
			continue
		}
		price, ok := item["price"].(map[string]any)
		if ok && price["id"] == priceID {
			return true
		}
	}
	return false
}
func (a *app) billingReady() bool {
	return a.billingProvider == "stripe" && a.stripeKey != "" && a.stripePrice != "" && a.stripeWebhook != ""
}
func (a *app) checkout(w http.ResponseWriter, r *http.Request) {
	if !a.billingReady() {
		fail(w, 503, "Pro 购买尚未开放")
		return
	}
	u := a.require(w, r)
	if u == nil {
		return
	}
	if a.stripeKey == "" || a.stripePrice == "" || a.stripeWebhook == "" {
		fail(w, 503, "Pro 支付尚未配置")
		return
	}
	p, _ := a.policy(r.Context(), u)
	if p.Tier == "pro" {
		fail(w, 409, "当前已是 Pro，可在订阅管理页管理套餐")
		return
	}
	form := url.Values{"mode": {"subscription"}, "line_items[0][price]": {a.stripePrice}, "line_items[0][quantity]": {"1"}, "success_url": {a.siteURL + "/#/account?checkout=success"}, "cancel_url": {a.siteURL + "/#/account?checkout=cancel"}, "client_reference_id": {strconv.FormatInt(u.ID, 10)}, "customer_email": {u.Email}}
	if u.CustomerID != "" {
		form.Del("customer_email")
		form.Set("customer", u.CustomerID)
	}
	out, err := a.stripePost("checkout/sessions", form)
	if err != nil {
		fail(w, 502, "无法创建支付页面")
		return
	}
	location, _ := out["url"].(string)
	write(w, 200, map[string]string{"url": location})
}
func (a *app) portal(w http.ResponseWriter, r *http.Request) {
	u := a.require(w, r)
	if u == nil {
		return
	}
	if a.stripeKey == "" || u.CustomerID == "" {
		fail(w, 503, "没有可管理的订阅")
		return
	}
	out, err := a.stripePost("billing_portal/sessions", url.Values{"customer": {u.CustomerID}, "return_url": {a.siteURL + "/#/account"}})
	if err != nil {
		fail(w, 502, "无法打开订阅管理")
		return
	}
	location, _ := out["url"].(string)
	write(w, 200, map[string]string{"url": location})
}
func verifyStripe(payload []byte, header, secret string) bool {
	var stamp, sig string
	for _, part := range strings.Split(header, ",") {
		pair := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(pair) == 2 {
			if pair[0] == "t" {
				stamp = pair[1]
			}
			if pair[0] == "v1" {
				sig = pair[1]
			}
		}
	}
	ts, err := strconv.ParseInt(stamp, 10, 64)
	if err != nil || sig == "" || time.Since(time.Unix(ts, 0)) > 5*time.Minute || time.Until(time.Unix(ts, 0)) > 5*time.Minute {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(stamp + "."))
	mac.Write(payload)
	actual, err := hex.DecodeString(sig)
	return err == nil && hmac.Equal(mac.Sum(nil), actual)
}
func (a *app) webhook(w http.ResponseWriter, r *http.Request) {
	if a.stripeWebhook == "" {
		fail(w, 503, "Webhook 未配置")
		return
	}
	payload, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))
	if err != nil || !verifyStripe(payload, r.Header.Get("Stripe-Signature"), a.stripeWebhook) {
		fail(w, 400, "签名无效")
		return
	}
	var event struct {
		ID, Type string
		Data     struct{ Object json.RawMessage }
	}
	if json.Unmarshal(payload, &event) != nil || event.ID == "" {
		fail(w, 400, "事件无效")
		return
	}
	tx, err := a.db.BeginTx(r.Context(), nil)
	if err != nil {
		fail(w, 500, "事件处理失败")
		return
	}
	defer tx.Rollback()
	_, err = tx.ExecContext(r.Context(), `INSERT INTO stripe_events(id) VALUES(?)`, event.ID)
	if err != nil {
		write(w, 200, map[string]bool{"ok": true})
		return
	}
	switch event.Type {
	case "checkout.session.completed":
		var obj map[string]any
		_ = json.Unmarshal(event.Data.Object, &obj)
		id, _ := strconv.ParseInt(fmt.Sprint(obj["client_reference_id"]), 10, 64)
		customer, _ := obj["customer"].(string)
		sub, _ := obj["subscription"].(string)
		if id > 0 && customer != "" {
			_, err = tx.ExecContext(r.Context(), `UPDATE users SET stripe_customer_id=?,stripe_subscription_id=? WHERE id=?`, customer, sub, id)
			if err == nil && sub != "" && obj["payment_status"] == "paid" {
				latest, fetchErr := a.stripeGet("subscriptions/" + url.PathEscape(sub))
				if fetchErr != nil {
					err = fetchErr
				} else if latest["status"] == "active" && subscriptionHasPrice(latest, a.stripePrice) {
					if until := subscriptionEnd(latest); until > time.Now().Unix() {
						_, err = tx.ExecContext(r.Context(), `UPDATE users SET plan='pro',pro_until=? WHERE id=?`, time.Unix(until, 0).UTC(), id)
					}
				}
			}
		}
	case "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted":
		var obj map[string]any
		_ = json.Unmarshal(event.Data.Object, &obj)
		customer, _ := obj["customer"].(string)
		sub, _ := obj["id"].(string)
		status, _ := obj["status"].(string)
		period := subscriptionEnd(obj)
		if customer != "" {
			if (status == "active" || status == "trialing") && period > time.Now().Unix() && subscriptionHasPrice(obj, a.stripePrice) {
				_, err = tx.ExecContext(r.Context(), `UPDATE users SET plan='pro',pro_until=?,stripe_subscription_id=? WHERE stripe_customer_id=?`, time.Unix(period, 0).UTC(), sub, customer)
			} else {
				_, err = tx.ExecContext(r.Context(), `UPDATE users SET plan='free',pro_until=NULL WHERE stripe_customer_id=?`, customer)
			}
		}
	}
	if err != nil {
		fail(w, 500, "事件处理失败")
		return
	}
	if tx.Commit() != nil {
		fail(w, 500, "事件处理失败")
		return
	}
	write(w, 200, map[string]bool{"ok": true})
}
