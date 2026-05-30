import { describe, test, expect } from "bun:test";

import { patternSpecificity, grantSpecificity } from "./specificity";

describe("patternSpecificity", () => {
  test("bare wildcard has zero specificity", () => {
    expect(patternSpecificity("*")).toBe(0);
  });

  test("type-level wildcard scores by literal length", () => {
    // "agent:" has 6 literal chars
    expect(patternSpecificity("agent:*")).toBe(6);
  });

  test("prefix wildcard scores by literal length", () => {
    // "wallet:wal_" has 11 literal chars
    expect(patternSpecificity("wallet:wal_*")).toBe(11);
  });

  test("exact match gets proportional bonus (2× literal length)", () => {
    // "agent:agt_abc" has 13 chars + 13 bonus = 26
    expect(patternSpecificity("agent:agt_abc")).toBe(26);
  });

  test("more specific patterns score higher", () => {
    const scores = [
      patternSpecificity("*"),
      patternSpecificity("agent:*"),
      patternSpecificity("agent:agt_*"),
      patternSpecificity("agent:agt_abc"),
    ];

    for (let i = 1; i < scores.length; i++) {
      const prev = scores[i - 1] ?? 0;
      expect(scores[i]).toBeGreaterThan(prev);
    }
  });

  test("action patterns follow same rules", () => {
    expect(patternSpecificity("*")).toBe(0);
    expect(patternSpecificity("read")).toBe(8); // 4 chars + 4 bonus
    expect(patternSpecificity("manage")).toBe(12); // 6 chars + 6 bonus
  });
});

describe("grantSpecificity", () => {
  test("combines resource and action specificity", () => {
    expect(grantSpecificity("*", "*")).toBe(0);
    expect(grantSpecificity("agent:*", "read")).toBe(6 + 8);
    expect(grantSpecificity("agent:agt_abc", "manage")).toBe(26 + 12);
  });

  test("more specific grant beats less specific", () => {
    // Wildcard everything
    const s1 = grantSpecificity("*", "*");
    // Type-level wildcard with specific action
    const s2 = grantSpecificity("agent:*", "read");
    // Exact resource and action
    const s3 = grantSpecificity("agent:agt_abc", "manage");

    expect(s2).toBeGreaterThan(s1);
    expect(s3).toBeGreaterThan(s2);
  });
});

describe("patternSpecificity edge cases", () => {
  test("empty string gets exact match bonus", () => {
    // Empty string has no wildcard, so it gets 0 + 0 bonus
    expect(patternSpecificity("")).toBe(0);
  });

  test("multi-wildcard pattern scores only literal characters", () => {
    // "*:*" has 1 literal char (':') and contains wildcards
    expect(patternSpecificity("*:*")).toBe(1);
  });

  test("nested colon pattern scores all literal characters", () => {
    // "api:stripe:*" has 11 literal chars ("api:stripe:") and contains a wildcard
    expect(patternSpecificity("api:stripe:*")).toBe(11);
    // "api:stripe:charges" has 18 chars and no wildcard -> 18 + 1000
    expect(patternSpecificity("api:stripe:charges")).toBe(36);
  });

  test("specificity is character-count based, not segment-aware", () => {
    // Two patterns with same literal length but different structure
    // score identically, proving specificity is purely character-based
    const a = patternSpecificity("abcdef:*"); // 7 literal chars
    const b = patternSpecificity("ab:cd:e*"); // 7 literal chars
    expect(a).toBe(b);
  });
});
