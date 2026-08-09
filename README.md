# TechPulse Nigeria V2

A mobile-first, age-adaptive Nigerian digital literacy assessment and research dashboard.

## Included
- Polished responsive UI
- Landing/consent flow
- Methodology page
- 120-question bank (30 per age group)
- Random 12-question assessment
- Five skill domains
- Four literacy tiers
- Domain-specific feedback
- Printable results
- Admin dashboard
- Demo admin authentication
- CSV export
- Supabase schema + RLS starter policies
- LocalStorage fallback for testing without a backend

## Run
Open `index.html`, or deploy the folder to GitHub Pages, Netlify, Vercel or Cloudflare Pages.

Demo admin password:
`techpulse-demo`

## Supabase production setup
1. Create a Supabase project.
2. Run `sql/schema.sql` in the SQL editor.
3. Put the project URL and anon/publishable key in `js/config.js`.
4. Replace the localStorage submission section in `js/test.js` with Supabase insert calls.
5. Add Supabase Auth and a real admin role/claim.
6. Add strict SELECT policies for admin analytics.
7. Do NOT expose the service-role key in browser code.

## Research caution
The question bank is a product prototype, not a validated psychometric instrument. Before claiming population-level findings, pilot-test questions, assess reliability/validity, define a sampling strategy, document consent/guardian procedures for minors, and report limitations.


## Supabase configuration for this build

The Supabase publishable key supplied for this build is already placed in `js/config.js`.

You still need to replace:
`https://YOUR-PROJECT.supabase.co`

with your actual Supabase project URL.

The supplied admin Auth UUID is already included in `sql/schema.sql`:

`39f1581e-133d-4f69-b28c-9b7b52c78e61`

Run the SQL in Supabase SQL Editor after creating the Auth user.
