# Home MAC Finder

Search a MAC address and see which smart device it belongs to. Pulls devices live from your
**TP-Link ID** (routers, extenders, Tapo), **eWeLink** (Sonoff) and **Govee** accounts, and matches
pasted client lists from Tether or the router admin page. Devices with no API, such as Philips WiZ
bulbs, can be added by hand.

Live site: https://hyperbolictimechamber.github.io/iot-mac-finder/

## How it works

- Static React app (Vite), deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.
- You enter account details in the Settings form. They stay in your browser (session storage, or
  local storage if you tick "Remember") and are sent only to TP-Link and eWeLink. Nothing is in this repo.
- **TP-Link cloud** and **Govee** allow browser requests, so the app calls them directly. Govee uses
  the Govee app's own (unofficial) sign-in, which returns each device's Wi-Fi MAC.
- **eWeLink** blocks browser requests (no CORS headers), so its calls go through a small Cloudflare
  Worker in `worker/` that forwards to eWeLink's API hosts only and stores nothing.
- "Finished" ticks are saved in your browser's local storage.

## Deploy the eWeLink relay

```sh
cd worker
npx wrangler login     # once, opens Cloudflare in the browser
npx wrangler deploy    # prints https://ewelink-relay.<you>.workers.dev
```

Paste that URL into **Relay URL** in Settings. The deployed relay for this site is https://ewelink-relay.hyperbolictimechamber.workers.dev and is pre-filled. To allow another origin, edit `ALLOWED_ORIGINS` in
`worker/wrangler.toml` and deploy again.

## eWeLink App ID / Secret

eWeLink sign-in has to be signed with an app ID and secret. The relay holds them as Cloudflare
secrets and signs the login itself, so the form only asks for email and password:

```sh
cd worker
npx wrangler secret put APP_ID
npx wrangler secret put APP_SECRET
```

Use your own pair from https://dev.ewelink.cc, or the public pair from homebridge-ewelink. To use a
different pair for one browser only, fill both fields under Settings → Advanced.

## What it can't do

It can't rename devices on the router. A web page served over HTTPS can't call the router's HTTP
admin interface on your home network, and Tether renames devices through its own private protocol.
Rename clients in the Tether app (Clients → device → edit name).

## Local development

```sh
npm install
npm run dev   # http://localhost:5173/iot-mac-finder/
```
