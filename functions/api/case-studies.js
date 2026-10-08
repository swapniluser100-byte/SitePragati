// Cloudflare Pages Function
// Lives at: /functions/api/case-studies.js
// Automatically becomes available at: https://yoursite.pages.dev/api/case-studies
//
// Requires a D1 database bound to this Pages project with the binding
// name "DB" (set this up in wrangler.toml or the Cloudflare dashboard —
// see DEPLOY-GUIDE.md for exact steps).
//
// Only returns case studies with visible_on_website = 1 (or unset, for
// rows that predate that column) — the admin console's checkbox lets an
// admin keep a case study in the admin list without showing it publicly.

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const { results } = await env.DB.prepare(
      `SELECT * FROM case_studies
       WHERE visible_on_website IS NULL OR visible_on_website = 1
       ORDER BY sort_order ASC, id ASC`
    ).all();

    return new Response(JSON.stringify({ case_studies: results }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60' // light caching, 1 minute
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
