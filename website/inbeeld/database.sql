-- In Beeld: database in Supabase (zelfde project als /oefentoets).
-- Alle tabellen staan in het schema "inbeeld", dat niet via de API bereikbaar is.
-- De website praat enkel met de functies public.ib_* hieronder (security definer).
-- Wat we bewaren: voornaam, klas, de code (versleuteld) en welke kaarten een leerling oefende.
-- Geen achternaam, geen e-mail, geen foto's. LANcelot meldt enkel "kaart X aangebracht in leerjaar Y".

create schema if not exists inbeeld;
revoke all on schema inbeeld from public, anon, authenticated;

create table if not exists inbeeld.config (sleutel text primary key, waarde text not null);
insert into inbeeld.config values
  ('schoolcode', upper(substr(md5(random()::text), 1, 8))),
  ('pinsleutel', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict do nothing;

create table if not exists inbeeld.leerkracht (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  wachtwoord text not null,
  gemaakt timestamptz not null default now()
);
create unique index if not exists leerkracht_naam on inbeeld.leerkracht (lower(naam));

create table if not exists inbeeld.klas (
  id uuid primary key default gen_random_uuid(),
  leerkracht_id uuid not null references inbeeld.leerkracht on delete cascade,
  naam text not null,
  leerjaar text not null check (leerjaar in ('JK','K2','K3','1','2','3','4','5','6')),
  gemaakt timestamptz not null default now()
);

create table if not exists inbeeld.leerling (
  id uuid primary key default gen_random_uuid(),
  klas_id uuid not null references inbeeld.klas on delete cascade,
  voornaam text not null,
  soort text not null check (soort in ('pin','dier')),
  code bytea not null,
  gemaakt timestamptz not null default now()
);
create unique index if not exists leerling_naam on inbeeld.leerling (klas_id, lower(voornaam));

create table if not exists inbeeld.sessie (
  token uuid primary key default gen_random_uuid(),
  leerling_id uuid references inbeeld.leerling on delete cascade,
  leerkracht_id uuid references inbeeld.leerkracht on delete cascade,
  tot timestamptz not null,
  check ((leerling_id is null) <> (leerkracht_id is null))
);

create table if not exists inbeeld.pogingen (sleutel text not null, op timestamptz not null default now());
create index if not exists pogingen_sleutel on inbeeld.pogingen (sleutel, op);

-- Aangebracht door de leerkracht op de website (per klas)
create table if not exists inbeeld.aangebracht_klas (
  klas_id uuid not null references inbeeld.klas on delete cascade,
  kaart text not null,
  op date not null default current_date,
  primary key (klas_id, kaart)
);

-- Aangebracht in LANcelot: enkel kaart + leerjaar, zonder klas of namen
create table if not exists inbeeld.aangebracht_leerjaar (
  leerjaar text not null,
  kaart text not null,
  eerste date not null default current_date,
  laatste date not null default current_date,
  aantal int not null default 1,
  primary key (leerjaar, kaart)
);

create table if not exists inbeeld.voortgang (
  leerling_id uuid not null references inbeeld.leerling on delete cascade,
  kaart text not null,
  doos int not null default 0,
  volgende date not null default current_date,
  juist int not null default 0,
  fout int not null default 0,
  laatst timestamptz not null default now(),
  primary key (leerling_id, kaart)
);

create table if not exists inbeeld.project (
  id uuid primary key default gen_random_uuid(),
  klas_id uuid not null references inbeeld.klas on delete cascade,
  naam text not null,
  kaarten text[] not null default '{}',
  gemaakt timestamptz not null default now()
);

revoke all on all tables in schema inbeeld from public, anon, authenticated;

-- ---------- hulpfuncties (niet via de API) ----------

create or replace function inbeeld._te_veel(p_sleutel text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  delete from inbeeld.pogingen where op < now() - interval '1 day';
  return (select count(*) >= 8 from inbeeld.pogingen where sleutel = p_sleutel and op > now() - interval '10 minutes');
end $$;

create or replace function inbeeld._sleutel() returns text
language sql security definer set search_path = '' as $$ select waarde from inbeeld.config where sleutel = 'pinsleutel' $$;

create or replace function inbeeld._ont(p bytea) returns text
language sql security definer set search_path = '' as $$ select extensions.pgp_sym_decrypt(p, inbeeld._sleutel()) $$;

create or replace function inbeeld._ver(p text) returns bytea
language sql security definer set search_path = '' as $$ select extensions.pgp_sym_encrypt(p, inbeeld._sleutel()) $$;

create or replace function inbeeld._nieuwe_code(p_soort text) returns text
language sql volatile set search_path = '' as $$
  select case when p_soort = 'dier'
    then (array['vos','uil','egel','beer','kikker','konijn','eend','muis','vlinder','schildpad','olifant','leeuw'])[1 + floor(random() * 12)::int]
    else lpad(floor(random() * 10000)::int::text, 4, '0') end
$$;

create or replace function inbeeld._leerling(p_token uuid) returns uuid
language sql security definer set search_path = '' as $$
  select leerling_id from inbeeld.sessie where token = p_token and tot > now() and leerling_id is not null
$$;

create or replace function inbeeld._leerkracht(p_token uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare r uuid;
begin
  select leerkracht_id into r from inbeeld.sessie where token = p_token and tot > now() and leerkracht_id is not null;
  if r is null then raise exception 'niet_aangemeld'; end if;
  return r;
end $$;

create or replace function inbeeld._mijn_klas(p_lk uuid, p_klas uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from inbeeld.klas where id = p_klas and leerkracht_id = p_lk) then raise exception 'geen_klas'; end if;
end $$;

create or replace function inbeeld._kaarten(p text[]) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array_agg(distinct k), '{}') from unnest(coalesce(p, '{}')) k where k ~ '^[A-Z]{1,3}-[0-9]{1,5}$'
$$;

-- ---------- leerlingen ----------

-- Stap 1: de klassen van de school (enkel naam en leerjaar)
create or replace function public.ib_klassen() returns json
language sql security definer set search_path = '' as $$
  select coalesce(json_agg(json_build_object('id', k.id, 'naam', k.naam, 'leerjaar', k.leerjaar)
    order by array_position(array['JK','K2','K3','1','2','3','4','5','6'], k.leerjaar), lower(k.naam)), '[]')
  from inbeeld.klas k where exists (select 1 from inbeeld.leerling l where l.klas_id = k.id)
$$;

-- Stap 2: de voornamen van die klas
create or replace function public.ib_klas(p_klas uuid) returns json
language sql security definer set search_path = '' as $$
  select coalesce(json_agg(json_build_object('id', l.id, 'voornaam', l.voornaam, 'soort', l.soort) order by lower(l.voornaam)), '[]')
  from inbeeld.leerling l where l.klas_id = p_klas
$$;

-- Stap 3: de code (4 cijfers of een dier). Ook de QR op het inlogkaartje gebruikt dit.
create or replace function public.ib_aanmelden(p_leerling uuid, p_code text) returns json
language plpgsql security definer set search_path = '' as $$
declare l inbeeld.leerling; t uuid;
begin
  if inbeeld._te_veel('ll:' || p_leerling) then raise exception 'te_veel'; end if;
  select * into l from inbeeld.leerling where id = p_leerling;
  if l.id is null or inbeeld._ont(l.code) <> lower(trim(p_code)) then
    insert into inbeeld.pogingen values ('ll:' || p_leerling);
    return null;
  end if;
  insert into inbeeld.sessie (leerling_id, tot) values (l.id, now() + interval '180 days') returning token into t;
  return json_build_object('token', t);
end $$;

-- Alles wat de leerling nodig heeft: klas, aangebrachte kaarten, projecten, voortgang
create or replace function public.ib_ik(p_token uuid) returns json
language plpgsql security definer set search_path = '' as $$
declare lid uuid := inbeeld._leerling(p_token); l inbeeld.leerling; k inbeeld.klas;
begin
  if lid is null then return null; end if;
  select * into l from inbeeld.leerling where id = lid;
  select * into k from inbeeld.klas where id = l.klas_id;
  return json_build_object(
    'voornaam', l.voornaam, 'soort', l.soort, 'klas', k.naam, 'leerjaar', k.leerjaar,
    'aangebracht', (select coalesce(json_agg(kaart), '[]') from (
        select kaart from inbeeld.aangebracht_klas where klas_id = k.id
        union select kaart from inbeeld.aangebracht_leerjaar where leerjaar = k.leerjaar) a),
    'projecten', (select coalesce(json_agg(json_build_object('id', p.id, 'naam', p.naam, 'kaarten', p.kaarten) order by p.gemaakt desc), '[]')
        from inbeeld.project p where p.klas_id = k.id),
    'voortgang', (select coalesce(json_object_agg(v.kaart, json_build_array(v.doos, v.volgende, v.juist, v.fout)), '{}')
        from inbeeld.voortgang v where v.leerling_id = lid));
end $$;

-- Resultaten van een spelletje: [{"kaart":"W-142","juist":true}, ...]
-- Doos 0-5 (Leitner): juist = een doos hoger en later terug, fout = terug naar doos 1 en morgen opnieuw.
create or replace function public.ib_oefen(p_token uuid, p_res jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare lid uuid := inbeeld._leerling(p_token); r jsonb; nr text; ok boolean;
begin
  if lid is null then return false; end if;
  for r in select * from jsonb_array_elements(p_res) limit 60 loop
    nr := r->>'kaart'; ok := coalesce((r->>'juist')::boolean, false);
    continue when nr !~ '^[A-Z]{1,3}-[0-9]{1,5}$';
    insert into inbeeld.voortgang as v (leerling_id, kaart, doos, volgende, juist, fout)
      values (lid, nr, case when ok then 1 else 0 end, current_date + 1, case when ok then 1 else 0 end, case when ok then 0 else 1 end)
    on conflict (leerling_id, kaart) do update set
      doos = case when ok then least(v.doos + 1, 5) else 1 end,
      volgende = current_date + case when ok then (array[1,2,4,7,14,30])[least(v.doos + 1, 5) + 1] else 1 end,
      juist = v.juist + case when ok then 1 else 0 end,
      fout = v.fout + case when ok then 0 else 1 end,
      laatst = now();
  end loop;
  return true;
end $$;

create or replace function public.ib_afmelden(p_token uuid) returns void
language sql security definer set search_path = '' as $$ delete from inbeeld.sessie where token = p_token $$;

-- ---------- LANcelot ----------

-- "Kaart X aangebracht in leerjaar Y". Niets anders.
create or replace function public.ib_aangebracht(p_kaart text, p_leerjaar text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_kaart !~ '^[A-Z]{1,3}-[0-9]{1,5}$' or p_leerjaar not in ('JK','K2','K3','1','2','3','4','5','6') then return false; end if;
  insert into inbeeld.aangebracht_leerjaar as a (leerjaar, kaart) values (p_leerjaar, p_kaart)
  on conflict (leerjaar, kaart) do update set laatste = current_date,
    aantal = a.aantal + case when a.laatste < current_date then 1 else 0 end;
  return true;
end $$;

-- ---------- leerkrachten ----------

create or replace function public.ib_lk_registreer(p_schoolcode text, p_naam text, p_wachtwoord text) returns json
language plpgsql security definer set search_path = '' as $$
declare nid uuid; t uuid;
begin
  if inbeeld._te_veel('reg') then raise exception 'te_veel'; end if;
  if upper(trim(p_schoolcode)) <> (select waarde from inbeeld.config where sleutel = 'schoolcode') then
    insert into inbeeld.pogingen values ('reg'); return json_build_object('fout', 'schoolcode');
  end if;
  if length(trim(p_naam)) < 2 or length(trim(p_naam)) > 40 then return json_build_object('fout', 'naam'); end if;
  if length(p_wachtwoord) < 6 then return json_build_object('fout', 'wachtwoord'); end if;
  if exists (select 1 from inbeeld.leerkracht where lower(naam) = lower(trim(p_naam))) then return json_build_object('fout', 'bestaat'); end if;
  insert into inbeeld.leerkracht (naam, wachtwoord) values (trim(p_naam), extensions.crypt(p_wachtwoord, extensions.gen_salt('bf'))) returning leerkracht.id into nid;
  insert into inbeeld.sessie (leerkracht_id, tot) values (nid, now() + interval '30 days') returning token into t;
  return json_build_object('token', t);
end $$;

create or replace function public.ib_lk_aanmelden(p_naam text, p_wachtwoord text) returns json
language plpgsql security definer set search_path = '' as $$
declare r inbeeld.leerkracht; t uuid;
begin
  if inbeeld._te_veel('lk:' || lower(trim(p_naam))) then raise exception 'te_veel'; end if;
  select * into r from inbeeld.leerkracht where lower(naam) = lower(trim(p_naam));
  if r.id is null or r.wachtwoord <> extensions.crypt(p_wachtwoord, r.wachtwoord) then
    insert into inbeeld.pogingen values ('lk:' || lower(trim(p_naam))); return null;
  end if;
  insert into inbeeld.sessie (leerkracht_id, tot) values (r.id, now() + interval '30 days') returning token into t;
  return json_build_object('token', t);
end $$;

-- Alles voor het leerkrachtscherm, enkel de eigen klassen
create or replace function public.ib_lk(p_token uuid) returns json
language plpgsql security definer set search_path = '' as $$
declare lk uuid := inbeeld._leerkracht(p_token);
begin
  return json_build_object(
    'naam', (select naam from inbeeld.leerkracht where id = lk),
    'klassen', (select coalesce(json_agg(json_build_object(
        'id', k.id, 'naam', k.naam, 'leerjaar', k.leerjaar,
        'leerlingen', (select coalesce(json_agg(json_build_object('id', l.id, 'voornaam', l.voornaam, 'soort', l.soort, 'code', inbeeld._ont(l.code)) order by lower(l.voornaam)), '[]')
            from inbeeld.leerling l where l.klas_id = k.id),
        'aangebracht', (select coalesce(json_agg(kaart), '[]') from inbeeld.aangebracht_klas where klas_id = k.id),
        'lancelot', (select coalesce(json_agg(kaart), '[]') from inbeeld.aangebracht_leerjaar where leerjaar = k.leerjaar),
        'projecten', (select coalesce(json_agg(json_build_object('id', p.id, 'naam', p.naam, 'kaarten', p.kaarten) order by p.gemaakt desc), '[]')
            from inbeeld.project p where p.klas_id = k.id)
      ) order by k.gemaakt), '[]') from inbeeld.klas k where k.leerkracht_id = lk));
end $$;

create or replace function public.ib_lk_klas(p_token uuid, p_klas uuid, p_naam text, p_leerjaar text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare lk uuid := inbeeld._leerkracht(p_token); r uuid;
begin
  if length(trim(p_naam)) < 1 or length(trim(p_naam)) > 30 then raise exception 'naam'; end if;
  if p_klas is null then
    if (select count(*) from inbeeld.klas where leerkracht_id = lk) >= 20 then raise exception 'te_veel'; end if;
    insert into inbeeld.klas (leerkracht_id, naam, leerjaar) values (lk, trim(p_naam), p_leerjaar) returning id into r;
    return r;
  end if;
  perform inbeeld._mijn_klas(lk, p_klas);
  update inbeeld.klas set naam = trim(p_naam), leerjaar = p_leerjaar where id = p_klas;
  return p_klas;
end $$;

create or replace function public.ib_lk_klas_wis(p_token uuid, p_klas uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare lk uuid := inbeeld._leerkracht(p_token);
begin
  perform inbeeld._mijn_klas(lk, p_klas);
  delete from inbeeld.klas where id = p_klas;
end $$;

-- Voornamen toevoegen. Wie in de kleuterklas of het 1ste zit, krijgt een dier, de anderen 4 cijfers.
create or replace function public.ib_lk_leerlingen(p_token uuid, p_klas uuid, p_namen text[]) returns int
language plpgsql security definer set search_path = '' as $$
declare lk uuid := inbeeld._leerkracht(p_token); lj text; s text; n text; c int := 0;
begin
  perform inbeeld._mijn_klas(lk, p_klas);
  select leerjaar into lj from inbeeld.klas where id = p_klas;
  s := case when lj in ('JK','K2','K3','1') then 'dier' else 'pin' end;
  foreach n in array p_namen[1:40] loop
    n := trim(n);
    continue when length(n) < 1 or length(n) > 30;
    continue when exists (select 1 from inbeeld.leerling where klas_id = p_klas and lower(voornaam) = lower(n));
    continue when (select count(*) from inbeeld.leerling where klas_id = p_klas) >= 40;
    insert into inbeeld.leerling (klas_id, voornaam, soort, code) values (p_klas, n, s, inbeeld._ver(inbeeld._nieuwe_code(s)));
    c := c + 1;
  end loop;
  return c;
end $$;

-- Nieuwe code (of overschakelen tussen dier en cijfers)
create or replace function public.ib_lk_leerling_code(p_token uuid, p_leerling uuid, p_soort text) returns void
language plpgsql security definer set search_path = '' as $$
declare lk uuid := inbeeld._leerkracht(p_token); k uuid;
begin
  select klas_id into k from inbeeld.leerling where id = p_leerling;
  perform inbeeld._mijn_klas(lk, k);
  update inbeeld.leerling set soort = p_soort, code = inbeeld._ver(inbeeld._nieuwe_code(p_soort)) where id = p_leerling and p_soort in ('pin','dier');
  delete from inbeeld.sessie where leerling_id = p_leerling;
end $$;

create or replace function public.ib_lk_leerling_wis(p_token uuid, p_leerling uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare lk uuid := inbeeld._leerkracht(p_token); k uuid;
begin
  select klas_id into k from inbeeld.leerling where id = p_leerling;
  perform inbeeld._mijn_klas(lk, k);
  delete from inbeeld.leerling where id = p_leerling;
end $$;

create or replace function public.ib_lk_aanbreng(p_token uuid, p_klas uuid, p_kaarten text[], p_aan boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare lk uuid := inbeeld._leerkracht(p_token);
begin
  perform inbeeld._mijn_klas(lk, p_klas);
  if p_aan then
    insert into inbeeld.aangebracht_klas (klas_id, kaart) select p_klas, k from unnest(inbeeld._kaarten(p_kaarten[1:500])) k on conflict do nothing;
  else
    delete from inbeeld.aangebracht_klas where klas_id = p_klas and kaart = any(p_kaarten);
  end if;
end $$;

create or replace function public.ib_lk_project(p_token uuid, p_klas uuid, p_id uuid, p_naam text, p_kaarten text[]) returns uuid
language plpgsql security definer set search_path = '' as $$
declare lk uuid := inbeeld._leerkracht(p_token); r uuid;
begin
  perform inbeeld._mijn_klas(lk, p_klas);
  if length(trim(p_naam)) < 1 or length(trim(p_naam)) > 60 then raise exception 'naam'; end if;
  if p_id is null then
    insert into inbeeld.project (klas_id, naam, kaarten) values (p_klas, trim(p_naam), inbeeld._kaarten(p_kaarten[1:300])) returning id into r;
    return r;
  end if;
  update inbeeld.project set naam = trim(p_naam), kaarten = inbeeld._kaarten(p_kaarten[1:300]) where id = p_id and klas_id = p_klas;
  return p_id;
end $$;

create or replace function public.ib_lk_project_wis(p_token uuid, p_klas uuid, p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare lk uuid := inbeeld._leerkracht(p_token);
begin
  perform inbeeld._mijn_klas(lk, p_klas);
  delete from inbeeld.project where id = p_id and klas_id = p_klas;
end $$;

-- Klasoverzicht: per leerling en kaart de doos en het aantal juist/fout
create or replace function public.ib_lk_overzicht(p_token uuid, p_klas uuid) returns json
language plpgsql security definer set search_path = '' as $$
declare lk uuid := inbeeld._leerkracht(p_token);
begin
  perform inbeeld._mijn_klas(lk, p_klas);
  return (select coalesce(json_agg(json_build_array(v.leerling_id, v.kaart, v.doos, v.juist, v.fout, v.laatst::date)), '[]')
    from inbeeld.voortgang v join inbeeld.leerling l on l.id = v.leerling_id where l.klas_id = p_klas);
end $$;

create or replace function public.ib_lk_afmelden(p_token uuid) returns void
language sql security definer set search_path = '' as $$ delete from inbeeld.sessie where token = p_token $$;

-- Hulpfuncties enkel voor de functies hierboven
revoke execute on all functions in schema inbeeld from public, anon, authenticated;
