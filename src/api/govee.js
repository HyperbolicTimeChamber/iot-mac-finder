// Govee account API — the same sign-in the Govee app uses (unofficial; also
// used by homebridge-govee). It sends CORS headers, so the browser calls it
// directly. Each device's Wi-Fi MAC sits in deviceExt.deviceSettings.
import { norm } from '../lib/mac.js'

const BASE = 'https://app2.govee.com'

// Stable client id per browser, like the app's install id
function clientId() {
  try {
    let id = localStorage.getItem('mac-finder-govee-client')
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, '')
      localStorage.setItem('mac-finder-govee-client', id)
    }
    return id
  } catch {
    return crypto.randomUUID().replace(/-/g, '')
  }
}

const parse = s => {
  if (s && typeof s === 'object') return s
  try { return JSON.parse(s || '{}') } catch { return {} }
}

export async function fetchGovee({ email, password }) {
  const client = clientId()
  const login = await fetch(`${BASE}/account/rest/account/v1/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, client }),
  }).then(r => r.json())
  const token = login.client?.token
  if (!token) throw new Error(`Govee login failed: ${login.message || 'unknown error'} [${login.status}]`)

  const list = await fetch(`${BASE}/device/rest/devices/v1/list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      appVersion: '5.6.01',
      clientId: client,
      clientType: '1',
      iotVersion: '0',
      timestamp: String(Date.now()),
    },
    body: '{}',
  }).then(r => r.json())
  if (!Array.isArray(list.devices)) throw new Error(`Govee device list failed: ${list.message || 'unknown error'} [${list.status}]`)

  return list.devices.map(d => {
    const settings = parse(d.deviceExt?.deviceSettings)
    const last = parse(d.deviceExt?.lastDeviceData)
    return {
      name: (d.deviceName || settings.deviceName || d.sku || '').trim(),
      model: ['Govee', d.sku].filter(Boolean).join(' '),
      src: 'Govee',
      home: settings.wifiName ? `Wi-Fi ${settings.wifiName}` : 'Govee',
      online: last.online === true || last.online === 'true',
      mac: norm(settings.wifiMac),
      bssid: '',
      id: d.device,
    }
  })
}
