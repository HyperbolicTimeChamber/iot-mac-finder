// eWeLink relay. The eWeLink API sends no CORS headers, so the browser
// can't call it directly. This worker forwards
//   https://<worker>/<api host>/v2/...  ->  https://<api host>/v2/...
// and adds CORS headers for the origins in ALLOWED_ORIGINS.
// It only ever talks to eWeLink's own API hosts and stores nothing.

const API_HOSTS = new Set(['as-apia.coolkit.cc', 'eu-apia.coolkit.cc', 'us-apia.coolkit.cc', 'cn-apia.coolkit.cn'])
const FORWARD_HEADERS = ['authorization', 'content-type', 'x-ck-appid', 'x-ck-nonce']

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
    if (!allowed.includes(origin)) return new Response('Origin not allowed', { status: 403 })

    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-CK-Appid, X-CK-Nonce',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    }
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

    const url = new URL(request.url)
    const [, host, ...rest] = url.pathname.split('/')
    if (!API_HOSTS.has(host) || rest[0] !== 'v2') {
      return new Response('Unknown eWeLink endpoint', { status: 400, headers: cors })
    }

    const headers = new Headers()
    for (const h of FORWARD_HEADERS) {
      const v = request.headers.get(h)
      if (v) headers.set(h, v)
    }
    const upstream = await fetch(`https://${host}/${rest.join('/')}${url.search}`, {
      method: request.method,
      headers,
      body: request.method === 'GET' ? undefined : await request.text(),
    })

    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...cors, 'Content-Type': upstream.headers.get('Content-Type') || 'application/json' },
    })
  },
}
