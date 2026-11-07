// Settings live only in this browser: localStorage when "remember" is on,
// sessionStorage (cleared when the tab closes) otherwise.
const SETTINGS = 'mac-finder-settings'
const DONE = 'mac-finder-done'

export const DEFAULT_SETTINGS = {
  tplinkEmail: '',
  tplinkPassword: '',
  ewelinkAccount: '',
  sameEmail: true,
  goveeEmail: '',
  goveePassword: '',
  goveeSameEmail: true,
  ewelinkPassword: '',
  ewelinkCountryCode: '+91',
  ewelinkRegion: 'as',
  ewelinkAppId: '',
  ewelinkAppSecret: '',
  relayUrl: 'https://ewelink-relay.hyperbolictimechamber.workers.dev',
  remember: false,
}

export function loadSettings() {
  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = store.getItem(SETTINGS)
      if (raw) {
        const saved = JSON.parse(raw)
        // Settings saved before "same email" existed: tick it only if the emails already matched
        if (!('sameEmail' in saved)) saved.sameEmail = !saved.ewelinkAccount || saved.ewelinkAccount === saved.tplinkEmail
        return { ...DEFAULT_SETTINGS, ...saved }
      }
    } catch {}
  }
  return null
}

export function saveSettings(s) {
  try {
    localStorage.removeItem(SETTINGS)
    sessionStorage.removeItem(SETTINGS)
    ;(s.remember ? localStorage : sessionStorage).setItem(SETTINGS, JSON.stringify(s))
  } catch {}
}

export function clearSettings() {
  try {
    localStorage.removeItem(SETTINGS)
    sessionStorage.removeItem(SETTINGS)
  } catch {}
}

// Devices added by hand (e.g. Philips WiZ bulbs, which have no API)
const MANUAL = 'mac-finder-manual'

export function loadManual() {
  try {
    return JSON.parse(localStorage.getItem(MANUAL) || '[]')
  } catch {
    return []
  }
}

export function saveManual(list) {
  try {
    localStorage.setItem(MANUAL, JSON.stringify(list))
  } catch {}
}

export function loadDone() {
  try {
    return new Set(JSON.parse(localStorage.getItem(DONE) || '[]'))
  } catch {
    return new Set()
  }
}

export function saveDone(set) {
  try {
    localStorage.setItem(DONE, JSON.stringify([...set]))
  } catch {}
}
