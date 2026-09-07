# Narrative Persistence Exact-Diff Plan

## Verified Preconditions

- Confirm the current ReportHistoryEntry model exactly matches the supplied Prisma block before editing.
- Confirm the current report-history controller exactly matches the supplied TypeScript block before editing.
- Confirm the service ends with the exact supplied getOne method before editing.
- Treat any mismatch as an immediate stop condition and return the real current content.

## Schema and Database

- In services/api/prisma/schema.prisma, add only narrative String? immediately after snapshot Json.
- Produce a full before-and-after diff showing that this is the only schema change.
- From services/api, run exactly npx dotenv-cli -e ../../.env -- npx prisma db push.
- Preserve and report the real terminal output.
- Do not run migrations, resets, or any destructive database command.

## Report-History API

- In services/api/src/report-history/report-history.controller.ts, add Patch to the existing Nest import and insert the exact attachNarrative method after getOne.
- In services/api/src/report-history/report-history.service.ts, insert the exact attachNarrative method directly after getOne and before the class closing brace.
- Do not create DTOs or additional files, and do not rename or alter any existing fields.

## Frontend Gate

- Inspect the actual AI synthesis action in apps/web/src/components/report/report-analysis.tsx and print the exact handler or inline callback that invokes narrative generation.
- Inspect that component, its hook return values, and apps/web/src/app/onboarding/report/page.tsx to locate the existing report-history entry id.
- The verified current flow exposes no report-history id in the component or parent page. Therefore, after the backend steps, stop at this gate and print the exact relevant props definition and parent render instead of inventing a prop, query parameter, or new flow.
- Make no frontend edit when the identifier is unavailable.

## Verification and Output

- Because the frontend gate triggers the user's explicit stop condition, do not proceed to the final API or frontend builds, which were requested only after all four steps complete.
- Report the backend changes already completed, the schema before-and-after diff, the database push output, and the exact frontend code proving why execution stopped.

## Dependencies

- Schema validation gates the database push.
- Successful database push gates controller and service edits.
- Backend completion gates frontend inspection.
- Frontend identifier discovery gates frontend modification and builds.

## Risk Controls

- Use exact textual replacements only.
- Preserve tradingType, tradingStyle, riskAppetite, and investmentPlan exactly.
- Restrict backend source edits to services/api/src/report-history plus the explicitly requested Prisma schema.
- Do not introduce a PATCH helper or other frontend API pattern unless the required existing identifier is confirmed.

## Rejected Alternatives

- Do not add Redis, WebSockets, DTOs, migrations, caching, report-history page rewrites, or new routing because they exceed the exact request.
- Do not invent a reportHistoryId prop or URL parameter because the user explicitly required stopping when no existing id source is found.
- Do not reinterpret PATCH as PUT or change the endpoint path.