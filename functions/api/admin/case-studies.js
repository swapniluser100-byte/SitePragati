// /api/admin/case-studies — protected by _middleware.js
// GET    → list all case studies
// POST   → create a new one
// PUT    → { id, ...fields } → update an existing one
// DELETE → { id } → remove one

import { json } from '../../_utils/auth.js';

const FIELDS = [
  'business_name', 'category', 'site_url', 'description', 'image_file',
  'stat1_label', 'stat1_value', 'stat2_label', 'stat2_value',
  'stat3_label', 'stat3_value', 'sort_order'
];

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM case_studies ORDER BY sort_order ASC, id ASC'
    ).all();
    return json({ case_studies: results });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    if (!body.business_name) return json({ error: 'business_name is required' }, 400);

    const values = FIELDS.map(f => body[f] ?? null);
    const placeholders = FIELDS.map(() => '?').join(', ');

    await env.DB.prepare(
      `INSERT INTO case_studies (${FIELDS.join(', ')}) VALUES (${placeholders})`
    ).bind(...values).run();

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    if (!body.id) return json({ error: 'id is required' }, 400);

    const setClause = FIELDS.map(f => `${f} = ?`).join(', ');
    const values = FIELDS.map(f => body[f] ?? null);

    await env.DB.prepare(
      `UPDATE case_studies SET ${setClause} WHERE id = ?`
    ).bind(...values, body.id).run();

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  try {
    const { id } = await request.json();
    if (!id) return json({ error: 'id is required' }, 400);

    await env.DB.prepare('DELETE FROM case_studies WHERE id = ?').bind(id).run();

    return json({ result: 'success' });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
