# Test Case Reviewer — Guide

## What this skill does

Audits test cases **already produced** by `testcase-generator`. It finds mismatches against requirements/UI, quality defects, coverage gaps, and **maps every finding to a screen**.

It does **not** generate a new full suite unless you ask for fixes afterward.

## When to use

- Right after `testcase-generator` finishes
- Before automation or handoff to testers
- When reviewing a saved `.md` / Excel pack of generated cases
- Keywords: review test cases, audit testcase, mismatch, validate generated TC

## Inputs

1. Generated test case table(s)
2. Original requirement / AC / browser document (strongly recommended)
3. Optional: coverage summary from the generator

## Output

| Section | Purpose |
|---------|---------|
| Summary + verdict | Pass / Pass with fixes / Rework required |
| Screen Registry | Which screens the pack touches |
| Findings by screen | Mismatch, wrong screen, over-spec, etc. |
| Coverage gaps by screen | Missing conditions with suggested titles |
| Assumptions / Questions / Risks | Unclear source material |

## Severity cheat sheet

- **Critical** — wrong vs AC, security hole, would fail on the wrong screen
- **Major** — missing P0, invented rule, unusable steps, non-English expected result
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
