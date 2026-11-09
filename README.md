# CreditSathi (क्रेडिटसाथी)

**Code for a Billion 2026 — track: Livelihood for the Uneducated**

A Hindi-first voice/text agent that takes an informal worker from "no credit history"
to a submitted, tracked formal-loan application: scheme eligibility, document
checklist, pre-filled forms, follow-up tracking, and credit-footprint coaching.

## Why
- 90%+ of India's workforce is informal; 40-50 crore Indians are credit-invisible or thin-file.
- MSME credit gap: ~USD 330B (IFC). Informal workers pay moneylenders 3-10%/month
  because formal channels reject them for missing paperwork, not missing intent.

## What it does
1. Chats in Hindi (voice-friendly, WhatsApp-like UX) to build a profile:
   occupation, income pattern, location, loan need.
2. Matches the profile to government schemes (PM SVANidhi, MUDRA Shishu/Kishore,
   Stand-Up India, Jan Dhan OD, KCC, SHG-Bank Linkage) with amount-band filtering.
3. Produces a document checklist and next-step guidance per scheme.
4. Tracks the application follow-up and coaches on building a credit footprint.
5. Logs anonymous usage stats (`data/db.json`, `/stats`) — the impact metric.

## Demo path
- `npm install && cp .env.example .env` (add an OpenRouter key; free model is default)
- `npm start` -> http://localhost:3001 (chat) and /stats.html (live usage stats)
- Scripted demo profile: street vendor, ₹10,000 working capital -> PM SVANidhi match
  with Hindi document checklist. A ₹3,00,000 shop-expansion profile -> MUDRA Kishore.

## Stack
Node.js (no framework), OpenRouter LLM for the Hindi conversation, a rule-based
scheme matcher (`schemes.json`) as the deterministic core, JSON file storage.
Built with the AgentFoundry IDE per hackathon rules.

## Repo layout
- `server.js` - HTTP server, chat + stats API
- `agent.js` - conversation flow and LLM prompts
- `schemes.json` - scheme rules (eligibility, amount bands, documents)
- `public/` - chat UI (`index.html`) and stats dashboard (`stats.html`)
- `data/db.json` - usage log (demo data from testing)

Team: Gaurav Jain (@jaingaurav1601)
