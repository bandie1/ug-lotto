-- Adds password-login support on top of the existing agent-issued OTP flow.
-- OTP remains how an agent signs a player up (or resets a forgotten
-- password); after that, the player sets their own password and logs in
-- with phone + password from then on.

alter table profiles
  add column if not exists has_password boolean not null default false;

-- A player must be able to flip their own has_password flag once they set
-- a password (see app/login/set-password). Only "own profile" SELECT
-- existed before; this adds the matching UPDATE, restricted so a player
-- can only ever touch their own row.
drop policy if exists "own profile update" on profiles;
create policy "own profile update"
on profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);
