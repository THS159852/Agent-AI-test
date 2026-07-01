---
name: testdata-generator
description: Creates test data sets mapped to test cases including valid, invalid, and boundary values. Use when tests need concrete inputs or database fixtures.
---

# Test Data Generator

## Workflow

1. Extract fields and validation rules from requirements or test cases.
2. Build equivalence partitions and boundary values.
3. Map each row to Test Case ID.
4. Provide format: JSON, CSV, SQL seed, or fixture code per project need.

## Output template

```markdown
## Data Set Overview
| Data Set ID | Purpose | Test Case IDs |

## Valid Data
| Field | Value | Notes |

## Invalid / Boundary Data
| Field | Value | Expected validation | Test Case ID |

## Setup Instructions
## Assumptions / Questions / Risks
```

## MCP

Database MCP to validate schema; avoid writing to prod.

See [GUIDE.md](GUIDE.md) | [GUIDE.vi.md](GUIDE.vi.md)
