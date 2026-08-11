## Block 0 - Environment
- Contentful account and a space. 
- sync-service (Fastify + TypeScript), delivery-api lives inside sync-service. 
- web (Next.js App Router). 
- docker-compose.yml with Postgres 16, contentful (SDK), contentful-management, and cloudflared

## Block 1 - Content modelling
In the Contentful web app, model three content types with deliberate complexity: 
- Author (name, avatar asset, bio),
- Article (title, slug, rich-text body, reference to Author, array of tags, hero image asset), 
- Banner (headline, CTA, image). Create ~6 entries; leave two as drafts. Do this by hand first, then repeat one content type via the contentful-migration CLI so you've touched migrations-as-code.
- Practice Scenario: environments, draft vs published, why reference fields and rich text are where integrations get hard, "content model changes go through review like schema changes" by running migration scripts.

## Block 2 — Direct delivery to Next.js
- Build the Next.js app consuming the CDA directly with the JS SDK: article list page, article detail page rendering rich text via @contentful/rich-text-react-renderer, linked Author hydrated. 
- Add Next.js Draft Mode wired to the Preview API so drafts render behind a preview route.

## Block 3 — The sync service: fetch-on-notify
- Fastify service with:
- Postgres schema: content_entries(entry_id pk, content_type, version, status, data jsonb, source, updated_at) plus a sync_failures table (DLQ).
- POST /webhooks/contentful.
- The processor: fetch the entry fresh from the CDA, run it through a mapper module.

## Block 4 — Backfill + reconciliation
Webhooks for latency, reconciliation for correctness, one mapper for both.
Reconciliation ran on a schedule — a Cloud Scheduler job hitting a Cloud Run job every few minutes in GCP terms, or a Kubernetes CronJob. Webhooks gave sub-second freshness; the sweep was the safety net, and its lag budget was minutes, not seconds. The token is persisted, so each run only fetches deltas — cheap enough to run often without hammering the API

## Block 5 — Own delivery API + frontend flip
Add GET /content/articles and GET /content/articles/:slug serving from Postgres. Flip the Next.js data layer from the Contentful SDK to your API — ideally behind the same fetch interface so the components don't change at all.
- What owning the store bought: availability independence from Contentful's API; cross-source querying and filtering in SQL; a delivery contract we control, so a CMS swap doesn't break consumers; and full control of caching and invalidation.
- What it cost: eventual consistency (publish-to-visible lag, which is measured in Block 3); a store to operate and back up; a sync path that can drift, needing reconciliation; and drafts must bypass it entirely via the Preview API.
- When you'd skip it: greenfield with a single content source and no existing store — pull-through with CDN caching and webhook-triggered invalidation is dramatically less machinery, and you build the sync only when you need multi-source queries or provenance-independent delivery.
