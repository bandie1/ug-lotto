-- Tickets now start life as "pending_approval" (player says they've made a
-- merchant-code deposit, but nothing is confirmed yet). An admin reviews the
-- deposit and either approves (status -> valid, counts toward the pool and
-- prize draw) or rejects (status -> rejected, never counts).
--
-- Previously buy-tickets inserted tickets as status='valid' immediately and
-- credited the round pool + ledger at that instant, before any payment was
-- actually confirmed. That's been moved to happen on admin approval instead
-- (see the updated buy-tickets and the new admin/tickets approval action).

alter table tickets
  alter column status set default 'pending_approval';

-- Track which mobile money network the player says they paid with, so the
-- admin approving deposits has that context without guessing.
alter table tickets
  add column if not exists deposit_network text check (deposit_network in ('mtn', 'airtel'));

-- Relax/replace whatever check constraint exists on tickets.status so the
-- new pending_approval / rejected values are allowed, without assuming we
-- know every value already in use (this was set up outside the tracked
-- migrations originally).
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'tickets'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table tickets drop constraint %I', c.conname);
  end loop;
end $$;

alter table tickets
  add constraint tickets_status_check
  check (status in ('pending_approval', 'valid', 'rejected', 'void'));
