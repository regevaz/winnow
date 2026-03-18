# Winnow — Competitive Intelligence

This document is the source of truth for understanding the competitive landscape. It is intended to be loaded into NotebookLM as a source and referenced by Claude Code when making product decisions.

---

## Scratchpad (`scratchpad.com`)

### What it is

Scratchpad is an AI workspace layer that sits between Salesforce and sales reps. It is the most mature, best-reviewed product in the CRM hygiene and pipeline management space — 1,470+ G2 reviews at 4.8/5, G2 Leader badge. Founded to solve the fundamental problem that reps hate updating Salesforce, so CRM data is always incomplete.

**CRM support:** Salesforce only.  
**Primary user:** Sellers (AEs, SDRs) + RevOps/managers.  
**Pricing:** $19/user/mo (Solo) · $49/user/mo (Team) · Enterprise custom.

---

### Feature breakdown

#### 1. Interface & Workspace

A modern, fast UI layer over Salesforce. Sellers interact with Scratchpad instead of the Salesforce native UI. Includes:
- Sales sheets (spreadsheet-like deal view synced to Salesforce in real time)
- Notes that auto-save to Salesforce records
- Command HUD (one keystroke to bring up any workflow)
- Kanban boards, tasks, daily to-do lists ("Zero Boards")

**Why it matters for Winnow:** Scratchpad owns the seller's attention during deal execution. Winnow is post-hoc validation — it reads what's in the CRM rather than intercepting it at the point of entry.

---

#### 2. Call Recorder & Notetaker (AI-Powered)

Captures and transcribes customer calls and meetings automatically. Three modes:
- Direct Zoom integration (no bot in the call)
- Meeting bot (joins calls like Gong/Chorus)
- Desktop app for background recording

**Why it matters for Winnow:** Scratchpad can infer activity from call data, which Winnow cannot (Winnow only reads what's logged in HubSpot). This means Scratchpad has richer signal. Winnow's validator for "no recent activity" is limited to what's in the CRM — a known blind spot Winnow should acknowledge.

---

#### 3. AI Field Updates (Automation)

After every customer call or email, Scratchpad AI automatically suggests Salesforce field updates:
- Extracts MEDDIC/CoM/SPICED qualification fields from calls
- Parses emails for next steps, close date signals, deal amounts
- Writes updates directly to Salesforce with rep approval (or auto)

**Why it matters for Winnow:** This is the upstream solution — Scratchpad ensures data gets INTO the CRM correctly. Winnow is the downstream solution — it validates what's already in there. These are complementary, not competing, roles.

---

#### 4. Hygiene Monitor (Process Management)

**This is Scratchpad's closest feature to Winnow's core.** Daily tracking of CRM hygiene and process adherence at individual, team, and regional levels.

What it detects:
- Missing required fields (deal amount, close date, next steps, next steps date, stage-specific fields)
- Stale data (deals with no recent activity)
- Overdue tasks
- Process gaps (missing MEDDIC fields, incomplete qualification)
- Expired close dates

How it works:
- Daily scan generates a hygiene report
- Violations surfaced in a dashboard; reps can fix in seconds without opening Salesforce
- Team leaderboard shows hygiene scores per rep — creates social pressure
- Manager dashboard shows compliance trends at team/regional level

Customer quote: *"Improved CRM hygiene and MEDDPICC adoption by over 90%"* — MaintainX RevOps

**Winnow vs. Scratchpad Hygiene Monitor:**

| Dimension | Scratchpad | Winnow |
|---|---|---|
| CRM | Salesforce only | HubSpot (planned: Salesforce) |
| Detection logic | Field-completion rules (is field X filled?) | Signal-based validation rules (benchmark-aware) |
| Benchmarks | No — just checks presence/absence | Yes — thresholds derived from historical deal data |
| Context-awareness | Some (flags expired close dates) | More (flags close dates pushed N times vs benchmark) |
| User persona | Seller (rep) + manager | Manager / RevOps (not seller-facing) |
| Action surface | Fix in Scratchpad UI, updates Salesforce | Report / dashboard — deals flagged for manager attention |
| Activity data source | Calls, emails, meetings (captured by Scratchpad) | Only what's logged in HubSpot |
| Pricing model | Per seller seat ($19–49/user/mo) | TBD — could be per pipeline/CRM instance |

---

#### 5. Deal & Account Agent (AI Assistant)

AI chatbot with full context for every deal. Can answer:
- "What's the latest from the Acme deal?"
- "What MEDDIC fields are incomplete on my top 10 deals?"
- "Summarize all activity on this account in the last 30 days"

Uses: calls, emails, notes, Salesforce data. Like ChatGPT with CRM context.

**Why it matters for Winnow:** This is a Q&A surface over deal data. Winnow's reports serve a similar manager need (what's wrong with my pipeline?) but through structured rules rather than conversational AI. A future Winnow feature could include natural language queries over validation findings.

---

#### 6. Coaching & Deal Grading

- Grades calls against the sales team's playbook/methodology
- Flags deals that are off-track before they slip
- Generates ROI docs, handoff notes, and manager summaries
- Closed Lost analysis — captures why deals were lost from actual conversations

---

### Scratchpad's positioning

**Tagline:** *"The AI workspace built for sales"*  
**Core claim:** Reduces non-selling work from 65% to 15% of a rep's time  
**Who they sell to:** Sales leaders and RevOps at companies using Salesforce, 5–500 reps

**Their narrative:** The problem isn't CRM — it's that sellers hate using it. Scratchpad makes Salesforce fast and lovable, so reps actually use it, so data quality improves as a side effect.

**What they do NOT do:**
- They don't work with HubSpot
- They don't validate deals against historical benchmarks
- They don't produce pipeline integrity reports for board/leadership consumption
- They don't calculate deal-level risk scores from pipeline patterns
- They don't address the "zombie deal" problem at scale (bulk pipeline audit)

---

### Winnow's differentiation vs. Scratchpad

1. **HubSpot first.** Scratchpad is Salesforce-only. The HubSpot market (SMB, growth-stage SaaS) is underserved by hygiene tooling. This is Winnow's entry wedge.

2. **Benchmark-based rules, not field-completion checks.** Scratchpad flags "close date is missing." Winnow flags "close date has been pushed 4 times — benchmark says deals with 3+ pushes close at 12%." The Winnow signal is richer and more actionable.

3. **Manager/RevOps lens, not seller lens.** Scratchpad is a better Salesforce for sellers. Winnow is an audit tool for managers who need to trust the number before a board meeting.

4. **Pipeline audit at a glance.** Winnow's report covers the entire pipeline in one view — like a medical scan. Scratchpad surfaces hygiene tasks deal-by-deal for individual reps.

5. **Pricing model.** Scratchpad charges per seller seat. At 50 reps × $49 = $2,450/mo just for the team plan. Winnow can charge per connected pipeline/workspace — cheaper for large teams, accessible for small ones.

---

## Clari (`clari.com`)

### What it is

Enterprise revenue platform — forecast management, pipeline inspection, deal execution. Primary users: CRO, VP Sales, RevOps. Tier: enterprise ($100K+/year contracts). Works with Salesforce and HubSpot.

### What it does
- AI-driven revenue forecasting (call vs. commit vs. best case)
- Pipeline inspection (deal-by-deal view with engagement signals)
- Revenue collaboration (deal rooms, mutual action plans)
- Activity capture (emails, calls, meetings sync'd to CRM)

### Why it falls short for Winnow's target market
- Pricing: enterprise-only. Not accessible to growth-stage companies with 5–20 reps.
- Complex to configure. Requires implementation resources.
- Forecasting-first. The hygiene enforcement is secondary — Clari improves forecast accuracy by layering AI predictions, not by enforcing pipeline discipline.
- Does not produce rule-based validation findings — no "this deal fails the X rule because Y" output.

---

## HubSpot AI Deal Scoring (native)

### What it is

Built-in feature on HubSpot Sales Hub (Professional+). Assigns a 0–100% score to each open deal, updated every 6 hours.

### How it works

Analyzes: deal amount changes, sales activity patterns, stage progression history, close date updates.

### Why it falls short

- Black box — no explanation of why a deal scores low
- Does not flag specific validator failures ("no contact activity in 45 days," "close date pushed 3 times")
- Does not use historical benchmarks from the customer's own deal history
- Practitioners are still building custom HubSpot workflows on top of it to get actionable alerts
- A 32% score doesn't tell a manager what to do — Winnow's findings do

---

## Cotera (`cotera.co`)

### What it is

HubSpot-focused AI pipeline monitor, launched March 2026. Uses LLM-based narrative reports to surface zombie deals and pipeline health issues. Closest competitor to Winnow on the HubSpot side.

### Approach

Weekly AI analysis of every deal — generates an 8-page narrative report flagging likely dead deals, stage mismatches, and amount inflation. Workflow automations built on findings (stagnation detector, close date integrity, amount drift).

### Why it falls short vs. Winnow

- Narrative AI reports, not structured rule-based validation. Hard to compare deal findings consistently or trend over time.
- No benchmark system — thresholds are AI-inferred, not derived from the customer's own historical deal data.
- No severity levels or categorization system.
- Early-stage, limited distribution. Validation that the market exists.

### Key insight from their public case study

One company found $1.3M in zombie deals out of $3.4M reported pipeline. Pipeline accuracy went from 55% → 89% with automated monitoring. Forecast accuracy improved from ±35% → ±12%.

---

## Salesforce Einstein / Pipeline Inspection (native)

### What it is

Salesforce's native deal health and forecasting layer. Color-coded opportunity scores, deal insights, activity analysis, voice call analysis.

### Why it falls short

Same structural limitations as HubSpot Deal Scoring — analytical overlay on dirty data without enforcing hygiene. Users building on top of it with custom flows, same as HubSpot.

---

## Summary Comparison Table

| | **Winnow** | **Scratchpad** | **Clari** | **Cotera** | **HubSpot Native** |
|---|---|---|---|---|---|
| CRM | HubSpot (→ Salesforce) | Salesforce only | Both | HubSpot only | HubSpot only |
| Target user | Manager / RevOps | Seller + manager | CRO / enterprise | Manager | Any HubSpot user |
| Approach | Rule-based validators + benchmarks | Seller workspace + hygiene tracking | AI forecasting | LLM narrative reports | AI scoring |
| Benchmarks | Yes — from own deal history | No | Yes (partial) | No | No |
| Seller-facing | No | Yes (core) | Partially | No | No |
| Pricing model | TBD (per pipeline) | Per seller seat ($19–49/mo) | Enterprise ($100K+/yr) | Early stage | Included in Sales Hub Pro |
| Status | In development | 1,470+ G2 reviews, established | Enterprise leader | Launched March 2026 | Generally available |

---

## Key Insights for Winnow Product Development

### Features to borrow from Scratchpad

1. **Hygiene Monitor pattern** — daily/weekly scan producing a prioritized list of deals with specific issues. Scratchpad's UX of "here are the violations, click to fix" is excellent. Winnow's equivalent: a report view where each finding is a row with severity, rule name, deal name, and recommended action.

2. **Team leaderboard** — showing hygiene scores by rep. Creates accountability without micromanagement. Easy to add to Winnow's dashboard.

3. **Trend views** — hygiene score over time per team/rep/pipeline. "Your pipeline health went from 72% → 61% this week" is more actionable than a static list.

4. **Fix-in-place** — Scratchpad lets you fix issues without opening Salesforce. Winnow could let managers mark deals as reviewed, snooze alerts, or push remediation tasks to reps via HubSpot workflows.

5. **Methodology enforcement** — Scratchpad enforces MEDDIC/SPICED/CoM. Winnow could add validators for qualification completeness (e.g., "no next steps logged for a Proposal-stage deal").

### Features Winnow has that Scratchpad doesn't

1. **Benchmark-derived thresholds** — Winnow's rules are calibrated to what's normal for that team's deal history. "Average time in Proposal stage is 12 days; this deal has been there 38 days" is more credible than a generic threshold.

2. **Confidence levels on benchmarks** — when < 20 closed-won deals exist, Winnow falls back to industry benchmarks and flags low confidence. Scratchpad has no equivalent.

3. **Contact coverage validators** — checking that deals have contacts at the right seniority level for the stage. Scratchpad checks contact role field completion; Winnow checks whether the contact titles map to the buying committee needed to close.

4. **HubSpot native** — Scratchpad doesn't exist for HubSpot at all. This is the entire entry market for Winnow.

---

## Sources

- [Scratchpad website](https://www.scratchpad.com/)
- [Scratchpad — CRM Hygiene page](https://www.scratchpad.com/crm-hygiene)
- [Scratchpad — AI Sales Agents page](https://www.scratchpad.com/pipeline-management)
- [Scratchpad — Pricing](https://www.scratchpad.com/pricing-new)
- [Scratchpad — Pipeline Hygiene blog post](https://www.scratchpad.com/blog/pipeline-hygiene)
- [Cotera — Zombie Deals case study](https://cotera.co/articles/hubspot-deal-pipeline-management)
- [RevOps Co-op — Fix Pipeline Mismanagement webinar](https://www.revopscoop.com/webinar-series/fix-pipeline-mismanagement)
