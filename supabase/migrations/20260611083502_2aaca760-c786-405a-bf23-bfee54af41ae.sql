
-- =========================================================
-- MEDICINES
-- =========================================================
CREATE TABLE public.medicines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  generic_name text,
  manufacturer text,
  category text NOT NULL,
  price_inr numeric(10,2) NOT NULL,
  mrp_inr numeric(10,2) NOT NULL,
  prescription_required boolean NOT NULL DEFAULT false,
  stock integer NOT NULL DEFAULT 0,
  image_url text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.medicines TO anon, authenticated;
GRANT ALL ON public.medicines TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.medicines TO authenticated;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Medicines public read" ON public.medicines FOR SELECT USING (true);
CREATE POLICY "Admins manage medicines" ON public.medicines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- LAB TESTS
-- =========================================================
CREATE TABLE public.lab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  description text,
  price_inr numeric(10,2) NOT NULL,
  mrp_inr numeric(10,2) NOT NULL,
  preparation text,
  report_time_hours integer NOT NULL DEFAULT 24,
  home_collection boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lab_tests TO anon, authenticated;
GRANT ALL ON public.lab_tests TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.lab_tests TO authenticated;
ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab tests public read" ON public.lab_tests FOR SELECT USING (true);
CREATE POLICY "Admins manage lab tests" ON public.lab_tests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- LAB BOOKINGS
-- =========================================================
CREATE TABLE public.lab_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.lab_tests(id) ON DELETE RESTRICT,
  scheduled_at timestamptz NOT NULL,
  address text NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'pending',
  total_inr numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_bookings TO authenticated;
GRANT ALL ON public.lab_bookings TO service_role;
ALTER TABLE public.lab_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages lab bookings" ON public.lab_bookings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read lab bookings" ON public.lab_bookings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- PHARMACY ORDERS + ITEMS
-- =========================================================
CREATE TABLE public.pharmacy_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  total_inr numeric(10,2) NOT NULL,
  address text NOT NULL,
  phone text,
  prescription_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_orders TO authenticated;
GRANT ALL ON public.pharmacy_orders TO service_role;
ALTER TABLE public.pharmacy_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages pharmacy orders" ON public.pharmacy_orders FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read pharmacy orders" ON public.pharmacy_orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.pharmacy_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.pharmacy_orders(id) ON DELETE CASCADE,
  medicine_id uuid NOT NULL REFERENCES public.medicines(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  price_inr numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_order_items TO authenticated;
GRANT ALL ON public.pharmacy_order_items TO service_role;
ALTER TABLE public.pharmacy_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages order items" ON public.pharmacy_order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pharmacy_orders o WHERE o.id = order_id AND o.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pharmacy_orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- =========================================================
-- HEALTH ARTICLES
-- =========================================================
CREATE TABLE public.health_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text NOT NULL,
  category text NOT NULL,
  cover_url text,
  author text DEFAULT 'Cureva Health Team',
  published_at timestamptz NOT NULL DEFAULT now(),
  read_minutes integer NOT NULL DEFAULT 3,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.health_articles TO anon, authenticated;
GRANT ALL ON public.health_articles TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.health_articles TO authenticated;
ALTER TABLE public.health_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Articles public read" ON public.health_articles FOR SELECT USING (is_published = true);
CREATE POLICY "Admins manage articles" ON public.health_articles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- VIDEO CONSULTATIONS
-- =========================================================
CREATE TABLE public.video_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_url text NOT NULL,
  started_at timestamptz,
  ended_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_consultations TO authenticated;
GRANT ALL ON public.video_consultations TO service_role;
ALTER TABLE public.video_consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages video consults" ON public.video_consultations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- SOS EVENTS
-- =========================================================
CREATE TABLE public.sos_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  lat numeric(9,6),
  lng numeric(9,6),
  address text,
  status text NOT NULL DEFAULT 'triggered',
  contacted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sos_events TO authenticated;
GRANT INSERT ON public.sos_events TO anon;
GRANT ALL ON public.sos_events TO service_role;
ALTER TABLE public.sos_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create SOS" ON public.sos_events FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Owner reads own SOS" ON public.sos_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins read all SOS" ON public.sos_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages notifications" ON public.notifications FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- Updated-at triggers (function already exists)
-- =========================================================
CREATE TRIGGER trg_medicines_updated BEFORE UPDATE ON public.medicines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lab_tests_updated BEFORE UPDATE ON public.lab_tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lab_bookings_updated BEFORE UPDATE ON public.lab_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pharmacy_orders_updated BEFORE UPDATE ON public.pharmacy_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_articles_updated BEFORE UPDATE ON public.health_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- SEED DATA — Medicines (Indian context, INR)
-- =========================================================
INSERT INTO public.medicines (name, generic_name, manufacturer, category, price_inr, mrp_inr, prescription_required, stock, description) VALUES
('Crocin Advance 500mg', 'Paracetamol', 'GSK', 'Pain Relief', 32.00, 36.00, false, 500, 'Fast relief from fever and pain. Strip of 15 tablets.'),
('Dolo 650', 'Paracetamol 650mg', 'Micro Labs', 'Pain Relief', 30.00, 34.00, false, 800, 'Effective for fever, headache and body pain.'),
('Combiflam', 'Ibuprofen + Paracetamol', 'Sanofi', 'Pain Relief', 38.00, 45.00, false, 400, 'For pain, inflammation and fever.'),
('Azithral 500', 'Azithromycin 500mg', 'Alembic', 'Antibiotic', 95.00, 110.00, true, 200, 'Broad spectrum antibiotic — strip of 3.'),
('Augmentin 625 Duo', 'Amoxicillin + Clavulanate', 'GSK', 'Antibiotic', 195.00, 220.00, true, 150, 'Bacterial infections — strip of 10.'),
('Cetirizine 10mg', 'Cetirizine', 'Cipla', 'Allergy', 18.00, 22.00, false, 600, 'Allergy relief — strip of 10.'),
('Allegra 120mg', 'Fexofenadine', 'Sanofi', 'Allergy', 145.00, 165.00, false, 300, 'Non-drowsy allergy relief.'),
('Pantop 40', 'Pantoprazole 40mg', 'Aristo', 'Gastric', 75.00, 90.00, false, 450, 'Acidity and gastric ulcers.'),
('Eno Lemon', 'Sodium Bicarbonate', 'GSK', 'Gastric', 5.00, 6.00, false, 1500, 'Fast acidity relief sachet.'),
('Glycomet 500', 'Metformin 500mg', 'USV', 'Diabetes', 22.00, 27.00, true, 700, 'Type 2 diabetes management.'),
('Telma 40', 'Telmisartan 40mg', 'Glenmark', 'Hypertension', 95.00, 110.00, true, 350, 'Blood pressure control.'),
('Ecosprin 75', 'Aspirin 75mg', 'USV', 'Cardiac', 12.00, 15.00, true, 900, 'Low-dose aspirin for heart health.'),
('Shelcal 500', 'Calcium + Vit D3', 'Torrent', 'Supplement', 145.00, 165.00, false, 500, 'Bone health supplement.'),
('Becosules', 'Vitamin B-Complex', 'Pfizer', 'Supplement', 38.00, 45.00, false, 600, 'Vitamin B complex capsules.'),
('Limcee 500', 'Vitamin C', 'Abbott', 'Supplement', 32.00, 38.00, false, 800, 'Vitamin C chewable tablets.'),
('Zincovit', 'Multivitamin + Zinc', 'Apex', 'Supplement', 110.00, 125.00, false, 450, 'Daily multivitamin.'),
('Volini Spray', 'Diclofenac Spray', 'Sun Pharma', 'Topical', 195.00, 220.00, false, 300, 'Pain relief spray 60g.'),
('Moov Cream', 'Methyl Salicylate', 'RB', 'Topical', 95.00, 110.00, false, 400, 'Muscle pain relief cream.'),
('Vicks VapoRub', 'Camphor + Menthol', 'P&G', 'Cold & Flu', 145.00, 165.00, false, 600, 'Cold and congestion relief 50g.'),
('Benadryl Syrup', 'Diphenhydramine', 'J&J', 'Cold & Flu', 125.00, 145.00, false, 350, 'Cough syrup 150ml.'),
('Hansaplast', 'Adhesive Bandage', 'Beiersdorf', 'First Aid', 65.00, 75.00, false, 1000, 'Pack of 20 bandages.'),
('Dettol Antiseptic', 'Chloroxylenol', 'RB', 'First Aid', 195.00, 220.00, false, 500, 'Antiseptic liquid 250ml.'),
('ORS Powder', 'Oral Rehydration Salts', 'FDC', 'First Aid', 22.00, 25.00, false, 800, 'Rehydration sachet 21g.'),
('Thyronorm 50mcg', 'Thyroxine', 'Abbott', 'Hormonal', 145.00, 165.00, true, 400, 'Hypothyroidism management.'),
('Sinarest', 'Paracetamol + CPM + Phenyl.', 'Centaur', 'Cold & Flu', 68.00, 78.00, false, 600, 'Cold and flu relief.');

-- =========================================================
-- SEED DATA — Lab Tests
-- =========================================================
INSERT INTO public.lab_tests (name, category, description, price_inr, mrp_inr, preparation, report_time_hours, home_collection) VALUES
('Complete Blood Count (CBC)', 'Hematology', 'Measures RBC, WBC, platelets and hemoglobin levels.', 299.00, 450.00, 'No fasting required.', 12, true),
('Fasting Blood Sugar', 'Diabetes', 'Measures blood glucose after 8-12 hours of fasting.', 99.00, 180.00, '8-12 hours fasting required.', 6, true),
('HbA1c (Glycated Hemoglobin)', 'Diabetes', '3-month average blood sugar level.', 449.00, 700.00, 'No fasting required.', 24, true),
('Lipid Profile', 'Cardiac', 'Cholesterol, HDL, LDL, triglycerides.', 499.00, 800.00, '12 hours fasting required.', 24, true),
('Liver Function Test (LFT)', 'Liver', 'SGOT, SGPT, bilirubin, albumin and more.', 549.00, 900.00, 'No fasting required.', 24, true),
('Kidney Function Test (KFT)', 'Renal', 'Urea, creatinine, uric acid, BUN.', 549.00, 900.00, 'No fasting required.', 24, true),
('Thyroid Profile (T3, T4, TSH)', 'Endocrine', 'Complete thyroid function evaluation.', 449.00, 750.00, 'No fasting required.', 24, true),
('Vitamin D (25-OH)', 'Nutrition', 'Vitamin D deficiency screening.', 999.00, 1500.00, 'No fasting required.', 48, true),
('Vitamin B12', 'Nutrition', 'B12 deficiency check.', 699.00, 1100.00, 'No fasting required.', 24, true),
('Urine Routine & Microscopy', 'Pathology', 'Basic urine analysis.', 149.00, 250.00, 'Morning sample preferred.', 12, true),
('Dengue NS1 Antigen', 'Infection', 'Early dengue detection.', 599.00, 950.00, 'No fasting required.', 24, true),
('Typhidot IgM (Typhoid)', 'Infection', 'Rapid typhoid screening.', 449.00, 700.00, 'No fasting required.', 24, true),
('Malaria Antigen', 'Infection', 'Rapid malaria detection.', 299.00, 500.00, 'No fasting required.', 6, true),
('COVID-19 RT-PCR', 'Infection', 'Gold standard COVID test.', 499.00, 800.00, 'Nasal/throat swab.', 24, true),
('CRP (C-Reactive Protein)', 'Inflammation', 'Inflammation marker test.', 349.00, 600.00, 'No fasting required.', 24, true),
('ECG', 'Cardiac', '12-lead electrocardiogram.', 299.00, 500.00, 'No preparation.', 2, false),
('Pap Smear', 'Womens Health', 'Cervical cancer screening.', 799.00, 1200.00, 'Avoid during menstruation.', 72, false),
('PSA (Prostate)', 'Mens Health', 'Prostate cancer screening.', 599.00, 900.00, 'No fasting required.', 24, true),
('Full Body Checkup — Basic', 'Health Packages', '40+ parameters including CBC, lipid, sugar, KFT, LFT, urine.', 1499.00, 3500.00, '12 hours fasting required.', 24, true),
('Full Body Checkup — Advanced', 'Health Packages', '70+ parameters including thyroid, vitamins, cardiac markers.', 2999.00, 6000.00, '12 hours fasting required.', 24, true);

-- =========================================================
-- SEED DATA — Health Articles
-- =========================================================
INSERT INTO public.health_articles (title, slug, excerpt, content, category, author, read_minutes) VALUES
('Managing Diabetes in India: A Practical Guide', 'managing-diabetes-india',
 'Diet, exercise and medication strategies tailored for Indian lifestyles.',
 E'## Understanding Type 2 Diabetes\n\nIndia has over 100 million people living with diabetes. Managing it well prevents complications.\n\n### Diet tips\n- Replace white rice with brown rice or millets (ragi, jowar)\n- Eat 5 portions of vegetables daily\n- Avoid sugary drinks and sweets\n\n### Exercise\n30 minutes of brisk walking daily reduces HbA1c by up to 0.7%.\n\n### Medication\nNever skip prescribed metformin or insulin. Consult your doctor before any change.',
 'Chronic Diseases', 'Dr. Anjali Sharma', 5),
('Monsoon Health: Avoiding Dengue and Malaria', 'monsoon-health-dengue-malaria',
 'Protect your family from vector-borne diseases this monsoon.',
 E'## Why monsoon is risky\n\nStagnant water breeds Aedes (dengue) and Anopheles (malaria) mosquitoes.\n\n### Prevention\n- Empty all standing water around home weekly\n- Use mosquito nets and repellents\n- Wear full-sleeve clothes at dawn and dusk\n\n### Warning signs\nHigh fever + body ache + rash → get a dengue NS1 test immediately.',
 'Preventive Care', 'Dr. Rakesh Verma', 4),
('Hypertension: The Silent Killer', 'hypertension-silent-killer',
 'Blood pressure above 140/90 needs attention — even without symptoms.',
 E'## What is hypertension?\n\nConsistently high BP damages arteries, heart, kidneys and brain.\n\n### Lifestyle changes\n- Cut salt to under 5g/day\n- Lose weight if BMI > 25\n- Walk 30 min, 5 days/week\n- Limit alcohol, quit tobacco\n\n### When to see a doctor\nIf home readings are >140/90 on three occasions.',
 'Chronic Diseases', 'Dr. Suresh Iyer', 4),
('Women''s Health: Iron Deficiency Anemia', 'iron-deficiency-anemia-women',
 'Over 50% of Indian women have anemia. Here is what to do.',
 E'## Why it matters\n\nAnemia causes fatigue, poor immunity and pregnancy complications.\n\n### Iron-rich foods\n- Spinach, drumstick leaves, jaggery\n- Dates, raisins, ragi\n- Eggs, chicken liver (non-veg)\n\n### Supplements\nFollow doctor''s advice — excess iron is harmful.',
 'Womens Health', 'Dr. Meera Joshi', 4),
('Mental Health: Recognising Depression', 'recognising-depression',
 'Sadness lasting >2 weeks with sleep/appetite changes needs help.',
 E'## Common signs\n- Persistent low mood\n- Loss of interest in activities\n- Sleep and appetite changes\n- Thoughts of self-harm\n\n### Get help\nCall iCall (9152987821) or NIMHANS helpline (080-46110007). Speak to a doctor or psychologist.',
 'Mental Health', 'Dr. Priya Nair', 5),
('Childhood Vaccination Schedule in India', 'childhood-vaccination-schedule',
 'Full IAP-recommended immunization timeline for 0-5 years.',
 E'## Birth\nBCG, OPV-0, Hep B-1\n\n## 6 weeks\nDTwP-1, IPV-1, Hep B-2, Hib-1, Rotavirus-1, PCV-1\n\n## 10 weeks\nRepeat doses\n\n## 14 weeks\nRepeat doses + IPV-2\n\n## 9 months\nMMR-1, Typhoid conjugate\n\n## 15-18 months\nMMR-2, Booster doses\n\nFree under India''s Universal Immunisation Programme.',
 'Children', 'Dr. Ramesh Kumar', 6),
('Heart Attack Warning Signs', 'heart-attack-warning-signs',
 'Recognise and act fast — every minute matters.',
 E'## Symptoms\n- Chest pressure or squeezing\n- Pain spreading to left arm/jaw\n- Cold sweat, nausea\n- Shortness of breath\n\n### Act\nCall ambulance (108) immediately. Chew an aspirin if not allergic. Do not drive yourself.',
 'Cardiac', 'Dr. Vivek Mehta', 3),
('Healthy Indian Breakfast Ideas', 'healthy-indian-breakfast',
 'Power up your morning the desi way.',
 E'## Options\n- Vegetable upma with peanuts\n- Moong dal chilla with mint chutney\n- Ragi dosa\n- Poha with sprouts\n- Oats idli\n\nAvoid: maida-heavy items, sugary cereals, fried snacks.',
 'Nutrition', 'Dr. Kavitha Reddy', 3),
('Yoga for Back Pain', 'yoga-for-back-pain',
 '5 asanas that strengthen your spine.',
 E'## Daily routine\n1. Bhujangasana (cobra) — 30s × 3\n2. Marjariasana (cat-cow) — 10 reps\n3. Setu Bandhasana (bridge) — 30s × 3\n4. Balasana (child pose) — 1 min\n5. Shavasana — 5 min\n\nStop if pain worsens — see a physiotherapist.',
 'Fitness', 'Yoga Acharya Ravi Shankar', 4),
('Ayushman Bharat: Free Healthcare for Eligible Families', 'ayushman-bharat-guide',
 'Up to ₹5 lakh per year — check if you qualify.',
 E'## What is PM-JAY?\n\nFree secondary and tertiary hospital care for low-income families.\n\n### Eligibility\nListed in SECC 2011 database (rural/urban deprivation criteria).\n\n### How to use\n1. Check eligibility at pmjay.gov.in\n2. Get Ayushman card from CSC or empanelled hospital\n3. Show card at any empanelled hospital for cashless treatment',
 'Schemes', 'Cureva Health Team', 4),
('Healthy Pregnancy: First Trimester Care', 'pregnancy-first-trimester',
 'Nutrition, tests and dos & don''ts for weeks 1-12.',
 E'## Tests to do\n- Beta hCG, blood group, CBC, TSH, HIV, Hep B\n- First ultrasound at 6-8 weeks\n\n### Nutrition\n- Folic acid 400mcg/day (start before conception if possible)\n- Iron + calcium as prescribed\n- Avoid raw meat, unpasteurised milk, alcohol, tobacco\n\n### Warning signs\nBleeding, severe abdominal pain → go to hospital.',
 'Womens Health', 'Dr. Sunita Bansal', 5),
('Asthma Action Plan', 'asthma-action-plan',
 'Use this 3-zone system to manage flare-ups.',
 E'## Green zone (good)\nNo symptoms. Continue controller inhaler.\n\n## Yellow zone (caution)\nCough, mild wheeze. Add reliever inhaler (salbutamol) and call doctor.\n\n## Red zone (danger)\nSevere breathlessness, blue lips → use reliever and rush to ER (108).',
 'Respiratory', 'Dr. Anil Khanna', 4),
('Eye Care for Screen Users', 'eye-care-screen-users',
 'Reduce digital eye strain with these simple habits.',
 E'## The 20-20-20 rule\nEvery 20 minutes, look 20 feet away for 20 seconds.\n\n### Other tips\n- Blink consciously\n- Use anti-glare screen\n- Maintain 50-70cm distance\n- Annual eye check-up',
 'Preventive Care', 'Dr. Reena Kapoor', 3),
('Knee Pain in Older Adults', 'knee-pain-older-adults',
 'Causes, exercises and when surgery is needed.',
 E'## Common causes\n- Osteoarthritis (most common)\n- Meniscal tear\n- Ligament injury\n\n### Home care\n- Quad strengthening exercises\n- Weight loss (each kg lost = 4kg less knee load)\n- Hot/cold packs\n\n### See orthopedic if\nPain at rest, locking, swelling > 1 week.',
 'Bone & Joint', 'Dr. Harish Patel', 5),
('Quitting Tobacco: A Step-by-Step Plan', 'quitting-tobacco-plan',
 'Tobacco causes 1.35 million deaths in India yearly. You can quit.',
 E'## Plan\n1. Set a quit date within 2 weeks\n2. Tell family/friends\n3. Remove all tobacco from home\n4. Consider nicotine replacement (gum/patch)\n5. Call helpline 1800-11-2356\n\n### Benefits\n- 20 min: heart rate normalises\n- 1 year: heart attack risk halved\n- 10 years: lung cancer risk halved',
 'Preventive Care', 'Dr. Ajay Singh', 4);
