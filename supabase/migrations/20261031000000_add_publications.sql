-- Where and when poems appeared in journals, listed on /publications.
-- poem_title is the title as the journal printed it, so a poem need not be on
-- the site. poem_id links one that is; deleting the poem keeps the credit.
-- published_on is the first of the month: the page shows month and year only.

create table publications (
  id uuid primary key default gen_random_uuid(),
  poem_id uuid references poems on delete set null,
  poem_title text not null check (length(trim(poem_title)) > 0),
  journal text not null check (length(trim(journal)) > 0),
  url text,
  published_on date not null check (extract(day from published_on) = 1),
  created_at timestamptz not null default now()
);

create index idx_publications_published_on on publications (published_on desc);
create index idx_publications_poem_id on publications (poem_id);

alter table publications enable row level security;

-- Public: the anon key reads every credit. The embedded poem still goes
-- through the poems policies, so a draft or kinky poem comes back null.
create policy "Public can read publications" on publications
  for select using (true);
create policy "Admin can insert publications" on publications
  for insert to authenticated with check ((select is_admin()));
create policy "Admin can update publications" on publications
  for update to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "Admin can delete publications" on publications
  for delete to authenticated using ((select is_admin()));
