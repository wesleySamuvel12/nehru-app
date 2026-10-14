# REST API Specifications

All endpoints are versioned under `/api/v1/`.

### Standards
- **Content-Type**: `application/json`
- **Authentication**: `Authorization: Bearer <jwt_token>`
- **Standard Envelope**:
```json
{
  "success": true,
  "data": {},
  "timestamp": "2026-10-14T11:00:00Z"
}
```
