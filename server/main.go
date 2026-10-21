package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"net"
	"net/http"
	"net/mail"
	"net/smtp"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-sql-driver/mysql"
	"golang.org/x/crypto/bcrypt"
)

type app struct {
	db                                             *sql.DB
	stripeKey, stripePrice, stripeWebhook, siteURL string
}
type account struct {
	ID                                      int64
	Email, Plan, CustomerID, SubscriptionID string
	ProUntil                                sql.NullTime
}
type policy struct {
	Tier           string `json:"tier"`
	MaxSeconds     int    `json:"maxSeconds"`
	MaxWidth       int    `json:"maxWidth"`
	Watermark      bool   `json:"watermark"`
	MonthlyExports int    `json:"monthlyExports,omitempty"`
	UsedExports    int    `json:"usedExports,omitempty"`
	MaxProjects    int    `json:"maxProjects"`
}
type apiError struct {
	Error string `json:"error"`
}

func env(name, fallback string) string {
	if v := os.Getenv(name); v != "" {
		return v
	}
	return fallback
}
func main() {
	if len(os.Args) > 1 && os.Args[1] == "-healthcheck" {
		conn, e := net.DialTimeout("tcp", "127.0.0.1:8080", 2*time.Second)
		if e != nil {
			os.Exit(1)
		}
		conn.Close()
		return
	}
	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		cfg := mysql.NewConfig()
		cfg.User = env("MYSQL_USER", "resonance")
		cfg.Passwd = env("MYSQL_PASSWORD", "resonance")
		cfg.Net = "tcp"
		cfg.Addr = env("MYSQL_HOST", "127.0.0.1:3306")
		cfg.DBName = env("MYSQL_DATABASE", "resonance")
		cfg.ParseTime = true
		cfg.Loc = time.UTC
		dsn = cfg.FormatDSN()
	}
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal(err)
	}
	db.SetMaxOpenConns(12)
	db.SetConnMaxLifetime(3 * time.Minute)
	for i := 0; i < 40; i++ {
		if db.Ping() == nil {
			break
		}
		time.Sleep(2 * time.Second)
	}
	if err := db.Ping(); err != nil {
		log.Fatal(err)
	}
	a := &app{db: db, stripeKey: os.Getenv("STRIPE_SECRET_KEY"), stripePrice: os.Getenv("STRIPE_PRICE_ID"), stripeWebhook: os.Getenv("STRIPE_WEBHOOK_SECRET"), siteURL: strings.TrimRight(env("SITE_URL", "http://localhost:8032"), "/")}
	if err := a.migrate(); err != nil {
		log.Fatal(err)
	}
	m := http.NewServeMux()
	m.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) { write(w, 200, map[string]any{"ok": true}) })
	m.HandleFunc("POST /api/register", a.register)
	m.HandleFunc("POST /api/login", a.login)
	m.HandleFunc("POST /api/logout", a.logout)
	m.HandleFunc("GET /api/me", a.me)
	m.HandleFunc("POST /api/password/forgot", a.forgot)
	m.HandleFunc("POST /api/password/reset", a.reset)
	m.HandleFunc("GET /api/projects", a.listProjects)
	m.HandleFunc("POST /api/projects", a.saveProject)
	m.HandleFunc("DELETE /api/projects/{id}", a.deleteProject)
	m.HandleFunc("GET /api/favorites", a.favorites)
	m.HandleFunc("PUT /api/favorites", a.favorites)
	m.HandleFunc("POST /api/exports", a.startExport)
	m.HandleFunc("POST /api/exports/{id}/complete", a.finishExport)
	m.HandleFunc("POST /api/exports/{id}/cancel", a.cancelExport)
	m.HandleFunc("POST /api/billing/checkout", a.checkout)
	m.HandleFunc("POST /api/billing/portal", a.portal)
	m.HandleFunc("POST /api/billing/webhook", a.webhook)
	server := &http.Server{Addr: env("PORT", ":8080"), Handler: requestLog(m), ReadHeaderTimeout: 5 * time.Second, MaxHeaderBytes: 1 << 20}
	log.Printf("API listening on %s", server.Addr)
	log.Fatal(server.ListenAndServe())
}
func requestLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		if r.Method != "GET" && r.Method != "HEAD" && r.URL.Path != "/api/billing/webhook" {
			origin := r.Header.Get("Origin")
			if origin != "" {
				expected := "http://" + r.Host
				if r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https" {
					expected = "https://" + r.Host
				}
				if origin != expected {
					fail(w, http.StatusForbidden, "跨站请求被拒绝")
					return
				}
			}
		}
		next.ServeHTTP(w, r)
	})
}
func write(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func fail(w http.ResponseWriter, status int, msg string) { write(w, status, apiError{msg}) }
func decode(r *http.Request, v any) error {
	r.Body = http.MaxBytesReader(nil, r.Body, 1<<20)
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	return d.Decode(v)
}
func randomToken() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}
func tokenHash(token string) []byte { h := sha256.Sum256([]byte(token)); return h[:] }
func (a *app) current(r *http.Request) (*account, error) {
	cookie, err := r.Cookie("resonance_session")
	if err != nil {
		return nil, nil
	}
	var u account
	err = a.db.QueryRowContext(r.Context(), `SELECT u.id,u.email,u.plan,COALESCE(u.stripe_customer_id,''),COALESCE(u.stripe_subscription_id,''),u.pro_until FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP()`, tokenHash(cookie.Value)).Scan(&u.ID, &u.Email, &u.Plan, &u.CustomerID, &u.SubscriptionID, &u.ProUntil)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}
func (a *app) require(w http.ResponseWriter, r *http.Request) *account {
	u, err := a.current(r)
	if err != nil {
		fail(w, 500, "账户读取失败")
		return nil
	}
	if u == nil {
		fail(w, 401, "请先注册或登录")
		return nil
	}
	return u
}
func setCookie(w http.ResponseWriter, r *http.Request, token string, expires time.Time) {
	secure := r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https"
	http.SetCookie(w, &http.Cookie{Name: "resonance_session", Value: token, Path: "/", Expires: expires, HttpOnly: true, Secure: secure, SameSite: http.SameSiteLaxMode})
}
func (a *app) newSession(w http.ResponseWriter, r *http.Request, id int64) error {
	token := randomToken()
	expires := time.Now().UTC().Add(30 * 24 * time.Hour)
	_, err := a.db.ExecContext(r.Context(), `INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)`, tokenHash(token), id, expires)
	if err == nil {
		setCookie(w, r, token, expires)
	}
	return err
}
func normalizeEmail(s string) (string, error) {
	s = strings.ToLower(strings.TrimSpace(s))
	addr, err := mail.ParseAddress(s)
	if err != nil || addr.Address != s || len(s) > 254 {
		return "", errors.New("请输入有效邮箱")
	}
	return s, nil
}
func (a *app) register(w http.ResponseWriter, r *http.Request) {
	var in struct{ Email, Password string }
	if decode(r, &in) != nil {
		fail(w, 400, "请求格式错误")
		return
	}
	email, err := normalizeEmail(in.Email)
	if err != nil {
		fail(w, 400, err.Error())
		return
	}
	if len(in.Password) < 10 || len(in.Password) > 72 {
		fail(w, 400, "密码须为 10–72 个字符")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		fail(w, 500, "账户创建失败")
		return
	}
	res, err := a.db.ExecContext(r.Context(), `INSERT INTO users(email,password_hash,plan) VALUES(?,?,'free')`, email, hash)
	if err != nil {
		fail(w, 409, "邮箱已注册")
		return
	}
	id, _ := res.LastInsertId()
	if a.newSession(w, r, id) != nil {
		fail(w, 500, "登录失败")
		return
	}
	write(w, 200, map[string]bool{"ok": true})
}
func (a *app) login(w http.ResponseWriter, r *http.Request) {
	var in struct{ Email, Password string }
	if decode(r, &in) != nil {
		fail(w, 400, "请求格式错误")
		return
	}
	email, err := normalizeEmail(in.Email)
	if err != nil {
		fail(w, 401, "邮箱或密码错误")
		return
	}
	var id int64
	var hash []byte
	err = a.db.QueryRowContext(r.Context(), `SELECT id,password_hash FROM users WHERE email=?`, email).Scan(&id, &hash)
	if err != nil || bcrypt.CompareHashAndPassword(hash, []byte(in.Password)) != nil {
		fail(w, 401, "邮箱或密码错误")
		return
	}
	if a.newSession(w, r, id) != nil {
		fail(w, 500, "登录失败")
		return
	}
	write(w, 200, map[string]bool{"ok": true})
}
func (a *app) logout(w http.ResponseWriter, r *http.Request) {
	if c, e := r.Cookie("resonance_session"); e == nil {
		_, _ = a.db.ExecContext(r.Context(), `DELETE FROM sessions WHERE token_hash=?`, tokenHash(c.Value))
	}
	setCookie(w, r, "", time.Unix(0, 0))
	write(w, 200, map[string]bool{"ok": true})
}
func (a *app) policy(ctx context.Context, u *account) (policy, error) {
	if u == nil {
		return policy{Tier: "guest", MaxSeconds: 30, MaxWidth: 1280, Watermark: true, MaxProjects: 0}, nil
	}
	if u.Plan == "pro" && u.ProUntil.Valid && u.ProUntil.Time.After(time.Now().UTC()) {
		return policy{Tier: "pro", MaxSeconds: 0, MaxWidth: 1920, Watermark: false, MaxProjects: 100}, nil
	}
	p := policy{Tier: "free", MaxSeconds: 300, MaxWidth: 1280, Watermark: true, MonthlyExports: 3, MaxProjects: 3}
	month := time.Now().UTC().Format("2006-01")
	err := a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM exports WHERE user_id=? AND month_key=? AND status='completed'`, u.ID, month).Scan(&p.UsedExports)
	return p, err
}
func (a *app) me(w http.ResponseWriter, r *http.Request) {
	u, err := a.current(r)
	if err != nil {
		fail(w, 500, "账户读取失败")
		return
	}
	p, err := a.policy(r.Context(), u)
	if err != nil {
		fail(w, 500, "权益读取失败")
		return
	}
	resp := map[string]any{"policy": p, "billingAvailable": a.stripeKey != "" && a.stripePrice != "" && a.stripeWebhook != ""}
	if u != nil {
		resp["email"] = u.Email
		resp["hasSubscription"] = u.CustomerID != ""
		if u.ProUntil.Valid {
			resp["proUntil"] = u.ProUntil.Time
		}
	}
	write(w, 200, resp)
}
func (a *app) forgot(w http.ResponseWriter, r *http.Request) {
	var in struct{ Email string }
	if decode(r, &in) != nil {
		fail(w, 400, "请求格式错误")
		return
	}
	email, err := normalizeEmail(in.Email)
	if err != nil {
		fail(w, 400, "请输入有效邮箱")
		return
	}
	if os.Getenv("SMTP_HOST") == "" {
		fail(w, 503, "尚未配置邮件服务，请联系站点管理员")
		return
	}
	var id int64
	if a.db.QueryRowContext(r.Context(), `SELECT id FROM users WHERE email=?`, email).Scan(&id) == nil {
		token := randomToken()
		_, err = a.db.ExecContext(r.Context(), `INSERT INTO password_resets(token_hash,user_id,expires_at) VALUES(?,?,?)`, tokenHash(token), id, time.Now().UTC().Add(time.Hour))
		if err == nil {
			go sendResetMail(email, a.siteURL+"/#/reset?token="+token)
		}
	}
	write(w, 200, map[string]bool{"ok": true})
}
func sendResetMail(to, link string) {
	host := os.Getenv("SMTP_HOST")
	port := env("SMTP_PORT", "587")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASSWORD")
	from := env("SMTP_FROM", user)
	body := "From: " + from + "\r\nTo: " + to + "\r\nSubject: Resonance password reset\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nReset your password within one hour:\r\n" + link + "\r\n"
	var auth smtp.Auth
	if user != "" {
		auth = smtp.PlainAuth("", user, pass, host)
	}
	if err := smtp.SendMail(host+":"+port, auth, from, []string{to}, []byte(body)); err != nil {
		log.Printf("password reset mail failed: %v", err)
	}
}
func (a *app) reset(w http.ResponseWriter, r *http.Request) {
	var in struct{ Token, Password string }
	if decode(r, &in) != nil || len(in.Token) != 64 {
		fail(w, 400, "重置链接无效")
		return
	}
	if len(in.Password) < 10 || len(in.Password) > 72 {
		fail(w, 400, "密码须为 10–72 个字符")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		fail(w, 500, "重置失败")
		return
	}
	tx, err := a.db.BeginTx(r.Context(), nil)
	if err != nil {
		fail(w, 500, "重置失败")
		return
	}
	defer tx.Rollback()
	var id int64
	err = tx.QueryRowContext(r.Context(), `SELECT user_id FROM password_resets WHERE token_hash=? AND expires_at>UTC_TIMESTAMP() AND used_at IS NULL FOR UPDATE`, tokenHash(in.Token)).Scan(&id)
	if err != nil {
		fail(w, 400, "重置链接无效或已过期")
		return
	}
	if _, err = tx.ExecContext(r.Context(), `UPDATE users SET password_hash=? WHERE id=?`, hash, id); err != nil {
		fail(w, 500, "重置失败")
		return
	}
	_, _ = tx.ExecContext(r.Context(), `UPDATE password_resets SET used_at=UTC_TIMESTAMP() WHERE token_hash=?`, tokenHash(in.Token))
	_, _ = tx.ExecContext(r.Context(), `DELETE FROM sessions WHERE user_id=?`, id)
	if tx.Commit() != nil {
		fail(w, 500, "重置失败")
		return
	}
	write(w, 200, map[string]bool{"ok": true})
}
func (a *app) listProjects(w http.ResponseWriter, r *http.Request) {
	u := a.require(w, r)
	if u == nil {
		return
	}
	rows, err := a.db.QueryContext(r.Context(), `SELECT id,scene_id,name,config,updated_at FROM projects WHERE user_id=? ORDER BY updated_at DESC`, u.ID)
	if err != nil {
		fail(w, 500, "配置读取失败")
		return
	}
	defer rows.Close()
	items := []any{}
	for rows.Next() {
		var id int64
		var scene, name string
		var raw []byte
		var updated time.Time
		if rows.Scan(&id, &scene, &name, &raw, &updated) == nil {
			items = append(items, map[string]any{"id": id, "sceneId": scene, "name": name, "config": json.RawMessage(raw), "updatedAt": updated})
		}
	}
	write(w, 200, map[string]any{"projects": items})
}
func (a *app) saveProject(w http.ResponseWriter, r *http.Request) {
	u := a.require(w, r)
	if u == nil {
		return
	}
	var in struct {
		ID      int64           `json:"id"`
		SceneID string          `json:"sceneId"`
		Name    string          `json:"name"`
		Config  json.RawMessage `json:"config"`
	}
	if decode(r, &in) != nil || len(in.Config) == 0 || len(in.Config) > 100000 || !json.Valid(in.Config) || len(in.Name) > 100 || len(in.SceneID) > 80 || in.Name == "" || in.SceneID == "" {
		fail(w, 400, "配置无效")
		return
	}
	p, err := a.policy(r.Context(), u)
	if err != nil {
		fail(w, 500, "权益读取失败")
		return
	}
	tx, err := a.db.BeginTx(r.Context(), nil)
	if err != nil {
		fail(w, 500, "保存失败")
		return
	}
	defer tx.Rollback()
	if in.ID > 0 {
		res, e := tx.ExecContext(r.Context(), `UPDATE projects SET scene_id=?,name=?,config=?,updated_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?`, in.SceneID, in.Name, in.Config, in.ID, u.ID)
		if e != nil {
			fail(w, 500, "保存失败")
			return
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			fail(w, 404, "配置不存在")
			return
		}
	} else {
		var count int
		var locked int64
		if tx.QueryRowContext(r.Context(), `SELECT id FROM users WHERE id=? FOR UPDATE`, u.ID).Scan(&locked) != nil {
			fail(w, 500, "保存失败")
			return
		}
		_ = tx.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM projects WHERE user_id=?`, u.ID).Scan(&count)
		if count >= p.MaxProjects {
			fail(w, 403, "已达到当前套餐的配置数量上限")
			return
		}
		res, e := tx.ExecContext(r.Context(), `INSERT INTO projects(user_id,scene_id,name,config) VALUES(?,?,?,?)`, u.ID, in.SceneID, in.Name, in.Config)
		if e != nil {
			fail(w, 500, "保存失败")
			return
		}
		in.ID, _ = res.LastInsertId()
	}
	if tx.Commit() != nil {
		fail(w, 500, "保存失败")
		return
	}
	write(w, 200, map[string]any{"id": in.ID})
}
func (a *app) deleteProject(w http.ResponseWriter, r *http.Request) {
	u := a.require(w, r)
	if u == nil {
		return
	}
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		fail(w, 400, "配置编号无效")
		return
	}
	_, err = a.db.ExecContext(r.Context(), `DELETE FROM projects WHERE id=? AND user_id=?`, id, u.ID)
	if err != nil {
		fail(w, 500, "删除失败")
		return
	}
	write(w, 200, map[string]bool{"ok": true})
}
func (a *app) favorites(w http.ResponseWriter, r *http.Request) {
	u := a.require(w, r)
	if u == nil {
		return
	}
	if r.Method == "PUT" {
		var in struct {
			SceneIDs []string `json:"sceneIds"`
		}
		if decode(r, &in) != nil || len(in.SceneIDs) > 100 {
			fail(w, 400, "收藏列表无效")
			return
		}
		tx, err := a.db.BeginTx(r.Context(), nil)
		if err != nil {
			fail(w, 500, "保存失败")
			return
		}
		defer tx.Rollback()
		_, _ = tx.ExecContext(r.Context(), `DELETE FROM favorites WHERE user_id=?`, u.ID)
		for _, id := range in.SceneIDs {
			if len(id) > 80 {
				fail(w, 400, "场景编号无效")
				return
			}
			if _, err = tx.ExecContext(r.Context(), `INSERT IGNORE INTO favorites(user_id,scene_id) VALUES(?,?)`, u.ID, id); err != nil {
				fail(w, 500, "保存失败")
				return
			}
		}
		if tx.Commit() != nil {
			fail(w, 500, "保存失败")
			return
		}
	}
	rows, err := a.db.QueryContext(r.Context(), `SELECT scene_id FROM favorites WHERE user_id=?`, u.ID)
	if err != nil {
		fail(w, 500, "读取失败")
		return
	}
	defer rows.Close()
	ids := []string{}
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			ids = append(ids, id)
		}
	}
	write(w, 200, map[string]any{"sceneIds": ids})
}
func (a *app) startExport(w http.ResponseWriter, r *http.Request) {
	u, err := a.current(r)
	if err != nil {
		fail(w, 500, "账户读取失败")
		return
	}
	p, err := a.policy(r.Context(), u)
	if err != nil {
		fail(w, 500, "权益读取失败")
		return
	}
	if u == nil || p.Tier == "pro" {
		write(w, 200, map[string]any{"policy": p})
		return
	}
	tx, err := a.db.BeginTx(r.Context(), nil)
	if err != nil {
		fail(w, 500, "额度预留失败")
		return
	}
	defer tx.Rollback()
	var dummy int64
	if err = tx.QueryRowContext(r.Context(), `SELECT id FROM users WHERE id=? FOR UPDATE`, u.ID).Scan(&dummy); err != nil {
		fail(w, 500, "额度预留失败")
		return
	}
	var used int
	month := time.Now().UTC().Format("2006-01")
	err = tx.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM exports WHERE user_id=? AND month_key=? AND (status='completed' OR (status='reserved' AND created_at>UTC_TIMESTAMP()-INTERVAL 1 HOUR))`, u.ID, month).Scan(&used)
	if err != nil {
		fail(w, 500, "额度读取失败")
		return
	}
	if used >= 3 {
		fail(w, 403, "本月 3 次免费完整导出额度已用完")
		return
	}
	res, err := tx.ExecContext(r.Context(), `INSERT INTO exports(user_id,month_key,status) VALUES(?,?,'reserved')`, u.ID, month)
	if err != nil {
		fail(w, 500, "额度预留失败")
		return
	}
	id, _ := res.LastInsertId()
	if tx.Commit() != nil {
		fail(w, 500, "额度预留失败")
		return
	}
	write(w, 200, map[string]any{"id": id, "policy": p})
}
func (a *app) exportStatus(w http.ResponseWriter, r *http.Request, status string) {
	u := a.require(w, r)
	if u == nil {
		return
	}
	id, e := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if e != nil {
		fail(w, 400, "导出编号无效")
		return
	}
	_, e = a.db.ExecContext(r.Context(), `UPDATE exports SET status=?,updated_at=UTC_TIMESTAMP() WHERE id=? AND user_id=? AND status='reserved'`, status, id, u.ID)
	if e != nil {
		fail(w, 500, "导出状态更新失败")
		return
	}
	write(w, 200, map[string]bool{"ok": true})
}
func (a *app) finishExport(w http.ResponseWriter, r *http.Request) { a.exportStatus(w, r, "completed") }
func (a *app) cancelExport(w http.ResponseWriter, r *http.Request) { a.exportStatus(w, r, "cancelled") }
