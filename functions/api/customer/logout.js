// POST /api/customer/logout — clears the customer session cookie.

import { clearSessionCookie, json } from '../../_utils/auth.js';

export async function onRequestPost(context) {
  return json({ result: 'success' }, 200, {
    'Set-Cookie': clearSessionCookie('customer_session')
  });
}
