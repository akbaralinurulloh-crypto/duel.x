-- Duel.X AI — migration 0009: profiles for Google (OAuth) sign-ups.
-- Google supplies full_name/name instead of display_name and no username, so
-- derive both server-side from untrusted metadata and the email's local part.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta           jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  wanted         text  := lower(btrim(coalesce(meta ->> 'username', '')));
  from_email     text  := left(regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9_]', '', 'g'), 24);
  fallback       text  := 'user_' || substr(replace(new.id::text, '-', ''), 1, 10);
  shown          text  := nullif(btrim(coalesce(meta ->> 'display_name', meta ->> 'full_name', meta ->> 'name', '')), '');
  final_username text;
  cat_id         uuid;
begin
  if wanted !~ '^[a-z0-9_]{3,30}$'
     or exists (select 1 from public.profiles p where p.username = wanted) then
    if char_length(from_email) >= 3
       and not exists (select 1 from public.profiles p where p.username = from_email) then
      final_username := from_email;
    else
      final_username := fallback;
    end if;
  else
    final_username := wanted;
  end if;

  select c.id into cat_id
  from public.categories c
  where c.slug = meta ->> 'primary_category_slug' and c.is_active;

  insert into public.profiles (id, username, display_name, primary_category_id)
  values (new.id, final_username, left(coalesce(shown, final_username), 80), cat_id);

  return new;
end;
$$;
