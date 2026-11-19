# AR Unity Shop: WebAR fashion try-on and spatial furniture preview

> **Status: Work in progress.** Prototype. Catalog, creators and checkout are demo data; no real payments are processed.

A browser-based augmented reality shopping prototype for [Unity Art Collective](https://unitycollective.art), built by Levi Howze (Army Captain turned finance and risk leader) with AI tools (Google AI Studio and Gemini). It explores how East African upcycled fashion and locally made furniture could be sold globally: shoppers try garments on through the front camera, place furniture in their room through the rear camera, and ask an AI stylist for fit and pairing advice.

## Why it matters

- **Commerce math kept testable.** Pricing, currency conversion, payment-rail fees and structured payment references live in pure functions (`src/utils/marketplaceLogic.ts`) with unit tests, separate from the 3D and UI code.
- **AI behind the server, with guardrails.** Gemini is called only from the server (`server.ts`), the API key never reaches the browser, requests are rate-limited per client, and the app returns a deterministic fallback answer when no key is configured.
- **Privacy by default.** Camera streams are used locally in the browser for preview and are not uploaded.

## Features

- Fashion virtual try-on overlay with size calibration (`FashionTryOnModal.tsx`)
- Spatial furniture placement over the rear camera with Three.js models (`FurnitureARModal.tsx`, `ThreeSceneBuilders.ts`)
- AI stylist and spatial advisor endpoints (Gemini, server-side)
- KES and USD cart and checkout drawer with mobile-money and card rails (simulated)
- Creator listing studio and shareable product cards

## Tech stack

TypeScript · React 19 · Vite · Tailwind CSS · Three.js · Express · Google Gemini (`@google/genai`)

## Run locally

```bash
bun install                # uses bun.lock (npm install hits a peer-dependency conflict)
cp .env.example .env      # optional: add your own Gemini key; without one the app uses built-in fallback answers
bun run dev               # http://localhost:3000
bun run test                # marketplace logic unit tests
```

## Intentionally omitted or replaced (security and privacy)

- Real payment numbers and the operating company's legal name are replaced with placeholders (`000000`, `111111`). There is no live payment integration or payment verification code.
- Creator names in the demo catalog are replaced with "Demo Creator" placeholders.
- AI Studio working files and generated media, keys, deployment details and git history are not included.

## Rights

No open-source license is granted for this repository unless one is added later. `src/App.tsx` carries the Apache-2.0 header from the original project template.
