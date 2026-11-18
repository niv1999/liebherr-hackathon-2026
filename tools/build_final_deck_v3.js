// Builds Liebherr5_DesignThinking_Journey.pptx — light, visual, white & blue.
// Run: APPLY_THEME=<pptx skill>/scripts/apply_theme.js NODE_PATH=<node_modules> node build_journey_deck.js out.pptx <imgdir>
// Knock-out version (6 parts, 8 min). imgdir = tools/deck_assets
const pptxgen = require("pptxgenjs");
const path = require("path");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa6");
const { applyTheme } = require(process.env.APPLY_THEME);

const OUT = process.argv[2];
const IMG = process.argv[3] || __dirname;

const THEME = {
  name: "Liebherr5 Liebherr Style",
  headFontFace: "Arial",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1F1F1F", lt1: "FFFFFF", dk2: "1F1F1F", lt2: "F2F2F2",
    accent1: "3A3A3A", accent2: "6E6E6E", accent3: "D9D9D9",
    accent4: "E5E7EB", accent5: "C2410C", accent6: "15803D",
    hlink: "3A3A3A", folHlink: "6B7280",
  },
};
const H = THEME.colors;
const YEL = "FFD000"; // Liebherr yellow accent

async function icon(name, color) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(fa[name], { color: "#" + color, size: 256 }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

(async () => {
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
    ],
  });
  pres.defineSlideMaster({
    title: "CONTENT",
    background: { color: C.background1 },
    objects: [
    ],
  });

  const PH = ["Design Challenge", "Insights", "User & needs", "Ideas & selection", "Prototype", "Outlook"];
  const T = (s, text, o) => s.addText(text, Object.assign({ margin: 0, isTextBox: true, valign: "top", color: C.text1, fontSize: 14 }, o));
  const dot = (s, n, x, y, d, filled) => {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: filled ? YEL : H.lt1 }, line: { color: filled ? YEL : H.accent3, width: 1.5 }, objectName: `Phase ${n}` });
    T(s, String(n), { x, y, w: d, h: d, fontSize: d > 0.45 ? 16 : 11, bold: true, align: "center", valign: "middle", color: filled ? C.text1 : C.accent2 });
  };
  const iconCircle = async (s, name, x, y, d, filled) => {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: filled ? YEL : H.lt2 }, line: { color: filled ? YEL : H.lt2 }, objectName: "Icon circle" });
    const p = d * 0.27;
    s.addImage({ data: await icon(name, filled ? H.dk1 : H.accent1), x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p, altText: name, objectName: "Icon" });
  };
  const card = (s, x, y, w, h, fill) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.1, fill: { color: fill || H.lt2 }, line: { color: fill || H.lt2 }, objectName: "Card" });
  const todoTag = (s, x, y) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 1.35, h: 0.28, rectRadius: 0.05, fill: { color: H.lt1 }, line: { color: H.accent1, width: 1, dashType: "dash" }, objectName: "TO COMPLETE tag" });
    T(s, "[TO COMPLETE]", { x, y, w: 1.35, h: 0.28, fontSize: 10, bold: true, align: "center", valign: "middle", color: C.accent1 });
  };
  let slideNo = 1;
  const slide = (title, phase, section) => {
    const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
    T(s, title, { x: 0.5, y: 0.5, w: 9.0, h: 0.6, fontSize: 28, bold: true, color: C.text2, valign: "middle", fontFace: THEME.headFontFace });
    slideNo++;
    T(s, String(slideNo), { x: 9.0, y: 5.22, w: 0.5, h: 0.25, fontSize: 9, color: C.accent2, align: "right" });
    s.addImage({ path: path.join(IMG, "helpr_logo.png"), x: 8.55, y: 0.15, w: 0.95, h: 0.95 * 188 / 720, altText: "HeLPR logo", objectName: "HeLPR logo" });
    if (phase) {
      dot(s, phase, 0.5, 0.17, 0.26, phase !== "B");
      T(s, phase === "B" ? "BACKUP  ·  FOR Q&A" : `PART ${phase}  ·  ${PH[phase - 1].toUpperCase()}`, { x: 0.85, y: 0.17, w: 6, h: 0.26, fontSize: 10, bold: true, charSpacing: 1, color: C.accent1, valign: "middle" });
    }
    return s;
  };
  // Stylised fridge-freezer drawn with shapes (bookend motif)
  const fridge = (s, x, y, w, h) => {
    const RR = pres.shapes.ROUNDED_RECTANGLE;
    s.addShape(pres.shapes.OVAL, { x: x - 0.15, y: y + h - 0.08, w: w + 0.3, h: 0.22, fill: { color: "000000", transparency: 85 }, line: { color: "000000", transparency: 100 }, objectName: "Fridge shadow" });
    s.addShape(RR, { x, y, w, h, rectRadius: 0.12, fill: { color: H.lt1 }, line: { color: H.accent3, width: 1.25 }, objectName: "Fridge body" });
    const split = y + h * 0.6;
    s.addShape(pres.shapes.LINE, { x: x + 0.04, y: split, w: w - 0.08, h: 0, line: { color: H.accent3, width: 1.5 }, objectName: "Door split" });
    s.addShape(RR, { x: x + w - 0.28, y: y + h * 0.18, w: 0.09, h: h * 0.3, rectRadius: 0.04, fill: { color: H.accent1 }, line: { color: H.accent1 }, objectName: "Handle top" });
    s.addShape(RR, { x: x + w - 0.28, y: split + 0.18, w: 0.09, h: h * 0.22, rectRadius: 0.04, fill: { color: H.accent1 }, line: { color: H.accent1 }, objectName: "Handle bottom" });
    s.addShape(RR, { x: x + 0.25, y: y + 0.3, w: w * 0.32, h: 0.28, rectRadius: 0.05, fill: { color: H.accent1 }, line: { color: H.accent1 }, objectName: "Display" });
    s.addShape(pres.shapes.OVAL, { x: x + 0.33, y: y + 0.39, w: 0.1, h: 0.1, fill: { color: YEL }, line: { color: YEL }, objectName: "Display light" });
    s.addShape(RR, { x: x + 0.5, y: y + 0.39, w: w * 0.32 - 0.35, h: 0.1, rectRadius: 0.03, fill: { color: "6E6E6E" }, line: { color: "6E6E6E" }, objectName: "Display text" });
  };
  const bookend = async (s) => {
    s.addShape(pres.shapes.RECTANGLE, { x: 6.3, y: 0, w: 3.7, h: 5.625, fill: { color: YEL }, line: { color: YEL }, objectName: "Yellow panel" });
    fridge(s, 7.15, 0.75, 1.9, 4.0);
    s.addShape(pres.shapes.OVAL, { x: 6.55, y: 3.05, w: 1.3, h: 1.3, fill: { color: H.accent1 }, line: { color: H.lt1, width: 3 }, objectName: "Audit badge" });
    s.addImage({ data: await icon("FaMagnifyingGlassChart", YEL), x: 6.87, y: 3.37, w: 0.66, h: 0.66, altText: "Audit icon", objectName: "Audit icon" });
  };
  // Yellow phase opener
  const GOALS = ["What problem do we solve, for whom, in which situation?", "What did we learn from Liebherr and existing solutions?", "Who is the user, and what does he really need?", "Which ideas did we have, and why this one?", "What does the solution look like?", "What happens next?"];
  const PICONS = ["FaBullseye", "FaComments", "FaUser", "FaLightbulb", "FaCubes", "FaRocket"];
  const divider = async (n, section) => {
    const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
    s.background = { color: YEL };
    slideNo++;
    T(s, "0" + n, { x: 0.5, y: 0.55, w: 4, h: 2.0, fontSize: 130, bold: true, color: C.text1, fontFace: THEME.headFontFace, valign: "bottom" });
    T(s, "PART " + n, { x: 0.6, y: 2.75, w: 5, h: 0.3, fontSize: 12, bold: true, charSpacing: 3, color: C.text1 });
    T(s, PH[n - 1], { x: 0.6, y: 3.05, w: 8.5, h: 0.7, fontSize: 34, bold: true, color: C.text1, fontFace: THEME.headFontFace });
    T(s, GOALS[n - 1], { x: 0.6, y: 3.8, w: 8.5, h: 0.4, fontSize: 16, color: C.text1 });
    for (let i = 0; i < 6; i++) {
      const cur = i === n - 1;
      s.addShape(pres.shapes.OVAL, { x: 0.6 + i * 0.42, y: 4.75, w: 0.24, h: 0.24, fill: { color: cur ? H.dk1 : YEL }, line: { color: H.dk1, width: 1.25 }, objectName: "Step" });
    }
    s.addShape(pres.shapes.OVAL, { x: 6.85, y: 0.55, w: 2.5, h: 2.5, fill: { color: H.lt1 }, line: { color: H.lt1 }, objectName: "Phase icon circle" });
    s.addImage({ data: await icon(PICONS[n - 1], H.dk1), x: 7.5, y: 1.2, w: 1.2, h: 1.2, altText: PH[n - 1], objectName: "Phase icon" });
  };

  // decorative circles (title + end)
  const deco = async (s) => {
    s.addShape(pres.shapes.OVAL, { x: 5.9, y: 0.85, w: 3.9, h: 3.9, fill: { color: H.lt2 }, line: { color: H.lt2 }, objectName: "Deco big" });
    s.addShape(pres.shapes.OVAL, { x: 6.7, y: 1.65, w: 2.3, h: 2.3, fill: { color: YEL }, line: { color: YEL }, objectName: "Deco circle" });
    s.addImage({ data: await icon("FaMagnifyingGlassChart", H.dk1), x: 7.3, y: 2.25, w: 1.1, h: 1.1, altText: "Audit icon", objectName: "Deco icon" });
  };

  // ================= SLIDES (v3: knock-out structure, 6 parts, 8 min) =================
  const shot = (s, file, alt) => {
    const w = 6.3, h = 6.3 / 1.681;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.47, y: 1.27, w: w + 0.06, h: h + 0.06, fill: { color: H.accent3 }, line: { color: H.accent3 }, objectName: "Screenshot border" });
    s.addImage({ path: path.join(IMG, file), x: 0.5, y: 1.3, w, h, altText: alt, objectName: "Screenshot" });
  };
  const points = (s, pts) => pts.forEach(([h, t], i) => {
    const y = 1.3 + i * 1.3;
    s.addShape(pres.shapes.OVAL, { x: 7.1, y, w: 0.45, h: 0.45, fill: { color: YEL }, line: { color: YEL }, objectName: "Point no" });
    T(s, String(i + 1), { x: 7.1, y, w: 0.45, h: 0.45, fontSize: 14, bold: true, align: "center", valign: "middle" });
    T(s, h, { x: 7.7, y: y - 0.02, w: 1.85, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
    T(s, t, { x: 7.7, y: y + 0.35, w: 1.85, h: 0.85, fontSize: 12 });
  });
  const chip = async (s, ic, h, t, x, y, w) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.62, rectRadius: 0.31, fill: { color: H.lt1 }, line: { color: H.accent3, width: 1.25 }, objectName: "Chip" });
    await iconCircle(s, ic, x + 0.1, y + 0.08, 0.46, false);
    T(s, h, { x: x + 0.65, y: y + 0.07, w: w - 0.75, h: 0.26, fontSize: 12, bold: true, color: C.text2 });
    T(s, t, { x: x + 0.65, y: y + 0.32, w: w - 0.75, h: 0.24, fontSize: 10, color: C.accent2 });
  };

  // 1 — Title
  pres.addSection({ title: "Intro" });
  {
    const s = pres.addSlide({ masterName: "TITLE", sectionTitle: "Intro" });
    await bookend(s);
    T(s, "LIEBHERR CHALLENGE  ·  KNOCK-OUT PRESENTATION", { x: 0.6, y: 0.55, w: 5.6, h: 0.3, fontSize: 10, bold: true, charSpacing: 2, color: C.accent1 });
    s.addImage({ path: path.join(IMG, "helpr_logo.png"), x: 0.6, y: 1.05, w: 1.7, h: 1.7 * 188 / 720, altText: "HeLPR logo", objectName: "HeLPR logo" });
    T(s, "Fair, fast webshop audits for Liebherr", { x: 0.6, y: 1.55, w: 5.4, h: 1.45, fontSize: 34, bold: true, color: C.text2, valign: "bottom", fontFace: THEME.headFontFace });
    T(s, "From the design challenge to the prototype", { x: 0.6, y: 3.1, w: 5.4, h: 0.4, fontSize: 16, color: C.accent1 });
    T(s, "CHALLENGE PARTNER", { x: 0.6, y: 3.85, w: 3, h: 0.25, fontSize: 9, bold: true, charSpacing: 2, color: C.accent2 });
    s.addImage({ path: path.join(IMG, "liebherr_logo.png"), x: 0.6, y: 4.15, w: 1.8, h: 1.8 * 99 / 800, altText: "Liebherr logo", objectName: "Partner logo" });
    T(s, "Team Liebherr 5  ·  HNU Winter School 2026", { x: 0.6, y: 4.7, w: 5.4, h: 0.3, fontSize: 12, color: C.accent2 });
    s.addNotes("8 minutes + 2 minutes Q&A. Six parts, one per phase: Challenge 0:45 · Insights 1:30 · User 1:30 · Ideas 1:30 · Prototype 2:00 · Outlook 0:45.");
  }

  // PART 1 — Design Challenge (0:45)
  pres.addSection({ title: "1 Challenge" });
  await divider(1, "1 Challenge");
  {
    const s = slide("Our Design Challenge", 1, "1 Challenge");
    const st = [["FaStore", "~30", "retailer webshops"], ["FaListCheck", "~76", "LPR criteria per shop"], ["FaClock", "3 months", "between two manual checks"]];
    for (let i = 0; i < 3; i++) {
      const x = 0.5 + i * 3.05;
      card(s, x, 1.3, 2.85, 0.95);
      await iconCircle(s, st[i][0], x + 0.15, 1.5, 0.55, false);
      T(s, st[i][1], { x: x + 0.85, y: 1.38, w: 1.9, h: 0.5, fontSize: 24, bold: true, color: C.text2, fontFace: THEME.headFontFace, valign: "middle" });
      T(s, st[i][2], { x: x + 0.85, y: 1.85, w: 1.9, h: 0.3, fontSize: 11, color: C.accent2 });
    }
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 2.45, w: 9.0, h: 1.45, rectRadius: 0.12, fill: { color: H.accent1 }, line: { color: H.accent1 }, objectName: "Question" });
    T(s, "HOW MIGHT WE…", { x: 0.8, y: 2.58, w: 5, h: 0.25, fontSize: 10, bold: true, charSpacing: 2, color: YEL });
    T(s, "“How do we manage to improve the webshop quality assessment for Liebherr employees and their retail partners?”", { x: 0.8, y: 2.85, w: 8.4, h: 0.95, fontSize: 19, bold: true, color: C.background1, valign: "middle" });
    T(s, "WHY IT MATTERS TO LIEBHERR", { x: 0.5, y: 4.08, w: 5, h: 0.25, fontSize: 10, bold: true, charSpacing: 2, color: C.accent2 });
    await chip(s, "FaScaleBalanced", "Fair rebates", "Same rule for every retailer", 0.5, 4.38, 4.4);
    await chip(s, "FaRotateLeft", "Fewer avoidable returns", "Better product pages, better choices", 5.1, 4.38, 4.4);
    s.addNotes("0:45 — Liebherr checks ~30 webshops by hand, ~76 criteria, every ~3 months. Our guiding question. Why it matters: the rebate must be fair for all, and good pages prevent returns.");
  }

  // PART 2 — Insights (1:30)
  pres.addSection({ title: "2 Insights" });
  await divider(2, "2 Insights");
  {
    const s = slide("What we did and what we learned", 2, "2 Insights");
    const tech = [
      ["FaComments", "Expert interview", "Kickoff call with Liebherr", "They want one quality score per retailer, fair for all"],
      ["FaEnvelopeOpenText", "Expert questions", "17 questions, answered in writing by Liebherr", "Hardest by hand: do texts explain Liebherr features well?"],
      ["FaGlobe", "Webshop test", "We tried to read 5 retailer shops with a tool", "3 of 5 shops can be read automatically"],
    ];
    for (let i = 0; i < 3; i++) {
      const [ic, h, d, r] = tech[i];
      const x = 0.5 + i * 3.05;
      card(s, x, 1.3, 2.85, 3.7);
      await iconCircle(s, ic, x + 0.25, 1.5, 0.65, true);
      T(s, h, { x: x + 0.25, y: 2.3, w: 2.4, h: 0.35, fontSize: 17, bold: true, color: C.text2 });
      T(s, d, { x: x + 0.25, y: 2.7, w: 2.4, h: 0.65, fontSize: 12, color: C.accent2 });
      T(s, "KEY FINDING", { x: x + 0.25, y: 3.65, w: 2.4, h: 0.25, fontSize: 10, bold: true, charSpacing: 1, color: C.accent1 });
      T(s, r, { x: x + 0.25, y: 3.93, w: 2.4, h: 0.95, fontSize: 14, bold: true });
    }
    s.addNotes("0:50 — Three techniques: expert interview (kickoff), written expert questions to Liebherr, and a test of existing solutions (can a tool read the shops?). One key finding each.");
  }
  {
    const s = slide("In Liebherr’s own words", 2, "2 Insights");
    T(s, "“", { x: 0.5, y: 1.1, w: 1, h: 1.2, fontSize: 96, bold: true, color: YEL, fontFace: "Cambria" });
    T(s, "When I give them 4% for pictures, then everyone should have the 4% for pictures.", { x: 1.3, y: 1.45, w: 7.9, h: 1.35, fontSize: 26, italic: true, color: C.text2, valign: "middle" });
    T(s, "Liebherr, kickoff call", { x: 1.3, y: 2.85, w: 6, h: 0.3, fontSize: 13, color: C.accent2 });
    card(s, 1.3, 3.45, 3.85, 1.5);
    await iconCircle(s, "FaScaleBalanced", 1.5, 3.65, 0.55, true);
    T(s, "Every rating must be fair and backed by proof", { x: 2.2, y: 3.6, w: 2.8, h: 1.2, fontSize: 15, bold: true, color: C.text2, valign: "middle" });
    card(s, 5.35, 3.45, 3.85, 1.5);
    await iconCircle(s, "FaRotateLeft", 5.55, 3.65, 0.55, true);
    T(s, "Real case: a fridge was returned because it had no door handle", { x: 6.25, y: 3.6, w: 2.8, h: 1.2, fontSize: 15, bold: true, color: C.text2, valign: "middle" });
    s.addNotes("0:40 — The strongest quote: fairness is contractual. Second finding from Liebherr's answers: returns come from missing info, e.g. the door-handle case.");
  }

  // PART 3 — User & needs (1:30)
  pres.addSection({ title: "3 User" });
  await divider(3, "3 User");
  {
    const s = slide("User Empathy Map: meet Bob", 3, "3 User");
    const q = [
      ["FaEye", "Sees", "A lot of Excel, all day long", 0.5, 1.3],
      ["FaEarListen", "Hears", "Typing, phone calls, notifications on his phone", 5.9, 1.3],
      ["FaCloudRain", "Thinks & feels", "Just wants the workday to end. A bit depressed, but still optimistic.", 0.5, 2.6],
      ["FaCommentDots", "Says", "Complains about his job, and that AI will soon replace him", 5.9, 2.6],
    ];
    s.addShape(pres.shapes.LINE, { x: 4.1, y: 2.45, w: 1.8, h: 0, line: { color: H.accent3, width: 1.5 }, objectName: "Connector" });
    for (const [ic, h, t, x, y] of q) {
      card(s, x, y, 3.6, 1.15);
      await iconCircle(s, ic, x + 0.15, y + 0.15, 0.45, true);
      T(s, h, { x: x + 0.7, y: y + 0.15, w: 2.8, h: 0.45, fontSize: 14, bold: true, color: C.text2, valign: "middle" });
      T(s, t, { x: x + 0.15, y: y + 0.65, w: 3.35, h: 0.48, fontSize: 11.5 });
    }
    s.addShape(pres.shapes.OVAL, { x: 4.35, y: 1.4, w: 1.3, h: 1.3, fill: { color: YEL }, line: { color: H.lt1, width: 4 }, objectName: "Bob centre" });
    s.addImage({ data: await icon("FaUser", H.dk1), x: 4.75, y: 1.7, w: 0.5, h: 0.56, altText: "Bob", objectName: "Bob icon" });
    T(s, "Bob, 35", { x: 4.1, y: 2.78, w: 1.8, h: 0.3, fontSize: 14, bold: true, color: C.text2, align: "center" });
    T(s, "Liebherr employee", { x: 4.1, y: 3.08, w: 1.8, h: 0.25, fontSize: 10, color: C.accent2, align: "center" });
    const pg = [
      ["FaTriangleExclamation", "Pains", "Time-consuming work, burned out, overwhelmed. Biggest fear: being replaced by AI.", 0.5],
      ["FaBullseye", "Job to be done", "Feels stuck in his comfort zone. A new AI tool would give him more responsibility and new skills.", 5.05],
    ];
    for (const [ic, h, t, x] of pg) {
      card(s, x, 3.9, 4.45, 1.15, H.accent1);
      await iconCircle(s, ic, x + 0.15, 4.05, 0.45, true);
      T(s, h, { x: x + 0.7, y: 4.05, w: 3.6, h: 0.45, fontSize: 14, bold: true, color: C.background1, valign: "middle" });
      T(s, t, { x: x + 0.7, y: 4.5, w: 3.6, h: 0.5, fontSize: 11.5, color: C.background1 });
    }
    s.addNotes("0:30 — Bob, 35, Liebherr employee. Spends his days in Excel, feels overwhelmed and fears AI will replace him. His job to be done: grow, with a tool that helps him.");
  }
  {
    const s = slide("User Journey: Bob’s LPR audit today", 3, "3 User");
    const st = [
      ["Plan the check", "Picks which of ~30 shops to check. No fixed schedule.", 3, "Only every ~3 months"],
      ["Open the webshop", "Brand page and product pages, one by one", 2, "Every shop is different"],
      ["Check the criteria", "Ticks ~76 criteria per SK class in Excel", 1, "Judging texts is subjective"],
      ["Score & compare", "Builds Excel and PowerPoint tables", 2, "Hard to compare fairly"],
      ["Inform the retailer", "Sends the gaps and a deadline to fix them", 2, "Must defend every rating"],
    ];
    const x0 = 1.6, cw = 1.58;
    [["DOING", 1.95], ["FEELING", 2.95], ["PAIN POINT", 4.15]].forEach(([l, y]) => T(s, l, { x: 0.5, y, w: 1.05, h: 0.3, fontSize: 10, bold: true, charSpacing: 1, color: C.accent2 }));
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const [h, d, f, p] = st[i];
      const x = x0 + i * cw;
      const worst = i === 2;
      s.addShape(pres.shapes.OVAL, { x: x + 0.05, y: 1.3, w: 0.4, h: 0.4, fill: { color: YEL }, line: { color: YEL }, objectName: "Step no" });
      T(s, String(i + 1), { x: x + 0.05, y: 1.3, w: 0.4, h: 0.4, fontSize: 13, bold: true, align: "center", valign: "middle" });
      T(s, h, { x: x + 0.5, y: 1.3, w: cw - 0.55, h: 0.4, fontSize: 12, bold: true, color: C.text2, valign: "middle" });
      T(s, d, { x: x + 0.05, y: 1.9, w: cw - 0.15, h: 0.75, fontSize: 11 });
      pts.push([x + cw / 2 - 0.1, 2.8 + (3 - f) * 0.35]);
      card(s, x + 0.05, 4.0, cw - 0.12, 0.95, worst ? YEL : H.accent1);
      T(s, p, { x: x + 0.15, y: 4.0, w: cw - 0.3, h: 0.95, fontSize: 11, bold: true, color: worst ? C.text1 : C.background1, valign: "middle" });
    }
    s.addShape(pres.shapes.LINE, { x: x0 + 0.05, y: 2.8, w: 5 * cw - 0.12, h: 0, line: { color: H.accent3, width: 1, dashType: "dash" }, objectName: "Neutral line" });
    for (let i = 0; i < 4; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      s.addShape(pres.shapes.LINE, { x: ax + 0.1, y: Math.min(ay, by) + 0.1, w: bx - ax, h: Math.abs(by - ay) || 0.001, flipV: by < ay, line: { color: H.accent1, width: 2 }, objectName: "Feeling curve" });
    }
    for (const [px, py] of pts) s.addShape(pres.shapes.OVAL, { x: px, y: py, w: 0.2, h: 0.2, fill: { color: YEL }, line: { color: H.accent1, width: 1.5 }, objectName: "Feeling point" });
    T(s, "ok", { x: 0.5, y: 2.72, w: 1, h: 0.25, fontSize: 9, color: C.accent2 });
    T(s, "frustrated", { x: 0.5, y: 3.42, w: 1, h: 0.25, fontSize: 9, color: C.accent2 });
    s.addNotes("0:30 — Five steps. The lowest point is step 3: ticking ~76 criteria by hand and judging texts subjectively. That is where HeLPR helps most.");
  }
  {
    const s = slide("Bob’s 5 most important needs", 3, "3 User");
    const pr = [
      ["FaRobot", "Automatic check of the LPR criteria", "He spends his days in Excel"],
      ["FaScaleBalanced", "One fair score per retailer", "Liebherr: same rule for everyone"],
      ["FaCamera", "Proof for every verdict", "He must defend each rating"],
      ["FaBolt", "Much faster than by hand", "Audits take too much time"],
      ["FaUserCheck", "Bob keeps control", "He fears being replaced by AI"],
    ];
    for (let i = 0; i < 5; i++) {
      const x = 0.5 + i * 1.83;
      card(s, x, 1.3, 1.7, 3.7, i === 0 ? H.accent1 : H.lt2);
      T(s, String(i + 1), { x: x + 0.15, y: 1.4, w: 1.4, h: 0.7, fontSize: 36, bold: true, color: i === 0 ? YEL : C.accent3, fontFace: THEME.headFontFace });
      await iconCircle(s, pr[i][0], x + 0.15, 2.2, 0.55, true);
      T(s, pr[i][1], { x: x + 0.15, y: 2.9, w: 1.45, h: 0.95, fontSize: 13.5, bold: true, color: i === 0 ? C.background1 : C.text2 });
      T(s, pr[i][2], { x: x + 0.15, y: 3.95, w: 1.45, h: 0.85, fontSize: 11, color: i === 0 ? C.accent3 : C.accent2 });
    }
    s.addNotes("0:30 — From 20 rated needs, we prioritised five. Each comes from Bob's map or from Liebherr's answers.");
  }

  // PART 4 — Ideas & selection (1:30)
  pres.addSection({ title: "4 Ideas" });
  await divider(4, "4 Ideas");
  {
    const s = slide("Idea pool: 25 ideas in 7 clusters", 4, "4 Ideas");
    const cl = [
      ["FaPlay", "A", "Running audits", "Weekly auto-run, run on demand, add a retailer"],
      ["FaSliders", "B", "Scoring & criteria", "Score per retailer, weights, SK filter"],
      ["FaUserCheck", "C", "Trust & control", "Evidence, override the AI, confidence level"],
      ["FaFileLines", "D", "Content checks", "Feature texts, official images, return-risk flag"],
      ["FaChartColumn", "E", "Overview", "Compare retailers, trends, product counts"],
      ["FaRobot", "F", "AI readiness", "AI-readiness score, AI shopper simulator"],
      ["FaFilePdf", "G", "Reports", "PDF report, to-do list, Excel export"],
    ];
    for (let i = 0; i < 7; i++) {
      const row = i < 4 ? 0 : 1, col = i < 4 ? i : i - 4;
      const x = row === 0 ? 0.5 + col * 2.3 : 1.65 + col * 2.3, y = 1.3 + row * 1.85;
      card(s, x, y, 2.1, 1.7);
      await iconCircle(s, cl[i][0], x + 0.15, y + 0.15, 0.5, true);
      T(s, cl[i][1], { x: x + 1.55, y: y + 0.15, w: 0.4, h: 0.5, fontSize: 18, bold: true, color: C.accent3, align: "right", valign: "middle" });
      T(s, cl[i][2], { x: x + 0.15, y: y + 0.75, w: 1.85, h: 0.3, fontSize: 13.5, bold: true, color: C.text2 });
      T(s, cl[i][3], { x: x + 0.15, y: y + 1.05, w: 1.85, h: 0.6, fontSize: 11 });
    }
    s.addNotes("0:40 — Brainstorming gave 25 ideas; we grouped them into 7 clusters. Liebherr's answers added a few (return risks, product counts).");
  }
  {
    const s = slide("Two idea profiles, one choice", 4, "4 Ideas");
    const crit = ["Answers Bob’s top 5 needs", "What Liebherr asked for", "Buildable in two days"];
    const prof = [
      [true, "FaMagnifyingGlassChart", "HeLPR: automated LPR audit tool", "Bob and the Liebherr LPR team", "Checks webshops weekly, scores and ranks retailers, with proof", [1, 1, 1]],
      [false, "FaRulerCombined", "“Will it fit?” shopper assistant", "Shoppers on retailer webshops", "Helps choose the right fridge: niche size, door handle", [0, 0, 1]],
    ];
    for (let i = 0; i < 2; i++) {
      const [sel, ic, h, who, what, ok] = prof[i];
      const x = 0.5 + i * 4.6;
      card(s, x, 1.3, 4.4, 3.75, sel ? H.accent1 : H.lt2);
      await iconCircle(s, ic, x + 0.2, 1.45, 0.55, true);
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 2.75, y: 1.53, w: 1.45, h: 0.36, rectRadius: 0.18, fill: { color: sel ? YEL : H.lt1 }, line: { color: sel ? YEL : H.accent3 }, objectName: "Status chip" });
      T(s, sel ? "SELECTED" : "NOT SELECTED", { x: x + 2.75, y: 1.53, w: 1.45, h: 0.36, fontSize: 10, bold: true, charSpacing: 1, align: "center", valign: "middle", color: sel ? C.text1 : C.accent2 });
      T(s, h, { x: x + 0.2, y: 2.1, w: 4.0, h: 0.4, fontSize: 16, bold: true, color: sel ? C.background1 : C.text2 });
      T(s, "FOR " + who.toUpperCase(), { x: x + 0.2, y: 2.5, w: 4.0, h: 0.25, fontSize: 9, bold: true, charSpacing: 1, color: sel ? YEL : C.accent2 });
      T(s, what, { x: x + 0.2, y: 2.78, w: 4.0, h: 0.5, fontSize: 12, color: sel ? C.background1 : C.text1 });
      s.addShape(pres.shapes.LINE, { x: x + 0.2, y: 3.42, w: 4.0, h: 0, line: { color: sel ? "5A5A5A" : H.accent3, width: 1 }, objectName: "Divider" });
      crit.forEach((c, j) => {
        const y = 3.55 + j * 0.45;
        const good = ok[j] === 1;
        s.addShape(pres.shapes.OVAL, { x: x + 0.2, y: y + 0.03, w: 0.3, h: 0.3, fill: { color: good ? YEL : H.lt1 }, line: { color: good ? YEL : H.accent3 }, objectName: "Check" });
        T(s, good ? "✓" : "✕", { x: x + 0.2, y: y + 0.03, w: 0.3, h: 0.3, fontSize: 11, bold: true, align: "center", valign: "middle", color: good ? C.text1 : C.accent2 });
        T(s, c, { x: x + 0.65, y, w: 3.6, h: 0.36, fontSize: 12.5, valign: "middle", color: sel ? C.background1 : C.text1 });
      });
    }
    s.addNotes("0:50 — We profiled two ideas and compared them on three criteria. HeLPR wins on all three. The shopper idea is not lost: its return-risk check lives inside HeLPR.");
  }

  // PART 5 — Prototype (2:00)
  pres.addSection({ title: "5 Prototype" });
  await divider(5, "5 Prototype");
  {
    const s = slide("HeLPR: all retailers at a glance", 5, "5 Prototype");
    shot(s, "shot0.png", "HeLPR overview screen");
    points(s, [["Ranking", "All retailers by LPR score"], ["Trend", "Is each retailer getting better?"], ["Return risks", "Missing info that leads to returns"]]);
    s.addNotes("0:20 — Bob opens HeLPR: every retailer ranked by LPR score, with trend, AI-readiness and return risks. Blocked shops are flagged for a manual check.");
  }
  {
    const s = slide("HeLPR: every verdict with proof", 5, "5 Prototype");
    shot(s, "shot1.png", "HeLPR retailer scorecard");
    points(s, [["Evidence", "Screenshot and reasoning per criterion"], ["Correct", "Bob can change any verdict"], ["Teach the AI", "His feedback improves the next audit"]]);
    s.addNotes("0:20 — One retailer's scorecard. Each criterion shows proof. Bob stays in control: he can correct a verdict and teach the AI.");
  }
  {
    const s = slide("How HeLPR scores a retailer", 5, "5 Prototype");
    T(s, "“When I give them 4% for pictures, then everyone should have the 4% for pictures.”  ·  Liebherr, kickoff call", { x: 0.5, y: 1.05, w: 9, h: 0.25, fontSize: 10, italic: true, color: C.accent2 });
    const bars = [
      ["FaEye", "Category", "Weight of each LPR block", [["Visibility", 3], ["Services", 2], ["Advice", 1]], "Liebherr: Visibility > Services > Advice"],
      ["FaStar", "Priority", "Set per criterion", [["High", 3], ["Medium", 2], ["Low", 1]], "Bob can change it, no coding"],
    ];
    for (let i = 0; i < 2; i++) {
      const [ic, h, sub, rows, foot] = bars[i];
      const x = 0.5 + i * 3.05;
      card(s, x, 1.4, 2.85, 2.05);
      await iconCircle(s, ic, x + 0.15, 1.52, 0.48, true);
      T(s, h, { x: x + 0.75, y: 1.52, w: 2, h: 0.26, fontSize: 13, bold: true, color: C.text2 });
      T(s, sub, { x: x + 0.75, y: 1.78, w: 2, h: 0.22, fontSize: 9.5, color: C.accent2 });
      rows.forEach(([l, v], j) => {
        const y = 2.2 + j * 0.3;
        T(s, l, { x: x + 0.15, y, w: 0.85, h: 0.24, fontSize: 10.5, valign: "middle" });
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 1.0, y: y + 0.07, w: 1.3 * v / 3, h: 0.1, rectRadius: 0.05, fill: { color: H.accent1 }, line: { color: H.accent1 }, objectName: "Bar" });
        T(s, "×" + v, { x: x + 2.35, y, w: 0.4, h: 0.24, fontSize: 11, bold: true, valign: "middle" });
      });
      T(s, foot, { x: x + 0.15, y: 3.12, w: 2.6, h: 0.25, fontSize: 9, color: C.accent2 });
    }
    card(s, 6.6, 1.4, 2.9, 2.05);
    await iconCircle(s, "FaRotateLeft", 6.75, 1.52, 0.48, true);
    T(s, "Return risk", { x: 7.35, y: 1.52, w: 2, h: 0.26, fontSize: 13, bold: true, color: C.text2 });
    T(s, "Info shoppers need to buy right", { x: 7.35, y: 1.78, w: 2.1, h: 0.22, fontSize: 9.5, color: C.accent2 });
    T(s, "×1.5", { x: 6.75, y: 2.1, w: 2.5, h: 0.5, fontSize: 28, bold: true, color: C.text2, fontFace: THEME.headFontFace });
    T(s, "Dimensions, door hinge and handle, technical data", { x: 6.75, y: 2.62, w: 2.6, h: 0.45, fontSize: 10.5 });
    T(s, "Liebherr: missing info causes returns", { x: 6.75, y: 3.12, w: 2.6, h: 0.25, fontSize: 9, color: C.accent2 });
    card(s, 0.5, 3.6, 9.0, 0.6, H.accent1);
    [["WEIGHT PER CRITERION", "Category × Priority × Return risk", 0.7], ["LPR SCORE", "Passed ÷ checked weight, per SK class", 3.7], ["EXAMPLE", "Dimensions 13.5 vs. staff training 1", 6.7]].forEach(([a, b, x]) => {
      T(s, a, { x, y: 3.66, w: 2.9, h: 0.2, fontSize: 8.5, bold: true, charSpacing: 1, color: YEL });
      T(s, b, { x, y: 3.88, w: 2.9, h: 0.26, fontSize: 11.5, bold: true, color: C.background1 });
    });
    await chip(s, "FaScaleBalanced", "Fair for all", "Same rules and weights for all", 0.5, 4.38, 2.85);
    await chip(s, "FaUserCheck", "No guessing", "Unsure checks go to Bob first", 3.55, 4.38, 2.85);
    await chip(s, "FaRobot", "AI-readiness apart", "Own score, not mixed into LPR", 6.6, 4.38, 2.9);
    s.addNotes("0:20 — The score is transparent and the same for everyone: block weight × priority × return risk. Unsure AI checks go to Bob first.");
  }
  {
    const s = slide("HeLPR: spotting avoidable returns", 5, "5 Prototype");
    shot(s, "shot2.png", "HeLPR return risks view");
    points(s, [["Return risks", "Missing info that makes shoppers buy the wrong model"], ["Real finding", "23 of 24 product pages don’t say which handle the fridge has"], ["Counts 1.5×", "Weighted higher and put on the retailer’s to-do list"]]);
    s.addNotes("0:20 — Back to the door-handle case: HeLPR found that 23 of 24 product pages don't say which handle the fridge has.");
  }
  {
    const s = slide("AI-readiness: can an AI use the page?", 5, "5 Prototype");
    T(s, "Liebherr: “No method exists yet.” Our proposal: 9 checks, as a separate score next to the LPR score.", { x: 0.5, y: 1.05, w: 9, h: 0.25, fontSize: 10.5, color: C.accent2 });
    const cols = [
      ["FaEye", "Read", "Can an AI read the data?", ["Product data in schema.org format", "Correct GTIN and brand", "Price and stock machine-readable", "Key specs readable without JavaScript"]],
      ["FaGlobe", "Find", "Can AI search find the page?", ["AI search crawlers allowed in robots.txt", "Images with descriptive alt texts"]],
      ["FaCommentDots", "Answer", "Can an AI advise a shopper?", ["Feature benefits as text, not only in images", "FAQ, Q&A or reviews", "AI shopper test: “Does it fit a 60 cm niche?”"]],
    ];
    for (let c = 0; c < 3; c++) {
      const [ic, h, sub, items] = cols[c];
      const x = 0.5 + c * 3.05;
      card(s, x, 1.4, 2.85, 2.65);
      await iconCircle(s, ic, x + 0.15, 1.52, 0.48, true);
      T(s, h, { x: x + 0.75, y: 1.52, w: 2, h: 0.26, fontSize: 13, bold: true, color: C.text2 });
      T(s, sub, { x: x + 0.75, y: 1.78, w: 2.05, h: 0.22, fontSize: 9.5, color: C.accent2 });
      items.forEach((t, j) => {
        const y = 2.2 + j * 0.45;
        s.addShape(pres.shapes.OVAL, { x: x + 0.17, y: y + 0.1, w: 0.09, h: 0.09, fill: { color: H.accent1 }, line: { color: H.accent1 }, objectName: "Dot" });
        T(s, t, { x: x + 0.35, y, w: 2.4, h: 0.42, fontSize: 10.5 });
      });
    }
    card(s, 0.5, 4.2, 9.0, 0.85, H.accent1);
    T(s, "FIRST RESULTS", { x: 0.75, y: 4.3, w: 2.5, h: 0.22, fontSize: 9, bold: true, charSpacing: 1, color: YEL });
    T(s, "AI-readiness per retailer", { x: 0.75, y: 4.55, w: 2.5, h: 0.3, fontSize: 13, bold: true, color: C.background1 });
    [["MediaMarkt", "94%"], ["EP:", "89%"], ["expert", "66%"]].forEach(([r, v], i) => {
      const x = 3.6 + i * 2.0;
      T(s, r, { x, y: 4.3, w: 1.8, h: 0.22, fontSize: 10, color: C.accent3 });
      T(s, v, { x, y: 4.5, w: 1.8, h: 0.45, fontSize: 22, bold: true, color: C.background1, fontFace: THEME.headFontFace });
    });
    s.addNotes("0:20 — Liebherr asked for a method. Our proposal: 9 checks in three questions: can an AI read, find and answer? First results per retailer.");
  }
  {
    const s = slide("HeLPR: a clear to-do list for the retailer", 5, "5 Prototype");
    shot(s, "shot3.png", "HeLPR retailer to-do list");
    points(s, [["What to fix", "Every missing criterion, with a fix"], ["Deadline", "When it must be done"], ["PDF or Excel", "Ready to send to the retailer"]]);
    s.addNotes("0:20 — Finally, Bob sends the retailer a clear to-do list with fixes and a deadline, as PDF or Excel.");
  }

  // PART 6 — Outlook (0:45)
  pres.addSection({ title: "6 Outlook" });
  await divider(6, "6 Outlook");
  {
    const s = slide("What HeLPR brings", 6, "6 Outlook");
    const cols = [
      ["FaUser", "For Bob", [["FaRobot", "Checks run by themselves, weekly"], ["FaCamera", "Proof he can show the retailer"], ["FaUserCheck", "He keeps the final verdict"]]],
      ["FaBuilding", "For Liebherr", [["FaScaleBalanced", "Same fair rules for every retailer"], ["FaCalendarCheck", "Weekly instead of every 3 months"], ["FaRotateLeft", "Fewer avoidable returns"]]],
    ];
    for (let i = 0; i < 2; i++) {
      const [ic, h, rows] = cols[i];
      const x = 0.5 + i * 4.6;
      card(s, x, 1.3, 4.4, 3.75, i === 0 ? H.lt2 : H.accent1);
      await iconCircle(s, ic, x + 0.25, 1.5, 0.6, true);
      T(s, h, { x: x + 1.0, y: 1.5, w: 3.2, h: 0.6, fontSize: 20, bold: true, color: i === 0 ? C.text2 : C.background1, valign: "middle" });
      for (let j = 0; j < 3; j++) {
        const y = 2.45 + j * 0.85;
        await iconCircle(s, rows[j][0], x + 0.25, y, 0.5, false);
        T(s, rows[j][1], { x: x + 0.95, y, w: 3.3, h: 0.5, fontSize: 14, bold: true, color: i === 0 ? C.text2 : C.background1, valign: "middle" });
      }
    }
    s.addNotes("0:20 — The benefit, for the user and for the company.");
  }
  {
    const s = slide("What’s next for HeLPR", 6, "6 Outlook");
    const st = [
      ["FaClipboardCheck", "Test", "Run HeLPR next to a manual audit and compare"],
      ["FaRobot", "Connect AI", "Add Liebherr’s AI provider so text checks run automatically"],
      ["FaCalendarCheck", "Scale", "All ~30 retailers, checked every week"],
      ["FaFilePdf", "Integrate", "Reports to retailers, results feed the LPR rebate"],
    ];
    for (let i = 0; i < 4; i++) {
      const x = 0.5 + i * 2.3;
      card(s, x, 1.3, 2.1, 2.55);
      await iconCircle(s, st[i][0], x + 0.7, 1.5, 0.7, true);
      T(s, `${i + 1}  ${st[i][1]}`, { x, y: 2.35, w: 2.1, h: 0.4, fontSize: 16, bold: true, color: C.text2, align: "center" });
      T(s, st[i][2], { x: x + 0.15, y: 2.8, w: 1.8, h: 0.95, fontSize: 12, align: "center" });
      if (i < 3) T(s, "›", { x: x + 2.07, y: 2.3, w: 0.26, h: 0.5, fontSize: 28, bold: true, color: C.accent3, align: "center", valign: "middle" });
    }
    T(s, "WHAT WE NEED FROM LIEBHERR", { x: 0.5, y: 4.03, w: 5, h: 0.25, fontSize: 10, bold: true, charSpacing: 2, color: C.accent2 });
    await chip(s, "FaFileLines", "A manual audit", "To compare HeLPR with", 0.5, 4.38, 2.85);
    await chip(s, "FaRobot", "An AI key", "Azure, Gemini…", 3.55, 4.38, 2.85);
    await chip(s, "FaStore", "Shop access", "EURONICS, OTTO", 6.6, 4.38, 2.9);
    s.addNotes("0:25 — Four next steps, and three things we need from Liebherr.");
  }
  {
    const s = pres.addSlide({ masterName: "TITLE", sectionTitle: "6 Outlook" });
    s.background = { color: "2B2B2B" };
    await bookend(s);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 0.7, w: 1.95, h: 0.62, rectRadius: 0.1, fill: { color: H.lt1 }, line: { color: H.lt1 }, objectName: "Logo plate" });
    s.addImage({ path: path.join(IMG, "helpr_logo.png"), x: 0.72, y: 0.79, w: 1.7, h: 1.7 * 188 / 720, altText: "HeLPR logo", objectName: "HeLPR logo" });
    T(s, "Bob keeps the verdict. HeLPR does the legwork.", { x: 0.6, y: 1.5, w: 5.4, h: 1.6, fontSize: 32, bold: true, color: C.background1, valign: "bottom", fontFace: THEME.headFontFace });
    T(s, "Thank you! Questions?", { x: 0.6, y: 3.3, w: 5.4, h: 0.5, fontSize: 22, bold: true, color: YEL });
    T(s, "Team Liebherr 5  ·  HNU Winter School 2026", { x: 0.6, y: 3.85, w: 5.4, h: 0.4, fontSize: 14, color: C.accent3 });
    s.addNotes("Key sentence to remember. Then 2 minutes Q&A: backup slides follow.");
  }

  // BACKUP for Q&A
  pres.addSection({ title: "Backup" });
  {
    const s = slide("How an audit works", "B", "Backup");
    const st = [
      ["FaListOl", "Plan", "Picks 3 Liebherr products per SK class in each shop"],
      ["FaGears", "Check", "Rules first, AI judge second, a human last"],
      ["FaUserCheck", "Review", "If the AI is unsure, the criterion goes to Bob"],
      ["FaChartColumn", "Report", "Weighted score, return risks, to-do list"],
    ];
    for (let i = 0; i < 4; i++) {
      const x = 0.5 + i * 2.3;
      card(s, x, 1.3, 2.1, 2.5);
      await iconCircle(s, st[i][0], x + 0.7, 1.5, 0.7, true);
      T(s, `${i + 1}  ${st[i][1]}`, { x, y: 2.35, w: 2.1, h: 0.4, fontSize: 16, bold: true, color: C.text2, align: "center" });
      T(s, st[i][2], { x: x + 0.15, y: 2.8, w: 1.8, h: 0.9, fontSize: 12, align: "center" });
      if (i < 3) T(s, "›", { x: x + 2.07, y: 2.25, w: 0.26, h: 0.5, fontSize: 28, bold: true, color: C.accent3, align: "center", valign: "middle" });
    }
    await chip(s, "FaStopwatch", "3–8 min", "per retailer", 0.5, 4.2, 2.85);
    await chip(s, "FaCalendarCheck", "Weekly", "automatic audits", 3.55, 4.2, 2.85);
    await chip(s, "FaBan", "Blocked shop", "flagged for a manual check", 6.6, 4.2, 2.9);
  }
  {
    const s = slide("What Liebherr answered to our questions", "B", "Backup");
    const cards = [
      ["FaHourglassHalf", "Hardest to check by hand", "Premium SK3 pages, SEO texts, and whether Liebherr technologies and their benefits are explained well"],
      ["FaScaleBalanced", "Weighting", "Online Visibility counts most, then Services, then Advice"],
      ["FaCalendarCheck", "How they would use it", "Check any retailer on demand. A weekly check of all retailers is enough."],
      ["FaRobot", "AI readiness", "No method exists yet. Liebherr wants our idea for a fair way to measure it."],
      ["FaRotateLeft", "Returns", "Caused by missing dimensions or features. Real case: a fridge returned because it had no door handle."],
      ["FaStore", "Priority retailers", "Euronics, expert, MediaMarkt, Otto, EP:, Elektroplus, and ideally any webshop"],
    ];
    for (let i = 0; i < 6; i++) {
      const col = i % 3, row = Math.floor(i / 3);
      const x = 0.5 + col * 3.05, y = 1.3 + row * 1.85;
      card(s, x, y, 2.85, 1.7);
      await iconCircle(s, cards[i][0], x + 0.18, y + 0.18, 0.5, true);
      T(s, cards[i][1], { x: x + 0.8, y: y + 0.18, w: 1.95, h: 0.5, fontSize: 14, bold: true, color: C.text2, valign: "middle" });
      T(s, cards[i][2], { x: x + 0.18, y: y + 0.8, w: 2.5, h: 0.85, fontSize: 11.5 });
    }
  }
  {
    const s = slide("All 20 user needs, rated by the team", "B", "Backup");
    const cols = [
      ["FaGears", "Functions", [[1, "Automatic LPR criteria check"], [1, "Final score per retailer"], [1, "Scoring history over time"], [1, "AI-readiness score"], [0, "Evidence for every verdict"], [0, "Feedback / to-do list for retailer"], [0, "Override the AI verdict"], [0, "Filter retailers by criteria"]]],
      ["FaClipboardCheck", "Requirements", [[1, "AI tool that improves over time"], [1, "Much faster than manual checks"], [1, "Data privacy and legal rules"], [0, "Reliable, correct results"], [0, "Fair and the same for all retailers"], [0, "Easy without technical knowledge"], [0, "Criteria editable without coding"]]],
      ["FaFaceSmile", "Experience", [[1, "Confidence to defend a rating"], [1, "Less repetitive manual work"], [0, "Overview: top and weak retailers"], [0, "Control over the verdicts"], [0, "Transparent talks with retailers"]]],
    ];
    for (let c = 0; c < 3; c++) {
      const [ic, h, items] = cols[c];
      const x = 0.5 + c * 3.05;
      card(s, x, 1.3, 2.85, 3.55);
      await iconCircle(s, ic, x + 0.18, 1.42, 0.45, true);
      T(s, h, { x: x + 0.75, y: 1.42, w: 2.0, h: 0.45, fontSize: 15, bold: true, color: C.text2, valign: "middle" });
      items.forEach(([v, t], i) => {
        const y = 2.02 + i * 0.35;
        s.addShape(pres.shapes.OVAL, { x: x + 0.22, y: y + 0.09, w: 0.14, h: 0.14, fill: { color: v ? H.accent1 : H.lt1 }, line: { color: H.accent1, width: 1.25 }, objectName: "Rating dot" });
        T(s, t, { x: x + 0.48, y, w: 2.3, h: 0.32, fontSize: 11.5, bold: !!v, valign: "middle", color: v ? C.text2 : C.text1 });
      });
    }
    s.addShape(pres.shapes.OVAL, { x: 0.5, y: 5.02, w: 0.14, h: 0.14, fill: { color: H.accent1 }, line: { color: H.accent1, width: 1.25 }, objectName: "Legend" });
    T(s, "very important", { x: 0.7, y: 4.95, w: 1.4, h: 0.28, fontSize: 11, valign: "middle" });
    s.addShape(pres.shapes.OVAL, { x: 2.1, y: 5.02, w: 0.14, h: 0.14, fill: { color: H.lt1 }, line: { color: H.accent1, width: 1.25 }, objectName: "Legend" });
    T(s, "important   ·   no need was rated “not important”", { x: 2.3, y: 4.95, w: 5, h: 0.28, fontSize: 11, valign: "middle" });
  }
  {
    const s = slide("Ideas we dropped, and why", "B", "Backup");
    const dr = [
      ["Upload mode for blocked shops", "Show “needs manual check” instead"],
      ["Retailer self-check portal", "Too much; PDF and Excel reports cover it"],
      ["Shopper “will it fit?” helper", "Focus is the internal tool; return risks live in HeLPR"],
      ["Accuracy test vs. manual audit", "No time in the hackathon: first next step"],
    ];
    dr.forEach(([a, b], i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.5 + col * 4.6, y = 1.3 + row * 1.85;
      card(s, x, y, 4.4, 1.7);
      s.addShape(pres.shapes.OVAL, { x: x + 0.2, y: y + 0.22, w: 0.45, h: 0.45, fill: { color: H.lt1 }, line: { color: H.accent3 }, objectName: "Dropped mark" });
      T(s, "✕", { x: x + 0.2, y: y + 0.22, w: 0.45, h: 0.45, fontSize: 14, bold: true, color: C.accent2, align: "center", valign: "middle" });
      T(s, a, { x: x + 0.85, y: y + 0.22, w: 3.4, h: 0.45, fontSize: 15, bold: true, color: C.text2, valign: "middle" });
      T(s, b, { x: x + 0.85, y: y + 0.8, w: 3.4, h: 0.75, fontSize: 12.5, color: C.text1 });
    });
  }

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("written", OUT);
})();
