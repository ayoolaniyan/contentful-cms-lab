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
