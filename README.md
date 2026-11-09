# CreditSathi (क्रेडिटसाथी)

**Code for a Billion 2026 — track: Financial Inclusion**

A Hindi-first voice/text agent that takes an informal worker from "no credit history"
to a submitted, tracked formal-loan application: scheme eligibility, document
checklist, next-step guidance, follow-up tracking, and credit-footprint coaching.

Live demo: https://creditsathi.onrender.com (chat) · https://creditsathi.onrender.com/stats.html (real usage stats)

## Why
- 90%+ of India's workforce is informal; an estimated 40-50 crore Indians are
  credit-invisible or thin-file.
- MSME credit gap: ~USD 330B (IFC). Informal workers pay moneylenders 3-10%/month
  because formal channels reject them for missing paperwork, not missing intent.

## What it does
1. Chats in Hindi (voice-friendly, WhatsApp-like UX) to build a profile:
   occupation, income pattern, location, loan need. Answers in the language of
   the question (per-message detection, Hindi or English).
2. Matches the profile to government schemes (PM SVANidhi, MUDRA Shishu/Kishore/
   Tarun, Stand-Up India, Jan Dhan OD, KCC, SHG-Bank Linkage) with amount-band
   filtering. Scheme facts (amounts, validity) are sourced from current official
   announcements, e.g. PM SVANidhi ₹15k/₹25k/₹50k tiers extended to 31 Mar 2030
   (PIB PRID 2161157).
3. Produces a document checklist and next-step guidance per scheme
   (`GET /api/checklist?scheme=<id>`).
4. Tracks the application follow-up (`GET /api/track/:sid`) and coaches on
   building a credit footprint.
5. Publishes honest usage stats (`GET /api/stats`, `/stats.html`): real visitor
   traffic only - internal test traffic (`?src=test`) is excluded.

## Agent-to-agent note
The core flows are plain JSON endpoints (`/api/chat`, `/api/checklist`,
`/api/track/:sid`, `/api/stats`), so another agent can drive CreditSathi
programmatically without the chat UI. An A2A-protocol adapter (agent card +
JSON-RPC) is a natural next step and is kept out of scope here to keep every
shipped claim verifiable.

## Built with AgentFoundry
The document-checklist API (`GET /api/checklist`) was written by SMART-Code,
the agent inside the AgentFoundry IDE, in an agent session on this repo; the
session transcript is in `af-sessions/`. The generated code was reviewed and
tested by hand (syntax check, boot test, live endpoint verification) before
release. The rest of the app was developed and reviewed in the AgentFoundry IDE.

## Run it
- `npm install && cp .env.example .env` (add an OpenRouter key; a free model is the default)
- `npm start` -> http://localhost:3001 (chat), /stats.html (stats)
- Scripted demo profile: street vendor, ₹10,000 working capital -> PM SVANidhi match
  with Hindi document checklist. A ₹3,00,000 shop-expansion profile -> MUDRA Kishore.

## Stack
Node.js + Express, OpenRouter LLM for the Hindi conversation, a rule-based
scheme matcher (`schemes.json`) as the deterministic core, JSON file storage.

## Repo layout
- `server.js` - HTTP server: chat, checklist, tracking, stats APIs
- `agent.js` - conversation flow and LLM prompts (fact-discipline rules)
- `schemes.json` - scheme rules (eligibility, amount bands, documents)
- `public/` - chat UI (`index.html`) and stats dashboard (`stats.html`)
- `af-sessions/` - AgentFoundry SMART-Code session transcript (evidence)
- `data/db.json` - usage log (reset at launch; real visitor traffic only)

Team: Gaurav Jain (@jaingaurav1601)
