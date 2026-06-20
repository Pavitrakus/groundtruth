# GroundTruth

The world that is your data.

GroundTruth turns live market, weather, news, and local system signals into real-time Helios world prompts. It is not a chart layer over video. The data becomes the environment.

## New Control Surface

- Top command bar: location, camera, Reactor model, frame mode, and director pulse.
- Globe picker: Bangalore, New York, Tokyo, Dubai, London, Iceland, Amazon, Sahara, Singapore, and Swiss Alps.
- Live weather follows the selected location coordinates.
- Camera modes: `Cine`, `Drone`, `Human`, and `Orbit`.
- Reactor models: `Helios` for cinematic world generation and `LingBot` for piloted drone mode.
- Frame modes: `World`, `Card`, `Map`, `Signal`, and `Dream`.
- Judge Run: a five-beat autoplay pitch sequence with cinematic captions and live prompt changes.
- Custom signal composer: enter a ticker, event, market move, fear level, weather, and world behavior.
- World events now live in the right-side rail on desktop so they do not cover the main HUD.

## Drone Controls

Switching to `Drone` automatically reboots the session into `LingBot`.

- Arrow up/down or `W`/`S`: fly forward/back.
- Arrow left/right or `Q`/`E`: yaw left/right.
- `A`/`D`: strafe left/right.
- `R`/`F`: look up/down.
- `Shift`: faster rotation.
- `Space`: stop and idle.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

The Vite app proxies `/api/token` to the local token server on `http://localhost:3101`. Keep `REACTOR_API_KEY` in `.env`; do not put it in browser code.

## Deploy On Vercel

1. Import this repo into Vercel.
2. Add `REACTOR_API_KEY` in Project Settings > Environment Variables.
3. Deploy with the default Vite settings.

Production uses `api/token.ts` as a Vercel Function for `/api/token`; the local `server/token.js` is only for `npm run dev`.

## Demo Flow

1. Open the app and let the live HUD populate.
2. Say: "This world has no pre-written scenes. It is built from live data, right now."
3. Click `Run` for the Judge Run sequence, then let the caption layer narrate the transformation.
4. Say: "Markets down 15 percent? This is what that feels like."
5. Say: "Euphoria has a color. Panic has a color. GroundTruth makes you feel data, not read it."
6. After the sequence, click `Drone`. Pilot the world with arrow keys.
7. Close with: "This is what Bloomberg Terminal looks like in 2030. Not a chart. A world."

## Judge Mapping

- World Model Native: a traditional dashboard cannot turn live reality into a changing cinematic world.
- Real-Time Interactivity: live data pulses and manual demo events change Helios prompts while generation streams.
- Usefulness and Potential: this is an emotional operating system for markets, climate, incident response, and news rooms.

## Fallbacks

Live APIs can throttle during a demo. The override buttons inject deterministic demo snapshots so the presentation still lands:

- `Market crash`
- `Bull run`
- `Storm alert`
- `Market open`
- `Circuit breaker`

Use `Live feed` to hand control back to real data.

Use `Custom signal` to create a user-authored market/world event such as `TSLA`, a shock headline, storm weather, and a collapse or dream behavior. Custom mode persists until `Live feed` or another override is selected.
