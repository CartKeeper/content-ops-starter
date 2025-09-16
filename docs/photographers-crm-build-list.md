# Codex Virtual Build List — Photographers CRM (Content Ops Starter)

## 1. Core Stack

- **Framework:** Next.js (existing in Content Ops Starter)
- **Styling:** Tailwind CSS with custom UI components
- **CMS:** Git-based CMS such as Netlify CMS/Decap
- **Database Layer (optional):** Supabase or Prisma with Postgres for extended storage needs
- **Deployment:** Netlify with GitHub-powered CI/CD

## 2. Project Structure

```
photographers-crm/
 ├── pages/                # Routes (dashboard, clients, bookings, etc.)
 │   ├── index.tsx         # Landing / Dashboard
 │   ├── clients/          # Client management
 │   ├── bookings/         # Booking calendar & events
 │   ├── invoices/         # Invoicing + payments
 │   ├── gallery/          # Client galleries
 │   └── settings/         # Profile & system settings
 ├── components/           # Reusable UI components
 │   ├── DashboardCard.tsx
 │   ├── ClientTable.tsx
 │   ├── BookingCalendar.tsx
 │   ├── InvoiceForm.tsx
 │   └── GalleryUploader.tsx
 ├── lib/                  # Utility functions
 │   ├── auth.ts           # Authentication logic
 │   ├── api.ts            # API calls (if external)
 │   └── cms.ts            # Git-based CMS helpers
 ├── styles/               # Global + Tailwind config
 └── cms/                  # Content models (clients, projects, contracts)
```

## 3. Feature Modules

### Dashboard

- Overview cards showing upcoming shoots, outstanding invoices, and recent client messages
- KPI snapshots such as monthly revenue and active client counts

### Client Management

- CRUD flows to add, edit, and archive clients
- Core fields: name, email, phone, address, and internal notes
- Relationship links into associated projects, invoices, and galleries

### Bookings

- Calendar views (weekly/monthly) for scheduled shoots
- Booking form capturing client, date, time, shoot type, and location details
- Integrations for Google Calendar or iCal export

### Projects & Galleries

- Photo upload and tagging pipeline (e.g., S3 or Cloudinary storage)
- Association with client and booking records
- Private client portal access with authentication controls

### Invoices & Contracts

- Auto-generated invoice templates (PDF or email delivery)
- Status tracking for draft, sent, and paid invoices
- Payment integrations (e.g., Stripe) and digital contract e-sign support (e.g., HelloSign API)

### Settings

- Photographer profile information such as name, brand, and logo
- Pricing presets for common shoot types
- Notification preferences for reminders and alerts

## 4. Authentication Options

- **Netlify Identity:** Simple option aligned with Git-based workflows
- **Supabase Auth:** Scalable email/password or OAuth provider support

## 5. Data Models (Git-based CMS Collections)

Define collections within `cms/config.yml`:

### Clients

```yaml
name: clients
fields:
  - { name: name, label: "Name" }
  - { name: email, label: "Email" }
  - { name: phone, label: "Phone" }
  - { name: address, label: "Address" }
  - { name: notes, label: "Notes", widget: "text" }
```

### Bookings

```yaml
name: bookings
fields:
  - { name: client, label: "Client", widget: "relation", collection: "clients", search_fields: ["name"], value_field: "name" }
  - { name: date, label: "Date", widget: "datetime" }
  - { name: time, label: "Time" }
  - { name: location, label: "Location" }
  - { name: shoot_type, label: "Shoot Type" }
  - { name: status, label: "Status", widget: "select", options: ["scheduled", "completed", "cancelled"] }
```

### Invoices

```yaml
name: invoices
fields:
  - { name: client, label: "Client", widget: "relation", collection: "clients", search_fields: ["name"], value_field: "name" }
  - { name: amount, label: "Amount" }
  - { name: due_date, label: "Due Date", widget: "datetime" }
  - { name: status, label: "Status", widget: "select", options: ["draft", "sent", "paid"] }
  - { name: pdf_url, label: "Invoice PDF", widget: "file" }
```

### Galleries

```yaml
name: galleries
fields:
  - { name: client, label: "Client", widget: "relation", collection: "clients", search_fields: ["name"], value_field: "name" }
  - { name: project, label: "Project" }
  - { name: photos, label: "Photos", widget: "list", field: { name: image, label: "Image", widget: "image" } }
  - { name: status, label: "Status", widget: "select", options: ["draft", "published", "archived"] }
```

## 6. Future Enhancements

- AI-powered photo tagging and categorization via serverless functions
- Client self-service portal for booking sessions, viewing invoices, and downloading galleries
- Mobile-optimized PWA experience for on-the-go access
- CRM analytics dashboard to track client lifetime value and revenue trends

