DROP POLICY IF EXISTS "Doctors can view consults for own appointments" ON public.video_consultations;
CREATE POLICY "Doctors can view consults for own appointments"
ON public.video_consultations FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.appointments a
  WHERE a.id = video_consultations.appointment_id
    AND public.is_doctor_owner(a.doctor_id)
));