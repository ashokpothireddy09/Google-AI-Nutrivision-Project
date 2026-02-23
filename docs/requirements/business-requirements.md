

* **Plan 1 (Business + Product Canvas):** UX, value prop, scoring/interpretation, compliance posture, differentiation vs. Yuka (Germany-first), demo/storytelling, and submission strategy.
* **Plan 2 (Technical + Architecture Canvas):** end-to-end system design with **Gemini Live API**, **ADK or GenAI SDK**, **Google Cloud services**, **exact API endpoints**, tool schemas, caching, MCP usage, and latency tactics.

I’m also **correcting + upgrading** your current NutriVision spec where it’s outdated/inefficient (notably: replacing `search.pl` with **Open Food Facts API v2 barcode + search**, and adding a clean “food + cosmetics” dual pipeline).

---

# Fit Check: Does NutriVision match the hackathon and is it a strong “best-of” idea?

## Hackathon requirements (hard constraints)

Your project **fits extremely well** because it is exactly a **real-time audio/vision agent** (the “Live Agents” track). The Devpost page requires:

* Use a **Gemini model**
* Build the agent with **Google GenAI SDK or ADK**
* Use **at least one Google Cloud service**
* Provide: **text description, public repo, proof of Cloud deployment, architecture diagram, and <4 min demo video** ([Gemini Live Agent Challenge][1])

NutriVision’s “hands-free camera + voice + tool calling + real-time interruption (barge-in)” is the sort of “beyond chat box” experience judges are looking for. ([Gemini Live Agent Challenge][1])

## Why it’s a “best-of” contender vs typical hackathon agents

Most teams will build:

* a voice chatbot,
* a generic UI navigator,
* or a creative storyteller.

Few will deliver a **real consumer-grade “live co-pilot”** with:

* **multimodal recognition**
* **tool calling**
* **structured safety/risk interpretation**
* and **instant UI overlays** driven by a streaming model.

If you add:

1. “zero-effort” passive barcode detection (not a barcode *workflow*; it happens silently),
2. a tight “food + cosmetics” evaluator,
3. a clean **on-camera analysis HUD** + audio verdict,
   you become a standout.

---

# Key upgrades to your current NutriVision spec (important)

## Upgrade 1 — Stop using `search.pl` as the primary endpoint

Open Food Facts explicitly notes that older search approaches are “outdated/hacky,” and they have newer search APIs. ([Open Food Facts][2])

**Winning move:** Use this order of operations:

1. **Passive barcode capture** (automatic, no user effort)
2. If barcode found → call **Product by Barcode API v2**
3. If no barcode → call **Search API v2** (text-based) using OCR-extracted brand/product name
4. If still ambiguous → ask a single clarifying question *by voice* (“Which variant—‘light’ or ‘classic’?”)

This improves accuracy, speed, and judge confidence.

## Upgrade 2 — Use “interleaved output” to prove you’re not just voice

The hackathon emphasizes moving beyond text I/O; the Live API supports streaming sessions, multimodal input, and mixed output. ([Google AI for Developers][3])

**Winning move:** Make the model output:

* **Audio** (spoken verdict)
* **Text/JSON events** (HUD updates: grade, warnings, chart values)
  in the same live stream, so the UI overlays update while the agent talks.

## Upgrade 3 — Treat “legal vs risky vs banned” as separate labels

For judges (and for safety), don’t say “illegal” loosely.

For **food**:

* “EU-authorised additive (legal)” vs.
* “requires warning label” (e.g., the **six colours** must carry a label warning about activity/attention in children) ([Food Standards Agency][4])
* “no longer authorised in EU” (e.g., **E171 titanium dioxide** banned as a food additive) ([European Commission][5])
* “EFSA re-evaluated / exposure caveats” (e.g., nitrites/nitrates have ADIs; total dietary exposure can exceed for some groups) ([European Food Safety Authority][6])

For **cosmetics**:

* “listed in CosIng / referenced in annexes” (CosIng is **information-only**) ([European Commission][7])
* “banned/restricted under Regulation 1223/2009” ([EUR-Lex][8])
* “label-triggering rules” (e.g., formaldehyde releasers labelling threshold) ([EUR-Lex][9])
* “new CMR bans (Omnibus Act VII / Regulation (EU) 2025/877)” apply **from 1 Sept 2025** (your colleague text said 2026; this is a key correction) ([Cosmeservice][10])
* “microplastics restriction applies from 17 Oct 2023” ([Internal Market & SMEs][11])

---

# PLAN 1 — Business + Product Canvas (Germany-first “Yuka, but live”)

## 1) Product Vision (one sentence)

**NutriVision AI** is a **live, hands-free grocery + personal care co-pilot** for Germany that instantly interprets labels (German packaging), nutrition, additives, and ingredient safety—**with voice + on-camera overlays**, no typing, no barcode ritual.

## 2) The problem (Germany-specific)

* Germany has high adoption of “scan & decide” behavior, but current apps are:

  * friction-heavy (barcode alignment, manual search),
  * screen-reading heavy,
  * not conversational,
  * weak at explaining *why* something matters for *your* goal.
* Cosmetics/personal care ingredient safety is even more confusing than food (INCI lists, allergens, microplastics rules).

## 3) Target users (personas)

1. **Busy shoppers** (Frankfurt, Berlin commuters): want fast “buy/skip” decisions.
2. **Fitness + diet goal users**: sugar/salt/sat fat + protein/fiber focus.
3. **Parents**: additives + colour warning labels; kid-safe picks (e.g., “six colours” warning) ([Food Standards Agency][4])
4. **Sensitive-skin users**: fragrance allergens, harsh surfactants, formaldehyde releasers, microplastics.
5. **Eco-driven consumers**: eco-score / packaging / palm oil signals (where available via OFF/OBF).

## 4) Core differentiators vs Yuka (what judges will love)

### Differentiator A: “Zero-UI” + instant understanding

* UI is just:

  * camera feed
  * mic toggle
  * tiny HUD overlay that appears when something is recognized

### Differentiator B: Live interruption + natural conversation

* User can interrupt mid-sentence; agent stops and adapts (barge-in).
* This is a signature Live API strength. ([Google AI for Developers][12])

### Differentiator C: Dual-domain: food + cosmetics in one agent

* One of the few demos that feels “real life useful” and not a toy.

### Differentiator D: Trust layer: “legal / warning / banned / controversial”

* Instead of vague “bad chemicals,” you show clear categories with EU-backed references.

## 5) UX / UI flow (judge-optimized)

### Screen layout (minimal but powerful)

* Full-screen camera preview
* Bottom: mic button
* Top-left: “Recognized: Brand + Product”
* Top-right: “Confidence” ring (green/yellow/red)
* Center overlay (appears on recognition):

  * **Grade chip** (Food: Nutri-Score A–E; Cosmetics: Safety Tier)
  * **3 warning chips max** (“High sugar”, “Ultra-processed”, “Fragrance allergens”)
  * **Tapless chart** (tiny bars) for sugar/salt/sat fat/protein or top cosmetic risks

### Interaction loop

1. User points camera at product
2. Agent silently tries: barcode → OCR name → database lookup
3. User asks: “Is this good?”
4. Agent responds with **2–3 sentences**, plus HUD updates:

   * sentence 1: verdict (“skip / okay / good choice”)
   * sentence 2: why + alternative suggestion
   * optional sentence 3: expiry warning or allergen warning

### Optional “Analysis Chart” overlay (your idea — strong!)

**Yes, do it**—as long as it’s minimal.

* For food:

  * 4 bars: sugar, salt, saturated fat, fiber/protein (or calories)
* For cosmetics:

  * 4 bars: fragrance allergens, harsh surfactants, preservative risk, microplastics likelihood

This proves “interleaved output” and makes the demo feel premium.

## 6) Scoring/Interpretation (user-facing, not math-facing)

### Food: Nutri + Processing + Additives + Eco

* **Nutrition verdict**

  * Use Nutri-Score grade from OFF where available.
  * Interpret “sugar/salt/sat fat” with thresholds and simple language.
* **Processing**

  * NOVA group (1–4). “4” triggers ultra-processed warning.
* **Additives**

  * Show:

    * “EU authorised”
    * “warning label required” (six colours) ([Food Standards Agency][4])
    * “not authorised / banned in EU food” (E171) ([European Commission][5])
* **Eco**

  * Eco/Green score where available (OFF provides ecoscore fields in many cases).

### Cosmetics: Ingredient safety + regulatory posture + microplastics

* Ingredient parsing:

  * Pull from Open Beauty Facts when possible, but treat as imperfect (“experimental ingredients parsing”) ([Open Food Facts][13])
  * Use Gemini vision to read the INCI list directly when needed.
* Regulatory framing:

  * Base rules: **Regulation (EC) 1223/2009** ([EUR-Lex][8])
  * Database reference: **CosIng** (info-only, but authoritative index) ([European Commission][7])
  * Formaldehyde releasers labeling threshold rule: ([EUR-Lex][9])
  * Omnibus Act VII / new CMR bans effective **1 Sept 2025** ([Cosmeservice][10])
  * Microplastics restriction started applying **17 Oct 2023** ([Internal Market & SMEs][11])

## 7) Data sources (non-technical framing)

* Open Food Facts + taxonomies (additives taxonomy) ([Open Food Facts][14])
* Open Beauty Facts (cosmetics products) ([Open Food Facts][13])
* EU Food Additives database (Union list reference) ([Food Safety][15])
* EU Cosmetics Regulation + CosIng ([EUR-Lex][8])
* Optional: EFSA references for specific controversial additives (nitrites/nitrates, titanium dioxide) ([European Food Safety Authority][6])

## 8) Trust, safety, and legal positioning (important)

* Clear disclaimers:

  * “Informational only, not medical advice.”
  * “Always follow allergy/medical guidance.”
* Avoid fear-mongering: present *evidence tier*:

  * **Banned / not authorised**
  * **Requires warning label**
  * **Authorised but controversial / high intake concern**
  * **Generally low concern**

This protects you and increases judge trust.

## 9) Business model (post-hackathon viability)

* **Freemium**

  * Free: scan + verdict + top warnings
  * Pro: goals (diabetes-friendly, low-salt, pregnancy-safe cosmetics), history, “better alternatives” suggestions
* **Affiliate / retailer partnerships** (Germany):

  * DM/Rossmann category insights (not direct endorsement in hackathon demo)
* **B2B**:

  * wellness programs, insurers, corporate health

## 10) “Winning” demo narrative (4 minutes max)

You should structure the demo exactly around the submission expectations (real-time, no mockups). ([Gemini Live Agent Challenge][1])

**Demo Script (fast + visual):**

1. Food item 1 (high sugar): shows grade + bars + sugar warning
2. Food item 2 (ultra-processed): NOVA 4 warning + additive mention
3. Cosmetic item (sensitive skin): fragrance allergens + microplastics note
4. Expiration date read: “MHD vs Verbrauchsdatum” logic (German label reading)
5. Barge-in moment: user interrupts mid-verdict; agent stops and answers new question

---

# PLAN 2 — Technical + Architecture Canvas (ADK + Live API + fast tool calling)

## 1) High-level architecture (what judges must understand instantly)

**Frontend (camera+mic) → Cloud Run WebSocket proxy (ADK/GenAI SDK) → Gemini Live API (Vertex AI) → Tool calls → OFF/OBF + regulatory datasets → Stream audio + HUD events back**

This matches Live API’s “session over WebSockets” pattern. ([Google Cloud Documentation][16])

## 2) Recommended stack (optimized for hackathon speed + judge clarity)

### Frontend

Pick one:

* **React web app** (fastest demo + easy screen recording)
* or **Flutter** (more “app-like,” but slower dev)

**Must-have frontend modules**

* Camera capture (video frames)
* Mic capture (PCM)
* HUD overlay renderer
* Optional: passive barcode detector

### Backend (Google Cloud)

* **Cloud Run** (WebSocket-capable proxy + tool execution)
* **Vertex AI Gemini Live API** for streaming multimodal agent
* **Cloud Memorystore (Redis)** for caching product lookups (optional but very strong)
* **Secret Manager** for keys (judge-friendly security story)
* **Cloud Logging** for proof-of-deployment video

Cloud Run qualifies as a Google Cloud service requirement. ([Gemini Live Agent Challenge][1])

## 3) Gemini Live API specifics you must implement correctly

### Session & streaming

Live API is stateful over **WebSockets**. ([Google AI for Developers][3])

### Audio format

* Live API audio is **raw little-endian 16-bit PCM**
* Output sample rate is **24 kHz** ([Google AI for Developers][17])

### Latency tactics (from your colleague’s strong points)

* Send audio in 20–40ms chunks
* Implement barge-in:

  * when interruption event arrives, **flush audio playback buffer immediately** (client-side)

### Video strategy

* Send a low frame rate (enough for label reading + barcode)
* Increase frames only when “recognition mode” triggers (to save bandwidth)

## 4) Core tool strategy (winning reliability)

### Recognition cascade (critical)

1. **Barcode detected?** → use barcode endpoint (high precision)
2. Else OCR name/brand → search endpoint
3. Else ask a single clarifying question

### Why this matters

Judges will punish hallucination. Barcode-first virtually eliminates it.

---

## 5) APIs to use (exact endpoints + best practices)

## A) Open Food Facts (Food)

### Product by barcode (v2)

Use the v2 product endpoint and limit fields to reduce payload. ([Open Food Facts][18])

```http
GET https://world.openfoodfacts.net/api/v2/product/{barcode}?fields=
  product_name,brands,quantity,ingredients_text,ingredients_tags,
  nutriments,nutriscore_grade,nova_group,ecoscore_grade,
  additives_tags,allergens_tags,labels_tags,categories_tags
```

### Search (v2 or v3)

Use when barcode fails. OFF warns older search approaches are outdated; use newer search APIs. ([Open Food Facts][2])

**Important best practices:**

* Add a **User-Agent** header or risk being blocked. ([Open Food Facts][19])
* Search responses may be cached; use `nocache=1` if freshness matters. ([Open Food Facts][19])
* Use `cc=de` (Germany) + `lc=de` (German language) to bias results. ([Open Food Facts][20])

Example:

```http
GET https://world.openfoodfacts.org/api/v2/search?
  categories_tags_en=food&
  search_terms={query}&
  page_size=5&
  fields=product_name,brands,nutriments,nutriscore_grade,nova_group,additives_tags,ecoscore_grade&
  cc=de&lc=de&nocache=1
```

## B) Open Beauty Facts (Cosmetics)

### Product by barcode (v2)

```http
GET https://world.openbeautyfacts.org/api/v2/product/{barcode}.json?fields=
  product_name,brands,ingredients_text,ingredients_tags,labels_tags,categories_tags
```

Note: OFF warns cosmetics ingredient parsing can be “very experimental,” so treat as best-effort and fallback to OCR. ([Open Food Facts][13])

## C) Additives taxonomy (Food)

You can fetch canonical additive metadata via OFF taxonomies. ([Open Food Facts][14])

```http
GET https://static.openfoodfacts.org/data/taxonomies/additives.json
```

## D) EU “legal status” references

### Food additives union list database

Use EC’s database as the reference point for “approved in EU + conditions of use.” ([Food Safety][15])

### Cosmetics legal framework

* Regulation (EC) **1223/2009** ([EUR-Lex][8])
* CosIng database (info-only, but official Commission tool) ([European Commission][7])
* Formaldehyde releaser labelling rule: Regulation (EU) **2022/1181** ([EUR-Lex][9])
* Omnibus Act VII / Regulation (EU) **2025/877** applies from **1 Sept 2025** ([Cosmeservice][10])
* Microplastics restriction started applying **17 Oct 2023** ([Internal Market & SMEs][11])

---

## 6) Tool schemas (Gemini function declarations)

### Tool 1 — Get product by barcode (primary, most reliable)

```json
{
  "name": "get_product_by_barcode",
  "description": "Fetches a product from Open Food Facts / Open Beauty Facts by barcode and returns a compact safety/nutrition payload.",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "barcode": { "type": "STRING", "description": "EAN-13/UPC barcode digits." },
      "domain": {
        "type": "STRING",
        "enum": ["food", "beauty"],
        "description": "Selects Open Food Facts (food) or Open Beauty Facts (beauty)."
      },
      "country": { "type": "STRING", "description": "Country hint, e.g. 'de'." },
      "language": { "type": "STRING", "description": "Language hint, e.g. 'de'." }
    },
    "required": ["barcode", "domain"]
  }
}
```

### Tool 2 — Search product by OCR text (fallback)

```json
{
  "name": "search_product_catalog",
  "description": "Searches Open Food Facts / Open Beauty Facts when barcode is unavailable. Returns best-match candidates with confidence hints.",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "query": { "type": "STRING", "description": "OCR-extracted product + brand text." },
      "domain": { "type": "STRING", "enum": ["food", "beauty"] },
      "country": { "type": "STRING", "description": "e.g. 'de'." },
      "language": { "type": "STRING", "description": "e.g. 'de'." },
      "max_results": { "type": "INTEGER", "description": "Return top N candidates.", "default": 5 }
    },
    "required": ["query", "domain"]
  }
}
```

### Tool 3 — Evaluate additives / ingredients against rulesets (your secret sauce)

This is where you win: you keep the model from hallucinating “bad chemicals.”

```json
{
  "name": "evaluate_ingredients_regulatory",
  "description": "Classifies additives/ingredients into (banned, warning-label, restricted, allowed) and assigns a risk tier with explanations.",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "domain": { "type": "STRING", "enum": ["food", "beauty"] },
      "ingredients": {
        "type": "ARRAY",
        "items": { "type": "STRING" },
        "description": "Normalized additives_tags (food) or INCI ingredients (beauty)."
      },
      "locale": { "type": "STRING", "description": "e.g. 'de-DE'." }
    },
    "required": ["domain", "ingredients"]
  }
}
```

Backend logic:

* Food:

  * Map OFF additive tags ↔ taxonomy metadata
  * Apply rules:

    * six colours warning set ([Food Standards Agency][4])
    * E171 banned in EU foods ([European Commission][5])
    * nitrates/nitrites nuance (not “illegal,” but risk context) ([European Food Safety Authority][6])
* Beauty:

  * Detect:

    * formaldehyde releasers label-trigger logic ([EUR-Lex][9])
    * microplastics risk terms (polyethylene, nylon-12, etc.) aligned with restriction ([Internal Market & SMEs][11])
    * banned CMR updates (Omnibus Act VII) ([Cosmeservice][10])

---

## 7) Data model (what you store/cache)

### ProductCache (Redis / Memorystore)

Key: `{domain}:{barcode}` or `{domain}:{normalized_name}:{brand}`
Value (compact JSON):

* product_name, brand
* nutrition summary (sugar/salt/satfat/protein/fiber/calories)
* nutriscore_grade, nova_group, ecoscore_grade
* additive flags
* cosmetics risk flags

TTL: 7–30 days

### RulesetStore

* `food_additives_rules.json`:

  * banned (E171)
  * warning label set (six colours)
  * “high attention” additives
* `beauty_rules.json`:

  * fragrance allergens list
  * formaldehyde releasers list
  * microplastics heuristics
  * CMR updates set

---

## 8) MCP servers to use (judge-visible sophistication)

### Why use MCP in this hackathon?

Devpost resources explicitly highlight MCP servers as part of the ecosystem. ([Gemini Live Agent Challenge][21])
Google Cloud now provides **official MCP support** documentation and servers. ([Google Cloud Documentation][22])
ADK also documents MCP support and references GenMedia MCP tools. ([google.github.io][23])

### Recommended MCPs (practical + demo-friendly)

1. **Cloud Run MCP server** (deployment/ops automation story)

   * Great for “bonus points” narrative: scripted deployments, reproducible infra.
   * Google has discussed Cloud Run MCP server patterns. ([Google Cloud][24])

2. **Google Cloud MCP servers (remote managed)** for:

   * BigQuery (analytics)
   * Storage (snapshots of rulesets)
   * Logging/Monitoring
     Supported-products list exists. ([Google Cloud Documentation][25])

3. **GenMedia MCP servers** (optional)

   * If you generate explainers, icons, or mini visuals using Imagen/Veo/Chirp, the MCP GenMedia toolchain is designed for that. ([GitHub][26])

**Hackathon reality check:** You don’t *need* GenMedia to win; it’s a “bonus wow” layer. The core win is the live agent experience.

---

## 9) ADK vs GenAI SDK choice (recommended)

Because you want a “real agent” with streaming and tool orchestration, I recommend **ADK**:

* ADK includes bidi-streaming guidance and patterns for real-time multimodal agents. ([google.github.io][27])
* There’s a codelab showing a full stack React + Python + FastAPI bidi-streaming agent architecture. ([Google Codelabs][28])

**Suggested backend implementation:**

* **Python + FastAPI + ADK** on Cloud Run (very judge-friendly)

---

## 10) System prompt (updated, safer, and more “judge-proof”)

Key improvements:

* Forces barcode-first
* Forces structured HUD events
* Forces “legal vs warning vs banned vs controversial” categories
* Avoids raw numbers unless requested
* Germany context

**System instruction draft:**

> You are NutriVision, a strict but helpful German nutritionist and product safety assistant. You see through a smartphone camera in Germany.
> When a product is visible, first try to detect a barcode; if present, call get_product_by_barcode. If not, read product/brand text in German and call search_product_catalog.
> After receiving product data, call evaluate_ingredients_regulatory to classify ingredients/additives as (banned, warning-label, restricted, allowed, controversial).
> Respond in 2–3 short spoken sentences, and simultaneously output HUD update events (grade, top 3 warnings, chart values).
> Never overclaim medical certainty; provide informational guidance only.
> Always scan for “Mindestens haltbar bis” and “Zu verbrauchen bis” and warn if past today’s date.

---

# Additive/Chemical intelligence layer (food + personal care)

## Food: what’s “legal,” “warning,” “banned,” “controversial”

### “Legal in EU”

Use the **European Commission food additives database** as the reference for what’s approved and under what conditions, based on the Union list in Regulation (EC) 1333/2008. ([Food Safety][15])

### “Warning label required”

The “six colours” must carry a warning about effects on activity/attention in children. ([Food Standards Agency][4])
Your app can flag those instantly by E-number.

### “Banned / not authorised”

Titanium dioxide (E171) is banned as a food additive in the EU; EFSA concluded it can no longer be considered safe. ([European Commission][5])

### “Controversial / context-based”

Nitrites/nitrates (E249–E252) are authorised, EFSA says additive exposure is generally within safe levels, but total exposure (all dietary sources) may exceed ADIs for some groups. ([European Food Safety Authority][6])
So you say:

* “legal, but limit frequency—especially for kids/high consumption patterns.”

## Cosmetics: legal framing + high-signal risks

### Regulatory basis

* Cosmetics Regulation 1223/2009 ([EUR-Lex][8])
* CosIng is an EC database for cosmetic ingredients (info-only but official) ([European Commission][7])

### Formaldehyde releasers

EU updated labelling requirements via Regulation (EU) 2022/1181. ([EUR-Lex][9])
So you can flag: “this uses a formaldehyde-releasing preservative” (risk phrasing depends on confidence).

### CMR bans update (important correction)

Omnibus Act VII / Regulation (EU) 2025/877 applies from **1 September 2025**. ([Cosmeservice][10])
So your ruleset should include a “post-2025-09 compliance attention” label.

### Microplastics

EU microplastics restriction began applying 17 Oct 2023. ([Internal Market & SMEs][11])
You can:

* detect common microplastic INCI terms,
* label “likely restricted / phase-out category” carefully (don’t overclaim without product category context).

---

# What you must submit (so you don’t get disqualified)

Your repo + Devpost submission must include:

* Description, technologies, data sources
* Public repo + spin-up instructions
* Proof of Google Cloud deployment
* Architecture diagram
* Demo video (<4 min) ([Gemini Live Agent Challenge][1])

---

## If you want the “single most winning scope” for hackathon time

Do this MVP slice (high impact, doable):

1. Live camera + mic (React)
2. Cloud Run proxy (FastAPI + ADK)
3. Barcode-first OFF/OBF lookup
4. Ingredients/additives classifier (small curated ruleset + taxonomy fetch)
5. Expiry date reading (Gemini vision)
6. HUD overlay bars + audio verdict (interleaved output)

That’s a complete, premium-feeling product in demo form.

---

If you want, I can also generate a **judge-friendly architecture diagram spec** (boxes/arrows + labels exactly matching the Devpost rubric) and a **4-minute demo storyboard with spoken script + shot list**—but the two canvases above already contain everything needed to execute and submit.

[1]: https://geminiliveagentchallenge.devpost.com/ "Gemini Live Agent Challenge: Redefining Interaction: From Static Chatbots to Immersive Experiences - Devpost"
[2]: https://wiki.openfoodfacts.org/Open_Food_Facts_Search_API_Version_2?utm_source=chatgpt.com "Open Food Facts Search API Version 2"
[3]: https://ai.google.dev/api/live?utm_source=chatgpt.com "Live API - WebSockets API reference | Gemini API | Google AI for Developers"
[4]: https://www.food.gov.uk/safety-hygiene/food-additives?utm_source=chatgpt.com "Food additives - Food Standards Agency"
[5]: https://ec.europa.eu/newsroom/sante/items/732079/en?utm_source=chatgpt.com "Goodbye E171: The EU bans titanium dioxide as a food additive"
[6]: https://www.efsa.europa.eu/en/press/news/170615?utm_source=chatgpt.com "EFSA confirms safe levels for nitrites and nitrates added to food"
[7]: https://ec.europa.eu/growth/tools-databases/cosing/?utm_source=chatgpt.com "CosIng - Cosmetics - GROWTH - European Commission"
[8]: https://eur-lex.europa.eu/eli/reg/2009/1223/oj/eng?utm_source=chatgpt.com "1223/2009 - EN - Cosmetic Products Regulation - EUR-Lex"
[9]: https://eur-lex.europa.eu/eli/reg/2022/1181/oj/eng?utm_source=chatgpt.com "Regulation - 2022/1181 - EN - EUR-Lex"
[10]: https://cosmeservice.com/news/new-cmr-substances-banned-2025-877/?utm_source=chatgpt.com "New CMR Substances Banned (2025/877) | Cosmeservice"
[11]: https://single-market-economy.ec.europa.eu/sectors/chemicals/reach/restrictions/commission-regulation-eu-20232055-restriction-microplastics-intentionally-added-products_en?utm_source=chatgpt.com "Commission Regulation (EU) 2023/2055 - Restriction of microplastics ..."
[12]: https://ai.google.dev/gemini-api/docs/live?utm_source=chatgpt.com "Get started with Live API | Gemini API | Google AI for Developers"
[13]: https://wiki.openfoodfacts.org/API/OpenBeautyFacts?utm_source=chatgpt.com "API/OpenBeautyFacts - Open Food Facts wiki"
[14]: https://wiki.openfoodfacts.org/API/Additives?utm_source=chatgpt.com "API/Additives - Open Food Facts wiki"
[15]: https://food.ec.europa.eu/food-safety/food-improvement-agents/additives/database_en?utm_source=chatgpt.com "Database - Food Safety - European Commission"
[16]: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/multimodal-live?utm_source=chatgpt.com "Gemini Live API reference | Generative AI on Vertex AI | Google Cloud ..."
[17]: https://ai.google.dev/gemini-api/docs/live-guide?utm_source=chatgpt.com "Live API capabilities guide | Gemini API | Google AI for Developers"
[18]: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorial-off-api/?utm_source=chatgpt.com "Tutorial on using the Open Food Facts API"
[19]: https://wiki.openfoodfacts.org/API/Read/Search?utm_source=chatgpt.com "API/Read/Search - Open Food Facts wiki"
[20]: https://wiki.openfoodfacts.org/API/Read?utm_source=chatgpt.com "API/Read - Open Food Facts wiki"
[21]: https://geminiliveagentchallenge.devpost.com/resources "Devpost"
[22]: https://docs.cloud.google.com/mcp?utm_source=chatgpt.com "Google Cloud MCP servers documentation"
[23]: https://google.github.io/adk-docs/mcp/?utm_source=chatgpt.com "Model Context Protocol (MCP) - Agent Development Kit (ADK)"
[24]: https://cloud.google.com/blog/products/ai-machine-learning/ai-studio-to-cloud-run-and-cloud-run-mcp-server?utm_source=chatgpt.com "AI Studio to Cloud Run and Cloud Run MCP server | Google Cloud Blog"
[25]: https://docs.cloud.google.com/mcp/supported-products?utm_source=chatgpt.com "Supported products | Google Cloud MCP servers | Google Cloud Documentation"
[26]: https://github.com/GoogleCloudPlatform/vertex-ai-creative-studio/tree/main/experiments/mcp-genmedia?utm_source=chatgpt.com "vertex-ai-creative-studio/experiments/mcp-genmedia at main ..."
[27]: https://google.github.io/adk-docs/streaming/dev-guide/part1/?utm_source=chatgpt.com "Part 1. Intro to streaming - Agent Development Kit (ADK)"
[28]: https://codelabs.developers.google.com/way-back-home-level-3/instructions?utm_source=chatgpt.com "Way Back Home - Building an ADK Bi-Directional Streaming Agent | Google ..."
