#DATABASE SCHEMAS

##categories
-- Drop if you're recreating from scratch
drop table if exists public.profiles cascade;

create table public.profiles (
id uuid primary key references auth.users on delete cascade,
business_name text,
phone text,
email text,
adress text,
credit_remaining integer default 0,
credits_started_at timestamptz,
last_credit_deduction timestamptz,
created_at timestamptz default now(),
updated_at timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;

create policy "Users read own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "Users update own profile"
on public.profiles for update
using (auth.uid() = id);

create policy "Users insert own profile"
on public.profiles for insert
with check (auth.uid() = id);

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
insert into public.profiles (id, email, business_name)
values (
new.id,
new.email,
new.raw_user_meta_data->>'business_name'
);
return new;
end;

$$
;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
$$
