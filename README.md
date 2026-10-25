# ❄️ ColdTwin — Digital Twin for Cold Storage

ColdTwin is a responsive, accessible web-based digital twin application for agricultural cold storage management. Built for facility operators and farmers, ColdTwin bridges telemetry data with operational intelligence to detect refrigeration faults early, calculate dynamic produce shelf life, optimize sales schedules using dynamic FEFO (First-Expired-First-Out), and curtail avoidable energy waste.

---

## 🚀 How to Run

### Prerequisites
- Node.js (v18.0.0 or later)
- npm (v9.0.0 or later)

### Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/YOUR_USERNAME/ColdTwin.git
cd "ColdTwin"
npm install
```

### Development
Start the local development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### Testing
Execute the complete test suite powered by Vitest:
```bash
npm test
# or run in one-shot mode:
npx vitest run
```

### Production Build
Type-check with TypeScript and build an optimized production bundle:
```bash
npm run build
```

---

## 📁 Folder Structure

```
cold-twin/
├── public/                     # Static assets and icons
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── layout/             # App shell, navigation sidebar, mobile bottom tab bar, role switcher
│   │   └── walkthrough/        # 3-step interactive first-launch onboarding tour
│   ├── engine/                 # Digital twin simulation, physical, and statistical models
│   │   ├── __tests__/          # Vitest unit test suites for all engine modules
│   │   ├── demoData.ts         # Deterministic demo generator (60 days, 4 chambers, 12 lots, faults)
│   │   ├── energyWaste.ts      # Energy waste & excess tariff calculation model
│   │   ├── faultDetection.ts   # Multi-signal fault diagnosis & EWMA residual tracking
│   │   ├── ranking.ts          # Lot ranking & FEFO priority dispatching
│   │   ├── shelfLife.ts        # Q10 kinetic shelf-life decay with chilling injury support
│   │   └── thermalTwin.ts      # Chamber thermal physics & heat transfer twin
│   ├── i18n/                   # Multilingual localization dictionaries
│   │   ├── en.ts               # English translations
│   │   ├── te.ts               # Telugu (తెలుగు) translations
│   │   ├── hi.ts               # Hindi (हिन्दी) translations
│   │   └── index.ts            # Translation hooks and language provider
│   ├── pages/                  # Top-level view routes
│   │   ├── Assumptions.tsx     # Physical assumptions & mathematical formulations documentation
│   │   ├── Dashboard.tsx       # Real-time facility overview, alert banners, and Sell-First list
│   │   ├── DataInput.tsx       # CSV/Excel bulk upload and manual sensor/lot logging
│   │   ├── DigitalTwin.tsx     # Live chamber microclimate simulator & fault injector
│   │   ├── Lots.tsx            # Inventory tracking, batch shelf-life cards, and search filters
│   │   ├── Reports.tsx         # Executive facility summary and role-scoped farmer reports
│   │   └── Settings.tsx        # Alert thresholds, produce reference library, and preferences
│   ├── store/
│   │   └── useStore.ts         # Zustand application state, dark mode, and simulation snapshots
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces, types, and domain models
│   ├── index.css               # Tailwind directives and WCAG-compliant accessible styles
│   ├── main.tsx                # React application entry point
│   └── testSetup.ts            # JSDOM polyfills (ResizeObserver, localStorage mock)
├── index.html                  # HTML5 entry template
├── package.json                # Project dependencies and script scripts
├── tailwind.config.js          # Tailwind CSS styling configuration with class dark mode
├── tsconfig.json               # TypeScript compiler options
└── vite.config.ts              # Vite bundler and test configuration
```

---

## 🧠 How Each Model Works (In Plain English)

ColdTwin combines physical thermodynamics, statistical signal processing, and post-harvest biological kinetics into five specialized engine modules:

### 1. Thermal Twin (`src/engine/thermalTwin.ts`)
The Thermal Twin simulates how a cold-storage chamber *should* behave under normal conditions:
- It balances the cooling output supplied by the compressor against heat influx penetrating through insulation from the warm outdoor ambient temperature.
- It accounts for heat and moisture introduced each time warehouse doors open.
- The difference between what the physical twin predicts and what the chamber sensor actually reports is termed the **thermal residual**. A small residual is normal; a large, growing residual indicates thermal inefficiency or equipment distress.

### 2. Fault Detection Model (`src/engine/faultDetection.ts`)
Rather than relying on simple, noisy static thresholds, the fault engine evaluates three complementary signals:
1. **EWMA Residual Deviation:** An Exponentially Weighted Moving Average smooths temperature residuals to distinguish genuine equipment drift (e.g. iced evaporator coils or refrigerant leaks) from brief sensor noise.
2. **Door Recovery Time:** Measures how many hours the chamber takes to pull back down to setpoint after a door-open event. Abnormally slow pull-down indicates worn door gaskets or declining compressor performance.
3. **Trailing Window Compressor Duty Cycle:** Instead of averaging across months (which hides sudden failures), ColdTwin inspects the trailing 24–48 hour window. If runtime exceeds 75%, the cooling system is overworking; if it drops below 30%, it flags short-cycling or compressor ignition issues.
These signals combine into a normalized **0–100 Fault Risk Score** paired with plain-language explanations and recommended maintenance actions.

### 3. Shelf-Life Model (`src/engine/shelfLife.ts`)
ColdTwin estimates remaining quality days for each produce batch based on ambient chamber exposure:
- **$Q_{10}$ Thermal Degradation:** Produce respiration and spoilage accelerate exponentially when temperatures rise above ideal storage setpoints ($Q_{10}$ factor typically doubles respiration rate for every 10°C increase).
- **Humidity Penalty:** Sub-optimal relative humidity accelerates transpiration, moisture loss, and shrinkage.
- **Chilling Injury Protection (`minSafeTempC`):** Cold-sensitive crops (such as chillies below 7°C) experience severe physiological breakdown when held below their safe minimum temperature, even without freezing. The engine explicitly penalises low temperatures below `minSafeTempC`.
- **Uncertainty Bounds:** Estimates provide `lowDays` and `highDays` confidence ranges that widen when sensor readings are missing or incomplete.

### 4. Lot Ranking & Dynamic FEFO (`src/engine/ranking.ts`)
Traditional warehouses dispatch produce using static FIFO (First-In, First-Out), which ignores actual microclimate storage conditions. ColdTwin implements dynamic **FEFO (First-Expired, First-Out)**:
- Lots are grouped into urgency tiers (`red` = critical, `amber` = warning, `green` = healthy).
- Within each tier, lots are sorted by lowest remaining shelf-life days (`lowDays`), using total remaining days as a deterministic tiebreaker.
- When viewed by a user in the **Farmer** role, the report strictly filters and re-ranks only that specific farmer's lots (ranks 1 to $N$) to safeguard grower data privacy.

### 5. Energy Waste Model (`src/engine/energyWaste.ts`)
When a chamber operates with iced coils, failing door seals, or uncalibrated thermostats, the compressor runs longer than the thermal twin baseline requires. The energy model calculates:
- The excess kilowatt-hours (kWh) consumed due to thermal drift.
- The corresponding financial loss in Indian Rupees (₹) based on the facility's commercial electricity tariff rate.

---

## ⚙️ Key User Capabilities

- **Light / Dark Mode:** Toggle in top navigation bar using Tailwind's `class` strategy with persistent `localStorage` preference and WCAG AA compliant contrast ratios.
- **Role-Based Views:** Instant switching between **Facility Manager** (full multi-chamber overview, equipment fault injection, and facility-wide lot prioritization) and **Farmer** (strictly private, lot-by-lot remaining shelf-life reports).
- **Interactive First-Launch Tour:** 3-step guided walkthrough highlighting key workflows, stored in `localStorage` with an on-demand "Replay tour" action in Settings.
- **Mobile-Responsive Ergonomics:** 5-tab fixed bottom navigation bar on mobile viewports ($\ge 44$px touch targets) with full desktop sidebar support.
- **Trilingual Localization:** Comprehensive English, Telugu (తెలుగు), and Hindi (हिन्दी) support across all dashboards, forms, and diagnostic messages.
- **Deterministic Simulation:** One-click fault simulation with lossless data restoration that preserves historical telemetry.

---

## ⚠️ Limitations & Disclaimer

> [!IMPORTANT]
> **Illustrative Parameters:** All produce parameters (ideal temperatures, base shelf lives, $Q_{10}$ factors, and minimum safe temperatures such as 7°C for chilli) provided in ColdTwin are illustrative reference values and initial approximations.
>
> **Estimates, Not Industrial Controls:** All shelf-life projections, fault risk scores, and energy waste calculations are software estimates meant for decision support and operational guidance. ColdTwin is not a certified industrial control system or automated PLC actuator.
>
> **Biological Variability:** Actual post-harvest produce shelf-life depends heavily on cultivar variety, pre-harvest growing conditions, maturity at harvest, initial microbial spore load, and transportation handling prior to cold-storage arrival.
