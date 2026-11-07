// Settings live only in this browser: localStorage when "remember" is on,
// sessionStorage (cleared when the tab closes) otherwise.
const SETTINGS = 'mac-finder-settings'
const DONE = 'mac-finder-done'

export const DEFAULT_SETTINGS = {
  tplinkEmail: '',
  tplinkPassword: '',
  ewelinkAccount: '',
  ewelinkPassword: '',
  ewelinkCountryCode: '+91',
  ewelinkRegion: 'as',
  ewelinkAppId: '',
  ewelinkAppSecret: '',
  relayUrl: '',
  remember: false,
}

export function loadSettings() {
  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = store.getItem(SETTINGS)
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
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
