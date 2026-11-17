// Builds Liebherr5_DesignThinking_Journey.pptx — white & blue, phase-by-phase documentation.
// Run: NODE_PATH=<dir with pptxgenjs> node build_journey_deck.js out.pptx <imgdir>
const pptxgen = require("pptxgenjs");
const path = require("path");
const { applyTheme } = require(process.env.APPLY_THEME);

const OUT = process.argv[2];
const IMG = process.argv[3] || __dirname;

const THEME = {
  name: "Liebherr5 White Blue",
  headFontFace: "Arial",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1F2937", lt1: "FFFFFF", dk2: "0B2D5B", lt2: "EEF4FC",
    accent1: "1F5FAD", accent2: "6B7280", accent3: "D6E3F5",
    accent4: "E5E7EB", accent5: "B45309", accent6: "15803D",
    hlink: "1F5FAD", folHlink: "6B7280",
  },
};
const H = THEME.colors;

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625
pres.title = "Liebherr5 Design Thinking Journey";
pres.author = "Team Liebherr 5";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

pres.defineSlideMaster({
  title: "TITLE",
  background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.5, w: 8.8, h: 1.3, fontSize: 36, bold: true, color: C.text2, align: "left", valign: "bottom", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.6, y: 2.95, w: 8.8, h: 0.6, fontSize: 18, color: C.accent1, align: "left", valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.5, w: 9.0, h: 0.6, fontSize: 26, bold: true, color: C.text2, align: "left", valign: "middle", margin: 0 }, text: "" } },
    { text: { text: "Team Liebherr 5  ·  HNU Winter School 2026", options: { x: 0.5, y: 5.22, w: 6, h: 0.25, fontSize: 9, color: C.accent2, margin: 0 } } },
  ],
  slideNumber: { x: 9.0, y: 5.22, w: 0.5, h: 0.25, fontSize: 9, color: C.accent2, align: "right" },
});

const PHASES = ["Define Design Challenge", "Understand Design Challenge", "Define Viewpoints", "Generate Ideas", "Develop Prototypes", "Test Prototypes", "Integrate Prototype"];

function T(s, text, o) { s.addText(text, Object.assign({ margin: 0, isTextBox: true, valign: "top", color: C.text1 }, o)); }

function circle(s, n, x, y, d, filled) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: filled ? H.accent1 : H.lt1 }, line: { color: filled ? H.accent1 : H.accent3, width: 1.5 }, objectName: `Circle ${n}` });
  T(s, String(n), { x, y, w: d, h: d, fontSize: d > 0.45 ? 16 : 11, bold: true, align: "center", valign: "middle", color: filled ? C.background1 : C.accent2 });
}

function slide(title, phase, section) {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
  s.addText(title, { placeholder: "title" });
  if (phase) {
    circle(s, phase, 0.5, 0.17, 0.26, true);
    T(s, `PHASE ${phase}  ·  ${PHASES[phase - 1].toUpperCase()}`, { x: 0.85, y: 0.17, w: 6, h: 0.26, fontSize: 10, bold: true, charSpacing: 1, color: C.accent1, valign: "middle" });
  }
  return s;
}

function card(s, x, y, w, h, name, fill) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: fill || H.lt2 }, line: { color: fill || H.lt2 }, objectName: name || "Card" });
}

function todo(s, x, y, w, h, text, size) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: H.lt1 }, line: { color: H.accent1, width: 1.25, dashType: "dash" }, objectName: "TO COMPLETE box" });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.15, y: y + 0.15, w: 1.35, h: 0.28, rectRadius: 0.05, fill: { color: H.accent3 }, line: { color: H.accent3 }, objectName: "TO COMPLETE tag" });
  T(s, "[TO COMPLETE]", { x: x + 0.15, y: y + 0.15, w: 1.35, h: 0.28, fontSize: 10, bold: true, align: "center", valign: "middle", color: C.accent1 });
  if (text) T(s, text, { x: x + 0.15, y: y + 0.52, w: w - 0.3, h: h - 0.62, fontSize: size || 12, color: C.text1 });
}

function bl(items, size) {
  return items.map((t, i) => ({ text: t, options: { bullet: { indent: 14 }, breakLine: i < items.length - 1, fontSize: size || 13 } }));
}

// "What we did" slide: left = activities, right = results
function didSlide(phase, section, title, activities, results, openItem) {
  const s = slide(title, phase, section);
  card(s, 0.5, 1.35, 4.4, openItem ? 2.55 : 3.65, "Activities");
  T(s, "What we did", { x: 0.7, y: 1.5, w: 4, h: 0.32, fontSize: 15, bold: true, color: C.accent1 });
  s.addText(bl(activities, 13), { x: 0.7, y: 1.9, w: 4.0, h: openItem ? 1.9 : 3.0, margin: 0, color: C.text1, paraSpaceAfter: 6, valign: "top", isTextBox: true });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.1, y: 1.35, w: 4.4, h: openItem ? 2.55 : 3.65, rectRadius: 0.08, fill: { color: H.lt1 }, line: { color: H.accent3, width: 1.25 }, objectName: "Results" });
  T(s, "Results", { x: 5.3, y: 1.5, w: 4, h: 0.32, fontSize: 15, bold: true, color: C.accent1 });
  s.addText(bl(results, 13), { x: 5.3, y: 1.9, w: 4.0, h: openItem ? 1.9 : 3.0, margin: 0, color: C.text1, paraSpaceAfter: 6, valign: "top", isTextBox: true });
  if (openItem) todo(s, 0.5, 4.05, 9.0, 1.0, null);
  if (openItem) T(s, openItem, { x: 2.15, y: 4.05, w: 7.15, h: 1.0, fontSize: 12.5, valign: "middle" });
  return s;
}

// ===================================================================
pres.addSection({ title: "Intro" });
{
  const s = pres.addSlide({ masterName: "TITLE", sectionTitle: "Intro" });
  T(s, "DESIGN THINKING JOURNEY  ·  LIEBHERR CHALLENGE", { x: 0.6, y: 0.7, w: 8, h: 0.3, fontSize: 11, bold: true, charSpacing: 2, color: C.accent1 });
  s.addText("Improving the webshop quality assessment for Liebherr", { placeholder: "title" });
  s.addText("From the design challenge to the prototype", { placeholder: "body" });
  for (let i = 0; i < 7; i++) circle(s, i + 1, 0.6 + i * 0.6, 4.35, 0.42, i < 3);
  T(s, "Team Liebherr 5  ·  HNU Winter School 2026  ·  17–18 Nov 2026", { x: 5.0, y: 4.4, w: 4.4, h: 0.32, fontSize: 11, color: C.accent2, align: "right", valign: "middle" });
}
{
  const s = slide("Our process: 7 phases", null, "Intro");
  const res = ["Design Challenge question", "Expert input, webshop test, research", "Empathy Map, User Needs", "Ideas and idea profiles", "Prototype", "Test with users", "Business model"];
  s.addShape(pres.shapes.LINE, { x: 0.85, y: 1.65, w: 7.8, h: 0, line: { color: H.accent3, width: 2 }, objectName: "Line" });
  for (let i = 0; i < 7; i++) {
    const x = 0.5 + i * 1.3, done = i < 3;
    circle(s, i + 1, x + 0.1, 1.4, 0.5, done);
    T(s, PHASES[i], { x, y: 2.05, w: 1.2, h: 0.55, fontSize: 12, bold: true, color: done ? C.text2 : C.accent2 });
    T(s, done ? "Done" : "To complete", { x, y: 2.65, w: 1.2, h: 0.25, fontSize: 10, bold: true, color: done ? C.accent1 : C.accent2 });
    T(s, res[i], { x, y: 2.95, w: 1.2, h: 0.9, fontSize: 11, color: done ? C.text1 : C.accent2 });
  }
  card(s, 0.5, 4.2, 9.0, 0.8, "Note");
  T(s, "Each phase builds on the one before: what we learn about the users leads to the solution.", { x: 0.7, y: 4.2, w: 8.6, h: 0.8, fontSize: 13, valign: "middle" });
}
{
  const s = slide("The starting point: Liebherr’s challenge", null, "Intro");
  const st = [["~30", "retailer webshops"], ["~76", "quality criteria (LPR)"], ["3", "months between manual checks"], ["SK1–3", "assortment classes"]];
  st.forEach(([n, l], i) => {
    const x = 0.5 + i * 2.3;
    card(s, x, 1.35, 2.1, 1.5, "Stat");
    T(s, n, { x: x + 0.15, y: 1.5, w: 1.85, h: 0.7, fontSize: 30, bold: true, color: C.accent1, fontFace: THEME.headFontFace });
    T(s, l, { x: x + 0.15, y: 2.2, w: 1.85, h: 0.55, fontSize: 13, color: C.text1 });
  });
  s.addText(bl([
    "Liebherr pays retailers a rebate (LPR) if their webshop meets quality criteria",
    "Today, employees check every webshop by hand in an Excel sheet",
    "Liebherr wants an AI-supported tool to check, score and compare retailers",
  ], 14), { x: 0.5, y: 3.15, w: 9.0, h: 1.8, margin: 0, color: C.text1, paraSpaceAfter: 8, valign: "top", isTextBox: true });
}

// ===================================================================
pres.addSection({ title: "Phase 1" });
didSlide(1, "Phase 1", "Phase 1: what we did",
  ["Read the challenge material from Liebherr and HNU", "Listened to Liebherr in the kickoff call", "Collected wishes and complaints of potential users", "Chose our users: Liebherr employees and retailers", "Formulated one guiding question"],
  ["Topic field: retail webshop quality (LPR)", "Filled Design Challenge template", "Our Design Challenge (next slide)"]);
{
  const s = slide("Our Design Challenge", 1, "Phase 1");
  [["Topic field", "Retail webshop quality (Liebherr LPR)"],
   ["Wishes", "Automatic webshop check · comparable quality index · transparent rating · clear to-do list for retailers"],
   ["Complaints", "Manual and time-intensive · only every 3 months · inconsistent ratings · late feedback · complex criteria"]].forEach(([h, t], i) => {
    const x = 0.5 + i * 3.05;
    card(s, x, 1.35, 2.85, 1.85, h);
    T(s, h, { x: x + 0.2, y: 1.5, w: 2.45, h: 0.32, fontSize: 14, bold: true, color: C.accent1 });
    T(s, t, { x: x + 0.2, y: 1.9, w: 2.45, h: 1.2, fontSize: 13 });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 3.4, w: 9.0, h: 1.6, rectRadius: 0.08, fill: { color: H.accent1 }, line: { color: H.accent1 }, objectName: "Design Challenge" });
  T(s, "DESIGN CHALLENGE", { x: 0.75, y: 3.55, w: 5, h: 0.3, fontSize: 11, bold: true, charSpacing: 2, color: C.accent3 });
  T(s, "“How do we manage to improve the webshop quality assessment for Liebherr employees and their retail partners?”", { x: 0.75, y: 3.9, w: 8.5, h: 0.95, fontSize: 19, bold: true, color: C.background1, valign: "middle" });
}

// ===================================================================
pres.addSection({ title: "Phase 2" });
didSlide(2, "Phase 2", "Phase 2: what we did",
  ["Expert interview: Liebherr kickoff call", "Expert questions: sent to Liebherr (Dominik), answered in writing", "Test of existing solutions: manual LPR Excel + automated test of 5 webshops", "Desk research: retailers, EU law, AI-readiness, existing tools"],
  ["Liebherr wants one comparable quality index", "Fairness is contractual: same rule for every retailer", "3 of 5 webshops can be read automatically"],
  "Add the key results from Dominik’s answers. HNU asks for at least 2 techniques with 3 documented results each.");
{
  const s = slide("Expert interview: what Liebherr told us", 2, "Phase 2");
  [["We would love to have an AI tool which can show us our 30 retailers and give us a quality index.", "One comparable score per retailer"],
   ["When I give them 4% for pictures, then everyone should have the 4% for pictures.", "Fair and equal rules, with proof"],
   ["Are they using our pictures… or their own content? Checking this will be a big job for a human.", "Image and content checks take the most effort"]].forEach(([q, r], i) => {
    const x = 0.5 + i * 3.05;
    card(s, x, 1.35, 2.85, 3.65, "Quote");
    T(s, "“", { x: x + 0.2, y: 1.35, w: 0.6, h: 0.7, fontSize: 48, bold: true, color: C.accent1, fontFace: "Cambria" });
    T(s, q, { x: x + 0.2, y: 1.95, w: 2.45, h: 1.75, fontSize: 14, italic: true });
    T(s, "RESULT", { x: x + 0.2, y: 3.85, w: 2.45, h: 0.25, fontSize: 10, bold: true, charSpacing: 1, color: C.accent1 });
    T(s, r, { x: x + 0.2, y: 4.12, w: 2.45, h: 0.75, fontSize: 13, bold: true, color: C.text2 });
  });
}
{
  const s = slide("Expert questions: Liebherr’s answers", 2, "Phase 2");
  T(s, "What we asked", { x: 0.5, y: 1.3, w: 4.2, h: 0.32, fontSize: 15, bold: true, color: C.accent1 });
  ["Can we see a completed manual assessment?", "How is the rebate % split across criteria?", "Which criteria take the most time?", "What does “AI-ready” mean for Liebherr?", "Who would use the tool, and how often?"].forEach((t, i) => {
    const y = 1.75 + i * 0.64;
    circle(s, i + 1, 0.5, y + 0.07, 0.36, false);
    T(s, t, { x: 1.0, y, w: 3.8, h: 0.5, fontSize: 13, valign: "middle" });
  });
  todo(s, 5.1, 1.3, 4.4, 3.7, "Dominik’s answers: one short line per question, plus the 3 most important results for our project.", 13);
}
{
  const s = slide("Test of existing solutions: our webshop test", 2, "Phase 2");
  const hdr = { bold: true, color: H.lt1, fill: { color: H.accent1 }, fontSize: 12 };
  const data = [[{ text: "Retailer", options: hdr }, { text: "Readable?", options: hdr }, { text: "Note", options: hdr }]];
  [["EP:", 1, "Full page, structured product data"], ["MediaMarkt", 1, "Liebherr content loaded by scripts"], ["Expert", 1, "Bot protection, but passed"], ["Euronics", 0, "Blocked (403)"], ["Otto", 0, "Empty page for bots"]].forEach(([r, ok, n]) => data.push([
    { text: r, options: { bold: true, fontSize: 12, color: H.dk1 } },
    { text: ok ? "Yes" : "No", options: { bold: true, fontSize: 12, color: ok ? H.accent6 : H.accent5 } },
    { text: n, options: { fontSize: 12, color: H.dk1 } }]));
  s.addTable(data, { x: 0.5, y: 1.35, w: 5.2, colW: [1.3, 1.0, 2.9], rowH: 0.42, border: { type: "solid", pt: 0.75, color: H.accent3 }, fontFace: THEME.bodyFontFace, valign: "middle" });
  T(s, "Results", { x: 6.1, y: 1.35, w: 3.4, h: 0.32, fontSize: 15, bold: true, color: C.accent1 });
  [["3 of 5", "shops can be read automatically"], ["Real browser", "needed: content loads via scripts"], ["Upload mode", "as fallback for blocked shops"]].forEach(([a, b], i) => {
    const y = 1.75 + i * 0.95;
    card(s, 6.1, y, 3.4, 0.8, "Result");
    T(s, a, { x: 6.3, y: y + 0.08, w: 3.1, h: 0.32, fontSize: 15, bold: true, color: C.text2 });
    T(s, b, { x: 6.3, y: y + 0.4, w: 3.1, h: 0.32, fontSize: 12 });
  });
  T(s, "Tested on 14 Nov 2026 with the product page of the Liebherr CBNsda 5223-22.", { x: 0.5, y: 4.6, w: 5.2, h: 0.4, fontSize: 10, color: C.accent2 });
}

// ===================================================================
pres.addSection({ title: "Phase 3" });
didSlide(3, "Phase 3", "Phase 3: what we did",
  ["Built a User Empathy Map of a typical user: Bob, Liebherr LPR auditor", "Collected 20 user needs: functions, requirements, experience", "Rated each need: very important / important / not important"],
  ["Bob’s main worries: time-consuming work, burnout, fear of AI replacement", "9 needs rated very important, 11 important, none unimportant"],
  "User Journey (as-is) of Bob’s audit, and selection of 3–5 prioritized needs.");
{
  const s = slide("User Empathy Map: Bob, LPR auditor", 3, "Phase 3");
  s.addImage({ path: path.join(IMG, "empathy.jpg"), x: 0.5, y: 1.35, w: 4.4, h: 4.4 / 1.776, altText: "Photo of the team's User Empathy Map", objectName: "Empathy map photo" });
  T(s, "Our template, 17 Nov 2026", { x: 0.5, y: 3.9, w: 4.4, h: 0.3, fontSize: 10, color: C.accent2 });
  [["Who he is", "35, single, 2-room flat, a cat. Board games, pub, detective novels."],
   ["Sees, hears, says", "A lot of Excel and phone calls. Complains about his job and that AI will replace him."],
   ["Frustrations", "Time-consuming work, burned out, overwhelmed."],
   ["Job to be done", "Feels stuck. Needs a new AI tool that gives him responsibility and new skills."]].forEach(([h, t], i) => {
    const y = 1.35 + i * 0.93;
    card(s, 5.1, y, 4.4, 0.83, h);
    T(s, h, { x: 5.3, y: y + 0.07, w: 4.0, h: 0.28, fontSize: 13, bold: true, color: C.accent1 });
    T(s, t, { x: 5.3, y: y + 0.35, w: 4.0, h: 0.45, fontSize: 11.5 });
  });
}
{
  const s = slide("User Needs: rated by the team", 3, "Phase 3");
  const very = ["Automatic check against LPR criteria\nFinal score per retailer\nScoring history over time\nAI-readiness score",
    "AI tool that improves over time\nMuch faster than manual checks\nComplies with data privacy and law",
    "Confidence to defend a rating to a retailer\nLess repetitive manual work"];
  const imp = ["Evidence / reasoning for every verdict\nFeedback report / to-do list for retailer\nOverride the AI verdict\nFilter retailers by criteria",
    "Reliable, correct results\nFair and the same for all retailers\nEasy without technical knowledge\nCriteria editable without coding",
    "Overview at a glance: top and weak retailers\nControl over verdicts and assessments\nTransparent communication with retailers"];
  const x0 = 1.75, cw = 2.6;
  ["Functions", "Requirements", "Experience"].forEach((h, i) => {
    T(s, h, { x: x0 + i * cw, y: 1.3, w: cw - 0.1, h: 0.35, fontSize: 14, bold: true, color: C.accent1, align: "center", valign: "middle" });
  });
  [["Very important", very, H.accent3, 1.75], ["Important", imp, H.lt2, 3.3]].forEach(([lab, arr, fill, y]) => {
    T(s, lab, { x: 0.5, y, w: 1.15, h: 1.45, fontSize: 12, bold: true, color: C.text2, valign: "middle" });
    arr.forEach((t, i) => {
      card(s, x0 + i * cw, y, cw - 0.1, 1.45, "Needs cell", fill);
      T(s, t, { x: x0 + i * cw + 0.12, y: y + 0.06, w: cw - 0.34, h: 1.33, fontSize: 11, valign: "middle", paraSpaceAfter: 3 });
    });
  });
  T(s, "Source: our User Needs template, 17 Nov 2026. No need was rated “not important”.", { x: 0.5, y: 4.88, w: 9.0, h: 0.28, fontSize: 10, color: C.accent2 });
}
{
  const s = slide("Still open in Phase 3", 3, "Phase 3");
  todo(s, 0.5, 1.35, 4.4, 3.65, "User Journey (as-is)\n\nBob’s audit step by step: needs, experiences and contact points per step.", 13);
  todo(s, 5.1, 1.35, 4.4, 3.65, "3–5 prioritized needs\n\nChoose from the needs rated “very important”.", 13);
}

// ===================================================================
pres.addSection({ title: "Next phases" });
{
  const s = slide("Next phases", null, "Next phases");
  [[4, "Generate Ideas", "Idea pool, clusters, 2 idea profiles, justified choice"],
   [5, "Develop Prototypes", "Prototype of the chosen solution"],
   [6, "Test Prototypes", "Test with Liebherr, feedback protocol"],
   [7, "Integrate Prototype", "Business model"]].forEach(([n, h, d], i) => {
    const x = 0.5 + i * 2.3;
    todo(s, x, 1.35, 2.1, 3.65, null);
    circle(s, n, x + 0.15, 1.95, 0.45, false);
    T(s, h, { x: x + 0.15, y: 2.55, w: 1.8, h: 0.6, fontSize: 15, bold: true, color: C.text2 });
    T(s, d, { x: x + 0.15, y: 3.2, w: 1.8, h: 1.5, fontSize: 12 });
  });
}
{
  const s = pres.addSlide({ masterName: "TITLE", sectionTitle: "Next phases" });
  s.addText("Thank you", { placeholder: "title" });
  s.addText("Team Liebherr 5  ·  HNU Winter School 2026", { placeholder: "body" });
  for (let i = 0; i < 7; i++) circle(s, i + 1, 0.6 + i * 0.6, 4.35, 0.42, i < 3);
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("written", OUT);
})();
