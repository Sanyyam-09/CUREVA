-- 1. Facility detail columns
ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS facility_type text NOT NULL DEFAULT 'hospital',
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS pin_code text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS map_url text;

-- 2. Link doctors to auth users
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS doctors_user_id_key ON public.doctors(user_id) WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_doctor_owner(_doctor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.doctors WHERE id = _doctor_id AND user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.current_doctor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.doctors WHERE user_id = auth.uid() LIMIT 1
$$;

DROP POLICY IF EXISTS "Doctors can update own doctor profile" ON public.doctors;
CREATE POLICY "Doctors can update own doctor profile"
ON public.doctors FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. Doctors access to their appointments
DROP POLICY IF EXISTS "Doctors can view own appointments" ON public.appointments;
CREATE POLICY "Doctors can view own appointments"
ON public.appointments FOR SELECT TO authenticated
USING (public.is_doctor_owner(doctor_id));

DROP POLICY IF EXISTS "Doctors can update own appointments" ON public.appointments;
CREATE POLICY "Doctors can update own appointments"
ON public.appointments FOR UPDATE TO authenticated
USING (public.is_doctor_owner(doctor_id)) WITH CHECK (public.is_doctor_owner(doctor_id));

-- 4. Doctors can read profiles of their patients
DROP POLICY IF EXISTS "Doctors can view their patients profiles" ON public.profiles;
CREATE POLICY "Doctors can view their patients profiles"
ON public.profiles FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.appointments a
  WHERE a.patient_id = profiles.user_id
    AND public.is_doctor_owner(a.doctor_id)
));

-- 5. Doctor availability slots
CREATE TABLE IF NOT EXISTS public.doctor_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  slot_date date NOT NULL,
  time_slot text NOT NULL,
  is_booked boolean NOT NULL DEFAULT false,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, slot_date, time_slot)
);

GRANT SELECT ON public.doctor_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_slots TO authenticated;
GRANT ALL ON public.doctor_slots TO service_role;

ALTER TABLE public.doctor_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Slots are publicly readable"
ON public.doctor_slots FOR SELECT USING (true);

CREATE POLICY "Doctors manage own slots"
ON public.doctor_slots FOR ALL TO authenticated
USING (public.is_doctor_owner(doctor_id)) WITH CHECK (public.is_doctor_owner(doctor_id));

CREATE POLICY "Admins manage slots"
ON public.doctor_slots FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_doctor_slots_updated
BEFORE UPDATE ON public.doctor_slots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();