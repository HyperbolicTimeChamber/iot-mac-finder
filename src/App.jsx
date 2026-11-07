import { useCallback, useEffect, useState } from 'react'
import Settings from './components/Settings.jsx'
import Dashboard from './components/Dashboard.jsx'
import { fetchTplink } from './api/tplink.js'
import { fetchEwelink } from './api/ewelink.js'
import { apLabel } from './lib/mac.js'
import { clearSettings, loadSettings, saveSettings } from './lib/storage.js'

function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('mac-finder-theme') || 'dark' } catch { return 'dark' }
  })
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('mac-finder-theme', theme) } catch {}
  }, [theme])
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button type="button" className="theme-toggle" onClick={() => setTheme(next)} aria-label={`Switch to ${next} theme`}>
      {next === 'light' ? 'Light' : 'Dark'}
    </button>
  )
}

export default function App() {
  return (
    <>
      <ThemeToggle />
      <Main />
    </>
  )
}

function Main() {
  const [settings, setSettings] = useState(loadSettings)
  const [editing, setEditing] = useState(() => !loadSettings())
  const [devices, setDevices] = useState([])
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [loadedAt, setLoadedAt] = useState(null)

  const load = useCallback(async s => {
    setLoading(true)
    const jobs = []
    if (s.tplinkEmail && s.tplinkPassword) {
      jobs.push(['TP-Link', fetchTplink({ email: s.tplinkEmail, password: s.tplinkPassword })])
    }
    if (s.ewelinkAccount && s.ewelinkPassword) {
      jobs.push(['eWeLink', fetchEwelink({
        account: s.ewelinkAccount,
        password: s.ewelinkPassword,
        countryCode: s.ewelinkCountryCode,
        region: s.ewelinkRegion,
        appId: s.ewelinkAppId,
        appSecret: s.ewelinkAppSecret,
        relayUrl: s.relayUrl,
      })])
    }
    const results = await Promise.allSettled(jobs.map(([, p]) => p))
    const all = []
    const errs = {}
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') all.push(...r.value)
      else errs[jobs[i][0]] = r.reason?.message || String(r.reason)
    })
    // eWeLink devices first, then the network gear they connect through
    all.sort((a, b) => (a.src === b.src ? 0 : a.src === 'eWeLink' ? -1 : 1))
    for (const d of all) d.ap = apLabel(d.bssid, all)
    setDevices(all)
    setErrors(errs)
    setLoadedAt(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (settings && !editing) load(settings)
  }, [settings, editing, load])

  if (editing) {
    return (
      <Settings
        initial={settings}
        onSave={s => {
          saveSettings(s)
          setSettings(s)
          setEditing(false)
        }}
        onCancel={settings ? () => setEditing(false) : null}
        onForget={() => {
          clearSettings()
          setSettings(null)
          setDevices([])
        }}
      />
    )
  }

  return (
    <Dashboard
      devices={devices}
      errors={errors}
      loading={loading}
      loadedAt={loadedAt}
      onRefresh={() => load(settings)}
      onSettings={() => setEditing(true)}
    />
  )
}
