import { useCallback, useEffect, useState } from 'react'
import Settings from './components/Settings.jsx'
import Dashboard from './components/Dashboard.jsx'
import { hasEwelink, hasGovee, hasTplink, signInEwelink, signInGovee, signInTplink } from './api/accounts.js'
import { apLabel } from './lib/mac.js'
import { clearSettings, loadManual, loadSettings, saveManual, saveSettings } from './lib/storage.js'

const SOURCE_ORDER = ['eWeLink', 'Govee', 'Manual', 'TP-Link']

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
  const [manual, setManual] = useState(loadManual)
  const updateManual = list => {
    setManual(list)
    saveManual(list)
  }

  const load = useCallback(async s => {
    setLoading(true)
    const jobs = []
    if (hasTplink(s)) jobs.push(['TP-Link', signInTplink(s)])
    if (hasEwelink(s)) jobs.push(['eWeLink', signInEwelink(s)])
    if (hasGovee(s)) jobs.push(['Govee', signInGovee(s)])
    const results = await Promise.allSettled(jobs.map(([, p]) => p))
    const all = []
    const errs = {}
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') all.push(...r.value)
      else errs[jobs[i][0]] = r.reason?.message || String(r.reason)
    })
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

  // Smart devices first, then the network gear they connect through
  const shown = [...devices, ...manual.map(m => ({ ...m, src: 'Manual', home: 'Added by hand', online: null, bssid: '', ap: '', id: m.mac }))]
    .sort((a, b) => SOURCE_ORDER.indexOf(a.src) - SOURCE_ORDER.indexOf(b.src))

  return (
    <Dashboard
      devices={shown}
      onAddManual={m => updateManual([...manual.filter(x => x.mac !== m.mac), m])}
      onRemoveManual={mac => updateManual(manual.filter(x => x.mac !== mac))}
      errors={errors}
      loading={loading}
      loadedAt={loadedAt}
      onRefresh={() => load(settings)}
      onSettings={() => setEditing(true)}
    />
  )
}
