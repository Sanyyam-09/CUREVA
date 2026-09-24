INSERT INTO public.doctor_slots (doctor_id, slot_date, time_slot)
SELECT d.id, (current_date + g)::date, t
FROM (SELECT id FROM public.doctors ORDER BY rating DESC NULLS LAST LIMIT 3) d
CROSS JOIN generate_series(1,3) g
CROSS JOIN unnest(ARRAY['10:00 AM','11:30 AM','04:00 PM']) t
ON CONFLICT DO NOTHING;