# Liebherr Challenge — Pre-Hackathon Briefing

*HNU Winter School 2026 · prepared 14 Nov 2026 · personal prep reading*

This is everything from the challenge material, the kickoff Zoom and online research, rewritten so you can understand it without a retail background. Section 7 onward contains **proposals**, not decisions; those get made with the team on site.

**Contents**

1. The challenge on one page
2. Glossary — the words you'll hear
3. What Liebherr said in the Zoom
4. How Liebherr's rebate system works
5. The full criteria list, explained
6. Background research worth knowing
7. What we already tested (feasibility)
8. Draft plan (proposal for the team)
9. Decisions the team has to make
10. Questions to ask Liebherr on site
11. Risks and things to think about
12. How to lead the first team conversation

---

## 1. The challenge on one page

**The company.** Liebherr is a family-owned German/Swiss group, famous for cranes and construction machines. One division, **Liebherr-Hausgeräte** (home appliances), makes premium **fridges, freezers and wine cabinets**: €1.17 bn revenue in 2025, Germany is its biggest market, and Liebherr claims to be the #1 fridge brand in Germany by units sold. Your contacts: **Dominic Petzold** and **Beatrix (Bea) Beer** from the German sales & service company.

**How they sell.** Mostly not directly. Liebherr sells **through retailers**: MediaMarkt, Euronics, Expert, EP:, Otto, plus many small shops. Only approved retailers may sell Liebherr (a "selective distribution system"), because Liebherr wants the brand to look premium everywhere.

**The carrot.** Retailers get an extra purchase discount, the **LPR (Liebherr Performance Rebate)**, if their **webshop** meets a list of quality rules: proper brand page, official Liebherr photos, videos, phone advice, good delivery service, payment options, etc. More expensive products (higher "assortment class") require more.

**The problem.** Today Liebherr employees check about **30 retailer webshops by hand**, roughly every **3 months**, ticking off ~70 criteria per shop in an Excel sheet. That is slow, things change between checks, and contractually every retailer must be judged **exactly the same way**.

**What they want (our "Option A").** An **AI-based tool** that:

- visits retailer webshops automatically,
- checks which criteria are met and which are missing,
- gives each retailer a **quality index** and lets Liebherr **compare** retailers,
- measures how **"AI-ready"** the pages are (can ChatGPT, Google's AI and similar systems read and recommend these products correctly?).

**The deeper "why".** Liebherr believes good information on retailer pages means customers choose the right appliance, choose Liebherr over competitors, and **return fewer appliances**. A fridge that doesn't fit the kitchen niche is an expensive return.

**The university's angle ("Option B").** HNU's briefing frames it as design thinking: *"How might we help prospective customers choose the right Liebherr appliance in retailer webshops?"* It suggests prototyping an improved product page or a selection assistant, and its key line is to **connect LPR compliance with practical value for customers**. Current plan: build A, ground it in customer needs, keep B as a fallback.

**Scope given by HNU:** one product category, 3–5 retailer webshops.

**The week:**

| Day | What |
|---|---|
| Mon 16 Nov | Kickoff, lectures (twin transformation, design thinking intro), city tour |
| **Tue 17 Nov** | **Hackathon 08:15–17:00**, then "work & pizza" until 19:30 (meant for finishing presentations) |
| **Wed 18 Nov** | **Hackathon 08:15–16:00**: knockout presentations to the company, then top 3 present to everyone |
| Thu 19 Nov | Liebherr factory tour (morning), Ulm cultural program |
| Fri 20 Nov | Input workshop, certificates |

So you effectively have **Tuesday plus Wednesday morning** to build and present.

---

## 2. Glossary — the words you'll hear

| Term | Meaning |
|---|---|
| **LPR** | *Liebherr Performance Rebate.* Extra discount for retailers who meet quality criteria. |
| **LPR Online** | The webshop part of the LPR (there's also a physical-store part). |
| **SVS** | *Selektives Vertriebssystem* (selective distribution system). Base rules every authorised online shop must meet just to be allowed to sell Liebherr. |
| **SK1 / SK2 / SK3** | *Sortimentsklasse* = assortment class. SK1 = simple appliances, SK2 = advanced, SK3 = high-end. Higher SK → more criteria → bigger expectations. Each of the ~370 models has an SK in the assortment Excel. |
| **Kano model** | Liebherr's logic behind SK: SK1 = basic expectations, SK2 = satisfaction, SK3 = "delight" factors. |
| **PDP** | *Product detail page.* The page of one specific product in a shop. |
| **Brand page / Markenwelt** | A dedicated Liebherr section inside the retailer's shop (e.g. "Liebherr Markenwelt" at Expert/EP). |
| **Brand detail / technology page** | A sub-page per Liebherr technology (e.g. BioFresh) listing all products with it. |
| **LH content** | Content supplied by Liebherr (LH = Liebherr): images, texts, videos. |
| **Premium PDP** | Special emotional product page template for SK3 products. |
| **Loadbee, Cliplister, DemoUp** | Third-party services that automatically inject Liebherr's official images, videos and rich content into retailer pages via a script. |
| **Tradeplace** | Liebherr's portal where retailers download assets and campaign material. |
| **Asset package** | Bundle of official images, logos, videos and texts that Liebherr gives retailers (we have the 2026 one: `6_LPR-brand_page_Assets.zip`). |
| **Teaser** | Big banner at the top of the brand page showing the current Liebherr campaign. |
| **Cross-selling / up-selling** | Recommending accessories (cross) or a better, pricier model (up). |
| **SEO / SEA** | Search engine optimisation (organic Google ranking) / search engine advertising (paid ads). |
| **Inventory ads** | Ads that show currently available products in search engines. |
| **Two-person delivery** | Delivery by two people who carry the appliance in, position it, connect it and remove packaging. |
| **EAN / GTIN** | The barcode number of a product, a universal ID. Liebherr's Excel has it for every model. |
| **EPREL** | EU database of energy labels; every model has a registration number. |
| **JSON-LD / schema.org** | Machine-readable product data hidden in the page code. Key for AI-readiness. |
| **EmpCo** | New EU rule (since 27 Sep 2026) banning vague green claims ("eco", "sustainable") without proof. |
| **White-label shops** | Small retailers running a standard shop template, often provided by their buying group. |
| **Buying group** | Cooperation of independent retailers (Euronics, Expert, EP: are partly this). |

**Decoding model names** (partly verified): `CBNsda 5223-22` → **C** = combination (fridge + freezer), **B** = BioFresh, **N** = NoFrost; the first digit **5** = Prime series. Series from entry to top: **Pure → Plus → Prime → Peak**. Lowercase letters and the "-22" suffix are unknown (ask Liebherr).

**Key Liebherr technologies:** BioFresh (special drawers that keep food fresh longer), NoFrost (no defrosting), EasyFresh, SmartDevice (app connectivity), BluRoX (vacuum insulation).

---

## 3. What Liebherr said in the Zoom

From the kickoff recording (Dominic and Bea, around minutes 48–64):

- *"Currently, we as Liebherr check all this manually. There are persons who sit in front of the computer and check: retailer A uses those pictures, has this information, has those videos…"*
- *"We want to use AI to gather all the information of our retailers and the pages of our retailers and systematically verify and evaluate those pages."*
- *"We would love to have an AI tool which can show us our **30 retailers** and give us a **quality index**."*
- **Fairness is contractual:** *"When I give them 4% for pictures, then everyone should have the 4% for pictures when they have the pictures."*
- **Frequency:** today about every 3 months; they don't know what happens in between and would like monthly or more often.
- **Specific pain point:** *"Are they using our pictures, are they using our content, or their own content? Checking this will be a big job for a human."*
- **Retailers named:** Euronics, Expert, MediaMarkt, Otto, plus many white-label shops. *"Every shop is different."*
- **Wish for later:** see whether retailers that meet more criteria also **sell more**.
- **Why the criteria exist:** *"The end consumer that goes to this shop needs the best information about our products to decide to buy our product and not the product from another."*

From the HNU organiser:

- Wednesday is a knockout: teams present to their company, and the best three present again to everyone.
- *"It's not a course where we typically build AI."* → Most teams will bring concepts and slides. **A working tool would stand out.**

---

## 4. How Liebherr's rebate system works

The LPR Online rating has three blocks, each worth a partial rebate percentage:

| Block | What it covers |
|---|---|
| **Online visibility** | Brand page, product detail page, product videos, SEO, Liebherr visibility in the shop's search and navigation |
| **Online advice** | Phone availability, product advisor or filter, staff training, recommendations |
| **Online services** | Stock, delivery service, delivery times, payment methods, after-sales, extras |

Important mechanics:

- Ratings are given **per SK**. A retailer can qualify for SK1 conditions but not SK3.
- The **lower of the physical-store rating and the online rating** determines the rebate per SK.
- Each **third-party platform** (e.g. a retailer's presence on a marketplace) is assessed separately.
- SK3 is optional: a retailer may list SK3 products without buying into the SK3 assessment.
- There's history: in **2021 the German competition authority (Bundeskartellamt)** reviewed the LPR because the online criteria were stricter than the store ones (e.g. Sunday staffing). Liebherr had to align them. **Transparency and equal treatment** are a sensitive, legal topic for them, so a tool with evidence per criterion addresses a real need.

---

## 5. The full criteria list, explained

This is the complete list from Liebherr's assessment Excel, rewritten in plain language.

**"Applies to"** shows which assortment classes the criterion is relevant for.

**"Tool?"** is my estimate of how an automated tool could check it:

- 🟢 **Auto**: checkable automatically from the page (code, text, links)
- 🟡 **AI judge**: needs an AI model to judge (looks premium? is the text good?), ideally with a screenshot
- 🟠 **Over time**: needs repeated checks across weeks or months
- 🔴 **Not visible online**: needs internal data or a human (training, real hotline hours)

### 5.1 SVS — base rules for any authorised webshop (all classes)

| # | Criterion (plain language) | Tool? |
|---|---|---|
| 1 | Shop name has no cheap-sounding words like "low price" or "cheap" | 🟡 |
| 2 | Shop name is the same as or similar to the physical store's name | 🟡 |
| 3 | Shop doesn't look as if Liebherr itself runs it (e.g. a huge Liebherr logo in the header) | 🟡 |
| 4 | Physical store's company name and address are shown in the footer | 🟢 |
| 5 | Cart says the products can also be bought and collected at the physical store | 🟢 (needs adding to cart) |
| 6 | Cart is reachable from everywhere and shows the essential info | 🟢 |
| 7 | The current Liebherr logo is used | 🟢 image comparison with the official logo |
| 8 | Liebherr logo links to Liebherr's website or the Liebherr brand page | 🟢 |
| 9 | Liebherr products are grouped and can be filtered/sorted | 🟢 |
| 10 | Shop loads quickly | 🟢 page-speed measurement |
| 11 | Purchasing process is clear and transparent | 🟡 |
| 12 | Only official or Liebherr-approved images and assets are used | 🟢 image matching vs Liebherr's asset links |
| 13 | Product name includes "Liebherr" (e.g. "Liebherr CBNsda 5723-20") | 🟢 |
| 14 | Discontinued models are labelled as such | 🟢 compare with the 2026 assortment list |
| 15 | Only products actually available are shown | 🟢 partly |
| 16 | Info about in-store advice at the physical shop is provided | 🟢 / 🟡 |
| 17 | Services offered: delivery, connection, setup, instruction, packaging removal, old-appliance pickup | 🟢 keyword and text detection |

### 5.2 Visibility — Brand page (SK1, SK2, SK3)

The brand page is the "Liebherr shop-in-shop" inside the retailer's site.

| # | Criterion | Tool? |
|---|---|---|
| 18 | Brand page exists, with up-to-date, clear images and content | 🟢 exists / 🟡 up to date |
| 19 | No other brands on the Liebherr brand page | 🟢 |
| 20 | Top teaser shows the current main Liebherr promotion | 🟡 compare with the current asset package |
| 21 | Current Liebherr campaign is displayed | 🟡 |
| 22 | Product categories split into built-in vs freestanding (or cooling vs freezing), with sub-categories | 🟢 / 🟡 |
| 23 | Liebherr bestsellers/highlights shown | 🟢 |
| 24 | Advice options (phone, video, advisor) and their hours are shown | 🟢 |
| 25 | "Promotions & brand" section filled with extra promotions and brand image content | 🟡 |
| 26 | Key Liebherr technologies (e.g. BioFresh) presented, each with its own page | 🟢 |
| 27 | Each technology page has a teaser image or video | 🟢 |
| 28 | Each technology page has a detailed description | 🟢 / 🟡 |
| 29 | Each technology page lists all matching products | 🟢 compare with the assortment list |

### 5.3 Visibility — Product detail page with Liebherr content (SK1, SK2, SK3)

| # | Criterion | Tool? |
|---|---|---|
| 30 | High-quality design | 🟡 |
| 31 | No other brands on the product page (e.g. no competitor recommendations) | 🟢 |
| 32 | Current Liebherr logo on the page, linked to the brand page | 🟢 |
| 33 | Product name = model name + index + short description | 🟢 |
| 34 | At least 5 suitable key features shown | 🟢 count / 🟡 "suitable" |
| 35 | Only high-quality Liebherr images | 🟢 match vs official images, check resolution |
| 36 | Image zoom and enlargement possible | 🟢 needs a click in a real browser |
| 37 | Manual, product data sheet, shipping costs and energy label visible near the product | 🟢 |
| 38 | Liebherr content integrated (via Loadbee, Cliplister or manually) | 🟢 detect the scripts |
| 39 | Technical data clearly presented | 🟢 completeness vs Liebherr master data / 🟡 clarity |

### 5.4 Visibility — Product videos (SK2, SK3)

| # | Criterion | Tool? |
|---|---|---|
| 40 | At least 5 key-feature videos matching the appliance are shown | 🟢 |

### 5.5 Visibility — Premium product page (SK3 only)

| # | Criterion | Tool? |
|---|---|---|
| 41 | Exclusive, emotional presentation (lifestyle image) or a high-quality in-house video | 🟡 |
| 42 | No other brands on the page | 🟢 |
| 43 | Features presented individually, in detail, with photos; SEO-optimised text | 🟡 |
| 44 | Liebherr tools used (DemoUp, Tradeplace) | 🟢 |
| 45 | Model name with index and short description | 🟢 |
| 46 | "Sticky" cart: the buy button stays visible while scrolling | 🟢 scroll test in a real browser |
| 47 | SEO text explaining the special features of this SK3 product | 🟡 |
| 48 | Key features explained in detail with videos and text | 🟢 / 🟡 |
| 49 | Liebherr's quality and sustainability benefits presented ("Discover Liebherr") | 🟡 |
| 50 | All technical details provided | 🟢 |
| 51 | For Liebherr's top-10 SK3 models: retailer's own high-quality product videos (only if >200 Liebherr units sold online per year) | 🟢 video present / 🔴 sales threshold |

### 5.6 Visibility — SEO (SK2, SK3)

| # | Criterion | Tool? |
|---|---|---|
| 52 | Retailer uses SEO, paid search ads and inventory ads | 🔴 / 🟠 (hard to see from outside) |
| 53 | SEO text about Liebherr (at least 200 words) on the brand page | 🟢 word count / 🟡 quality |

### 5.7 Visibility — Liebherr visible inside the shop (SK2, SK3)

| # | Criterion | Tool? |
|---|---|---|
| 54 | Searching "Liebherr" in the shop leads to the Liebherr brand page | 🟢 |
| 55 | For "refrigerator", "built-in", "built-in refrigerator", "freestanding", "wine cooler", "freezer" and "fridge-freezer": at least 1 Liebherr product in the top 5 results, and the brand page is suggested | 🟢 (German search terms) |
| 56 | In the fridge/freezer category it's immediately clear Liebherr is stocked (filter, logo, or a Liebherr product among the first 5) | 🟢 |
| 57 | Liebherr highlighted on the brand page and product pages 4× a year, or 1 social-commerce event per year | 🟠 |

### 5.8 Advice — Buying guide or product advisor (SK2, SK3)

| # | Criterion | Tool? |
|---|---|---|
| 58 | Liebherr buying guide visible on screen on the brand page and product pages | 🟢 |
| 59 | Product filters on the brand page | 🟢 |
| 60 | SK3 only: a needs-based questionnaire ("what do you need?") on the brand page | 🟢 / 🟡 |

### 5.9 Advice — Phone, video, training, recommendations

| # | Criterion | Applies to | Tool? |
|---|---|---|---|
| 61 | Phone number visible on screen (ideally "sticky") on the brand page and product pages | SK1–3 | 🟢 |
| 62 | Hotline open at least 50 h/week (up to 200 Liebherr online sales/yr) or 60 h/week (above) | SK1–3 | 🟢 stated hours / 🔴 actually staffed |
| 63 | Video consultation bookable from the product page and visible on screen, or alternatively a 12/7 hotline | SK3 | 🟢 |
| 64 | Video advice at least 30 h/week (40 h/week above 200 sales) | SK3 | 🟢 stated / 🔴 real |
| 65 | Staff attended Liebherr's introductory training (refresher when staff change) | SK1–3 | 🔴 |
| 66 | Only Liebherr appliances shown as alternatives | SK1–3 | 🟢 |
| 67 | Matching Liebherr accessories offered (cross-selling) | SK1–3 | 🟢 |

The slides also say **higher-class Liebherr alternatives should be offered (up-selling) from SK2**.

### 5.10 Services (SK1, SK2, SK3 unless noted)

| # | Criterion | Tool? |
|---|---|---|
| 68 | The 10 best-selling models per SK are immediately available | 🟢 stock label (needs Liebherr's top-10 list) |
| 69 | Two-person delivery with positioning is the **default**, incl. connection, setup and packaging removal | 🟢 / 🟡 |
| 70 | Items marked "in stock" ship within 3 working days | 🟢 stated / 🔴 real |
| 71 | At least 2 payment methods (PayPal, Klarna, Giropay, credit card) | 🟢 |
| 72 | SK2+: pay by invoice or financing | 🟢 |
| 73 | Transport damage and warranty requests handled via Liebherr's forms | 🔴 |
| 74 | Shipment tracking for all deliveries | 🟢 FAQ or text |
| 75 | Delivery checklist completed with the customer | 🔴 |
| 76 | Product page shareable on social media (WhatsApp, X) | 🟢 |

Also mentioned in the slides (SK2+): a post-purchase feedback checklist, Liebherr newsletter (FreshMAG) and social channels offered after purchase, and Liebherr products in the retailer's newsletter at least 4× a year (🔴/🟠).

### Takeaway

Roughly **two thirds of the criteria can be checked automatically** from the page. About **15 need an AI to judge** (subjective quality), and **a handful can't be seen from outside** at all. The honest pitch is: *"The tool automates what's verifiable, gives AI-assisted judgements with screenshots for the subjective ones, and clearly flags what still needs a human or internal data."*

---

## 6. Background research worth knowing

### The retailer landscape (Germany)

- **MediaMarkt/Saturn (Ceconomy):** biggest. Group sales ~€23 bn; online now over 30% of sales.
- **Euronics** (~€1.3 bn, ~1,100 affiliated stores), **Expert** (~€2 bn, moving toward a marketplace model), **EP: / ElectronicPartner** (flat in 2025). These are partly **buying groups** of independent shops, which is probably where most of Liebherr's "30 retailers" and the white-label shops come from.
- **Otto, Amazon**: online pure players.
- **Liebherr runs its own webshop too** (€69 delivery). Its own shop competes with its retailers, which is a sensitive topic.

### "AI readiness" — what's real and what's hype

- Google officially says its AI search features need **no special markup or AI files**. What matters: **important content as text** (not baked into images or PDFs), structured data that **matches what's visible**, and an up-to-date product feed.
- Measurable AI-readiness signals for a product page:
    1. Machine-readable product data (**JSON-LD Product**): name, brand, model, **EAN/GTIN**, images, price, availability
    2. **Specs as text or a table**: dimensions, capacity, energy class, noise
    3. Content visible **without JavaScript** (many AI crawlers don't run JavaScript)
    4. AI crawlers not blocked in **robots.txt** (the file that tells bots what they may read), e.g. OpenAI's OAI-SearchBot and PerplexityBot
    5. FAQ or Q&A content, reviews, image alt texts
    6. Model number and EAN **match Liebherr's master data**
- `llms.txt` (a new file meant to guide AI tools) is unproven, so give it low weight at most.
- **Agentic commerce** is the forward-looking bit: OpenAI's ACP (Agentic Commerce Protocol, Sept 2025) and Google's UCP (Universal Commerce Protocol, Jan 2026) let AI assistants **buy** products directly. Present this as "future readiness", not a must-have.

### Legal context

- **EU selective distribution rules (VBER 2022):** Liebherr may set quality criteria for online shops, but they must be proportionate and not discriminate between online and offline. The tool should only score objective, contractual criteria, **never prices**.
- **EmpCo** (since 27 Sep 2026): vague green claims ("umweltfreundlich", "nachhaltig", "klimaneutral") without proof are banned. Liebherr's 2026 asset package is literally named **"EmpCo-Update"**. A small "green-claim risk flag" check could impress them.
- **Energy label online:** the energy class arrow must appear near the price and link to the label and data sheet. Clear, legally grounded, automatically checkable.

### Returns

- No public data on fridge return rates. General German online return rate is ~10–11%; returns of bulky goods cost far more (freight pickup, often can't be resold as new).
- Likely causes (hypotheses to validate with interviews and Liebherr): **doesn't fit the niche** (height/width/depth, ventilation gap), wrong door hinge side, built-in vs freestanding confusion, noise, smaller capacity than expected, delivery damage.
- Most of these are **information problems**, which the criteria (complete specs, clear technical data, advice) are meant to fix. **This is the bridge between Option A and B.**

### Existing tools on the market

- **Salsify, Syndigo, Profitero** sell generic "digital shelf analytics" to big brands (monitoring how products appear in shops).
- None appears to do **Liebherr's specific rebate-criteria audit**. Our angle: a tailored, transparent LPR auditor plus AI-readiness.

---

## 7. What we already tested (feasibility)

On 14 Nov we tried loading the product page for **Liebherr CBNsda 5223-22** at several retailers with simple automated requests:

| Retailer | Result | Notes |
|---|---|---|
| **EP:** | ✅ Works | Full page, clean JSON-LD (name, EAN, price, "in stock"), Loadbee present, energy label, data sheet |
| **MediaMarkt** | ✅ Works | Full page; Cliplister and Loadbee present, energy label, manual, financing, old-appliance pickup, PayPal, Klarna |
| **Expert** | ✅ Works | Behind Cloudflare protection but passed |
| **Euronics** | ❌ Blocked | 403, even with an automated Chrome |
| **Otto** | ❌ Blocked | Empty page for automated browsers |

**Implications:**

- A real demo on **EP, MediaMarkt and Expert** is feasible: 3 retailers, which meets the briefing's 3–5.
- Blocked shops need a fallback:
    1. **Upload mode:** a Liebherr employee saves the page or a screenshot, and the tool analyses the file.
    2. **Running through a normal, human-used browser.**
    3. **In production:** Liebherr asks its partners to allow its checking bot (they're contractually bound).
- Some Liebherr content is injected by scripts, so the tool should use a **real browser engine** (Playwright) to see the final page, not just the raw HTML.

---

## 8. Draft plan (proposal for the team)

### The product idea in one sentence

**"LPR Inspector"** (working name): an evidence-based auditing tool that visits retailer pages, checks Liebherr's criteria, scores each retailer per SK, compares retailers, and rates AI-readiness. Every verdict comes with a screenshot and a reason, so it's fair, explainable and contestable.

### How it would work

```
Retailer URL list ──► 1. Crawl     real browser opens brand page + product pages,
                                    saves HTML, screenshot, structured data
                  ──► 2. Check     ~45 rule-based checks (logo, images, EAN,
                                    documents, payment, phone, videos…)
                                  + ~15 AI-judge checks (screenshot + text → Claude
                                    decides "premium look?", "SEO text good?")
                  ──► 3. Score     only criteria relevant for the product's SK;
                                    "not checkable online" shown separately
                  ──► 4. Report    dashboard: ranking of retailers, per-criterion
                                    pass/fail with evidence, fix list per retailer,
                                    AI-readiness sub-score
```

Supporting data we already have:

- **Assortment Excel**: SK class, EAN and dimensions per model, i.e. what the page *should* say.
- **26 MB product data CSV**: official specs plus links to official images and documents, used to check whether the retailer uses Liebherr's assets.
- **Brand page asset pack**: official logo and campaign teasers, to check whether the brand page is current.

### Possible differentiators ("wow" moments)

1. **"Are they using our images?"** Automatic image matching between retailer images and Liebherr's official ones (perceptual hashing, i.e. a "fingerprint" per image). Liebherr asked for exactly this.
2. **Evidence per verdict.** Screenshot plus reason, addressing the fairness and legal concern.
3. **Validated accuracy.** A teammate audits the same pages **by hand**, and we show *"the tool agrees with the human auditor on X% of criteria and took 2 minutes instead of 2 hours."* Very convincing.
4. **Customer-impact weighting** (the bridge to Option B). Each missing criterion is tagged with the shopper problem it causes ("no dimensions as text → fit uncertainty → return risk"), based on the team's interviews.
5. **AI-readiness score with a live demo.** Ask ChatGPT "which Liebherr fridge fits a 60 cm niche at retailer X?" and show how well the AI can answer from each retailer's page.
6. **EmpCo green-claim flag.** Timely and specific to their "EmpCo-Update".

### MVP vs stretch

- **Must have (Tuesday):** 3 retailers, 1 category, 3 products (one per SK), PDP checks plus some brand-page checks, simple score and comparison view.
- **Should have:** AI-judge checks with screenshots, AI-readiness sub-score, evidence view.
- **Stretch:** image matching, search-visibility tests (#54–56), EmpCo flag, upload mode for blocked shops, history over time.

### Suggested tech stack (for you)

- **Python** + **Playwright** (controls a real browser) for crawling
- **Claude API** for AI judgements (Sonnet for quality, Haiku for cheap bulk checks), with screenshots as input
- **Criteria stored as a config file** (YAML or JSON) generated from Liebherr's Excel, so Liebherr can change criteria without touching code
- Dashboard with **Streamlit** (a Python library for quick web dashboards), or a generated HTML report
- **GitHub repo** so teammates can see and contribute (content, criteria wording, slides)

### Possible split for 6 people (to discuss)

| Role | Who | Does what |
|---|---|---|
| Builder | you | Crawler, checks, scoring, dashboard |
| Criteria owner | 1 | Maps criteria → checks with you, clarifies with Liebherr, decides weighting |
| Human auditor / validation | 1 | Audits the same pages manually → ground truth for the accuracy number |
| User research | 2 | Interviews 4–6 people about buying a fridge online (classmates count), user journey, "information gaps that cause returns" |
| Story & presentation | 1 | Pitch narrative, slides, demo script, design-thinking artefacts per phase |

### Rough timeline

| When | Team | You |
|---|---|---|
| Mon (evening) | — | Final setup check, repo ready |
| Tue 08:15–10:00 | Phase 1–2: define challenge, interview Liebherr reps, start shopper interviews | Crawl first retailer end-to-end |
| Tue 10:00–12:15 | Phase 3: viewpoints, user journey, prioritised gaps; manual audit starts | Rule-based checks |
| Tue 13:15–15:30 | Phase 4: ideas, 2 idea profiles | Scoring + AI-judge checks |
| Tue 15:30–19:30 | Phase 5: prototype + slides | Dashboard; run all 3 retailers |
| Wed 08:15–noon | Rehearse, polish, accuracy comparison | Fix bugs, freeze the demo, **record a backup video** |
| Wed afternoon | Present | Live demo, or the backup video |

---

## 9. Decisions the team has to make

For each one: the options, and my suggestion to bring into the discussion.

1. **Direction: A (audit tool for Liebherr), B (shopper-facing assistant or better product page), or A+B?**
   *Suggestion:* A as the core, with B as the "why" (customer impact). Optionally show one improved product page as an illustration.
2. **Product category.**
   *Suggestion:* **Freestanding fridge-freezers**. Core product, all three SK classes, every retailer stocks them, and they fit the "replace my fridge, will it fit?" story.
3. **Which 3–5 retailers?**
   *Suggestion:* EP, MediaMarkt, Expert (tested, work), plus Euronics via upload mode to show the fallback.
4. **Which products (one per SK)?** The Excel has SK per model; pick models that all chosen retailers carry.
5. **Which criteria are in the MVP?** Product-page criteria are the most valuable and most automatable; the brand page comes second.
6. **Scoring.** Simple pass/fail per criterion, or weighted? Per SK, as Liebherr does? (Ask Liebherr how the % is split.)
7. **Output format.** Dashboard, PDF report per retailer, or both? What would Dominic open every month?
8. **How "AI" is the AI?** Where an AI model judges, and where plain rules are better (rules for the factual checks, AI only for the subjective ones). Be transparent about it.
9. **How to show the customer side.** Interviews, user journey, return-risk mapping per criterion.
10. **Presentation story and roles.** Who presents, demo live or recorded, what's the one memorable number.

---

## 10. Questions to ask Liebherr on site

Best asked early on Tuesday; Dominic and Bea or a Liebherr rep will hopefully be there.

1. Can we see a **completed manual assessment** of one retailer? (A real reference to validate against.)
2. **Which ~30 retailers**, and do you have their shop URLs? Which 3–5 would be most useful for us to focus on?
3. How is the **rebate % split** across criteria and blocks? Are some criteria worth more?
4. Which criteria take you the **most time** manually, or are the most often disputed?
5. What does **"AI-ready"** mean to you: being found and recommended by ChatGPT or Google? Something else?
6. How would you **use the tool**: who runs it, how often, what output (Excel, dashboard, email)? Any IT or data-privacy constraints on AI tools (e.g. only Microsoft/Azure)?
7. Do you have a list of the **top-10 bestsellers per SK**? (Needed for the stock criterion.)
8. Do you have data on **return reasons** for appliances bought online?
9. What changed in the **"EmpCo-Update"** asset package?
10. What do the **lowercase letters and the "-22"** in model names mean?
11. Is your **own webshop** part of the benchmark (best-practice reference)?
12. Would retailers accept being **crawled automatically**? Could you ask them to whitelist a bot?
13. Is there an "ideal" retailer page you'd call **best practice**?
14. Is **sales data per retailer** available, even anonymised, to test "do compliant retailers sell more"?

---

## 11. Risks and things to think about

- **Getting blocked by shops** (bot protection). Mitigation: focus on the shops that work, upload mode, and a recorded backup demo.
- **Demo failing live** (Wi-Fi, a site changes, captchas). Mitigation: run audits beforehand and cache the results, then present from the cached data with a live "re-run" as a bonus. Always have a screen recording.
- **The slow laptop** (8 GB RAM). Close Chrome and other heavy apps while running Playwright; keep things lightweight.
- **API key and cost**: you'll need an Anthropic API key with some credit. A few hundred AI calls cost a few euros at most.
- **Over-engineering**: Tuesday is short. Get one retailer working end-to-end first, then widen.
- **Team engagement**: you're likely the only developer. The others need meaningful work (research, audit, story), not waiting for code. The design-thinking phases give them that.
- **Judges are mixed**: Liebherr (wants a usable tool) plus HNU professors (want design-thinking process and user focus). Show both: the process artefacts and the working tool.
- **Honesty about limits**: say clearly which criteria can't be checked online. Credibility beats overclaiming.
- **Legal sensitivity**: frame it as "fair, transparent, evidence-based assessment", not "spying on retailers".

---

## 12. How to lead the first team conversation

If the team looks to you for direction on Tuesday morning, a 15-minute structure:

1. **Recap the challenge in 2 minutes** (section 1). Make sure everyone knows what LPR and SK mean.
2. **Show the tension**: Liebherr wants an audit tool; HNU wants customer value. Propose solving both: a tool for Liebherr, justified by customer needs.
3. **Share what's already known**: feasibility results (section 7), the full criteria list and data files. This saves the team hours.
4. **Agree on scope** (section 9: decisions 1–4). Timebox it to 10 minutes and don't let it drag.
5. **Split roles** (section 8 table), letting people pick what suits them.
6. **Set checkpoints**: e.g. 12:00 (research findings plus first crawl), 15:30 (prototype plus story outline), 18:00 (full run-through).

Phrases that help:

- *"Can we timebox this decision to 5 minutes and revisit it at noon if needed?"*
- *"What's the smallest version we could demo on Wednesday?"*
- *"Who wants to own this?"*
- *"Let's ask Liebherr instead of guessing."*

Good luck. You're better prepared than most teams will be.
