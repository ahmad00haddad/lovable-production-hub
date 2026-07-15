
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  avatar_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO anon, authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw team_members" ON public.team_members FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  title text NOT NULL,
  details text,
  is_completed boolean NOT NULL DEFAULT false,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO anon, authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'أخرى',
  quantity int NOT NULL DEFAULT 1,
  is_secured boolean NOT NULL DEFAULT false,
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment TO anon, authenticated;
GRANT ALL ON public.equipment TO service_role;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw equipment" ON public.equipment FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_name text,
  item_type text NOT NULL,
  item_id uuid,
  action_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_log TO anon, authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public r activity" ON public.activity_log FOR SELECT USING (true);
CREATE POLICY "public i activity" ON public.activity_log FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER equipment_updated_at BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.equipment;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;

-- Seed team members
INSERT INTO public.team_members (name, role, sort_order) VALUES
  ('إبراهيم', 'المصور والمنتج المنفذ', 1),
  ('حداد', 'المصور الرئيسي ومسؤول الإضاءة والكاميرات', 2),
  ('عذاربة', 'مهندس الصوت', 3),
  ('جابر', 'المنتج العام والمنسق', 4);

-- Seed tasks
INSERT INTO public.tasks (team_member_id, title)
SELECT id, t.title FROM public.team_members m, (VALUES
  ('متابعة الجريبت ودفع العربون لتأكيد حجز المعدات'),
  ('جلب المعدات من شركة التأجير والتأكد من مطابقتها للقائمة'),
  ('التأكد من الكهرباء والتمديدات في اللوكيشن'),
  ('مراجعة خطة الطاقة والجنريتر أو بطاريات V-Mount'),
  ('فحص اللوكيشنات الخارجية وتحديد أفضل زاوية للشمس'),
  ('تأمين أكياس الرمل الإضافية للستاندات والبترفلاي'),
  ('التنسيق مع جابر على الجدول الزمني')
) AS t(title) WHERE m.name = 'إبراهيم';

INSERT INTO public.tasks (team_member_id, title)
SELECT id, t.title FROM public.team_members m, (VALUES
  ('مراجعة قائمة معدات التصوير بدقة مع ورقة الحجز'),
  ('تفريغ كروت الميموري وعمل Format على كاميرا FX3'),
  ('كتابة نواقص الإضاءة (GVM 600W، Boom Stand، الفريسنل، الفلاقات)'),
  ('توحيد إعدادات الكاميرات والـ White Balance يدوياً'),
  ('الإشراف على نظام Double Diffusion للإضاءة السوفت'),
  ('ضبط كشافات 600W على Silent Mode لمنع صوت المراوح'),
  ('عمل نسخة احتياطية مزدوجة بعد كل يوم تصوير على SSD')
) AS t(title) WHERE m.name = 'حداد';

INSERT INTO public.tasks (team_member_id, title)
SELECT id, t.title FROM public.team_members m, (VALUES
  ('اختبار ميكروفونات Sennheiser G3/G4 قبل يوم التصوير'),
  ('كتابة نواقص معدات الصوت وتزويد إبراهيم بها'),
  ('معالجة الصدى في اللوكيشن الداخلي (فوم / سجاد)'),
  ('خطة ضد ضوضاء السيارات والهواء (Deadcat + Cardioid)'),
  ('فحص بطاريات AA الاحتياطية وشحن القابل للشحن'),
  ('تثبيت المايكات على الضيوف قبل التصوير بـ 20 دقيقة')
) AS t(title) WHERE m.name = 'عذاربة';

INSERT INTO public.tasks (team_member_id, title)
SELECT id, t.title FROM public.team_members m, (VALUES
  ('التأكيد على المذيع والضيوف بجهوزيتهم للمحاور'),
  ('متابعة مواعيد الضيوف والتأكيد المستمر'),
  ('جلب الدفعة المالية لشركة التأجير ومهندس الصوت'),
  ('متابعة ترتيبات اللوكيشن والديكور مع إبراهيم'),
  ('إدارة الجدول اليومي وفترات الراحة بين الحلقات'),
  ('تأمين المياه والضيافة لفريق العمل والضيوف'),
  ('التحقق من تصاريح التصوير وسهولة دخول المعدات')
) AS t(title) WHERE m.name = 'جابر';

-- Seed equipment
INSERT INTO public.equipment (name, category, quantity, sort_order) VALUES
  ('كاميرا Sony FX3', 'كاميرات وعدسات', 3, 1),
  ('عدسات تصوير (24-70 f/2.8 أو 50 f/1.2)', 'كاميرات وعدسات', 3, 2),
  ('ترايبود كاميرا', 'كاميرات وعدسات', 3, 3),
  ('بطاريات كاميرا NP-FZ100', 'كاميرات وعدسات', 9, 4),
  ('شواحن بطاريات الكاميرا (Dual)', 'كاميرات وعدسات', 2, 5),
  ('كروت ذاكرة SD V90 / CFexpress Type A', 'الداتا والتفريغ', 6, 10),
  ('لابتوب DIT (MacBook Pro)', 'الداتا والتفريغ', 1, 11),
  ('هاردسك خارجي SSD Samsung T7', 'الداتا والتفريغ', 2, 12),
  ('قارئ كروت سريع USB-C', 'الداتا والتفريغ', 1, 13),
  ('شاشة مخرج Atomos Shinobi 7"', 'الشاشات والوصلات', 1, 20),
  ('شاشات كاميرا صغيرة 5"', 'الشاشات والوصلات', 2, 21),
  ('كيبلات HDMI / Micro HDMI', 'الشاشات والوصلات', 5, 22),
  ('بطاريات شاشات NP-F970/F550', 'الشاشات والوصلات', 6, 23),
  ('Aputure LS 600d Pro (مع ستاند)', 'الإضاءة', 1, 30),
  ('GVM 600W (مع Boom Stand)', 'الإضاءة', 1, 31),
  ('Aputure F10 Fresnel', 'الإضاءة', 2, 32),
  ('فريم دفيوزر 4x4 (مع ستاند)', 'الإضاءة', 2, 33),
  ('فلاق أسود 4x4 (Negative Fill)', 'الإضاءة', 2, 34),
  ('بترفلاي 8x8 (240 كامل)', 'الإضاءة', 1, 35),
  ('ميكروفونات Sennheiser G3/G4', 'الصوت', 2, 40),
  ('بطاريات AA', 'الصوت', 24, 41),
  ('سماعات رأس احترافية', 'الصوت', 1, 42),
  ('أكياس رمل Sandbags', 'الجريبت والإكسسوارات', 10, 50),
  ('ملاقط غسيل حديد A-Clamps', 'الجريبت والإكسسوارات', 6, 51),
  ('Gaffer Tape (أسود وملون)', 'الجريبت والإكسسوارات', 2, 52),
  ('Velcro Straps / Bongo Ties', 'الجريبت والإكسسوارات', 10, 53),
  ('كابلات تمديد وموزعات كهرباء (Drums)', 'الجريبت والإكسسوارات', 3, 54);
