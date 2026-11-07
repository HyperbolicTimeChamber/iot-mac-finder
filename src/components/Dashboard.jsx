import { useMemo, useState } from 'react'
import { extractMacs, fmt, guess, norm } from '../lib/mac.js'
import { loadDone, saveDone } from '../lib/storage.js'

// Highlight the searched hex digits inside a formatted MAC
function MarkedMac({ mac, q }) {
  const f = fmt(mac)
  const i = q ? mac.indexOf(q) : -1
  if (i < 0) return f
  const start = i + Math.floor(i / 2)
  const end = i + q.length + Math.floor((i + q.length - 1) / 2)
  return <>{f.slice(0, start)}<mark>{f.slice(start, end)}</mark>{f.slice(end)}</>
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="copy"
      aria-label={label}
      onClick={() => navigator.clipboard?.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }).catch(() => {})}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function BulkMatcher({ devices }) {
  const [text, setText] = useState('')
  const macs = useMemo(() => extractMacs(text), [text])
  const byMac = useMemo(() => new Map(devices.map(d => [d.mac, d])), [devices])
  const hits = macs.filter(m => byMac.has(m)).length

  return (
    <details>
      <summary>Paste a client list from Tether or the router page</summary>
      <label className="lbl" htmlFor="paste">Client list text</label>
      <textarea id="paste" spellCheck="false" value={text} onChange={e => setText(e.target.value)} placeholder="Paste anything. Every MAC address in the text is pulled out and matched." />
      <div className="hint">Works with 70:03:9F:7A:79:5A, 70-03-9F-7A-79-5A and 70039F7A795A.</div>
      {text.trim() && !macs.length && <div className="hint">No MAC addresses found in that text.</div>}
      {macs.length > 0 && (
        <div className="bulk-out">
          <div className="hint">{macs.length} MACs found · {hits} matched · {macs.length - hits} unknown</div>
          <table>
            <thead><tr><th>MAC</th><th>Device</th></tr></thead>
            <tbody>
              {macs.map(m => {
                const d = byMac.get(m)
                return (
                  <tr key={m}>
                    <td className="mono">{fmt(m)}</td>
                    {d
                      ? <td className="found">{d.name} <span className="sub">· {d.model}</span></td>
                      : <td className="unk">{guess(m)}</td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </details>
  )
}

export default function Dashboard({ devices, errors, loading, loadedAt, onRefresh, onSettings }) {
  const [q, setQ] = useState('')
  const [src, setSrc] = useState('all')
  const [hideDone, setHideDone] = useState(false)
  const [done, setDone] = useState(loadDone)

  const toggle = (mac, on) => {
    const next = new Set(done)
    on ? next.add(mac) : next.delete(mac)
    setDone(next)
    saveDone(next)
  }

  const raw = q.trim()
  const hex = norm(raw)
  const text = raw.toLowerCase()
  const rows = devices.filter(d => {
    if (src !== 'all' && d.src !== src) return false
    if (hideDone && done.has(d.mac)) return false
    if (!raw) return true
    return (hex.length >= 2 && d.mac.includes(hex)) || d.name.toLowerCase().includes(text) || d.model.toLowerCase().includes(text)
  })
  const finished = devices.filter(d => done.has(d.mac)).length
  const exact = hex.length === 12 ? devices.find(d => d.mac === hex) : null

  return (
    <div className="wrap">
      <header className="dash-head">
        <div>
          <h1>Home MAC Finder</h1>
          <p>Type any part of a MAC address, or a device name. Colons, dashes and case don't matter.</p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={onRefresh} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
          <button type="button" className="btn" onClick={onSettings}>Settings</button>
        </div>
      </header>

      {Object.entries(errors).map(([source, msg]) => (
        <div key={source} className="alert" role="alert"><b>{source}:</b> {msg}</div>
      ))}

      <section>
        <label className="lbl" htmlFor="q">Search</label>
        <input id="q" type="search" className="search" placeholder="e.g. 70:03:9F or b8d61a or Kitchen" autoComplete="off" spellCheck="false" value={q} onChange={e => setQ(e.target.value)} />
        {hex.length === 12 && (
          <div className="verdict">
            {exact
              ? <><b>{exact.name}</b> · {exact.model} on {exact.src} ({exact.home})</>
              : <><b className="mono">{fmt(hex)}</b> isn't in your accounts. {guess(hex)}</>}
          </div>
        )}
      </section>

      <BulkMatcher devices={devices} />

      <div className="filters" role="group" aria-label="Filter devices">
        {['all', 'eWeLink', 'TP-Link'].map(s => (
          <button key={s} type="button" className="chip" aria-pressed={src === s} onClick={() => setSrc(s)}>{s === 'all' ? 'All' : s}</button>
        ))}
        <button type="button" className="chip" aria-pressed={hideDone} onClick={() => setHideDone(!hideDone)}>Hide finished</button>
      </div>

      <section className="progress" aria-live="polite">
        <div className="progress-top">
          <span><b>{finished}</b> of {devices.length} finished</span>
          <span className="sub">Ticks are saved in this browser</span>
        </div>
        <div className="bar"><span style={{ width: devices.length ? `${(finished / devices.length) * 100}%` : 0 }} /></div>
      </section>

      <div className="list" aria-live="polite" aria-busy={loading}>
        {loading && !devices.length && <div className="empty">Signing in and loading your devices…</div>}
        {!loading && !devices.length && <div className="empty">No devices loaded. Check the errors above or your details in Settings.</div>}
        {devices.length > 0 && !rows.length && <div className="empty">No device in your accounts matches “{raw}”.</div>}
        {rows.map(d => (
          <div key={d.src + d.id} className={`row${done.has(d.mac) ? ' done' : ''}`}>
            <input type="checkbox" className="tick" id={`tick-${d.mac}`} checked={done.has(d.mac)} onChange={e => toggle(d.mac, e.target.checked)} aria-label={`Mark ${d.name} finished`} />
            <label className="name" htmlFor={`tick-${d.mac}`}>{d.name || '(no name)'}</label>
            <div className={`state ${d.online ? 'on' : 'off'}`}>{d.online ? 'Online' : 'Offline'}</div>
            <div className="meta">
              {d.mac ? <span className="mono mac"><MarkedMac mac={d.mac} q={hex.length >= 2 ? hex : ''} /></span> : <span>No MAC reported</span>}
              {d.mac && <CopyButton text={fmt(d.mac)} label={`Copy MAC for ${d.name}`} />}
              <span>{d.model}</span>
              <span>{d.src} · {d.home}</span>
              {d.ap && <span>Connected to {d.ap}</span>}
            </div>
          </div>
        ))}
      </div>

      <footer>
        {loadedAt && <>Loaded live from your accounts at {loadedAt.toLocaleTimeString()}. </>}
        "Connected to" is the access point each Sonoff last reported.
      </footer>
    </div>
  )
}
