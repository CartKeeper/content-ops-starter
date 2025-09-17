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
3. For local development, add the Supabase variables to `.env.local`. The starter recognises either `SUPABASE_URL` or `SUPABASE_DATABASE_URL` for the project URL and prefers `SUPABASE_SERVICE_ROLE_KEY` (falling back to anonymous/public keys if provided).
4. Redeploy or restart the Next.js server so the API routes can pick up the new variables.

These API routes return JSON responses for GET, POST, PUT, and DELETE requests, so they can be consumed directly from front-end forms or integrations.

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

## Next Steps

Here are a few suggestions on what to do next if you're new to Netlify visual editor:

- Learn [Netlify visual editor overview](https://docs.netlify.com/visual-editor/visual-editing/)
- Check [Netlify visual editor reference documentation](https://visual-editor-reference.netlify.com/)

## Support

If you get stuck along the way, get help in our [support forums](https://answers.netlify.com/).
