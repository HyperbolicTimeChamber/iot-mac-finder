// eWeLink (CoolKit v2). The API sends no CORS headers, so requests go
// through the relay in worker/ — <relay>/<api host>/v2/...
import { norm } from '../lib/mac.js'

const hostFor = region => (region === 'cn' ? 'cn-apia.coolkit.cn' : `${region}-apia.coolkit.cc`)

const nonce = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), b => b.toString(16).padStart(2, '0')).join('')

async function sign(secret, payload) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

export async function fetchEwelink(cfg) {
  const relay = cfg.relayUrl.replace(/\/+$/, '')
  let host = hostFor(cfg.region || 'as')

  async function request(path, { method = 'GET', headers = {}, body, query } = {}) {
    const qs = query ? '?' + new URLSearchParams(query) : ''
    let res
    try {
      res = await fetch(`${relay}/${host}${path}${qs}`, {
        method,
        // App ID is optional here: the relay fills in its own when it's absent
        headers: { 'Content-Type': 'application/json', ...(cfg.appId && { 'X-CK-Appid': cfg.appId }), 'X-CK-Nonce': nonce(), ...headers },
        body,
      })
    } catch {
      throw new Error('Can\'t reach the eWeLink relay. Check the relay URL in Settings.')
    }
    return res.json()
  }

  async function login(retried = false) {
    const body = { countryCode: cfg.countryCode || '+91', password: cfg.password }
    if (cfg.account.includes('@')) body.email = cfg.account
    else body.phoneNumber = cfg.account
    const payload = JSON.stringify(body)
    // Without a custom app secret the relay signs the login itself
    const json = await request('/v2/user/login', {
      method: 'POST',
      headers: cfg.appId && cfg.appSecret ? { Authorization: `Sign ${await sign(cfg.appSecret, payload)}` } : {},
      body: payload,
    })
    // Account lives in another region: retry there once
    if (json.error === 10004 && json.data?.region && !retried) {
      host = hostFor(json.data.region)
      return login(true)
    }
    if (json.error !== 0 || !json.data?.at) throw new Error(`eWeLink login failed: ${json.msg || 'unknown error'} [${json.error}]`)
    return json.data.at
  }

  let token = await login()
  const authed = async (path, opts, retried = false) => {
    const json = await request(path, { ...opts, headers: { Authorization: `Bearer ${token}` } })
    // A newer sign-in elsewhere (another tab, the MCP) ends this session: sign in again once
    if ((json.error === 401 || json.error === 406) && !retried) {
      token = await login()
      return authed(path, opts, true)
    }
    if (json.error !== 0) throw new Error(`eWeLink ${path} failed: ${json.msg || ''} [${json.error}]`)
    return json.data
  }

  const { familyList = [] } = await authed('/v2/family')
  const devices = []
  for (const family of familyList) {
    const { thingList = [] } = await authed('/v2/device/thing', { query: { num: 0, familyid: family.id } })
    for (const t of thingList) {
      if (t.itemType !== 1 && t.itemType !== 2) continue
      const d = t.itemData
      devices.push({
        name: (d.name || '').trim(),
        model: [d.brandName, d.productModel].filter(Boolean).join(' '),
        src: 'eWeLink',
        home: family.name,
        online: !!d.online,
        mac: norm(d.params?.staMac),
        bssid: norm(d.params?.bssid),
        id: d.deviceid,
      })
    }
  }
  return devices
}
