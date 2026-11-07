// TP-Link cloud (TP-Link ID). The cloud sends CORS headers, so the browser
// calls it directly — same login the Kasa / Tether apps use.
import { norm } from '../lib/mac.js'

const CLOUD = 'https://wap.tplinkcloud.com'

// Stable terminal id per browser, so the account doesn't see a new phone every visit
function terminalUUID() {
  try {
    let id = localStorage.getItem('mac-finder-terminal')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('mac-finder-terminal', id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

async function call(url, method, params) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }),
  })
  return res.json()
}

const TYPE_LABEL = {
  WIRELESSROUTER: 'Router',
  RANGEEXTENDER: 'Extender',
  'SMART.TAPOPLUG': 'Smart plug',
  'SMART.TAPOBULB': 'Smart bulb',
  'SMART.IPCAMERA': 'Camera',
  'IOT.SMARTPLUGSWITCH': 'Smart plug',
  'IOT.SMARTBULB': 'Smart bulb',
}

// Tapo devices store their alias base64-encoded
function decodeAlias(alias, type) {
  if (!alias || !type?.startsWith('SMART.')) return alias || ''
  try {
    const text = new TextDecoder().decode(Uint8Array.from(atob(alias), c => c.charCodeAt(0)))
    return /^[\P{C}]+$/u.test(text) ? text : alias
  } catch {
    return alias
  }
}

export async function fetchTplink({ email, password }) {
  const login = await call(CLOUD, 'login', {
    appType: 'Kasa_Android',
    cloudUserName: email,
    cloudPassword: password,
    terminalUUID: terminalUUID(),
  })
  if (login.error_code !== 0 || !login.result?.token) {
    throw new Error(`TP-Link login failed: ${login.msg || 'unknown error'} [${login.error_code}]`)
  }
  const list = await call(`${CLOUD}?token=${encodeURIComponent(login.result.token)}`, 'getDeviceList', {})
  if (list.error_code !== 0) throw new Error(`TP-Link device list failed: ${list.msg || ''} [${list.error_code}]`)

  return (list.result?.deviceList || []).map(d => {
    const kind = TYPE_LABEL[d.deviceType] || d.deviceType
    return {
      name: decodeAlias(d.alias, d.deviceType),
      model: d.deviceModel,
      src: 'TP-Link',
      home: kind,
      online: d.status === 1,
      mac: norm(d.deviceMac),
      bssid: '',
      id: d.deviceId,
    }
  })
}
