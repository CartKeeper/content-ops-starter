-- Remove deprecated Zapier webhook archive now that the integration has been retired.

-- Drop indexes explicitly in case the table exists from previous migrations.
drop index if exists zapier_webhook_events_event_idx;
drop index if exists zapier_webhook_events_received_idx;

drop table if exists public.zapier_webhook_events;
