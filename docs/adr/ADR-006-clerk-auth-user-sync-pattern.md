# ADR-006: Clerk Auth Verification + User Sync Pattern

## Status
Accepted

## Context
Clerk owns authentication (identity, sessions, JWTs). Our own `User` table 
owns business-relevant profile data (org membership, app-specific fields). 
These need to stay in sync: the first time a Clerk-authenticated request 
arrives from a user we haven't seen, we need a corresponding `User` row 
(and, for MVP, a personal `Org`) created before the request can proceed.

## Decision
Token verification and user/org sync both happen inline inside 
`ClerkAuthGuard.canActivate()`:
1. Verify the JWT via `@clerk/backend`'s `authenticateRequest()`.
2. On success, fetch the user's email via `clerkClient.users.getUser()`.
3. Call `UserService.findOrCreateFromClerk()`, which does a `findUnique` 
   and, only on a cache-miss, a `$transaction` creating both `Org` and `User`.
4. Attach both `req.auth` (raw Clerk payload) and `req.user` (our synced 
   record) for downstream handlers.

## Consequences
- Every protected request pays the cost of one Clerk API call + one Prisma 
  read (steady state), or +1 transaction on a brand-new user's first request.
- Org-per-user is a simplifying MVP assumption. Multi-user orgs (invites, 
  shared portfolios) will need explicit design later — not blocking now 
  since `Org`/`User` are already separate tables with no schema change needed.
- If request volume makes the extra Clerk API call a real latency/cost 
  concern, the fix is to cache `clerkId -> User` lookups (e.g. in Redis, 
  which is already in our stack) rather than restructuring the guard. 
  Not needed at MVP scale.

## Alternatives considered
- **Separate interceptor for sync, guard only for verification**: rejected 
  for MVP — adds a layer of indirection for no real benefit at current scale, 
  and the guard already has access to everything it needs in one place.
- **Sync via Clerk webhooks (user.created event) instead of on-request**: 
  more "correct" long-term (no per-request Clerk API call), but adds 
  webhook infrastructure (endpoint, signature verification, retry handling) 
  that isn't justified before the platform has real traffic. Revisit if 
  Task 3.5's steady-state cost becomes a measured problem.