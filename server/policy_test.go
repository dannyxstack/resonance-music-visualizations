package main

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestPolicyJSON(t *testing.T) {
	raw, err := json.Marshal(policy{Tier: "free", MaxSeconds: 300, MaxWidth: 1280, Watermark: true, MonthlyExports: 3, UsedExports: 2, MaxProjects: 3})
	if err != nil {
		t.Fatal(err)
	}
	for _, part := range []string{`"monthlyExports":3`, `"usedExports":2`, `"maxProjects":3`, `"maxSeconds":300`, `"maxWidth":1280`} {
		if !strings.Contains(string(raw), part) {
			t.Fatalf("missing %s in %s", part, raw)
		}
	}
}
