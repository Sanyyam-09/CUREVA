## Goal
Audit the entire app, fill backend gaps, and make every button functional. Existing tables (profiles, doctors, hospitals, appointments, medical_records, schemes, etc.) stay; we add what's missing and wire what's static.

## 1. Database — new tables + seed (one migration)

New tables, all with RLS + GRANTs:

- `medicines` — name, generic_name, manufacturer, category, price_inr, mrp_inr, prescription_required, stock, image_url, description. Public read; admin write.
- `lab_tests` — name, category, description, price_inr, mrp_inr, preparation, report_time_hours, home_collection. Public read; admin write.
- `lab_bookings` — user_id, test_id, scheduled_at, address, status, total_inr. Owner CRUD.
- `pharmacy_orders` + `pharmacy_order_items` — user_id, status, total_inr, address, prescription_url; items: medicine_id, qty, price. Owner CRUD.
- `health_articles` — title, slug, excerpt, content, category, cover_url, author, published_at, read_minutes. Public read; admin write.
- `video_consultations` — appointment_id, room_url, started_at, ended_at, notes. Patient + doctor read; doctor write.
- `sos_events` — user_id, lat, lng, address, status, contacted_at. Owner CRUD; admin read.
- `notifications` — user_id, title, body, link, read_at. Owner CRUD.

Seed: ~25 medicines, ~20 lab tests, ~15 articles in Indian context (INR pricing).

## 2. Wire static pages

- **Pharmacy** → fetch `medicines`, search/filter, "Add to cart" (localStorage cart), checkout creates `pharmacy_orders`.
- **LabTests** → fetch `lab_tests`, "Book test" → modal → inserts `lab_bookings`.
- **HealthAwareness** → fetch `health_articles`, category filter, article detail dialog.
- **VideoConsultation** → list user's upcoming appointments, "Join call" opens a Jitsi room (`https://meet.jit.si/cureva-<appointmentId>`), logs `video_consultations`.
- **EmergencySOS** → "Call 112" tel link + insert `sos_events` with geolocation.
- **SymptomChecker** → already uses AI; ensure "Find doctor for X" deep-links into `/doctors?specialty=...`.

## 3. Wire buttons audited across app

- Navbar/Footer: ensure every link routes (logout, profile, dashboard tiles).
- HomePage feature cards → real routes.
- DoctorSearch "Book" → `/book-appointment?doctorId=...` (already exists; verify).
- Dashboard tiles → real pages.
- PatientProfile "Save" / avatar upload — already works; verify.
- MedicalRecords upload/delete/view — already works; verify.
- AIChatbot send/voice — already works; verify.
- Notifications bell (new) → dropdown reading `notifications`.

## 4. Admin dashboard — full CRUD

Tabs in `AdminDashboard.tsx` (admin-only, guarded by `has_role('admin')`):

- Doctors, Hospitals, Procedure Pricing, Government Schemes, NGO Services, Medicines, Lab Tests, Health Articles, Users (view + role assign), Appointments (view).

Each tab: table list + add/edit dialog + delete confirm, using shadcn `Table` + `Dialog` + `Form` (zod).

## 5. RLS patterns

- Public-read tables (medicines, lab_tests, articles, doctors, hospitals, schemes, ngo): `GRANT SELECT TO anon, authenticated`; admin write via `has_role(auth.uid(),'admin')`.
- User-owned tables (orders, bookings, sos, notifications, video_consultations): `authenticated` only, owner-scoped policies.
- Admin override policy on every table for full management.

## 6. Technical details

- Cart: `localStorage` key `cureva_cart` — array of `{medicineId, qty}`. Checkout transforms into order + items.
- Geolocation for SOS: `navigator.geolocation.getCurrentPosition`, reverse geocode skipped (store lat/lng only).
- Video: Jitsi embed via iframe — no API key needed.
- Article body: stored as markdown, rendered with `react-markdown` (add dep).
- Toasts via existing `useToast`.
- All new pages use existing design tokens.

## 7. Out of scope (this pass)

- Real payment gateway for pharmacy/lab orders (orders go to `pending` status — stub).
- Doctor-side video controls beyond room join.
- Push notifications (only in-app).

## Order of work

1. Migration (tables + RLS + seed).
2. Regenerate types, then build admin CRUD + new pages + button wiring in parallel.
3. Smoke-test critical flows (register → book lab test → pharmacy order → SOS).
