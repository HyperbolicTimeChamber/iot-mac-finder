import { useState } from 'react'
import { DEFAULT_SETTINGS } from '../lib/storage.js'
import { ewelinkAccount, hasEwelink, hasGovee, hasTplink, signInEwelink, signInGovee, signInTplink } from '../api/accounts.js'

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

function PasswordField({ id, label, hint, ...props }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="field">
      <label className="lbl" htmlFor={id}>{label}</label>
      <div className="pw">
        <input id={id} type={visible ? 'text' : 'password'} spellCheck="false" autoCapitalize="off" {...props} />
        <button
          type="button"
          className="pw-toggle"
          onClick={() => setVisible(!visible)}
          aria-controls={id}
          aria-pressed={visible}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  )
}

// Signs in to one account on demand and reports the result inline
function Reauth({ label, ready, missing, run }) {
  const [state, setState] = useState({ status: 'idle' })
  async function go() {
    setState({ status: 'busy' })
    try {
      const devices = await run()
      setState({ status: 'ok', text: `Signed in. ${devices.length} device${devices.length === 1 ? '' : 's'} found.` })
    } catch (err) {
      setState({ status: 'error', text: err.message || String(err) })
    }
  }
  return (
    <div className="reauth">
      <button type="button" className="btn" onClick={go} disabled={!ready || state.status === 'busy'}>
        {state.status === 'busy' ? 'Signing in…' : `Reauthenticate ${label}`}
      </button>
      <span className={`reauth-msg ${state.status}`} role="status">
        {!ready ? missing : state.text}
      </span>
    </div>
  )
}

export default function Settings({ initial, onSave, onCancel, onForget }) {
  const [s, setS] = useState(initial || DEFAULT_SETTINGS)
  const [problem, setProblem] = useState('')
  const set = key => e => setS({ ...s, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  function submit(e) {
    e.preventDefault()
    if (((s.sameEmail && s.ewelinkPassword) || (s.goveeSameEmail && s.goveePassword)) && !s.tplinkEmail) {
      return setProblem('Enter your email under TP-Link ID, or untick "Same email".')
    }
    if (!hasTplink(s) && !hasEwelink(s) && !hasGovee(s)) return setProblem('Fill in at least one account: TP-Link, eWeLink or Govee.')
    if (hasEwelink(s) && !s.relayUrl) return setProblem('eWeLink needs the relay URL. Find it under Advanced.')
    if (Boolean(s.ewelinkAppId) !== Boolean(s.ewelinkAppSecret)) {
      return setProblem('Fill in both App ID and App Secret under Advanced, or leave both empty.')
    }
    setProblem('')
    onSave({ ...s, ewelinkAccount: ewelinkAccount(s), tplinkEmail: s.tplinkEmail.trim(), relayUrl: s.relayUrl.trim() })
  }

  return (
    <div className="wrap">
      <header>
        <h1>Home MAC Finder</h1>
        <p>Connect your accounts. Fill in only the ones you use. Everything you enter stays in this browser and is sent only to that service.</p>
      </header>

      <form className="settings" onSubmit={submit} autoComplete="on">
        <fieldset>
          <legend>TP-Link ID</legend>
          <p className="hint">The account you use in Tether. Lists your routers, extenders and Tapo devices.</p>
          <Field id="tplinkEmail" label="Email" type="email" autoComplete="username" value={s.tplinkEmail} onChange={set('tplinkEmail')} />
          <PasswordField id="tplinkPassword" label="Password" autoComplete="current-password" value={s.tplinkPassword} onChange={set('tplinkPassword')} />
          <Reauth label="TP-Link" ready={hasTplink(s)} missing="Enter email and password to test." run={() => signInTplink(s)} />
        </fieldset>

        <fieldset>
          <legend>eWeLink</legend>
          <p className="hint">Lists your Sonoff devices with their MAC addresses.</p>
          <label className="check">
            <input id="sameEmail" type="checkbox" checked={s.sameEmail} onChange={set('sameEmail')} />
            <span>Same email as my TP-Link ID</span>
          </label>
          {s.sameEmail
            ? <div className="field">
                <span className="lbl">Email</span>
                <div className="linked mono">{s.tplinkEmail || 'Enter your email in TP-Link ID above'}</div>
              </div>
            : <Field id="ewelinkAccount" label="Email or phone" value={s.ewelinkAccount} onChange={set('ewelinkAccount')} hint="Phone numbers include the country code, e.g. +919800000000." />}
          <PasswordField id="ewelinkPassword" label="Password" autoComplete="off" value={s.ewelinkPassword} onChange={set('ewelinkPassword')} />
          <Reauth label="eWeLink" ready={hasEwelink(s) && Boolean(s.relayUrl)} missing="Enter email and password to test." run={() => signInEwelink(s)} />
        </fieldset>

        <fieldset>
          <legend>Govee</legend>
          <p className="hint">Lists your Govee lights and plugs with their Wi-Fi MAC addresses. Uses the Govee app's sign-in.</p>
          <label className="check">
            <input id="goveeSameEmail" type="checkbox" checked={s.goveeSameEmail} onChange={set('goveeSameEmail')} />
            <span>Same email as my TP-Link ID</span>
          </label>
          {s.goveeSameEmail
            ? <div className="field">
                <span className="lbl">Email</span>
                <div className="linked mono">{s.tplinkEmail || 'Enter your email in TP-Link ID above'}</div>
              </div>
            : <Field id="goveeEmail" label="Email" type="email" value={s.goveeEmail} onChange={set('goveeEmail')} />}
          <PasswordField id="goveePassword" label="Password" autoComplete="off" value={s.goveePassword} onChange={set('goveePassword')} />
          <Reauth label="Govee" ready={hasGovee(s)} missing="Enter email and password to test." run={() => signInGovee(s)} />
        </fieldset>

        <details className="advanced">
          <summary>Advanced</summary>
          <p className="hint">You don't need to change these. The defaults work for accounts in India.</p>
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
          <Field id="relayUrl" label="eWeLink relay URL" type="url" placeholder="https://ewelink-relay.<you>.workers.dev" value={s.relayUrl} onChange={set('relayUrl')} hint="eWeLink blocks browser requests, so they go through a Cloudflare Worker (see the README)." />
          <div className="row2">
            <Field id="ewelinkAppId" label="eWeLink App ID" autoComplete="off" placeholder="Relay's own" value={s.ewelinkAppId} onChange={set('ewelinkAppId')} />
            <PasswordField id="ewelinkAppSecret" label="eWeLink App Secret" autoComplete="off" placeholder="Relay's own" value={s.ewelinkAppSecret} onChange={set('ewelinkAppSecret')} />
          </div>
          <div className="hint">Leave both empty to use the relay's app credentials.</div>
        </details>

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
