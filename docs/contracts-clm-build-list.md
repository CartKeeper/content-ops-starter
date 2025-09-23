# Codex Virtual Build List — Contracts & CLM MVP (Content Ops Starter)

## 1. Core Stack

- **Frontend:** Next.js + Tailwind UI from Content Ops Starter (React components + shared theming tokens)
- **API Layer:** Next.js API routes (Node/TypeScript) for contract CRUD, OpenContracts bridge, DocuSign orchestration
- **Database:** Supabase/Postgres (tables for contracts, versions, counterparties, tasks, audit)
- **Object Storage:** S3-compatible bucket for original uploads and signed copies
- **Sidecars:**
  - OpenContracts (self-hosted) for ingestion, annotation viewer, analytics, vector search
  - DocuSign JWT/OAuth app for envelope creation + Connect webhooks
- **Auth & Permissions:** Existing Identity provider (Netlify Identity or Supabase Auth) extended with `view_contracts`, `manage_contracts`, `signer`
- **Deployment:** Netlify (Next.js app) + private network sidecar deployment for OpenContracts

## 2. Solution Architecture

```
User → Next.js UI → Next.js API routes → Supabase / S3
                               ↘
                                ↘→ OpenContracts API (ingest, search, viewer links)
                                ↘→ DocuSign API (envelopes) ← DocuSign Connect webhooks
```

- API routes act as the system of record and broker files/metadata between Supabase, storage, and sidecars.
- DocuSign webhooks deliver status changes → API persists audit events and auto-adds signed versions.
- OpenContracts corpus/document IDs are stored in Supabase and never exposed directly to the browser.

## 3. Data Model (Supabase)

Mirror the provided schema with migrations inside `supabase/migrations/`:

```sql
create table if not exists counterparties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  counterparty_id uuid references counterparties(id),
  owner_user_id uuid references users(id),
  status text not null check (status in (
    'draft','review','signature','executed','active','expiring','archived'
  )),
  value_cents bigint,
  currency text default 'USD',
  effective_at date,
  renewal_at date,
  tags text[] default '{}',
  oc_corpus_id text,
  oc_document_id text,
  file_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contract_versions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  oc_document_id text,
  file_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists contract_signers (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  role text not null check (role in ('company','counterparty')),
  name text not null,
  email text not null,
  docusign_recipient_id text,
  created_at timestamptz not null default now()
);

create table if not exists contract_tasks (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  kind text not null check (kind in ('review','signature','renewal')),
  due_at timestamptz,
  assignee_user_id uuid references users(id),
  status text not null check (status in ('open','done','dismissed')) default 'open',
  created_at timestamptz not null default now()
);

create table if not exists contract_audit (
  id bigserial primary key,
  contract_id uuid not null references contracts(id) on delete cascade,
  actor_user_id uuid references users(id),
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);
```

## 4. API Surface (Next.js API routes)

- `POST /api/contracts` – create metadata, generate signed upload URL, seed draft tasks
- `GET /api/contracts` – list with filters (status, owner, counterparty, tags, value range, date ranges)
- `GET /api/contracts/search` – combine DB filters with OpenContracts vector search when `q` provided
- `GET /api/contracts/:id` – detail fetch with metadata, tasks, versions, extracts, audit log
- `POST /api/contracts/:id/ingest` – push latest file to OpenContracts, persist `oc_*` references
- `GET /api/contracts/:id/viewer-link` – mint time-bound OC viewer URL/SSO token
- `POST /api/contracts/:id/sign` – create DocuSign envelope from latest version + signers
- `POST /api/webhooks/docusign` – Connect webhook receiver (status transitions, fetch signed PDF)
- `POST /api/contracts/:id/status` – controlled lifecycle updates with audit entries
- `POST /api/contracts/:id/tasks` – CRUD for review/signature/renewal tasks
- `GET /api/reports/contracts` – dashboard aggregations (revenue, renewals, outstanding signatures)

## 5. Feature Modules

### Contracts Lifecycle & Versioning

- Upload initial draft → persist as `contract_versions` row + `contracts.file_url`
- Status transitions: `draft → review → signature → executed → active → expiring → archived`
- Every signed DocuSign completion inserts a new version + automatically advances to `executed/active`
- Manual archive toggles remove active tasks and logs audit entries

### OpenContracts Integration

- On ingest: create or reuse corpus, upload PDF, trigger extraction pipelines
- Store extracted metadata (parties, effective dates, renewal terms, contract value) in `contracts`
- Display extracts in UI with approve/edit toggles; push acceptance back to Supabase
- Provide "Open in Analyzer" button linking to OC viewer using short-lived SSO tokens
- Vector search endpoint uses OC query when keyword present; merge results with DB filters

### DocuSign E-signature

- Map `contract_signers` to DocuSign recipients (company vs counterparty roles)
- Envelope creation uses latest contract version PDF and DocuSign tabs (signature/date fields)
- Track envelope status; update tasks + send notifications on `sent`, `completed`, `voided`
- On completion download combined PDF → upload to storage → create version + mark executed

### Search & Filters

- Table filters: title, counterparty, owner, status, date ranges (effective/renewal), value range, tags
- Keyword search uses OC vector service + DB `ILIKE`
- Save user filter presets for quick recall (optional local storage or Supabase table)

### Tasks & Reminders

- Task panel per contract; status toggles and due dates displayed on detail + list badges
- Daily cron (Netlify Scheduled Function) checks for overdue reviews/signatures, upcoming renewals
- Reminder emails/slack notifications with context links; log attempts in `contract_audit`

### Templates & Clauses (Should Have)

- Store DOCX templates in storage bucket with metadata in Supabase
- Generate new contract from template → fill merge fields → export to PDF for versioning
- Clause presets stored as JSON/Markdown; allow insertion into draft metadata editor

### Counterparty Directory

- `counterparties` table powering reusable company/contact records
- UI module for search + edit; link to contract creation flow for reuse

### Optional Enhancements

- AI-assisted extract approval interface (accept/reject suggestions, raise risk flags)
- Renewal revenue forecasting card aggregating `value_cents` over upcoming periods

## 6. UI Workstreams

- **Contracts List:** Data table with sorting, filters, inline task badge counts, quick actions (view, send for signature, archive)
- **Contract Detail:** status pill, lifecycle actions, metadata form, tasks panel, versions timeline, extract review panel, audit log
- **Dashboard:**
  - Revenue view → total contract value, upcoming renewals (30/60/90 days), renewal forecast chart
  - Client view → contracts awaiting review, contracts pending signature, recently executed list
- **Settings → Permissions:** toggles for `view_contracts`, `manage_contracts`, `signer`; assign to team members

## 7. Operational Considerations

- Implement retry/backoff for OpenContracts ingestion and DocuSign webhook fetches
- Background jobs for polling DocuSign if webhooks delayed
- Signed URL expirations tuned for uploads & viewer links (15 min default)
- Monitoring/logging via Netlify functions + Supabase audit table

## 8. Milestones & KPIs

- **M1 – Foundations:** Deploy OpenContracts, run DB migrations, wire storage
- **M2 – Ingestion & Search:** Upload→ingest pipeline, metadata extraction, viewer linking, vector search
- **M3 – E-Signature:** Envelope creation, webhook handling, signed version automation
- **M4 – UI & Tasks:** Contracts list/detail, tasks/reminders, dashboards
- **M5 – Hardening:** Permissions, audit trail, retries, monitoring

**KPIs:**
- Time to first signed contract < 1 day
- Upload→ingest success ≥ 99%
- Webhook delivery ≥ 99% with no lost envelopes
- Search latency p95 < 300ms (DB) / < 1s (vector)
