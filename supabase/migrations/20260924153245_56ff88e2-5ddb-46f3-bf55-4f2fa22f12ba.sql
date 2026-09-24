CREATE OR REPLACE FUNCTION public.sync_doctor_slot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status NOT IN ('cancelled','rescheduled') THEN
    UPDATE public.doctor_slots SET is_booked = true, appointment_id = NEW.id
    WHERE doctor_id = NEW.doctor_id AND slot_date = NEW.appointment_date AND time_slot = NEW.time_slot AND is_booked = false;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IN ('cancelled','rescheduled') AND OLD.status NOT IN ('cancelled','rescheduled') THEN
    UPDATE public.doctor_slots SET is_booked = false, appointment_id = NULL WHERE appointment_id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_doctor_slot() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_appointments_sync_slot AFTER INSERT OR UPDATE OF status ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.sync_doctor_slot();