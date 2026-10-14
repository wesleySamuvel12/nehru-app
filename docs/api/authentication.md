# Authentication & Authorization

Authentication is based on stateless JWT access tokens with Redis-backed refresh token rotation.

### Flow
1. Client calls `POST /api/v1/auth/login` with email and password.
2. Server validates credentials against Prisma database.
3. Server returns JWT Access Token (7 days) and Refresh Token.
4. Client includes token in `Authorization: Bearer <token>` for all secured requests.
