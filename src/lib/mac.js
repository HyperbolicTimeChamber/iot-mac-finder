// MAC address helpers: normalise any notation to 12 upper-case hex digits.

export const norm = s => (s || '').toUpperCase().replace(/[^0-9A-F]/g, '')

export const fmt = m => (m.match(/.{2}/g) || []).join(':')

// A bssid of all zeros means the device didn't report one
export const isBlank = m => !m || /^0+$/.test(m)

// Pull every MAC out of free text (Tether / router client list pastes)
export function extractMacs(text) {
  const found = text.match(/\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b|\b[0-9A-Fa-f]{12}\b/g) || []
  return [...new Set(found.map(norm))]
}

// Vendor prefixes worth calling out for MACs that aren't in either account
// Prefixes seen on this household's own Sonoffs and TP-Link gear
const ESPRESSIF = ['70039F', 'C44F33', '7C87CE', 'A4F00F', 'D4E9F4', 'B8D61A', 'E0E2E6', '083AF2', '2043A8', '249494']
const TPLINK = ['28EE52', 'D84489', '1027F5', '14EBB6', '3C7895', '40ED00']

// Prefixes commonly reported for WiZ (Philips Wi-Fi) bulbs; treated as a hint, not proof
const WIZ = ['A8BB50', '6C2990', '444F8E', 'D8A011']

export function guess(mac) {
  const oui = mac.slice(0, 6)
  if (WIZ.includes(oui)) return 'Likely a Philips WiZ Wi-Fi bulb. Add it under "Add a device by hand" once you know which one.'
  if (ESPRESSIF.includes(oui)) return 'Espressif chip, used in Sonoff and most Wi-Fi smart switches. Likely a smart device that isn\'t on your eWeLink account.'
  if (TPLINK.includes(oui)) return 'TP-Link hardware. Possibly a router, extender or Tapo device not bound to your TP-Link ID.'
  if (/^.[26AE]/.test(mac)) return 'Private (randomized) address. Usually a phone, tablet or laptop, not a smart device.'
  return 'Not in either account. Not a known smart-device vendor prefix.'
}

// Routers broadcast from radio MACs that differ from the base MAC in the
// first bytes, so match an access point on the last three bytes.
export function apLabel(bssid, devices) {
  if (isBlank(bssid)) return ''
  const exact = devices.find(d => d.mac === bssid)
  if (exact) return exact.name
  const tail = bssid.slice(6)
  const near = devices.find(d => d.src === 'TP-Link' && d.mac.slice(6) === tail)
  return near ? near.name : fmt(bssid)
}
