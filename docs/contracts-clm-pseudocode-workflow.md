# Pseudocode Workflow — Contracts & CLM MVP (Content Ops Starter)

Execution guide for integrating OpenContracts + DocuSign with the Content Ops Starter stack.

---

## Step 1. Environment & Dependencies

```pseudo
CLONE Content Ops Starter repository
INSTALL npm dependencies
SETUP .env.local with Supabase + storage credentials
PROVISION S3 bucket (or Supabase Storage) for contract files
DEPLOY OpenContracts sidecar via production.yml (private network)
RUN OpenContracts migrations & create API key / service account
CONFIGURE DocuSign integration key, RSA key pair, userId, accountId
```

**Notes:**
- Store OpenContracts base URL + API key as server-side environment variables (`OC_BASE_URL`, `OC_API_KEY`).
- Configure DocuSign JWT credentials and Connect webhook listener URL in Netlify.

---

## Step 2. Database & Storage Prep

```pseudo
CREATE Supabase migrations for counterparties, contracts, contract_versions, contract_signers, contract_tasks, contract_audit
RUN migrations locally (supabase db push) and confirm tables exist
CONFIGURE storage helper to mint signed upload URLs for original/signed PDFs
```

**Notes:**
- Add triggers or policies if row-level security enabled (grant appropriate roles to service key).
- Ensure timestamps update via Supabase triggers or application logic on updates.

---

## Step 3. OpenContracts Bootstrap

```pseudo
FUNCTION ensureCorpus(workspaceId):
    QUERY Supabase for existing oc_corpus_id
    IF missing:
        CALL OpenContracts API to create corpus
        STORE oc_corpus_id on workspace/contract metadata
```

```pseudo
FUNCTION ingestDocument(contractId, fileUrl):
    DOWNLOAD file from storage
    CALL OC upload → receive documentId
    TRIGGER OC pipelines (extraction/vector)
    UPDATE contracts.oc_document_id + insert contract_versions row
```

**Notes:**
- Implement retry/backoff if OC pipelines respond with async status codes.
- Cache extracted metadata and persist approved values back into `contracts` table.

---

## Step 4. DocuSign Integration

```pseudo
FUNCTION createEnvelope(contractId):
    FETCH latest contract version + signers
    GENERATE JWT access token with DocuSign SDK
    BUILD envelope definition (documents[], recipients[], tabs[])
    CALL DocuSign Envelopes::create
    STORE envelopeId on contract + log audit event
    UPDATE contract status → 'signature'
```

```pseudo
WEBHOOK /api/webhooks/docusign:
    VERIFY HMAC signature (if configured)
    PARSE envelopeStatus
    IF status == 'completed':
        FETCH combined PDF via DocuSign API
        UPLOAD signed PDF to storage
        INSERT new contract_versions row (mark as signed)
        UPDATE contract status → 'executed' and `active` if effective date reached
    ELSE IF status in ['declined','voided']:
        UPDATE status + audit log
```

**Notes:**
- Register Connect webhook with DocuSign pointing to Netlify Function/Next API route.
- Support idempotent webhook handling using envelopeId + event timestamp.

---

## Step 5. API Routes & Services

```pseudo
POST /api/contracts:
    AUTHORIZE user has manage_contracts
    VALIDATE payload (title, counterparty, owner)
    INSERT contract row (status=draft)
    GENERATE signed S3 upload URL
    RETURN contract + upload URL
```

```pseudo
POST /api/contracts/:id/ingest:
    AUTHORIZE manage_contracts
    CALL ingestDocument(contractId, latestFileUrl)
    PULL OC extracts → map to metadata (parties, dates, value, renewal)
    UPSERT extracted fields into contracts table
```

```pseudo
GET /api/contracts/search:
    PARSE filters (status, owners, tags, value range, date range)
    IF q provided:
        CALL OC vector search (topK)
        MERGE results with DB query (by contract_id)
    RETURN paginated list + counts
```

**Notes:**
- Centralize OpenContracts + DocuSign clients in `src/server/` with reusable helpers.
- Append audit events for lifecycle changes, ingests, signature actions.

---

## Step 6. UI Implementation

```pseudo
PAGE /contracts:
    FETCH list via SWR/React Query
    RENDER table with filters + quick actions (view, send, archive)
    DISPLAY task badges (review/signature/renewal counts)
```

```pseudo
PAGE /contracts/[id]:
    FETCH detail (metadata, tasks, versions, extracts, audit)
    RENDER status pill + action buttons (Send for signature, Ingest, Archive)
    EMBED extracted metadata review UI (approve/edit)
    LIST versions with download links; call viewer-link for OpenContracts button
```

```pseudo
DASHBOARD cards:
    USE /api/reports/contracts to display totals, upcoming renewals, outstanding signatures
    PROVIDE quick links to filtered contract lists
```

**Notes:**
- Reuse existing design system tokens (colors, typography) for consistent outline mode.
- Gate signature action behind `signer` or `manage_contracts` permission checks in UI.

---

## Step 7. Tasks, Reminders & Automations

```pseudo
CRON daily (Netlify Scheduled Function):
    QUERY contracts with upcoming renewal dates (30/60/90 days)
    CREATE or update renewal tasks + send reminders
    FIND signature/review tasks overdue → send digest emails/slack
    LOG reminder attempts in contract_audit
```

```pseudo
API /api/contracts/:id/tasks (POST/PATCH):
    MANAGE task lifecycle (open → done/dismissed)
    TRIGGER notifications to assignees
```

**Notes:**
- Compose emails using existing transactional template utilities.
- Consider websocket/SSE channel for real-time task updates on contract detail view.

---

## Step 8. Permissions & Settings

```pseudo
UPDATE team roster settings page:
    ADD toggles for view_contracts, manage_contracts, signer roles
    MAP permissions to Supabase policies or Identity roles
    ENSURE API routes enforce via middleware
```

**Notes:**
- Document permission matrix (e.g., `signer` can trigger DocuSign send but not edit metadata).
- Backfill existing admins with all three roles during migration.

---

## Step 9. QA & Observability

```pseudo
TEST upload → ingest → metadata extraction → DocuSign send → webhook completion
SIMULATE webhook retries (duplicate deliveries)
VERIFY vector search latency under 1s for 95th percentile queries
ASSERT audit log captures status transitions + signature events
```

**Notes:**
- Instrument key metrics (ingest success rate, webhook delivery) via Supabase logging or third-party APM.
- Provide runbooks for regenerating DocuSign JWT and rotating OC API keys.
