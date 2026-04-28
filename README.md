# 🛡️ Sentinel Sports Defense Network

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google%20gemini&logoColor=white)

Sentinel Sports Defense Network is a comprehensive, enterprise-grade Digital Intellectual Property (IP) Protection Suite. It is specifically engineered to safeguard official broadcast assets against unauthorized streams, illicit leaks, and malicious brand alterations. Built with an advanced tech stack, Sentinel aims to provide real-time cross-referencing and contextual AI monitoring across web domains, social media channels, and peer-to-peer networks to rapidly detect and mitigate piracy and trademark infringement at scale.

## Table of Contents
- [🎯 Primary Use Cases](#primary-use-cases)
- [🚀 How to Use the Platform](#how-to-use-the-platform)
- [✨ Features](#features)
- [🛠️ Technology Stack](#technology-stack)
- [⚙️ Getting Started](#getting-started)
- [📂 Project Structure](#project-structure)
- [🔒 Security & Privacy](#security--privacy)
- [🤝 Support & Queries](#support--queries)
- [📄 License](#license)

---

## Primary Use Cases

Network broadcasters and digital rights owners face an endless battle against content piracy. Sentinel Sports is purpose-built for:

- **Live Sports Broadcasters:** Instantly track and issue takedowns for unauthorized relay streams of live sporting events (e.g., football matches, PPV events) across social media and illicit streaming sites.
- **Brand Protection Agencies:** Monitor the web for trademark infringements, unauthorized logo usage, and brand dilution campaigns.
- **Digital Content Creators:** Protect exclusive digital media, VODs, and premium tier content from being leaked to public forums and unauthorized file-sharing networks.
- **Legal & Compliance Teams:** Generate auditable threat reports and gather cryptographic evidence of IP infringement for legal actions.

---

## How to Use the Platform

The platform is designed around a seamless, three-step defensive workflow:

### 1. Register Your Assets (Asset Ledger)
Before Sentinel can protect your IP, it needs to know what to look for.
- Navigate to the **Assets** tab.
- Click **Register New Asset**.
- Provide granular details: Name the asset (e.g., "UCL Finals Broadcast 2025") and supply deep contextual AI hints (e.g., *"Contains BeIn Sports logo TR"*, *"English commentary by Peter Drury"*, *"Scorebug on top-left"*). This specificity trains the AI to distinguish your official asset from fair-use fan commentary.

### 2. Live Monitoring & Detection
Once assets are securely registered on the ledger, the automated scanning engine takes over.
- Navigate to the **Live Monitoring** tab.
- The system continuously polls web channels. To test specific domains or search queries, use the **Ad-hoc Investigation** module to manually trigger a deep environment scrape.
- The **Threat Detection Feed** will automatically populate with potential violations sorted by Risk Level (Critical, High, Medium, Low) and Confidence Score.

### 3. Triage & Take Action
- Review the dashboard feed for **Critical/High** risk items.
- Analyze the AI-generated reasoning tailored for each threat (e.g., "Matches pHash of official broadcast with 98% confidence").
- Click **Investigate** on any alert to directly access the source URL, confirm the violation, and proceed with your organization's standard takedown/DMCA procedures.

---

## Features

- **Executive Dashboard Intelligence:** Get a high-level, global overview of total active threats, critical risk metrics, actions required, and live network node scanning status.
- **Terminal Web Discovery Pipeline:** View real-time hacker-style logs of the AI agents and web scrapers performing forensic hunts in progress.
- **Real-time Threat Automation:**
  - Continuous ad-hoc investigation and deep web scanning capabilities mapping surface vectors tracking asset leaks.
  - Threat detection feeds dynamically categorized by risk severity and machine-learning confidence scores.
  - Granular filtering allowing you to isolate threats targeting specific registered assets.
- **Secure Asset Ledger:**
  - Immutable registry of official broadcasts, logos, and critical IP assets.
  - Advanced prompt-engineering fields to guide the Semantic AI Matching engine.
  - Integration with pHash (perceptual hashing) heuristics for visual detection.
- **Robust Analytics & Diagnostics:** Real-time tracking of active ledger signatures, web scan coverage, and blockchain sync integrity.

---

## Technology Stack

- **Frontend Framework:** [React](https://reactjs.org/) (v18+) bootstrapped with [Vite](https://vitejs.dev/)
- **Backend Framework:** [Express](https://expressjs.com/) for API proxying and server-side processing
- **Language:** [TypeScript](https://www.typescriptlang.org/) for strict type safety
- **AI / Semantic Analysis:** [Gemini API](https://aistudio.google.com/) (`@google/genai`) for context understanding and pirate intent classification
- **Web Scraping / Proxy Penetration:** [Jina Reader API](https://jina.ai/reader) for reliable Markdown extraction bypassing anti-bot measures
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) for utility-first, responsive design
- **Animation Engine:** [Framer Motion (motion/react)](https://motion.dev/) for fluid, layout-aware UI transitions
- **Iconography:** [Lucide React](https://lucide.dev/) for crisp, consistent vector icons

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.x or higher)
- `npm` or `yarn`

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd sentinel-sports
   ```

2. Install core dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```
   The application will deploy locally at `http://localhost:3000`.

### Building for Production
To construct an optimized, minified production build:
```bash
npm run build
```
Compiled assets will be securely output to the `/dist` directory.

---

## Project Structure

```
├── src/
│   ├── components/        # Reusable UI components (buttons, badges)
│   ├── services/          # Real-world LLM intelligence layers (geminiService.ts)
│   ├── lib/               # Utility functions, helpers, and constants
│   ├── App.tsx            # Main application component & core routing state
│   ├── main.tsx           # Application entry point and DOM renderer
│   └── index.css          # Global styling and Tailwind directives
├── server.ts              # Full-stack integration entry point (Jina Proxy & API endpoints)
├── package.json           # Project metadata, scripts, and dependencies
├── vite.config.ts         # Vite bundler and plugin configuration
└── tsconfig.json          # TypeScript compiler options
```

---

## Security & Privacy

Sentinel Sports strictly adheres to corporate digital IP protection standards. The scanning engine **does not** scrape consumer PII (Personally Identifiable Information). All algorithms run solely to identify broadcast watermarks, proprietary audio commentary, UI overlays, and copyrighted visual assets. System logs are sanitized to prevent data leakage.

---

## Support & Queries

**API Quota Notice:**
If the system encounters "quota exceeded" errors (e.g., Gemini API rate limits), please pause operations. Free-tier AI quotas typically reset daily at midnight PT. For sustained enterprise usage without interruption, please contact your account manager to upgrade your billing tier.

---

## License

Copyright © Sentinel Sports Defense Network. All rights reserved. Do not distribute without express authorization.
