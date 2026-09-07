CREATE TABLE public.patients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  age integer,
  gender text,
  blood_group text,
  medical_history text,
  allergies text[],
  chronic_conditions text[],
  current_medications text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX patients_user_id_key ON public.patients(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients manage their own record"
ON public.patients FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Doctors can view their patients records"
ON public.patients FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.appointments a
  WHERE a.patient_id = public.patients.user_id
    AND a.doctor_id = public.current_doctor_id()
));

CREATE POLICY "Admins can view all patient records"
ON public.patients FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();