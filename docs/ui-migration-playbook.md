# UI Migration Playbook

This guide outlines how to roll out the Tabler-aligned system UI across the application using the shared primitives introduced in `src/ui`.

## 1. Wrap routes with `AppShell`

Every authenticated workspace screen should render within the `AppShell` exported from `@/ui`. The shell provides the shared top navigation, contextual sub-navigation, and footer. Pages can opt into custom slot content by passing `renderSearch` and `renderActions` callbacks.

```tsx
import { AppShell, PageHeader, PageBody } from '@/ui';

export default function ExamplePage() {
    return (
        <AppShell currentPath="/example">
            <PageHeader pretitle="Workspace" title="Example" />
            <PageBody>
                {/* page content */}
            </PageBody>
        </AppShell>
    );
}
```

*When migrating legacy pages that still wrap their own container markup, remove the Tabler `page` / `container-xl` scaffolding so layout padding is controlled by `PageBody`.*

## 2. Standardise page headers

Replace ad-hoc hero sections with the `PageHeader` component. It supports pretitles, action rows, and metadata summaries. For example:

```tsx
<PageHeader
    pretitle="Clients"
    title="Account overview"
    description="Track performance, billing health, and latest activity for each client."
    actions={[
        <Button key="new" icon="plus">New client</Button>,
        <Button key="export" variant="outline" icon="download">Export</Button>
    ]}
    meta={[
        { label: 'Active', value: '128' },
        { label: 'Outstanding', value: '$24,800' }
    ]}
/>
```

## 3. Swap structural wrappers

* Use `PageBody` (optionally combined with `Container`) to manage width.
* Use the `Grid` helper instead of manual `row`/`col` class combinations.
* Apply the `Card` primitives (`variant="stats" | "table" | "form" | "chart"`) to replace bespoke card markup.

## 4. Adopt shared utilities

* Icons: replace bespoke SVGs with the Tabler-backed `<Icon name="..." />` wrapper.
* Avatars, badges, chips, and dividers: use the primitives in `@/ui` for consistent spacing and radii.
* Stats and skeletons: use `<Stat />` and `<Skeleton variant="..." />` to align metric tiles and loading placeholders.

## 5. Navigation configuration

Primary and secondary navigation items live in `src/ui/app-shell/navigation.ts`. Extend the arrays when new modules ship, keeping icons within the `ICONS` map.

## 6. Accent + theme alignment

Accent switching should update the CSS variables defined in `src/css/main.css` (`--accent-*` and `--surface-*`). Legacy code that writes to `--tblr-*` tokens can be replaced with helpers that target the new variables.

## 7. QA checklist

1. Verify every page renders inside `AppShell` with the shared header/subnav/footer rhythm.
2. Confirm cards use the `Card` primitive and respect `--space-*` spacing.
3. Ensure icons are routed through the wrapper (lint rule optional).
4. Keyboard navigation (tab/arrow) across the top navigation and pills should follow the default focus order.
5. Run visual regression/screenshot tests after large migrations.

## 8. Rollout order

1. Convert the dashboard (`/crm`) because it already follows a card-first layout.
2. Migrate Settings to the two-column template (nav rail + content) using `Grid`.
3. Roll out to list/detail flows (Clients, Contacts, Projects, Galleries).
4. Replace remaining portal pages.

Track migrations by adding a checklist to the engineering board and linking to PRs that remove legacy Tabler wrappers.
