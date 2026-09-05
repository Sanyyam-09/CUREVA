DROP POLICY IF EXISTS "Doctors can create own doctor profile" ON public.doctors;
CREATE POLICY "Doctors can create own doctor profile"
ON public.doctors FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());