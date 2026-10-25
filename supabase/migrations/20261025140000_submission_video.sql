-- Duel.X AI — migration 0009: allow video submissions (MP4/MOV/WEBM), files up to 50 MB.
alter table public.submissions drop constraint if exists submissions_file_size_check;
alter table public.submissions
  add constraint submissions_file_size_check check (file_size between 1 and 52428800);

update storage.buckets
   set file_size_limit = 52428800,
       allowed_mime_types = array[
         'application/pdf','text/plain','text/markdown','text/csv','application/json',
         'application/zip','image/png','image/jpeg','video/mp4','video/quicktime','video/webm'
       ]
 where id = 'submissions';
