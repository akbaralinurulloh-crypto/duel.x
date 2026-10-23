-- Duel.X AI — migration 0007: company requests (public form -> admin inbox).
-- Anyone may submit through submit_company_request(); only admins can read or
-- triage. A simple per-email limit stops casual flooding; edge rate limiting
-- is still recommended in production.

create table public.company_requests (
  id            uuid primary key default gen_random_uuid(),
  company_name  text not null check (char_length(company_name) between 2 and 120),
  contact_name  text not null check (char_length(contact_name) between 2 and 120),
  contact_email text not null
                  check (char_length(contact_email) <= 254
                         and contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  request_type  text not null
                  check (request_type in ('sponsor_challenge', 'talent_access', 'other')),
  message       text not null check (char_length(message) between 10 and 2000),
  status        text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  handled_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index company_requests_status_idx on public.company_requests (status, created_at desc);
create index company_requests_email_idx on public.company_requests (lower(contact_email), created_at);

create trigger company_requests_set_updated_at
  before update on public.company_requests
  for each row execute function public.set_updated_at();

create trigger company_requests_audit
  after update or delete on public.company_requests
  for each row execute function public.audit_row_change();

alter table public.company_requests enable row level security;
revoke all on public.company_requests from anon, authenticated;
grant select on public.company_requests to authenticated;
grant update (status, handled_by) on public.company_requests to authenticated;

create policy company_requests_admin_select
  on public.company_requests for select
  to authenticated
  using (public.is_admin());

create policy company_requests_admin_update
  on public.company_requests for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.submit_company_request(
  p_company_name text,
  p_contact_name text,
  p_contact_email text,
  p_request_type text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  email   text := lower(btrim(coalesce(p_contact_email, '')));
  new_id  uuid;
begin
  if (
    select count(*) from public.company_requests r
     where lower(r.contact_email) = email
       and r.created_at > now() - interval '1 hour'
  ) >= 3 then
    raise exception 'rate_limited';
  end if;

  begin
    insert into public.company_requests
      (company_name, contact_name, contact_email, request_type, message)
    values
      (btrim(coalesce(p_company_name, '')), btrim(coalesce(p_contact_name, '')),
       email, coalesce(p_request_type, ''), btrim(coalesce(p_message, '')))
    returning id into new_id;
  exception when check_violation then
    raise exception 'invalid_request';
  end;

  return new_id;
end;
$$;

revoke execute on function public.submit_company_request(text, text, text, text, text) from public;
grant execute on function public.submit_company_request(text, text, text, text, text)
  to anon, authenticated;
