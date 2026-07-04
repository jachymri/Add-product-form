# Customer Portal

Next.js + Supabase customer product intake portal.

## Local setup

```bash
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Supabase setup you must do manually

1. Create Supabase project.
2. Copy Project URL and anon/publishable key into `.env.local`.
3. In SQL Editor, run `supabase/setup.sql`.
4. Storage -> New bucket -> `product-images` -> keep private.
5. Auth -> Users -> Add user. Add approved customer email.
6. Copy created auth user ID, then run:

```sql
insert into public.customers (id, email, name)
values ('USER_ID_FROM_AUTH_USERS', 'customer@example.com', 'Customer Name');
```

## Magic link redirect URLs

In Supabase Dashboard -> Authentication -> URL Configuration:

- Site URL local: `http://localhost:3000`
- Redirect URLs local: `http://localhost:3000/dashboard`
- After Vercel deploy add: `https://YOUR-APP.vercel.app/dashboard`

## Deploy to Vercel

```bash
git init
git add .
git commit -m "Initial customer portal"
# create GitHub repo, then:
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

In Vercel:

1. New Project -> import repo.
2. Add env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy.

## Fetch new products privately

Create local `.env` or export vars in shell:

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
npm run fetch:new
```

Never put service role key in browser code or public Vercel env.
