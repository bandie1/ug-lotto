# EziLoto — Setup Instructions (Steps 6–8)

You've already done Steps 1–5 (accounts, Supabase project + schema, API keys,
`create-next-app`, and `.env.local`). Here's exactly what to do with these files.

## Where these files go

Copy every folder/file in this package into the root of your existing
`eziloto` project (the one you made with `create-next-app`), merging folders
where they already exist:

```
eziloto/
├── app/
│   ├── globals.css          (replace existing)
│   ├── layout.tsx           (replace existing)
│   ├── page.tsx              (replace existing)
│   ├── login/page.tsx
│   ├── tickets/page.tsx
│   ├── results/page.tsx
│   └── admin/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── users/page.tsx
│       ├── config/page.tsx
│       ├── rounds/page.tsx
│       ├── ledger/page.tsx
│       └── fraud/page.tsx
├── components/
│   ├── NumberPicker.tsx
│   └── Countdown.tsx
├── lib/supabase/
│   ├── client.ts
│   ├── server.ts
│   └── admin.ts
├── middleware.ts
├── tailwind.config.ts        (replace existing)
├── supabase/functions/
│   ├── buy-tickets/index.ts
│   ├── generate-otp/index.ts
│   ├── verify-otp/index.ts
│   └── round-manager/index.ts
└── .env.local.example
```

## Step 6: Install dependencies and confirm the Supabase connection

```bash
cd eziloto
npm install
npm run dev
```

Open http://localhost:3000 — you should be redirected to `/login` (this
confirms `middleware.ts` and the Supabase client are wired up correctly).
It won't fully work yet because Steps 7–8 (Edge Functions) aren't deployed.

## Step 7 & 8: Deploy the Edge Functions

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF   # find this in Supabase → Project Settings → General

supabase functions deploy buy-tickets
supabase functions deploy generate-otp
supabase functions deploy verify-otp
supabase functions deploy round-manager
```

Each function automatically gets `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` injected by Supabase — you don't need to set
those manually for Edge Functions (only your Next.js app needs the
`.env.local` values).

## Turn on the scheduler (pg_cron)

In the Supabase SQL Editor, first enable extensions:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
```

Then schedule the round manager (replace the URL and key):

```sql
select cron.schedule(
  'lottery-round-manager',
  '*/5 * * * *',
  $$ select net.http_post(
      url:='https://YOUR_PROJECT_REF.functions.supabase.co/round-manager',
      headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ); $$
);
```

Run this once manually first to create your very first round:

```bash
curl -X POST https://YOUR_PROJECT_REF.functions.supabase.co/round-manager \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## Create your first admin

1. Go to `/admin/users` — wait, you can't yet, you're not an admin. Instead:
2. In the Supabase SQL Editor, manually insert yourself as a player + admin:

```sql
-- Do this only if you don't already have a profile row for yourself
insert into profiles (id, phone, is_admin, status)
values (gen_random_uuid(), '+256700000000', true, 'active');
```

   Or, if you already logged in once as a normal player (via the OTP flow
   after generating yourself a code through Supabase directly), just run:

```sql
update profiles set is_admin = true where phone = '+256700000000';
```

3. Log in at `/login` with that phone number. You'll now see the admin nav
   links (Overview, Rounds, Users & OTP, Game Config, Ledger, Fraud Review).

## Test the full loop

1. Go to `/admin/users`, generate an OTP for a test phone number.
2. Log out, log back in as that test player using the code.
3. Buy a few tickets on the Play page (try both manual picks and Quick Pick).
4. Manually trigger the round manager again (curl command above) once the
   round's `closes_at` time has passed, to force a draw.
5. Check `/results` — you should see the winning number and the fairness
   commit/reveal hash.
6. Check `/admin/ledger` — you should see the ticket sale and, if the test
   ticket won, a prize_payout entry.

## Then deploy to Vercel (Steps 9–11 from the main guide)

```bash
git init
git add .
git commit -m "EziLoto MVP"
git remote add origin https://github.com/YOUR-USERNAME/eziloto.git
git push -u origin main
```

Import the repo at vercel.com, add the three `.env.local` values under
Project Settings → Environment Variables, and deploy.
