create table if not exists content_entries (
  entry_id      text primary key,
  content_type  text not null,
  revision      integer not null,
  status        text not null check (status in ('published','unpublished')),
  source        text not null default 'contentful',
  data          jsonb not null,
  published_at  timestamptz,
  synced_at     timestamptz not null default now()
);

create index if not exists idx_entries_type_status
  on content_entries (content_type, status);

create index if not exists idx_entries_slug
  on content_entries ((data->>'slug'));

create table if not exists sync_failures (
  id            bigserial primary key,
  entry_id      text not null,
  content_type  text,
  topic         text,
  attempts      integer not null default 1,
  error         text not null,
  payload       jsonb,
  failed_at     timestamptz not null default now()
);

create table if not exists sync_state (
  id              text primary key,
  next_sync_token text,
  last_run_at     timestamptz
);
