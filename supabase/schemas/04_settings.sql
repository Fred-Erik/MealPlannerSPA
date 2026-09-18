create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  default_recipes_per_week integer not null default 3 check (default_recipes_per_week >= 0),
  default_servings integer not null default 6 check (default_servings > 0),
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

create policy "settings_all_authenticated"
on public.settings
for all
to authenticated
using (true)
with check (true);

grant select, insert, update, delete on public.settings to authenticated;

drop trigger if exists set_settings_updated_at on public.settings;
create trigger set_settings_updated_at
before update on public.settings
for each row
execute function public.set_updated_at();
