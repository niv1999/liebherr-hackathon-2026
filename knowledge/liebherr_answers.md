# Liebherr's answers to our questions (Dominik, received 17 Nov 2026)

Source of truth for what Liebherr wants. Where this conflicts with `briefing.md` (written before), **this file wins**.

## Not available
- **No completed manual assessment** will be shared (Q1). → We validate by doing our own manual audit.
- **No sales data per retailer** (Q14).
- **No fixed top-10 bestseller list** (Q10): the stock criterion is met if **10 products per SK are available**; the retailer chooses which.

## Retailers (Q2, Q13)
- Priority: **EURONICS, expert, MediaMarkt, OTTO, ElectronicPartner (EP:), Elektroplus**.
- Tool should ideally work for **any retailer with an online shop**, not just these.
- ⚠ Euronics (403) and Otto (empty page) blocked our bot on 14 Nov → upload mode / real browser matters more. Elektroplus not tested yet.
- Bot access (Q9): for the prototype, **document access restrictions** and separate auto-verifiable vs manual criteria. **Liebherr could ask partners to whitelist a bot.**
- Liebherr's own website = reference for official product info, technologies, features, descriptions. Not a retailer to score. **No "perfect" retailer page** exists.

## Weighting (Q3, Q15)
- Block weight: **Online Visibility (highest) > Online Services (middle) > Online Advice (lowest)**.
- Requirements differ per SK1/SK2/SK3.
- Most important in practice: **high-quality product detail pages, comprehensive product features, accurate technical information**.
- No more detail on the exact scoring; see the LPR intro deck and assessment spreadsheet.

## Hardest / most time-consuming to assess (Q4), the best automation targets
1. **Premium product detail pages (SK3)**: comprehensive, high-quality content.
2. **SEO-optimised product descriptions**: quality, completeness, relevance.
3. **Product features and benefits**: are Liebherr technologies and their customer benefits presented correctly and completely?
- Their example: checking an image exists is easy; judging whether a text **sufficiently explains the benefit of a Liebherr technology** is subjective. → This is where the AI judge adds most value (compare against official feature texts in the product CSV).

## Today's process (Q5, Q16)
- Manual, in **Excel files and PowerPoint tables**, against LPR Online criteria per SK.
- Gaps → retailer is informed and helped → must fix within a deadline → otherwise **purchasing conditions can suffer**.
- Goal: **more efficient, systematic, scalable**.

## How they'd use the tool (Q6)
- Today ad hoc, no fixed schedule. Want: analyse any retailer on demand, repeat over time. **A weekly check of all retailers would be sufficient.**
- Outputs wanted:
    - Overview of Liebherr's online presence across retailers
    - Fulfilled vs missing LPR criteria
    - **Gap analysis**: missing or outdated product information
    - Comparison of retailer websites
    - **How many Liebherr products are listed** per retailer
    - **How many listed products are available to buy**
    - AI-readiness evaluation
    - **Actionable recommendations**
- Format open (dashboard, Excel, other). Must be **transparent, easy to understand and reusable**.

## AI readiness (Q7)
- No method exists yet. **They want our ideas for a systematic, comparable way to measure it.**
- Scope: retailers' Liebherr **brand pages and product detail pages**, for AI search, discovery and recommendation.
- Aspects they named: complete and accurate product info · clear feature and benefit descriptions · consistent identifiers and specs · structured machine-readable data · content AI can access and interpret · info that lets AI compare and recommend accurately.

## Constraints (Q8)
- Prototype: use **publicly available retailer info + the challenge reference data**. No IT/AI-provider restrictions stated.

## Returns (Q11)
- Strategic goal: better purchase decisions, **fewer avoidable returns**, through better info, advice and services.
- Causes they named: missing **installation dimensions**, incomplete technical info, insufficient feature explanations.
- **Real example:** a customer bought an appliance **without a door handle** but needed one, so she returned it.

## EmpCo (Q12)
- **Nice to have**, not required. Focus is the existing LPR Online framework.

## Retailer-facing output (Q17)
- Primary: a **reliable internal tool** with a full overview.
- Secondary but "very valuable": a **structured report per retailer** with fulfilled criteria, missing requirements, examples of missing or outdated info, evidence/screenshots, and specific recommendations.
