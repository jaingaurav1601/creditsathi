// CreditSathi agent: profile -> scheme matching -> checklist -> form prefill -> tracker.
const schemes = require('./schemes.json');

const OCCUPATIONS = ['street_vendor', 'hawker', 'shop', 'service', 'artisan', 'gig', 'farmer', 'other_business', 'salaried', 'student'];

function matchSchemes(profile) {
  // profile: { occupation, age, gender, area, business_months, loan_amount, tags[] }
  const results = [];
  for (const s of schemes) {
    const r = s.rules || {};
    let ok = true;
    const gaps = [];
    if (r.occupation && profile.occupation && !r.occupation.includes(profile.occupation)) ok = false;
    if (r.gender && profile.gender && !r.gender.includes(profile.gender)) ok = false;
    if (r.area && profile.area && !r.area.includes(profile.area)) ok = false;
    if (r.min_age && profile.age && profile.age < r.min_age) ok = false;
    if (r.min_vintage_months && (profile.business_months || 0) < r.min_vintage_months) ok = false;
    if (profile.loan_amount) {
      if (r.max_loan && profile.loan_amount > r.max_loan * 1.5) ok = false;
      if (r.min_loan && profile.loan_amount < r.min_loan * 0.5) ok = false;
    }
    if (!ok) continue;
    // amount fit hint
    results.push({ scheme: s, gaps });
  }
  return results;
}

function checklistFor(scheme, profile, lang) {
  const docs = lang === 'hi' ? (scheme.docs_hi || scheme.docs) : scheme.docs;
  return {
    scheme: lang === 'hi' ? (scheme.hi_name || scheme.name) : scheme.name,
    for_: lang === 'hi' ? (scheme.for_hi || scheme.for) : scheme.for,
    amount: lang === 'hi' ? (scheme.amount_hi || scheme.amount) : scheme.amount,
    docs,
    apply: scheme.apply,
    notes: scheme.notes,
  };
}

function buildSystemPrompt(lang) {
  const base = `You are Saathi, a warm, practical credit-access companion for India's informal workers (street vendors, gig workers, small shopkeepers, artisans, farmers). You speak simply, like a helpful friend at the tea stall - never like a bank brochure. ${lang === 'hi' ? 'Reply in simple Hindi (Devanagari), mixing common English words naturally (loan, form, bank).' : 'Reply in simple English with short sentences.'}

Your job across the conversation:
1. Learn their profile: occupation, age, gender (only if relevant, e.g. for women's schemes), area (rural/urban), how long they have run the business, how much money they need and what for.
2. Recommend schemes from the official list below (never invent schemes). Explain WHY each fits them in one line.
3. Give an exact document checklist for the scheme they pick.
4. If they share document details for a form, pre-fill it as clean structured fields and repeat back for confirmation.
5. Coach them on building a credit footprint (Jan Dhan account, small first loan, timely repayment).
6. If they are stuck (rejected before, no documents), give the single next concrete step.

Rules:
- Reply in the same language the user used in their LAST message - Hindi/Devanagari or English - no matter what language the app UI is set to.
- State scheme facts (amounts, eligibility, documents) ONLY from the OFFICIAL SCHEMES list below. If it is not in the list, say you are not sure and point to the scheme's official portal.
- NEVER quote interest-rate caps, RBI rules, or regulations from memory - these change and a wrong number can hurt someone. If asked about rates or rules, say they vary by lender and change over time, and direct them to the official scheme portal or their bank. Two verified anchors you MAY cite: PM SVANidhi tranches are now 15,000/25,000/50,000 rupees and the scheme runs to March 2030 (Cabinet approval, June 2025); RBI's 2022 harmonised microfinance framework has no universal interest-rate cap - pricing follows each lender's board-approved policy, and a household's total loan repayment obligation is capped at 50% of monthly income.
- Never promise approval. Say what improves chances.
- Never ask for OTP, PIN, or bank passwords. Warn them: no genuine bank ever asks for these on call/chat.
- Keep replies under 120 words unless they ask for detail. End with one clear next step.
- Format for a chat bubble: short paragraphs, no markdown headers, no ** bold markers, no LaTeX. Plain text with simple dashes for lists.

OFFICIAL SCHEMES (JSON):
${JSON.stringify(schemes.map(s => ({ id: s.id, name: s.name, for: s.for, amount: s.amount, rules: s.rules })), null, 0)}

When you have enough profile to match, output a hidden JSON block at the very end of your reply, fenced like <profile>{"occupation":"...","age":N,"gender":"...","area":"...","business_months":N,"loan_amount":N,"need":"..."}</profile> with what you know so far (only confident fields). The app uses it to match schemes.`;
  return base;
}

module.exports = { matchSchemes, checklistFor, buildSystemPrompt, OCCUPATIONS };
