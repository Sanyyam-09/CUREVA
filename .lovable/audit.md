# Button & Action Audit — Cureva

Audit date: 2026-06-13. Every interactive surface in the app was checked against the live Supabase schema (21 tables, 2 storage buckets, `chat` edge function). For each button we list: the table/function it calls, and the final loading / success / error state (after this pass).

Legend: ✅ already had full states · 🛠 added in this pass · ➖ pure navigation, no state needed

---

## Auth pages

| Page | Button | Backend | Loading | Success | Error |
|---|---|---|---|---|---|
| Login | Sign In | `supabase.auth.signInWithPassword` | ✅ "Signing in..." | ✅ toast + redirect | ✅ toast |
| Login | Continue with Google / Apple | `lovable.auth.signInWithOAuth` | 🛠 "Connecting…" + disabled | ➖ redirect | ✅ toast |
| Register | Create Account | `supabase.auth.signUp` | ✅ button disabled | ✅ alert + toast | ✅ alert (incl. `user_already_exists`) |
| Register | Resend confirmation | `supabase.auth.resend` | ✅ disabled + label | ✅ alert | ✅ alert |
| Register | Continue with Google | `lovable.auth.signInWithOAuth` | ✅ disabled | ➖ redirect | ✅ toast |
| ForgotPassword | Send Reset Link | `supabase.auth.resetPasswordForEmail` | ✅ "Sending..." | ✅ in-card confirmation | ✅ toast |
| ForgotPassword | Send again | local state | ➖ | ➖ | ➖ |
| ResetPassword | Update Password | `supabase.auth.updateUser` | ✅ "Updating..." | ✅ toast + redirect | ✅ toast |
| AdminLogin | Sign In as Admin | `supabase.auth.signInWithPassword` | ✅ "Authenticating..." | ✅ toast + redirect | ✅ toast |
| DoctorRegister | Register as Doctor | `auth.signUp` + insert `doctors` + insert `user_roles` | ✅ "Submitting..." | ✅ toast | 🛠 now surfaces doctor-profile + role-insert errors (previously swallowed) |

## Navbar / global

| Button | Backend | States |
|---|---|---|
| Sign out (desktop + mobile) | `supabase.auth.signOut` | 🛠 added loading + success/error toast |
| SOS button | navigation | ➖ |
| FloatingSOSButton | `tel:112` | ➖ |
| LanguageSelector | local context | ➖ |
| ThemeToggle | local context | ➖ |
| SmartSearchBar (Cmd+K) | client-side index | ➖ |
| Avatar → /dashboard/profile | navigation | ➖ |

## Dashboard (patient)

| Button | Backend | States |
|---|---|---|
| Quick action cards (Upload, Find, Video, Book) | router navigation | ➖ |
| Dashboard data tiles | `profiles`, `appointments`, `medical_records` (read) | ✅ loaded silently on mount |

## PatientProfile

| Button | Backend | States |
|---|---|---|
| Save Changes | `profiles` update | ✅ Loader2 + toast |
| Change Photo / camera overlay | storage `avatars` + `profiles` update | ✅ "Uploading..." + toast |
| Add allergy / remove allergy | local state | ➖ |

## MedicalRecords

| Button | Backend | States |
|---|---|---|
| Choose Files / upload | storage `medical-records` + `medical_records` insert | ✅ "Loading..." + toast |
| View | storage `createSignedUrl` | 🛠 per-row spinner + error toast |
| Delete | storage remove + `medical_records` delete | 🛠 confirm() + per-row spinner + error toast |

## DoctorSearch

| Button | Backend | States |
|---|---|---|
| Search / filter | client filter on `doctors` | 🛠 added "Loading doctors…" + empty state |
| Book Appointment | navigate `/book-appointment?doctor={id}` | 🛠 now preselects the doctor |
| Video | navigate | ➖ |
| Reviews → Open | `doctor_reviews` select | 🛠 error toast on failure |
| Submit Review | `doctor_reviews` insert | 🛠 disabled + "Submitting..." + validation |

## BookAppointment

| Button | Backend | States |
|---|---|---|
| Confirm Booking | `appointments` insert | 🛠 disabled + Loader2 + toast on both paths |
| Time slot chips | local state | ➖ |
| Cancel appointment | `appointments` update status=cancelled | 🛠 per-row spinner + error toast |
| Reschedule | `appointments` update status=rescheduled | 🛠 awaits update + toasts on success/failure |

## DoctorDashboard

| Button | Backend | States |
|---|---|---|
| Mark Done | `appointments` update status=completed | ✅ toast |
| Cancel (doctor) | `appointments` update status=cancelled | ✅ toast |

## VideoConsultation

| Button | Backend | States |
|---|---|---|
| Join call | `video_consultations` insert + opens Jitsi iframe | 🛠 per-row "Joining..." spinner + error toast |
| End call | `video_consultations` update ended_at | 🛠 success/error toast |
| Sign in (gate) | navigate | ➖ |
| Book an appointment (empty state) | navigate | ➖ |

## Pharmacy

| Button | Backend | States |
|---|---|---|
| Add to Cart / +/− | local cart in localStorage | ✅ stock toast on overflow |
| Cart → Checkout | gate via auth | ✅ |
| Place order | `pharmacy_orders` + `pharmacy_order_items` + `notifications` insert | ✅ Loader2 + toast + chained error handling |
| Cancel checkout | close dialog | ➖ |

## LabTests

| Button | Backend | States |
|---|---|---|
| Home / Lab visit (open dialog) | gate via auth | ✅ toast + redirect if guest |
| Confirm booking | `lab_bookings` insert + `notifications` insert | ✅ Loader2 + toast |

## HealthAwareness

| Button | Backend | States |
|---|---|---|
| Article card → open dialog | `health_articles` read | ✅ list-level Loader2 + toast on load error |
| Category filter chips | local state | ➖ |

## SymptomChecker / AIChatbot

| Button | Backend | States |
|---|---|---|
| Send / Enter | `POST /functions/v1/chat` (streaming) | ✅ disabled while loading + typing dots + error bubble |
| Mic toggle | Web Speech API | ✅ icon swap |
| Speaker | speechSynthesis | ➖ |
| Find Doctor (after answer) | navigate `/doctors` | ➖ |

## EmergencySOS

| Button | Backend | States |
|---|---|---|
| SOS press | `sos_events` insert + geolocation | 🛠 success toast + geolocation-failure toast |
| Cancel SOS | `sos_events` update status=cancelled | 🛠 spinner + toast (previously only reset local state) |
| Call 112 | `tel:` link | ➖ |

## GovernmentSchemes

All buttons are external links or filters — no mutations. Visit Website opens in a new tab. ✅

## HospitalPricing

| Button | Backend | States |
|---|---|---|
| View Price Breakup & Rooms | local expand | ➖ |
| Reads: `hospitals`, `hospital_rooms`, `procedure_pricing` | ✅ |

## AdminDashboard / ResourceManager (Doctors, Hospitals, Schemes, NGOs, Medicines, Lab Tests, Articles, Procedure Pricing)

| Button | Backend | States |
|---|---|---|
| + Add | insert into target table | ✅ Loader2 + toast |
| Edit (row) | update into target table | ✅ Loader2 + toast |
| Delete (row) | delete from target table | ✅ AlertDialog confirm + toast |

---

## Summary of changes in this pass

- **Loading state added** to: DoctorSearch (grid + review submit), BookAppointment (confirm, cancel, reschedule), VideoConsultation (join), MedicalRecords (view, delete), Login (social), Navbar (sign out).
- **Error surfacing added** to: DoctorRegister (silent inserts), EmergencySOS (silent log), VideoConsultation (join + end), MedicalRecords (view + delete), Navbar sign-out.
- **Success toasts added** to: BookAppointment (confirm with date/time), EmergencySOS (trigger + cancel), Navbar sign-out, VideoConsultation join/end.
- **UX flow fixes**: DoctorSearch "Book" now deep-links to `?doctor=` and BookAppointment auto-selects it. MedicalRecords delete now requires confirmation.

## Out of scope / not touched

- `chat` edge function streaming already has full UI states.
- Pure navigation links (Navbar feature strip, Footer, Dashboard quick actions, GovernmentSchemes external links) — no states needed.
- Read-only dashboards (HospitalPricing, GovernmentSchemes, HealthAwareness list) — load errors already toasted.
