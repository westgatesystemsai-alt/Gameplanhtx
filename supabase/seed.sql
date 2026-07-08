-- Game Plan HTX — seed.sql
-- Categories and event types (Build Brief Section 5).
-- Idempotent: safe to re-run.

insert into public.categories (name, slug, icon, sort_order) values
  ('Catering & Food',            'catering-food',            '🍽️', 1),
  ('Photography & Videography',  'photography-videography',  '📸', 2),
  ('DJ & Entertainment',         'dj-entertainment',         '🎧', 3),
  ('Venues',                     'venues',                   '🏛️', 4),
  ('Decorations & Floral',       'decorations-floral',       '💐', 5),
  ('Event Planning & Coordination', 'event-planning',        '📋', 6),
  ('Bar & Beverage Service',     'bar-beverage',             '🍹', 7),
  ('Lighting & AV',              'lighting-av',              '💡', 8),
  ('Transportation',             'transportation',           '🚗', 9),
  ('Photo Booths',               'photo-booths',             '🤳', 10),
  ('Desserts & Cakes',           'desserts-cakes',           '🎂', 11),
  ('Security & Staffing',        'security-staffing',        '🛡️', 12)
on conflict (slug) do update
  set name = excluded.name,
      icon = excluded.icon,
      sort_order = excluded.sort_order;

insert into public.event_types (name, slug) values
  ('Wedding',          'wedding'),
  ('Birthday',         'birthday'),
  ('Corporate Event',  'corporate-event'),
  ('Baby Shower',      'baby-shower'),
  ('Graduation',       'graduation'),
  ('Quinceañera',      'quinceanera'),
  ('Holiday Party',    'holiday-party'),
  ('Fundraiser',       'fundraiser'),
  ('Networking Event', 'networking-event'),
  ('Other',            'other')
on conflict (slug) do update
  set name = excluded.name;
