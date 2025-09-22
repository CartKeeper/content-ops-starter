# Content Ops Starter

![Content Ops Starter](https://assets.stackbit.com/docs/content-ops-starter-thumb.png)

Netlify starter that's made for customization with a flexible content model, component library, [visual editing](https://docs.netlify.com/visual-editor/overview/) and [Git Content Source](https://docs.netlify.com/create/content-sources/git/).

**⚡ View demo:** [https://content-ops-starter.netlify.app/](https://content-ops-starter.netlify.app/)

## Table of Contents

- [Deploying to Netlify](#deploying-to-netlify)
- [Develop with Netlify Visual Editor Locally](#develop-with-netlify-visual-editor-locally)
- [Building for production](#building-for-production)
- [Setting Up Algolia Search](#setting-up-algolia-search)
- [Configuring Supabase Storage](#configuring-supabase-storage)
- [Core Codex Setup](#core-codex-setup)
- [Next Steps](#next-steps)
- [Support](#support)

## Deploying to Netlify

If you click "Deploy to Netlify" button, it will create a new repo for you that looks exactly like this one, and sets that repo up immediately for deployment on Netlify.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/netlify-templates/content-ops-starter)

### Gallery expiration reminders

Galleries now automatically receive an `expiresAt` value one year after they are marked as delivered. A Netlify scheduled function located at `netlify/functions/gallery-expiration-reminder.ts` runs once per day to find delivered galleries that are 11 months past delivery, send an expiration reminder email, and persist the `reminderSentAt` timestamp so clients are only notified once. Reminder activity is appended to `content/logs/gallery-reminders.log` for auditing.

Configure the mailer by setting the following environment variables before deploying:

- `GALLERY_REMINDER_FROM_EMAIL` &mdash; the from/reply address used in the reminder email (defaults to `no-reply@averyloganstudio.com`).
- `GALLERY_REMINDER_OPT_OUT_URL` &mdash; optional link included in the footer so clients can manage reminders.

The reminder template is a concise plain-text email:

```
Subject: Your gallery expires on {expirationDate}

Hi {clientName},

We hope you're enjoying the "{shootType}" gallery. This is a friendly reminder that access expires on {expirationDate}.
Download the full-resolution files and favorites before the link is closed to keep a local backup.
{Opt-out URL (if configured)}

With gratitude,
Avery Logan Studio
```

Reminders are only attempted when a gallery includes a `deliveryEmail` custom field. You can capture this value through the gallery quick-action modal or by editing the gallery record directly.

## Develop with Netlify Visual Editor Locally

The typical development process is to begin by working locally. Clone this repository, then run `npm install` in its root directory.

Run the Next.js development server:

```txt
cd content-ops-starter
npm run dev
```

Install the [Netlify Visual Editor CLI](https://www.npmjs.com/package/@stackbit/cli). Then open a new terminal window in the same project directory and run the Netlify visual editor dev server:

```txt
npm install -g @stackbit/cli
stackbit dev
```

This outputs your own Netlify visual editor URL. Open this, register, or sign in, and you will be directed to Netlify's visual editor for your new project.

![Next.js Dev + Visual Editor Dev](https://assets.stackbit.com/docs/next-dev-stackbit-dev.png)

## Building for production

To build a static site for production, run the following command

```shell
npm run build
```

## Setting Up Algolia Search

This starter includes Algolia search integration. To set it up:

1. Create an [Algolia](https://www.algolia.com/) account
2. Create a new application and index
3. Set the following environment variables:
   - `NEXT_PUBLIC_ALGOLIA_APP_ID` - Your Algolia application ID
   - `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY` - Your Algolia search-only API key
   - `NEXT_PUBLIC_ALGOLIA_INDEX_NAME` - Your index name

## Configuring Supabase Storage

The CRM API routes under `src/pages/api/` rely on [Supabase](https://supabase.com/) for persistence.

### Connect your Netlify site to Supabase

1. In Netlify, open **Site configuration** for the project you want to connect.
2. Select **Supabase** in the sidebar and choose **Connect** on the Supabase extension card.
3. Authorize Netlify to access your Supabase account, then pick the Supabase project and framework. Selecting **Other** lets you provide a custom prefix for the environment variables that will be created for you.
4. Click **Save**. Netlify adds environment variables such as `SUPABASE_DATABASE_URL` and `SUPABASE_ANON_KEY` (or the prefixed equivalents) to your site.

### Prepare your Supabase project and environment variables

1. Create a Supabase project and note the project URL and service role key from the dashboard.
2. Create `clients` and `projects` tables with the columns your application needs (for example: `id`, `name`, `email`, `notes`, timestamps, etc.).
3. For local development, add the Supabase variables to `.env.local`. The starter recognises either `SUPABASE_URL` or `SUPABASE_DATABASE_URL` for the project URL and prefers `SUPABASE_SERVICE_ROLE_KEY` (falling back to anonymous/public keys if provided). Ensure that either `AUTH_JWT_SECRET`, a Supabase service-role key, or the project's `SUPABASE_JWT_SECRET` environment variable is available so `/api/auth/login` can mint sessions.
4. Redeploy or restart the Next.js server so the API routes can pick up the new variables.

These API routes return JSON responses for GET, POST, PUT, and DELETE requests, so they can be consumed directly from front-end forms or integrations.

When preparing CSVs for Supabase imports (for example, bulk-loading contacts or clients), set the `owner_user_id` column to a value from `public.users.id`. Leave the field blank if the record should be unassigned so the import stores a `NULL` owner.

### Galleries automation with Dropbox

The galleries dashboard now includes an authenticated Dropbox workflow so asset imports are trackable end-to-end without exposing access tokens to the browser.

- **Environment variables**
  - `NEXT_PUBLIC_DROPBOX_APP_KEY` – optional legacy support for rendering the Dropbox Chooser button.
  - `DROPBOX_APP_SECRET` – server-side secret used to exchange refresh tokens for Dropbox API access tokens.
  - `DROPBOX_REFRESH_TOKEN` – long-lived refresh token generated for the Dropbox app; exchanged on the server for short-lived access tokens.
  - `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_URL` – required for the new galleries API routes to write to Supabase tables.
- **Supabase tables** (`supabase/migrations/20250212000000_create_dropbox_tables.sql`)
  - `dropbox_assets` stores metadata for imported files and links them to galleries.
  - `gallery_publications` records publish events and downstream automation metadata.
- **Server utilities**
  - `src/server/dropbox/client.ts` securely exchanges refresh tokens for access tokens and exposes Dropbox helpers for listing folders and downloading files.
- **Next.js API routes**
  - `POST /api/dropbox/list-folder` – previews Dropbox folders through the authenticated API so the CRM can select files server-side.
  - `POST /api/galleries/import` – resolves Dropbox metadata via the API helper and persists imports.
  - `GET|POST /api/galleries` – list or create galleries with publish-ready metadata.
  - `POST /api/galleries/[id]/publish` – transitions a gallery to `live` and logs the publication.
- **UI additions**
  - `DropboxImportPanel` (rendered on `/galleries`) previews Dropbox folders via the server helper and streams selected files to Supabase.
- **Smoke test plan**
  1. Set the environment variables above (with dummy values locally) and run `npm run dev`.
  2. Visit `/galleries`, preview a Dropbox folder, select a few files, and trigger an import. Confirm the success message and that `/api/galleries/import` returns `200`.
  3. Call `POST /api/galleries/{id}/publish` and confirm a new record appears in the `gallery_publications` table.

### Using the Supabase client in your site

When you need to interact with Supabase from the front end, create a client with the public environment variables that Netlify generated for your framework:

```js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_URL,
    process.env.PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY
);
```

If you supplied a custom prefix while connecting the extension (for example `CRM_SUPABASE_DATABASE_URL`), use those prefixed names in your client code. The server-side utilities in this starter automatically detect environment variables that end with `SUPABASE_URL`, `SUPABASE_DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, or `SUPABASE_ANON_KEY`, even when they are prefixed.

## Core Codex Setup

This project now ships with a Codex-oriented content workflow that blends Git-based publishing with Netlify Identity and dynamic serverless utilities.

### Visual editing with Decap CMS

- Navigate to `/admin/` to access Decap CMS (formerly Netlify CMS). The configuration at `public/admin/config.yml` exposes pages, blog posts, CRM datasets, and design data directly from the `content/` directory.
- Media uploads are stored in `public/images/uploads`, ensuring all assets remain version controlled alongside Markdown and JSON content.
- To connect Netlify Identity with the CMS, enable **Identity** and **Git Gateway** for your Netlify site. Editors can then authenticate with their Netlify Identity account and commit updates back to GitHub.

### Authentication with Netlify Identity

- The `NetlifyIdentityProvider` wraps the Next.js application and exposes the current user, roles, and helper actions via `useNetlifyIdentity()`.
- `CrmAuthGuard` now prefers Netlify Identity. Users with the `photographer` role can open the private CRM, while other roles see a friendly access prompt.
- Invite teammates from the Netlify dashboard and assign either `photographer` (studio staff) or `client` (gallery access) roles. The in-app account menu signs users out of Identity so they can switch roles quickly.

### Dynamic invoices and payments

- `netlify/functions/generate-invoice-pdf.ts` renders polished PDF invoices on demand using `pdfkit`. The CRM UI calls this function and streams the file to the browser.
- `netlify/functions/create-checkout-session.ts` creates Stripe Checkout sessions for outstanding invoices. The CRM updates the payment link and opens Stripe in a new tab.
- Provide a `STRIPE_SECRET_KEY` environment variable before deploying. Identity tokens are forwarded automatically so only authenticated photographers can invoke these Netlify Functions.

Together these additions connect Codex to GitHub for structured content, secure authentication, and practical automation for invoicing and payments.

## Next Steps

Here are a few suggestions on what to do next if you're new to Netlify visual editor:

- Learn [Netlify visual editor overview](https://docs.netlify.com/visual-editor/visual-editing/)
- Check [Netlify visual editor reference documentation](https://visual-editor-reference.netlify.com/)

## CRM data tables

The Clients and Contacts workspaces now share a data-table architecture powered by TanStack Table and the components under `src/components/data`. To add or remove columns:

1. Update the column definitions in `src/pages/clients/index.tsx` or `src/pages/contacts/index.tsx` (look for the `columns` memo). Columns are plain TanStack definitions, so you can add custom cells, sorting functions, or width hints.
2. If the column requires additional data, extend the corresponding loader in `src/lib/api/clients.ts` or the contact mapper in `src/lib/api/contacts.ts` to surface the new field.
3. Adjust the `ClientDrawer` or `ContactDrawer` components if the detail view should mirror the new data.

Filters and search chips live inside `DataToolbar`. Each page wires its own `ToolbarFilter[]` array—adding a filter is as simple as adding another entry with a unique `id`, a list of options, and a state hook. The toolbar automatically renders the menu and keeps query-string state in sync so the views stay shareable.

## Support

If you get stuck along the way, get help in our [support forums](https://answers.netlify.com/).
