# Bolide workspace standard

The current CRM and Township Prospector source, rather than their initial branding alone, defines this interaction baseline.

| Reference inspected | Pattern adopted in EPC |
|---|---|
| CRM `src/components/Layout.tsx` | Fixed-height application shell, header outside the scrolling workspace, online/offline notice, persistent compact navigation |
| CRM `src/components/TopBar.tsx` | Workspace search, click-open account control, profile/password form and theme control |
| CRM `src/pages/Deals.tsx` | Fixed page controls, scrollable table body, 25/50/100 row pages and separate pagination |
| Prospector `src/routes/_authenticated/index.tsx` | Viewport-contained work areas and independent table scrolling |
| Prospector `LeadsTable.tsx` | Sticky column labels with solid backgrounds, horizontal table overflow and pagination |
| Prospector `AppHeader.tsx`, `ProspectorSidebar.tsx` | Compact/full sidebar, mobile drawer, product identity and links between Bolide tools |
| Prospector `src/styles.css` | Public Sans body, Archivo display typography and Bolide magenta/orange/plum colour family |

EPC now keeps the product header and page heading stationary, with one scrollable content region. In Properties, the toolbar and pagination also remain stationary; only the table rows scroll vertically/horizontally. The energy ledger has its own bounded scroll area and sticky labels. Print styles remove these bounds so reports do not truncate to a viewport.

Public Sans and Archivo variable fonts are bundled locally under `assets/fonts/`, with their SIL Open Font Licenses from the Google Fonts repository. Body text uses a stronger base weight; headings and key figures use Archivo 750; table labels use 750. Important data does not rely on 8–9 px pale text. Fonts load from the application itself, without Google requests or tracking. Familiar structure, contrast, restrained colour and clear information hierarchy are the durable design principles; no promise is made that a visual style will remain unchanged for a century.

The account menu changes only the signed-in user's details. Password changes require the current password and invalidate other sessions. Organisation roles and tenant isolation remain server-enforced. Offline notices do not claim edits are queued or persisted locally; users must reconnect before saving.

CSV/Excel import is the primary intake action; manual entry remains available. API integrations are a later capability, not a prerequisite for clients with older systems.

Desktop/navigation and colour parity (9 November 2026): re-read CRM TopBar/Sidebar/index.css and Prospector AppHeader/ProspectorSidebar/styles.css. Desktop at 1024px and above uses the same Lucide PanelLeftClose/PanelLeftOpen geometry and Hide/Show menu names actions; below 1024px uses the hamburger drawer. Compact navigation persists independently of screen size. Drawer links close the menu even when the current section is selected, and closed drawers are inert.

The actual shared faviconbolide.png B mark is used for compact identity. Light/dark surfaces, text, borders, fields, tables, dialogs and status treatments follow the CRM plum and Prospector warm-light palette; the primary gradient retains Bolide magenta/orange. Logos and energy-rating colours keep their intended artwork. The sun/moon action updates without rerendering the table. Appearance persists under bolide-epc:theme (migrating the old epc-theme value), honours the appearance-storage preference, and is applied before CSS paint. Lucide icon licence is retained under assets/icons/.
