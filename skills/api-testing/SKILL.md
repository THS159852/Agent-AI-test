---
name: api-testing
description: Designs API test coverage from OpenAPI specs including auth, payloads, status codes, and schema validation. Use for REST or GraphQL API testing tasks.
---

# API Testing

## Workflow

1. Parse OpenAPI/Swagger or endpoint docs.
2. List endpoints × methods × auth requirements.
3. For each: happy path, validation errors, auth failures, edge payloads.
4. Output Verify-prefixed test cases in table format (per QA_GLOBAL_RULES).
5. Note contract testing tools (Dredd, Schemathesis) if relevant.

## Coverage matrix

| Endpoint | Method | Auth | Positive | Negative | Boundary |

## MCP

HTTP/REST MCP, Postman MCP for live calls (non-prod only).

See [GUIDE.md](GUIDE.md) | [GUIDE.vi.md](GUIDE.vi.md)
