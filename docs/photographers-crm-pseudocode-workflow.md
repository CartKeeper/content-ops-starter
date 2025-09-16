# Pseudocode Workflow — Photographers CRM (Content Ops Starter)

This workflow is the execution playbook that pairs with the **Codex Virtual Build List**. Follow these steps sequentially to stand up the Photographers CRM experience on top of the Content Ops Starter repository.

---

## Step 1. Setup Project

```pseudo
CLONE Content Ops Starter template from GitHub
INSTALL dependencies (npm install or yarn)
CONFIGURE Tailwind CSS (themes, colors for photography branding)
SETUP Netlify CMS with GitHub backend for content editing
CONFIGURE Netlify deployment (connect repo → enable CI/CD)
```

**Notes:**
- Confirm Tailwind theme tokens capture brand palette, typography, and spacing.
- Establish required environment variables (CMS auth, storage keys) inside Netlify dashboard.

---

## Step 2. Authentication

```pseudo
IF using Netlify Identity:
    ENABLE Identity service in Netlify dashboard
    CONFIGURE role-based access (admin vs. client)
ELSE IF using Supabase:
    INSTALL supabase-js
    CREATE project in Supabase dashboard
    CONFIGURE auth (email/password + optional Google OAuth)
```

**Notes:**
- Document chosen auth provider and required redirect URLs.
- For Supabase, generate service role keys and store in server-side environment variables.

---

## Step 3. Content Models (CMS Schema)

```pseudo
DEFINE CMS collections in cms/config.yml:
    COLLECTION clients:
        fields: name, email, phone, address, notes
    COLLECTION bookings:
        fields: client, date, time, location, shoot_type, status
    COLLECTION invoices:
        fields: client, amount, due_date, status, pdf_url
    COLLECTION galleries:
        fields: client, project, photos[], status
```

**Notes:**
- Add relation widgets so bookings, invoices, and galleries reference client entries.
- Map default status options (e.g., scheduled/completed) for consistent filtering in UI.

---

## Step 4. Dashboard

```pseudo
CREATE /pages/index.tsx
IMPORT DashboardCard component
DISPLAY widgets:
    Upcoming bookings
    Outstanding invoices
    Quick stats (monthly revenue, active clients)
```

**Notes:**
- Surface CMS data via static generation with revalidation or client-side fetching depending on auth strategy.
- Include loading/empty states for each widget.

---

## Step 5. Clients Module

```pseudo
CREATE /pages/clients/index.tsx
DISPLAY ClientTable component with CRUD options
FUNCTION addClient():
    SAVE new client to CMS collection
FUNCTION editClient():
    UPDATE client details
FUNCTION deleteClient():
    REMOVE client entry
```

**Notes:**
- Validate required fields on create/update flows.
- Gate destructive actions (delete) behind confirmation modal.

---

## Step 6. Bookings Module

```pseudo
CREATE /pages/bookings/index.tsx
IMPORT BookingCalendar component
FUNCTION addBooking(client, date, time, type, location):
    SAVE booking entry
FUNCTION updateBooking(id, newData):
    UPDATE booking status or details
FUNCTION syncCalendar():
    EXPORT bookings → Google Calendar / iCal
```

**Notes:**
- Ensure time zone normalization when storing and displaying booking times.
- Optional calendar export can be implemented via ICS file generation or third-party API integration.

---

## Step 7. Invoices & Contracts Module

```pseudo
CREATE /pages/invoices/index.tsx
DISPLAY InvoiceTable with statuses (draft, sent, paid)
FUNCTION generateInvoice(client, items, amount, due_date):
    CREATE PDF using a library (pdfkit or react-pdf)
    STORE pdf_url in CMS
FUNCTION sendInvoice(invoice_id):
    TRIGGER email with PDF link
OPTIONAL: INTEGRATE Stripe for payment collection
OPTIONAL: INTEGRATE HelloSign API for contracts
```

**Notes:**
- Provide admin controls for updating invoice status post-payment.
- Store email delivery logs (timestamp, recipient) for compliance and support.

---

## Step 8. Galleries Module

```pseudo
CREATE /pages/gallery/index.tsx
IMPORT GalleryUploader component
FUNCTION uploadPhotos(client, project, files()):
    STORE files in S3/Cloudinary
    SAVE links in CMS gallery entry
FUNCTION clientAccessGallery(gallery_id, client_auth):
    PROVIDE secure URL to view/download
```

**Notes:**
- Implement upload progress and error handling in the UI.
- Apply optional watermarking or size presets during upload pipeline.

---

## Step 9. Settings

```pseudo
CREATE /pages/settings/index.tsx
ALLOW photographer to update profile (name, logo, brand colors)
STORE global preferences in CMS (pricing presets, notifications)
```

**Notes:**
- Persist settings as a singleton collection in the CMS for easy retrieval.
- Sync brand colors with Tailwind config to ensure UI consistency.

---

## Step 10. Enhancements (Optional, Future)

```pseudo
ADD AI photo tagging service:
    ON photo upload → send to AI API
    RETURN tags (e.g., "wedding, portrait, outdoor")
EXTEND dashboard analytics:
    CALCULATE client lifetime value
    GRAPH revenue trends with charting lib
OPTIMIZE for PWA:
    ADD offline support
    ENABLE push notifications
```

**Notes:**
- Evaluate AI vendor pricing and privacy compliance before enabling automated tagging.
- For PWA features, configure service workers and manifest via Next.js progressive enhancement patterns.

---

With the **Codex Virtual Build List** defining the architecture and this **Pseudocode Workflow** detailing execution order, the team has a complete handoff kit for delivering the Photographers CRM.
