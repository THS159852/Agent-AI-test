# Test Case Reviewer — Guide

## What this skill does

Audits test cases **already produced** by `testcase-generator`. It finds mismatches against requirements/UI, quality defects, coverage gaps, and **maps every finding to a screen**.

It **rebuilds a coverage matrix** (AC / Rule / Endpoint / Branch) from the source spec during review. A generator coverage summary is not proof of coverage.

It does **not** generate a new full suite unless you ask for fixes afterward.

## When to use

- Right after `testcase-generator` finishes
- Before automation or handoff to testers
- When reviewing a saved `.md` / Excel pack of generated cases
- Keywords: review test cases, audit testcase, mismatch, validate generated TC, coverage matrix

## Inputs

1. Generated test case table(s)
2. Original requirement / AC / API spec / browser document (strongly recommended)
3. Optional: coverage summary from the generator — **rebuild the matrix anyway**

## Output

| Section | Purpose |
|---------|---------|
| Summary + verdict | Pass / Pass with fixes / Rework required |
| Screen Registry | Which screens the pack touches |
| Coverage matrix | Every AC/rule/endpoint/branch scored Covered Yes/No |
| Findings by screen | Mismatch, wrong screen, over-spec, under-spec, assumed coverage |
| Coverage gaps by screen | Missing conditions with suggested titles |
| Assumptions / Questions / Risks | Unclear source material |

## Coverage matrix (reviewer)

Build rows from the **spec**, then map TC IDs onto them.

**Covered = Yes** only if a TC hits that exact branch **and** Expected Result asserts the specified data/mapping (not HTTP 200 / "success" alone).

Fail the pack when:

- Status-only assertions stand in for field/merge/token checks
- Specified happy-path branches were treated as edge/"do later"
- Similar flags, merges, or endpoints were collapsed into one TC
- Only one happy case exists per API while the spec has more success branches
- The matrix was skipped

## Severity cheat sheet

- **Critical** — wrong vs AC, security hole, wrong screen, uncovered P0 happy-path / mapping row
- **Major** — missing P0/P1 matrix row, status-only assertion, invented rule, unusable steps, assumed coverage
- **Minor** — style, ID, Auto Candidate

## Typical chain

```
testcase-generator → testcase-reviewer → (fix) → testdata-generator / automation-script-writer
```

For UI from browser:

```
browser-url-check → browser-document-generator → testcase-generator → testcase-reviewer
```

## Related

- Skill: [SKILL.md](SKILL.md)
- Generator rules: `skills/testcase-generator/SKILL.md`
- Global rules: `docs/QA_GLOBAL_RULES.md`
