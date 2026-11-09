// CreditSathi - multilingual credit-access agent for informal workers.
// Code for a Billion (Bharat Agentic-AI Hackathon 2026) entry.
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { matchSchemes, checklistFor, buildSystemPrompt } = require('./agent');

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
function loadDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ sessions: [], events: [], trackers: [] }, null, 2));
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function saveDb(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
function event(db, type, data) { db.events.push({ ts: new Date().toISOString(), type, ...data }); }

const LLM_BASE = process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1';
const LLM_KEY = process.env.LLM_API_KEY || '';
const LLM_MODEL = process.env.LLM_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free';

async function llm(messages) {
  if (!LLM_KEY) return null;
  const r = await fetch(`${LLM_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM_KEY}` },
    body: JSON.stringify({ model: LLM_MODEL, messages, temperature: 0.4 }),
  });
  if (!r.ok) throw new Error(`llm ${r.status}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content || '';
}

function parseProfile(text) {
  const m = text && text.match(/<profile>([\s\S]*?)<\/profile>/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}
function stripProfile(text) { return (text || '').replace(/<profile>[\s\S]*?<\/profile>/, '').trim(); }

app.post('/api/chat', async (req, res) => {
  const { message, history = [], lang = 'hi', session = null, src = 'web' } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message required' });
  const db = loadDb();
  const sid = session || `s${Date.now()}`;
  // Reply language follows the user's message, not the UI toggle:
  const msgLang = /[\u0900-\u097F]/.test(message) ? 'hi' : 'en';
  const effLang = msgLang || lang;
  const srcTag = src === 'test' ? 'test' : 'web';
  try {
    const sys = { role: 'system', content: buildSystemPrompt(effLang) };
    const msgs = [sys, ...history.slice(-12), { role: 'user', content: message }];
    let reply = await llm(msgs);
    let profile = null, matches = [];
    if (reply) {
      profile = parseProfile(reply);
      reply = stripProfile(reply);
      if (profile) {
        matches = matchSchemes(profile).map(m => checklistFor(m.scheme, profile, effLang));
        event(db, 'profile', { sid, src: srcTag, profile, matched: matches.map(m => m.scheme) });
      }
    } else {
      reply = effLang === 'hi'
        ? 'अभी मेरा दिमाग़ (AI) उपलब्ध नहीं है। थोड़ी देर में फिर कोशिश करें।'
        : 'My AI brain is unavailable right now. Please try again in a bit.';
    }
    event(db, 'chat', { sid, lang: effLang, src: srcTag });
    if (!db.sessions.find(s => s.sid === sid)) db.sessions.push({ sid, started: new Date().toISOString(), lang: effLang, src: srcTag });
    saveDb(db);
    res.json({ reply, session: sid, matches: matches.length ? matches : undefined });
  } catch (e) {
    event(db, 'error', { sid, where: 'chat', msg: String(e).slice(0, 120) });
    saveDb(db);
    res.status(500).json({ error: String(e) });
  }
});

// follow-up tracker: user saves an application they started
app.post('/api/track', (req, res) => {
  const { sid, scheme, step = 'started', note = '' } = req.body || {};
  if (!sid || !scheme) return res.status(400).json({ error: 'sid and scheme required' });
  const db = loadDb();
  const t = db.trackers.find(t => t.sid === sid && t.scheme === scheme);
  if (t) { t.steps.push({ ts: new Date().toISOString(), step, note }); }
  else db.trackers.push({ sid, scheme, started: new Date().toISOString(), steps: [{ ts: new Date().toISOString(), step, note }] });
  event(db, 'track', { sid, scheme, step });
  saveDb(db);
  res.json({ ok: true });
});

app.get('/api/track/:sid', (req, res) => {
  const db = loadDb();
  res.json(db.trackers.filter(t => t.sid === req.params.sid));
});

// checklist: required documents for a scheme
app.get('/api/checklist', (req, res) => {
  const { scheme } = req.query;
  if (!scheme) return res.status(400).json({ error: 'scheme query param required' });
  try {
    const schemes = JSON.parse(fs.readFileSync(path.join(__dirname, 'schemes.json'), 'utf8'));
    const s = schemes.find(x => x.id === scheme);
    if (!s) return res.status(404).json({ error: 'scheme not found' });
    const docs = s.docs || [
      'Identity proof (Aadhaar/PAN/Passport)',
      'Address proof',
      'Passport-size photo',
      'Bank account details'
    ];
    res.json({ scheme: s.id, name: s.name, documents: docs });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// public impact stats (proven-impact judging criterion)
app.get('/api/stats', (req, res) => {
  const db = loadDb();
  // Honesty rule: internal test/development traffic is tagged src=test and
  // EXCLUDED from public impact numbers. Only real web usage counts.
  const real = db.events.filter(e => e.src !== 'test');
  const realSessions = db.sessions.filter(s => s.src !== 'test');
  const profiles = real.filter(e => e.type === 'profile');
  const schemeCounts = {};
  for (const p of profiles) for (const s of p.matched || []) schemeCounts[s] = (schemeCounts[s] || 0) + 1;
  const realSids = new Set(realSessions.map(s => s.sid));
  const realTrackers = db.trackers.filter(t => realSids.has(t.sid));
  res.json({
    sessions: realSessions.length,
    chats: real.filter(e => e.type === 'chat').length,
    profilesBuilt: profiles.length,
    applicationsTracked: realTrackers.length,
    trackerSteps: realTrackers.reduce((n, t) => n + t.steps.length, 0),
    schemeMatches: schemeCounts,
    firstEvent: real[0]?.ts || null,
    latestEvent: real[real.length - 1]?.ts || null,
    methodology: 'Counts real visitor sessions only; internal test and development traffic (tagged separately) is excluded. Updated live.',
  });
});

app.get('/stats', (req, res) => res.sendFile(path.join(__dirname, 'public', 'stats.html')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`CreditSathi on :${PORT}`));
