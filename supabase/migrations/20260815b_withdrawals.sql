-- Winnings withdrawal request/approval flow.
-- Players request a withdrawal for a winning ticket; an admin approves it,
-- then marks it paid once the payout has actually been handed over. This
-- sits alongside tickets.prize_paid, which stays as the final source of
-- truth once a payout is completed.

create table if not exists withdrawal_requests (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references tickets(id),
  player_id uuid not null references profiles(id),
  amount_ugx bigint not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paid')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references profiles(id),
  notes text,
  unique (ticket_id)
);

alter table withdrawal_requests enable row level security;

drop policy if exists "own withdrawal requests select" on withdrawal_requests;
create policy "own withdrawal requests select"
on withdrawal_requests
for select
using (auth.uid() = player_id);

drop policy if exists "own withdrawal requests insert" on withdrawal_requests;
create policy "own withdrawal requests insert"
on withdrawal_requests
for insert
with check (auth.uid() = player_id);

drop policy if exists "admin full access withdrawal requests" on withdrawal_requests;
create policy "admin full access withdrawal requests"
on withdrawal_requests
for all
using (is_admin_user())
with check (is_admin_user());
