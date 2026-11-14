# Orbital Command — 3D Space Mission Design Game

An interactive 3D educational space mission design, orbital mechanics, systems engineering, and multiplayer mission control simulation built with React, TypeScript, Tailwind CSS, Zustand, Three.js, Express, and Socket.IO.

## Setup & Run Commands

```bash
# Install dependencies
npm install

# Run full-stack development server (Express + Socket.IO + Vite on port 3000)
npm run dev

# TypeScript check & production build
npm run lint
npm run build

# Run production server
NODE_ENV=production npm start

# Run engineering & orbital mechanics unit tests
npx --yes tsx --test src/engine/*.test.ts
```

## Environment Variables

See `.env.example`:
- `PORT`: Server port (defaults to `3000`).
- `APP_URL`: Hosted application URL.
- `GEMINI_API_KEY`: Optional server-side API key (not required for core gameplay).

## Testing Multiplayer Squads

1. Open the app in two browser tabs (`http://localhost:3000/?autostart=1`).
2. Navigate to **Squad** in Tab 1, enter a callsign and squad name, and click **Create Squad & Generate Room Code**.
3. Copy the generated room code (e.g. `ORB-XXXX`).
4. Navigate to **Squad** in Tab 2, enter a callsign and the room code, and click **Join Squad Room**.
5. Edit spacecraft, payloads, orbital plans, or chat in either tab to see real-time synchronization and role-gated mission progression.

## Data Sources & Educational Disclaimers

- **NASA/JPL Horizons API**: Queried via `/api/nasa/horizons` for heliocentric target state vectors (`KM-S`, `J2000 Ecliptic`). When offline or unreachable, the app switches to clearly labeled non-live curated reference elements.
- **Orbital Mechanics**: Uses idealized coplanar circular patched-conic Hohmann equations and the Tsiolkovsky rocket equation for educational estimation.
- **Systems Engineering**: Lifecycle phases (Pre-Phase A–Phase F) and design gates (MCR–PFAR) are an educational adaptation and do not represent official NASA certification.
