-- Duel.X AI — migration 0008: allow submission files up to 25 MB (e.g. a website as a ZIP).
alter table public.submissions drop constraint if exists submissions_file_size_check;
alter table public.submissions
  add constraint submissions_file_size_check check (file_size between 1 and 26214400);

update storage.buckets set file_size_limit = 26214400 where id = 'submissions';
