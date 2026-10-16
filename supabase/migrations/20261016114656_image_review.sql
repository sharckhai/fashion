-- Bewertung + Feedback des Nutzers pro Bild (wird gespeichert, nicht an GPT geschickt)
alter table public.images
  add column rating smallint check (rating between 1 and 5),
  add column review text,
  add column reviewed_at timestamptz;
