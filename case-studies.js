// Cloudflare Pages Function
// Lives at: /functions/api/case-studies.js
// Automatically becomes available at: https://yoursite.pages.dev/api/case-studies
//
// Requires a D1 database bound to this Pages project with the binding
// name "DB" (set this up in wrangler.toml or the Cloudflare dashboard —
// see DEPLOY-GUIDE.md for exact steps).

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM case_studies ORDER BY sort_order ASC, id ASC'
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
