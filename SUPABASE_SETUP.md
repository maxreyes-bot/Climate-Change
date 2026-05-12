# Supabase setup instructions

## 1) Paste SQL schema in Supabase

1. Open your Supabase project dashboard.
2. In the left menu, click **SQL Editor**.
3. Click **New query**.
4. Open this repository file: `supabase/schema.sql`.
5. Copy all SQL from that file and paste it into the query editor.
6. Click **Run**.

This creates:
- `user_profiles`
- `user_actions`
- `user_topic_views`
- `user_footprints`
- `user_quiz_attempts`
- `user_activity_events`
- RLS policies and profile/activity triggers

## 2) Configure local environment

Create `.env.local` in the repo root:

```bash
VITE_SUPABASE_URL=https://efsudcugiqkvhcnyghhw.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The app reads these from `import.meta.env` through `src/supabaseClient.js`.

## 3) Install and run

```bash
npm install
npm run dev
```

## 4) Auth notes

- The app uses Supabase Auth email/password.
- If your Supabase project requires email confirmation, confirm email first.
- You can manage this in **Authentication -> Providers -> Email**.
