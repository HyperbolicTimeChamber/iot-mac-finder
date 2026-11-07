import { useState } from 'react'
import { DEFAULT_SETTINGS } from '../lib/storage.js'

const REGIONS = [
  ['as', 'Asia (as)'],
  ['eu', 'Europe (eu)'],
  ['us', 'Americas (us)'],
  ['cn', 'China (cn)'],
]

function Field({ id, label, hint, ...props }) {
  return (
    <div className="field">
      <label className="lbl" htmlFor={id}>{label}</label>
      <input id={id} {...props} />
      {hint && <div className="hint">{hint}</div>}
    </div>
  )
}

export default function Settings({ initial, onSave, onCancel, onForget }) {
  const [s, setS] = useState(initial || DEFAULT_SETTINGS)
  const [problem, setProblem] = useState('')
  const set = key => e => setS({ ...s, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  function submit(e) {
    e.preventDefault()
    const hasTplink = s.tplinkEmail && s.tplinkPassword
    const hasEwelink = s.ewelinkAccount && s.ewelinkPassword
    if (!hasTplink && !hasEwelink) return setProblem('Fill in at least one account: TP-Link or eWeLink.')
    if (hasEwelink && (!s.relayUrl || !s.ewelinkAppId || !s.ewelinkAppSecret)) {
      return setProblem('eWeLink also needs the relay URL, App ID and App Secret.')
    }
    setProblem('')
    onSave({ ...s, ewelinkAccount: s.ewelinkAccount.trim(), tplinkEmail: s.tplinkEmail.trim(), relayUrl: s.relayUrl.trim() })
  }

  return (
    <div className="wrap">
      <header>
        <h1>Home MAC Finder</h1>
        <p>Connect your accounts. Everything you enter stays in this browser and is sent only to TP-Link and eWeLink.</p>
      </header>

      <form className="settings" onSubmit={submit} autoComplete="on">
        <fieldset>
          <legend>TP-Link ID</legend>
          <p className="hint">The account you use in Tether. Lists your routers, extenders and Tapo devices.</p>
          <Field id="tplinkEmail" label="Email" type="email" autoComplete="username" value={s.tplinkEmail} onChange={set('tplinkEmail')} />
          <Field id="tplinkPassword" label="Password" type="password" autoComplete="current-password" value={s.tplinkPassword} onChange={set('tplinkPassword')} />
        </fieldset>

        <fieldset>
          <legend>eWeLink</legend>
          <p className="hint">Lists your Sonoff devices with their MAC addresses.</p>
          <Field id="ewelinkAccount" label="Email or phone" value={s.ewelinkAccount} onChange={set('ewelinkAccount')} hint="Phone numbers include the country code, e.g. +919800000000." />
          <Field id="ewelinkPassword" label="Password" type="password" autoComplete="off" value={s.ewelinkPassword} onChange={set('ewelinkPassword')} />
          <div className="row2">
            <Field id="ewelinkCountryCode" label="Country code" value={s.ewelinkCountryCode} onChange={set('ewelinkCountryCode')} />
            <div className="field">
              <label className="lbl" htmlFor="ewelinkRegion">Region</label>
              <select id="ewelinkRegion" value={s.ewelinkRegion} onChange={set('ewelinkRegion')}>
                {REGIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <div className="hint">Corrected automatically on sign-in.</div>
            </div>
          </div>
          <Field id="relayUrl" label="Relay URL" type="url" placeholder="https://ewelink-relay.<you>.workers.dev" value={s.relayUrl} onChange={set('relayUrl')} hint="eWeLink blocks browser requests, so they go through your own Cloudflare Worker (see the README)." />
          <div className="row2">
            <Field id="ewelinkAppId" label="App ID" autoComplete="off" value={s.ewelinkAppId} onChange={set('ewelinkAppId')} />
            <Field id="ewelinkAppSecret" label="App Secret" type="password" autoComplete="off" value={s.ewelinkAppSecret} onChange={set('ewelinkAppSecret')} />
          </div>
        </fieldset>

        <label className="check">
          <input id="remember" type="checkbox" checked={s.remember} onChange={set('remember')} />
          <span>Remember on this device. Off: cleared when you close the tab. On: saved unencrypted in this browser's storage.</span>
        </label>

        {problem && <div className="alert" role="alert">{problem}</div>}

        <div className="actions">
          <button type="submit" className="btn primary">Open dashboard</button>
          {onCancel && <button type="button" className="btn" onClick={onCancel}>Cancel</button>}
          {initial && <button type="button" className="btn danger" onClick={onForget}>Forget saved details</button>}
        </div>
      </form>
    </div>
  )
}
