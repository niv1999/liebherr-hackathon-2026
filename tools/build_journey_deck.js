const pptxgen = require("pptxgenjs");
const path = require("path");
const { applyTheme } = require("/root/.claude/skills/synced/37961a9f-90c4-42e2-81c6-9859aadd4278_3cf4318c-5909-4d34-8bca-060925bff7e6/pptx/scripts/apply_theme.js");

const OUT = process.argv[2];
const HERE = __dirname;

const THEME = {
  name: "Liebherr5 Journey",
  headFontFace: "Arial",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1F2124", lt1: "FFFFFF", dk2: "2B2D2F", lt2: "F2F3F4",
    accent1: "F2C200", accent2: "3A8E5C", accent3: "6B7075",
    accent4: "D9DCDF", accent5: "C0392B", accent6: "4A6FA5",
    hlink: "4A6FA5", folHlink: "6B7075",
  },
};
const HEX = THEME.colors;

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625
pres.title = "Liebherr5 Design Thinking Journey";
pres.author = "Team Liebherr 5";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

// ---------- Layouts ----------
pres.defineSlideMaster({
  title: "TITLE_DARK",
  background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.25, w: 8.4, h: 1.5, fontSize: 36, bold: true, color: C.background1, valign: "bottom", align: "left", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.6, y: 2.9, w: 8.4, h: 0.9, fontSize: 18, color: C.accent1, valign: "top", margin: 0 }, text: "" } },
  ],
});

pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.5, w: 9.0, h: 0.6, fontSize: 26, bold: true, color: C.text1, valign: "middle", align: "left", margin: 0 }, text: "" } },
    { text: { text: "Team Liebherr 5  ·  HNU Winter School 2026  ·  Design Thinking Journey", options: { x: 0.5, y: 5.22, w: 7, h: 0.25, fontSize: 9, color: C.accent3, margin: 0 } } },
  ],
  slideNumber: { x: 9.0, y: 5.22, w: 0.5, h: 0.25, fontSize: 9, color: C.accent3, align: "right" },
});

// ---------- helpers ----------
const PHASES = ["Define Design Challenge", "Understand Design Challenge", "Define Viewpoints", "Generate Ideas", "Develop Prototypes", "Test Prototypes", "Integrate Prototype"];

function addContent(title, phase, section) {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
  s.addText(title, { placeholder: "title" });
  if (phase) {
    s.addShape(pres.shapes.OVAL, { x: 0.5, y: 0.17, w: 0.26, h: 0.26, fill: { color: C.accent1 }, line: { color: C.accent1 }, objectName: "Phase badge" });
    s.addText(String(phase), { x: 0.5, y: 0.17, w: 0.26, h: 0.26, fontSize: 10, bold: true, align: "center", valign: "middle", color: C.text1, margin: 0, isTextBox: true });
    s.addText(`PHASE ${phase}  ·  ${PHASES[phase - 1].toUpperCase()}`, { x: 0.85, y: 0.17, w: 6, h: 0.26, fontSize: 10, bold: true, charSpacing: 1, color: C.accent3, valign: "middle", margin: 0, isTextBox: true });
  } else {
    s.addText("CONTEXT", { x: 0.5, y: 0.17, w: 6, h: 0.26, fontSize: 10, bold: true, charSpacing: 1, color: C.accent3, valign: "middle", margin: 0, isTextBox: true });
  }
  return s;
}

function card(s, x, y, w, h, fill, name) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: 0.08, fill: { color: fill || C.background2 }, line: { color: fill || C.background2 },
    objectName: name || "Card",
  });
}

// Dashed "[TO COMPLETE]" box
function todo(s, x, y, w, h, text, opts = {}) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: 0.08, fill: { color: "FFFBEA" }, line: { color: HEX.accent1, width: 1.5, dashType: "dash" },
    objectName: "TO COMPLETE box",
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.15, y: y + 0.15, w: 1.35, h: 0.28, rectRadius: 0.05, fill: { color: C.accent1 }, line: { color: C.accent1 }, objectName: "TO COMPLETE tag" });
  s.addText("[TO COMPLETE]", { x: x + 0.15, y: y + 0.15, w: 1.35, h: 0.28, fontSize: 10, bold: true, align: "center", valign: "middle", color: C.text1, margin: 0, isTextBox: true });
  if (text) {
    s.addText(text, { x: x + 0.15, y: y + 0.5, w: w - 0.3, h: h - 0.6, fontSize: opts.fontSize || 12, color: C.text2, valign: "top", margin: 0, isTextBox: true, paraSpaceAfter: 3 });
  }
}

function heading(s, text, x, y, w, color) {
  s.addText(text, { x, y, w, h: 0.32, fontSize: 14, bold: true, color: color || C.text1, margin: 0, isTextBox: true, valign: "top" });
}

function bullets(items, size) {
  return items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1, fontSize: size || 13 } }));
}

function numCircle(s, n, x, y, d, fill, color) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill }, objectName: `Circle ${n}` });
  s.addText(String(n), { x, y, w: d, h: d, fontSize: d > 0.45 ? 16 : 11, bold: true, align: "center", valign: "middle", color, margin: 0, isTextBox: true });
}

// =====================================================================
// 1. Title
pres.addSection({ title: "Intro" });
{
  const s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "Intro" });
  s.addText("DESIGN THINKING JOURNEY  ·  LIEBHERR CHALLENGE", { x: 0.6, y: 0.6, w: 8, h: 0.3, fontSize: 11, bold: true, charSpacing: 2, color: C.accent4, margin: 0, isTextBox: true });
  s.addText("From manual checks to fair, evidence-based webshop audits", { placeholder: "title" });
  s.addText("How we help Liebherr assess retailer webshops for the LPR", { placeholder: "body" });
  for (let i = 0; i < 7; i++) {
    const done = i < 3;
    numCircle(s, i + 1, 0.6 + i * 0.62, 4.35, 0.42, done ? HEX.accent1 : HEX.accent3, done ? C.text1 : C.background1);
  }
  s.addText("Team Liebherr 5  ·  HNU Winter School 2026  ·  17–18 Nov 2026", { x: 5.2, y: 4.4, w: 4.2, h: 0.32, fontSize: 11, color: C.accent4, align: "right", margin: 0, isTextBox: true });
}

// 2. Journey at a glance
{
  const s = addContent("Our journey at a glance", null, "Intro");
  const status = [
    ["Done", HEX.accent2, "Design Challenge question, users, scope"],
    ["In progress", HEX.accent1, "Liebherr expert input, webshop test, research"],
    ["In progress", HEX.accent1, "Empathy Map + User Needs done; Journey open"],
    ["To complete", HEX.accent3, "Idea pool, clusters, 2 idea profiles"],
    ["To complete", HEX.accent3, "Audit tool prototype + demo"],
    ["To complete", HEX.accent3, "Test with Liebherr"],
    ["To complete", HEX.accent3, "Business model"],
  ];
  const x0 = 0.5, step = 1.3, cw = 1.2;
  s.addShape(pres.shapes.LINE, { x: x0 + 0.35, y: 1.62, w: step * 6, h: 0, line: { color: HEX.accent4, width: 2 }, objectName: "Timeline line" });
  for (let i = 0; i < 7; i++) {
    const x = x0 + i * step;
    const [label, col, res] = status[i];
    numCircle(s, i + 1, x + 0.1, 1.37, 0.5, i < 3 ? HEX.accent1 : HEX.dk2, i < 3 ? C.text1 : C.background1);
    s.addText(PHASES[i], { x, y: 2.0, w: cw, h: 0.55, fontSize: 12, bold: true, color: C.text1, margin: 0, valign: "top", isTextBox: true });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.62, w: 1.05, h: 0.26, rectRadius: 0.05, fill: { color: col }, line: { color: col }, objectName: "Status chip" });
    s.addText(label, { x, y: 2.62, w: 1.05, h: 0.26, fontSize: 10, bold: true, align: "center", valign: "middle", color: col === HEX.accent1 ? C.text1 : C.background1, margin: 0, isTextBox: true });
    s.addText(res, { x, y: 3.0, w: cw, h: 1.0, fontSize: 11, color: C.text2, margin: 0, valign: "top", isTextBox: true });
  }
  card(s, 0.5, 4.3, 9.0, 0.7, C.background2, "Note card");
  s.addText([
    { text: "Common thread: ", options: { bold: true } },
    { text: "each phase justifies the next. Our users’ pains lead to the needs, and the needs lead to the solution." },
  ], { x: 0.7, y: 4.3, w: 8.6, h: 0.7, fontSize: 13, color: C.text1, valign: "middle", margin: 0, isTextBox: true });
}

// 3. Context
{
  const s = addContent("Today, Liebherr audits retailer webshops by hand", null, "Intro");
  const stats = [["~30", "retailer webshops"], ["~76", "LPR quality criteria"], ["3 mo.", "between two checks"], ["SK1–3", "assortment classes, stricter at the top"]];
  stats.forEach(([n, l], i) => {
    const x = 0.5 + i * 2.3;
    card(s, x, 1.4, 2.1, 1.75, C.background2, "Stat card");
    s.addText(n, { x: x + 0.15, y: 1.55, w: 1.8, h: 0.8, fontSize: 36, bold: true, color: C.text1, margin: 0, isTextBox: true, fontFace: THEME.headFontFace });
    s.addText(l, { x: x + 0.15, y: 2.4, w: 1.8, h: 0.65, fontSize: 13, color: C.accent3, margin: 0, valign: "top", isTextBox: true });
  });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 3.45, w: 9.0, h: 1.5, fill: { color: C.text2 }, line: { color: HEX.dk2 }, objectName: "Quote panel" });
  s.addText("“There are persons who sit in front of the computer and check: retailer A uses those pictures, has this information, has those videos…”", { x: 0.8, y: 3.55, w: 8.4, h: 0.9, fontSize: 16, italic: true, color: C.background1, margin: 0, valign: "middle", isTextBox: true });
  s.addText("Liebherr-Hausgeräte, kickoff call. LPR = Liebherr Performance Rebate, paid if a webshop meets the criteria.", { x: 0.8, y: 4.45, w: 8.4, h: 0.4, fontSize: 11, color: C.accent1, margin: 0, isTextBox: true });
}

// =====================================================================
// Phase 1
pres.addSection({ title: "Phase 1 – Design Challenge" });
{
  const s = addContent("From topic field to one guiding question", 1, "Phase 1 – Design Challenge");
  const boxes = [
    ["Topic field", "Retail webshop quality (Liebherr LPR)"],
    ["Wishes", "Automatic webshop check · comparable quality index · transparent rating · clear to-do list for retailers"],
    ["Complaints", "Manual and time-intensive · only every 3 months · inconsistent ratings · late feedback · complex criteria"],
  ];
  boxes.forEach(([h, t], i) => {
    const x = 0.5 + i * 3.05;
    card(s, x, 1.35, 2.85, 1.85, C.background2, h);
    heading(s, h, x + 0.2, 1.5, 2.45);
    s.addText(t, { x: x + 0.2, y: 1.9, w: 2.45, h: 1.2, fontSize: 13, color: C.text2, margin: 0, valign: "top", isTextBox: true });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 3.4, w: 9.0, h: 1.6, rectRadius: 0.08, fill: { color: C.text2 }, line: { color: HEX.dk2 }, objectName: "Design Challenge box" });
  s.addText("OUR DESIGN CHALLENGE", { x: 0.75, y: 3.55, w: 5, h: 0.3, fontSize: 11, bold: true, charSpacing: 2, color: C.accent1, margin: 0, isTextBox: true });
  s.addText("“How do we manage to improve the webshop quality assessment for Liebherr employees and their retail partners?”", { x: 0.75, y: 3.9, w: 8.5, h: 0.95, fontSize: 19, bold: true, color: C.background1, margin: 0, valign: "middle", isTextBox: true });
  s.addNotes("Source: team's filled Design Challenge template (Phase1_Design_Challenge.docx). TO CHECK: align with the new Design Challenge template document if the wording changed.");
}
{
  const s = addContent("Who we design for, and what is in scope", 1, "Phase 1 – Design Challenge");
  heading(s, "Typical users", 0.5, 1.3, 4.2);
  const users = [
    ["Liebherr LPR team", "Sales staff who audit ~30 webshops by hand and decide the rebate", "PRIMARY"],
    ["Retail partners", "Shops that must meet the criteria and need clear feedback on what to fix", "SECONDARY"],
  ];
  users.forEach(([n, d, tag], i) => {
    const y = 1.7 + i * 1.6;
    card(s, 0.5, y, 4.2, 1.4, C.background2, n);
    s.addText(tag, { x: 0.7, y: y + 0.15, w: 2, h: 0.25, fontSize: 10, bold: true, charSpacing: 1, color: i === 0 ? C.accent2 : C.accent3, margin: 0, isTextBox: true });
    s.addText(n, { x: 0.7, y: y + 0.4, w: 3.8, h: 0.35, fontSize: 16, bold: true, color: C.text1, margin: 0, isTextBox: true });
    s.addText(d, { x: 0.7, y: y + 0.75, w: 3.8, h: 0.55, fontSize: 12, color: C.text2, margin: 0, valign: "top", isTextBox: true });
  });
  heading(s, "Scope (HNU: 1 category, 3–5 retailers)", 5.1, 1.3, 4.4);
  s.addText(bullets([
    "Direction: AI-supported audit tool for Liebherr (Option A)",
    "Customer value as the “why”: better product pages, fewer returns",
    "Plan: Tue = phases 1–5 · Wed = pitch to Liebherr",
  ], 13), { x: 5.1, y: 1.7, w: 4.4, h: 1.5, color: C.text2, margin: 0, valign: "top", paraSpaceAfter: 6, isTextBox: true });
  todo(s, 5.1, 3.3, 4.4, 1.7, "Confirm category (proposal: freestanding fridge-freezers) and retailers (proposal: EP:, MediaMarkt, Expert, plus Euronics via upload)", { fontSize: 12 });
}

// =====================================================================
// Phase 2
pres.addSection({ title: "Phase 2 – Understand" });
{
  const s = addContent("How we built our understanding", 2, "Phase 2 – Understand");
  const techs = [
    ["Expert interview", "Liebherr kickoff call: goals, pain points, fairness", true],
    ["Expert Q&A", "Written answers to our questions from Liebherr (Dominik)", "todo"],
    ["Test of existing solutions", "Manual LPR Excel + automated test of 5 webshops", true],
    ["Desk research", "Retailers, EU law, AI-readiness, existing tools", true],
  ];
  techs.forEach(([t, d, st], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.5 + col * 4.6, y = 1.35 + row * 1.35;
    card(s, x, y, 4.4, 1.15, C.background2, t);
    const done = st === true;
    s.addShape(pres.shapes.OVAL, { x: x + 0.2, y: y + 0.22, w: 0.34, h: 0.34, fill: { color: done ? HEX.accent2 : HEX.accent1 }, line: { color: done ? HEX.accent2 : HEX.accent1 }, objectName: "Status dot" });
    s.addText(done ? "✓" : "!", { x: x + 0.2, y: y + 0.22, w: 0.34, h: 0.34, fontSize: 13, bold: true, align: "center", valign: "middle", color: done ? C.background1 : C.text1, margin: 0, isTextBox: true });
    s.addText(t, { x: x + 0.7, y: y + 0.18, w: 3.5, h: 0.35, fontSize: 15, bold: true, color: C.text1, margin: 0, isTextBox: true });
    s.addText(d + (done ? "" : "  [TO COMPLETE]"), { x: x + 0.7, y: y + 0.55, w: 3.55, h: 0.5, fontSize: 12, color: C.text2, margin: 0, valign: "top", isTextBox: true });
  });
  todo(s, 0.5, 4.1, 9.0, 0.95, "Interview or observe a typical user (an LPR auditor or a retailer). HNU asks for ≥ 2 techniques with 3 documented results each.", { fontSize: 12 });
}
{
  const s = addContent("Expert interview: what Liebherr told us", 2, "Phase 2 – Understand");
  const q = [
    ["“We would love to have an AI tool which can show us our 30 retailers and give us a quality index.”", "Result 1: one comparable score per retailer"],
    ["“When I give them 4% for pictures, then everyone should have the 4% for pictures.”", "Result 2: fairness is contractual, so every verdict needs proof"],
    ["“Are they using our pictures… or their own content? Checking this will be a big job for a human.”", "Result 3: image and content checks are the biggest manual effort"],
  ];
  q.forEach(([quote, res], i) => {
    const x = 0.5 + i * 3.05;
    card(s, x, 1.35, 2.85, 3.65, C.background2, "Quote card");
    s.addText("“", { x: x + 0.2, y: 1.35, w: 0.6, h: 0.7, fontSize: 48, bold: true, color: C.accent1, margin: 0, isTextBox: true, fontFace: "Cambria" });
    s.addText(quote.replace(/^“|”$/g, ""), { x: x + 0.2, y: 1.95, w: 2.45, h: 1.7, fontSize: 14, italic: true, color: C.text1, margin: 0, valign: "top", isTextBox: true });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.15, y: 3.85, w: 2.55, h: 1.0, rectRadius: 0.06, fill: { color: C.text2 }, line: { color: HEX.dk2 }, objectName: "Result box" });
    s.addText(res, { x: x + 0.3, y: 3.85, w: 2.3, h: 1.0, fontSize: 12, bold: true, color: C.background1, margin: 0, valign: "middle", isTextBox: true });
  });
  s.addNotes("Source: kickoff Zoom with Liebherr (Dominic Petzold, Bea Beer), around minutes 48–64.");
}
{
  const s = addContent("Expert Q&A: Liebherr’s answers to our questions", 2, "Phase 2 – Understand");
  heading(s, "What we asked", 0.5, 1.3, 4.2);
  const qs = [
    "Can we see a completed manual assessment?",
    "How is the rebate % split across criteria?",
    "Which criteria take the most time or cause disputes?",
    "What does “AI-ready” mean for Liebherr?",
    "Who would use the tool, how often, with which IT limits?",
  ];
  qs.forEach((t, i) => {
    const y = 1.7 + i * 0.66;
    numCircle(s, i + 1, 0.5, y + 0.06, 0.36, HEX.dk2, C.background1);
    s.addText(t, { x: 1.0, y, w: 3.8, h: 0.5, fontSize: 13, color: C.text1, margin: 0, valign: "middle", isTextBox: true });
  });
  todo(s, 5.1, 1.3, 4.4, 3.7, "Add Dominik’s key answers here (one line per question), and 3 documented results, e.g.:\n\n• What changes our scope\n• What changes our scoring\n• What changes our prototype", { fontSize: 13 });
}
{
  const s = addContent("Webshop test: can a tool read the shops?", 2, "Phase 2 – Understand");
  const rows = [["EP:", true, "Full page, structured product data"], ["MediaMarkt", true, "Liebherr content injected by scripts"], ["Expert", true, "Bot protection, but passed"], ["Euronics", false, "Blocked (403)"], ["Otto", false, "Empty page for bots"]];
  const hdr = { bold: true, color: HEX.lt1, fill: { color: HEX.dk2 }, fontSize: 12 };
  const data = [[{ text: "Retailer", options: hdr }, { text: "Readable?", options: hdr }, { text: "Note", options: hdr }]];
  rows.forEach(([r, ok, n]) => data.push([
    { text: r, options: { bold: true, fontSize: 12, color: HEX.dk1 } },
    { text: ok ? "Yes" : "No", options: { bold: true, fontSize: 12, color: ok ? HEX.accent2 : HEX.accent5 } },
    { text: n, options: { fontSize: 12, color: HEX.dk2 } },
  ]));
  s.addTable(data, { x: 0.5, y: 1.35, w: 5.2, colW: [1.3, 1.0, 2.9], rowH: 0.42, border: { type: "solid", pt: 0.75, color: HEX.accent4 }, fontFace: THEME.bodyFontFace, valign: "middle" });
  heading(s, "Three results", 6.1, 1.35, 3.4);
  const res = [
    ["3 of 5", "shops can be read automatically"],
    ["Real browser", "needed: Liebherr content loads via scripts"],
    ["Upload mode", "as fallback for blocked shops"],
  ];
  res.forEach(([a, b], i) => {
    const y = 1.75 + i * 0.95;
    card(s, 6.1, y, 3.4, 0.8, C.background2, "Result card");
    s.addText(a, { x: 6.3, y: y + 0.08, w: 3.1, h: 0.32, fontSize: 15, bold: true, color: C.text1, margin: 0, isTextBox: true });
    s.addText(b, { x: 6.3, y: y + 0.4, w: 3.1, h: 0.32, fontSize: 12, color: C.text2, margin: 0, isTextBox: true });
  });
  s.addText("Test on 14 Nov 2026 with the product page of the Liebherr CBNsda 5223-22. Today’s manual process: an Excel sheet with ~70 criteria per shop.", { x: 0.5, y: 4.6, w: 5.2, h: 0.5, fontSize: 10, color: C.accent3, margin: 0, isTextBox: true });
}

// =====================================================================
// Phase 3
pres.addSection({ title: "Phase 3 – Viewpoints" });
{
  const s = addContent("User Empathy Map: meet Bob, LPR auditor", 3, "Phase 3 – Viewpoints");
  s.addImage({ path: path.join(HERE, "empathy.jpg"), x: 0.5, y: 1.35, w: 4.6, h: 4.6 / 1.776, altText: "Photo of the team's filled User Empathy Map for Bob", objectName: "Empathy map photo" });
  s.addText("Our filled template, 17 Nov 2026", { x: 0.5, y: 4.0, w: 4.6, h: 0.3, fontSize: 10, color: C.accent3, margin: 0, isTextBox: true });
  const groups = [
    ["Who he is", "35, single, 2-room flat with his cat. Board games, pub, detective novels. Influenced by his older brother and a close work friend."],
    ["Sees & hears", "A lot of Excel. Typing, phone calls and notifications all day."],
    ["Thinks & says", "Wants the workday to end; a bit down but optimistic. Complains about his job and that AI will soon replace him."],
  ];
  groups.forEach(([h, t], i) => {
    const y = 1.35 + i * 1.23;
    card(s, 5.4, y, 4.1, 1.1, C.background2, h);
    s.addText(h, { x: 5.6, y: y + 0.08, w: 3.8, h: 0.3, fontSize: 13, bold: true, color: C.text1, margin: 0, isTextBox: true });
    s.addText(t, { x: 5.6, y: y + 0.38, w: 3.8, h: 0.68, fontSize: 11.5, color: C.text2, margin: 0, valign: "top", isTextBox: true });
  });
}
{
  const s = addContent("What Bob’s map tells us", 3, "Phase 3 – Viewpoints");
  const cols = [
    ["Frustrations", HEX.accent5, ["Audits are time-consuming", "Feels burned out and overwhelmed", "Fears AI will replace him"]],
    ["Job to be done", HEX.accent2, ["Feels stuck in his comfort zone", "Wants to grow at work", "Solution: an AI tool that gives him more responsibility and new skills"]],
  ];
  cols.forEach(([h, col, items], i) => {
    const x = 0.5 + i * 3.05;
    card(s, x, 1.35, 2.85, 2.55, C.background2, h);
    s.addShape(pres.shapes.OVAL, { x: x + 0.2, y: 1.52, w: 0.22, h: 0.22, fill: { color: col }, line: { color: col }, objectName: "Dot" });
    s.addText(h, { x: x + 0.52, y: 1.47, w: 2.2, h: 0.32, fontSize: 15, bold: true, color: C.text1, margin: 0, isTextBox: true });
    s.addText(bullets(items, 13), { x: x + 0.2, y: 1.9, w: 2.5, h: 1.9, color: C.text2, margin: 0, valign: "top", paraSpaceAfter: 6, isTextBox: true });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.6, y: 1.35, w: 2.9, h: 2.55, rectRadius: 0.08, fill: { color: C.text2 }, line: { color: HEX.dk2 }, objectName: "Insight box" });
  s.addText("DESIGN IMPLICATION", { x: 6.8, y: 1.5, w: 2.6, h: 0.3, fontSize: 11, bold: true, charSpacing: 1, color: C.accent1, margin: 0, isTextBox: true });
  s.addText("The tool is Bob’s assistant, not his replacement: AI does the repetitive checks, Bob keeps the final verdict.", { x: 6.8, y: 1.85, w: 2.55, h: 1.9, fontSize: 15, bold: true, color: C.background1, margin: 0, valign: "top", isTextBox: true });
  card(s, 0.5, 4.1, 9.0, 0.9, C.background2, "Link card");
  s.addText([
    { text: "This links to our User Needs: ", options: { bold: true } },
    { text: "“less repetitive manual work”, “maintain control over the verdicts” and “a way to override the AI verdict”." },
  ], { x: 0.7, y: 4.1, w: 8.6, h: 0.9, fontSize: 13, color: C.text1, margin: 0, valign: "middle", isTextBox: true });
}
{
  const s = addContent("User Journey (as-is): Bob’s audit today", 3, "Phase 3 – Viewpoints");
  const stages = ["Prepare audit", "Visit webshops", "Check criteria", "Score & rebate", "Feedback to retailer"];
  const rowsL = ["Needs & tasks", "Experiences", "Contact points"];
  const x0 = 2.0, cw = 1.5;
  stages.forEach((st, i) => {
    const x = x0 + i * cw;
    s.addShape(pres.shapes.CHEVRON, { x, y: 1.35, w: cw - 0.05, h: 0.55, fill: { color: i % 2 ? HEX.dk2 : "3E4144" }, line: { color: HEX.dk2 }, objectName: "Stage chevron" });
    s.addText(st, { x: x + 0.2, y: 1.35, w: cw - 0.45, h: 0.55, fontSize: 11, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0, isTextBox: true });
  });
  rowsL.forEach((r, j) => {
    const y = 2.05 + j * 0.8;
    s.addText(r, { x: 0.5, y, w: 1.4, h: 0.7, fontSize: 12, bold: true, color: C.text1, margin: 0, valign: "middle", isTextBox: true });
    stages.forEach((_, i) => {
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x0 + i * cw + 0.05, y, w: cw - 0.15, h: 0.7, rectRadius: 0.05, fill: { color: "FFFBEA" }, line: { color: HEX.accent1, width: 1, dashType: "dash" }, objectName: "Journey cell" });
    });
  });
  todo(s, 0.5, 4.5, 9.0, 0.65, null);
  s.addText("Draft stages only. Validate with Liebherr, then fill needs, experiences and contact points per stage.", { x: 2.15, y: 4.5, w: 7.2, h: 0.65, fontSize: 12, color: C.text2, margin: 0, valign: "middle", isTextBox: true });
}
{
  const s = addContent("User Needs: 20 needs, rated by the team", 3, "Phase 3 – Viewpoints");
  const colsH = ["Functions", "Requirements", "Experience"];
  const very = [
    "Automatic check against LPR criteria\nFinal score per retailer\nScoring history over time\nAI-readiness score",
    "AI tool that improves over time\nMuch faster than manual checks\nComplies with data privacy and law",
    "Confidence to defend a rating to a retailer\nLess repetitive manual work",
  ];
  const imp = [
    "Evidence / reasoning for every verdict\nFeedback report / to-do list for retailer\nOverride the AI verdict\nFilter retailers by criteria",
    "Reliable, correct results\nFair and the same for all retailers\nEasy without technical knowledge\nCriteria editable without coding",
    "Overview at a glance: top and weak retailers\nControl over verdicts and assessments\nTransparent communication with retailers",
  ];
  const x0 = 1.75, cw = 2.6;
  colsH.forEach((h, i) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x0 + i * cw, y: 1.3, w: cw - 0.1, h: 0.4, rectRadius: 0.05, fill: { color: C.text2 }, line: { color: HEX.dk2 }, objectName: "Column header" });
    s.addText(h, { x: x0 + i * cw, y: 1.3, w: cw - 0.1, h: 0.4, fontSize: 13, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0, isTextBox: true });
  });
  [["Very important", very, HEX.accent1, 1.8, 1.45], ["Important", imp, HEX.accent4, 3.35, 1.45]].forEach(([lab, arr, col, y, h]) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y, w: 1.15, h, rectRadius: 0.05, fill: { color: col }, line: { color: col }, objectName: "Row label" });
    s.addText(lab, { x: 0.5, y, w: 1.15, h, fontSize: 12, bold: true, color: C.text1, align: "center", valign: "middle", margin: 0.05, isTextBox: true });
    arr.forEach((t, i) => {
      card(s, x0 + i * cw, y, cw - 0.1, h, col === HEX.accent1 ? "FFF6CC" : HEX.lt2, "Needs cell");
      s.addText(t, { x: x0 + i * cw + 0.12, y: y + 0.06, w: cw - 0.34, h: h - 0.12, fontSize: 11, color: C.text1, margin: 0, valign: "middle", paraSpaceAfter: 3, isTextBox: true });
    });
  });
  s.addText("Source: our User Needs template (DT_5_UN), 17 Nov 2026. No need was rated “not important”.", { x: 0.5, y: 4.88, w: 9.0, h: 0.28, fontSize: 10, color: C.accent3, margin: 0, isTextBox: true });
  s.addNotes("Source: team's User Needs template (DT_5_UN), 17 Nov 2026. Ratings copied as written on the board.");
}
{
  const s = addContent("Our focus: 5 prioritized needs", 3, "Phase 3 – Viewpoints");
  const pri = [
    ["Automatic check of webshops against the LPR criteria", "Function"],
    ["One final score per retailer, comparable over time", "Function"],
    ["Much faster than manual checks, less repetitive work", "Requirement + Experience"],
    ["Confidence: Bob can defend every rating to a retailer", "Experience"],
    ["Compliant with data privacy and legal rules", "Requirement"],
  ];
  pri.forEach(([t, k], i) => {
    const y = 1.3 + i * 0.66;
    card(s, 0.5, y, 5.6, 0.56, C.background2, "Priority row");
    numCircle(s, i + 1, 0.62, y + 0.1, 0.36, HEX.accent1, C.text1);
    s.addText(t, { x: 1.15, y, w: 3.4, h: 0.56, fontSize: 12.5, bold: true, color: C.text1, margin: 0, valign: "middle", isTextBox: true });
    s.addText(k, { x: 4.55, y, w: 1.45, h: 0.56, fontSize: 10, color: C.accent3, margin: 0, valign: "middle", align: "right", isTextBox: true });
  });
  s.addImage({ path: path.join(HERE, "needs.jpg"), x: 6.4, y: 1.3, w: 3.1, h: 3.1 / 1.776, altText: "Photo of the team's User Needs board", objectName: "Needs board photo" });
  s.addText("Selected from the needs rated “very important”", { x: 6.4, y: 3.12, w: 3.1, h: 0.3, fontSize: 10, color: C.accent3, margin: 0, isTextBox: true });
  todo(s, 6.4, 3.5, 3.1, 1.5, "Team to confirm this top 5. Check if “evidence per verdict” and “reliable results” should move up.", { fontSize: 11 });
}

// =====================================================================
// Phase 4
pres.addSection({ title: "Phase 4 – Ideas" });
{
  const s = addContent("Generate ideas: from many to the relevant ones", 4, "Phase 4 – Ideas");
  const steps = [["Idea pool", "All ideas, e.g. brainwriting"], ["Clusters", "Group and revise ideas"], ["2 idea profiles", "Describe the two best ideas"], ["Selection", "Justify the choice against our 5 needs"]];
  steps.forEach(([h, d], i) => {
    const x = 0.5 + i * 2.3;
    todo(s, x, 1.35, 2.1, 2.3, null);
    s.addText(h, { x: x + 0.15, y: 1.9, w: 1.8, h: 0.4, fontSize: 16, bold: true, color: C.text1, margin: 0, isTextBox: true });
    s.addText(d, { x: x + 0.15, y: 2.35, w: 1.8, h: 1.1, fontSize: 12, color: C.text2, margin: 0, valign: "top", isTextBox: true });
    if (i < 3) s.addText("›", { x: x + 2.08, y: 2.2, w: 0.25, h: 0.5, fontSize: 28, bold: true, color: C.accent3, align: "center", valign: "middle", margin: 0, isTextBox: true });
  });
  card(s, 0.5, 3.9, 9.0, 1.1, C.background2, "Starting points");
  s.addText("STARTING POINTS (NOT YET EVALUATED)", { x: 0.7, y: 4.0, w: 8.6, h: 0.3, fontSize: 10, bold: true, charSpacing: 1, color: C.accent3, margin: 0, isTextBox: true });
  s.addText("A: evidence-based audit tool for Liebherr      B: better product page or selection assistant for shoppers", { x: 0.7, y: 4.35, w: 8.6, h: 0.5, fontSize: 13, color: C.text1, margin: 0, valign: "middle", isTextBox: true });
}

// Phase 5
pres.addSection({ title: "Phase 5 – Prototype" });
{
  const s = addContent("Prototype: draft concept of the audit tool", 5, "Phase 5 – Prototype");
  const flow = [["Crawl", "Real browser opens product and brand pages"], ["Check", "Rules + AI judge per criterion"], ["Score", "Per retailer and per SK class"], ["Report", "Ranking, evidence, to-do list"]];
  flow.forEach(([h, d], i) => {
    const x = 0.5 + i * 2.3;
    card(s, x, 1.35, 2.1, 1.5, i === 3 ? HEX.dk2 : HEX.lt2, h);
    numCircle(s, i + 1, x + 0.15, 1.5, 0.36, HEX.accent1, C.text1);
    s.addText(h, { x: x + 0.62, y: 1.5, w: 1.4, h: 0.36, fontSize: 16, bold: true, color: i === 3 ? C.background1 : C.text1, margin: 0, valign: "middle", isTextBox: true });
    s.addText(d, { x: x + 0.15, y: 1.98, w: 1.8, h: 0.8, fontSize: 12, color: i === 3 ? C.background1 : C.text2, margin: 0, valign: "top", isTextBox: true });
    if (i < 3) s.addText("›", { x: x + 2.08, y: 1.85, w: 0.25, h: 0.5, fontSize: 28, bold: true, color: C.accent3, align: "center", valign: "middle", margin: 0, isTextBox: true });
  });
  s.addText("Draft from our preparation. Final version depends on the Phase 4 selection.", { x: 0.5, y: 2.95, w: 9, h: 0.3, fontSize: 10, color: C.accent3, margin: 0, isTextBox: true });
  todo(s, 0.5, 3.35, 9.0, 1.65, "Screenshots or demo of the working prototype · which need each feature answers · backup video of the demo", { fontSize: 13 });
}

// Phases 6–7
pres.addSection({ title: "Phases 6–7 – Test & Integrate" });
{
  const s = addContent("Next: test it, then build the business model", 6, "Phases 6–7 – Test & Integrate");
  todo(s, 0.5, 1.35, 4.4, 3.65, "Phase 6 · Test Prototypes\n\n• Test with Liebherr (Dominik, Bea)\n• Compare tool vs. manual audit: % agreement and time saved\n• Feedback protocol and improvements", { fontSize: 13 });
  todo(s, 5.1, 1.35, 4.4, 3.65, "Phase 7 · Integrate Prototype\n\n• Business model (5 dimensions)\n• Who runs it, how often, at what cost\n• Value for Liebherr, retailers and shoppers", { fontSize: 13 });
}

// Closing
{
  const s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "Phases 6–7 – Test & Integrate" });
  s.addText("Bob keeps the verdict. The tool does the legwork.", { placeholder: "title" });
  s.addText("Thank you. Questions?", { placeholder: "body" });
  for (let i = 0; i < 7; i++) {
    const done = i < 3;
    numCircle(s, i + 1, 0.6 + i * 0.62, 4.35, 0.42, done ? HEX.accent1 : HEX.accent3, done ? C.text1 : C.background1);
  }
  s.addText("Team Liebherr 5  ·  HNU Winter School 2026", { x: 5.2, y: 4.4, w: 4.2, h: 0.32, fontSize: 11, color: C.accent4, align: "right", margin: 0, isTextBox: true });
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("written", OUT);
})();
