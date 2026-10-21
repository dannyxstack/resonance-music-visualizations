package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"strconv"
	"testing"
	"time"
)

func TestStripeSignature(t *testing.T) {
	payload := []byte(`{"id":"evt_test","type":"checkout.session.completed"}`)
	stamp := strconv.FormatInt(time.Now().Unix(), 10)
	mac := hmac.New(sha256.New, []byte("whsec_test"))
	mac.Write([]byte(stamp + "."))
	mac.Write(payload)
	header := "t=" + stamp + ",v1=" + hex.EncodeToString(mac.Sum(nil))
	if !verifyStripe(payload, header, "whsec_test") {
		t.Fatal("valid signature rejected")
	}
	if verifyStripe([]byte(`{}`), header, "whsec_test") {
		t.Fatal("tampered body accepted")
	}
	if verifyStripe(payload, header, "other") {
		t.Fatal("wrong secret accepted")
	}
}
func TestSubscriptionEnd(t *testing.T) {
	end := float64(time.Now().Add(time.Hour).Unix())
	top := map[string]any{"current_period_end": end}
	if got := subscriptionEnd(top); got != int64(end) {
		t.Fatalf("top-level period: %d", got)
	}
	nested := map[string]any{"items": map[string]any{"data": []any{map[string]any{"current_period_end": end}}}}
	if got := subscriptionEnd(nested); got != int64(end) {
		t.Fatalf("nested period: %d", got)
	}
}
