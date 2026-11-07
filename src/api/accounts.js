// Turn saved settings into each account's sign-in call
import { fetchTplink } from './tplink.js'
import { fetchEwelink } from './ewelink.js'
import { fetchGovee } from './govee.js'

export const ewelinkAccount = s => (s.sameEmail ? s.tplinkEmail : s.ewelinkAccount).trim()
export const goveeEmail = s => (s.goveeSameEmail ? s.tplinkEmail : s.goveeEmail).trim()

export const hasTplink = s => Boolean(s.tplinkEmail && s.tplinkPassword)
export const hasEwelink = s => Boolean(ewelinkAccount(s) && s.ewelinkPassword)
export const hasGovee = s => Boolean(goveeEmail(s) && s.goveePassword)

export const signInTplink = s => fetchTplink({ email: s.tplinkEmail.trim(), password: s.tplinkPassword })

export const signInEwelink = s => fetchEwelink({
  account: ewelinkAccount(s),
  password: s.ewelinkPassword,
  countryCode: s.ewelinkCountryCode,
  region: s.ewelinkRegion,
  appId: s.ewelinkAppId,
  appSecret: s.ewelinkAppSecret,
  relayUrl: s.relayUrl.trim(),
})

export const signInGovee = s => fetchGovee({ email: goveeEmail(s), password: s.goveePassword })
