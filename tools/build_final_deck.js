// Builds Liebherr5_DesignThinking_Journey.pptx — light, visual, white & blue.
// Run: APPLY_THEME=<pptx skill>/scripts/apply_theme.js NODE_PATH=<node_modules> node build_journey_deck.js out.pptx <imgdir>
// Final presentation version. Needs liebherr_logo.png (app/backend/lpr/reference/) in <imgdir>.
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

  const PH = ["Define Design Challenge", "Understand Design Challenge", "Define Viewpoints", "Generate Ideas", "Develop Prototypes", "Test Prototypes", "Integrate Prototype"];
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
    if (phase) {
      dot(s, phase, 0.5, 0.17, 0.26, true);
      T(s, `PHASE ${phase}  ·  ${PH[phase - 1].toUpperCase()}`, { x: 0.85, y: 0.17, w: 6, h: 0.26, fontSize: 10, bold: true, charSpacing: 1, color: C.accent1, valign: "middle" });
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
  const GOALS = ["Open a broad field, then focus on one design challenge", "Build a shared understanding of users and expert knowledge", "Sum up what we learned and create a typical user", "Collect many ideas, then focus on the relevant ones", "Turn the chosen idea into something people can see and try"];
  const PICONS = ["FaBullseye", "FaComments", "FaUser", "FaLightbulb", "FaCubes"];
  const divider = async (n, section) => {
    const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
    s.background = { color: YEL };
    slideNo++;
    T(s, "0" + n, { x: 0.5, y: 0.55, w: 4, h: 2.0, fontSize: 130, bold: true, color: C.text1, fontFace: THEME.headFontFace, valign: "bottom" });
    T(s, "PHASE " + n, { x: 0.6, y: 2.75, w: 5, h: 0.3, fontSize: 12, bold: true, charSpacing: 3, color: C.text1 });
    T(s, PH[n - 1], { x: 0.6, y: 3.05, w: 8.5, h: 0.7, fontSize: 34, bold: true, color: C.text1, fontFace: THEME.headFontFace });
    T(s, GOALS[n - 1], { x: 0.6, y: 3.8, w: 8.5, h: 0.4, fontSize: 16, color: C.text1 });
    for (let i = 0; i < 7; i++) {
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

  // 1 — Title
  pres.addSection({ title: "Intro" });
  {
    const s = pres.addSlide({ masterName: "TITLE", sectionTitle: "Intro" });
    await bookend(s);
    T(s, "LIEBHERR CHALLENGE  ·  DESIGN THINKING", { x: 0.6, y: 0.8, w: 5.6, h: 0.3, fontSize: 11, bold: true, charSpacing: 2, color: C.accent1 });
    T(s, "HeLPR: fair, fast webshop audits", { x: 0.6, y: 1.3, w: 5.4, h: 1.7, fontSize: 40, bold: true, color: C.text2, valign: "bottom", fontFace: THEME.headFontFace });
    T(s, "Our Design Thinking journey, from challenge to prototype", { x: 0.6, y: 3.15, w: 5.6, h: 0.6, fontSize: 18, color: C.accent1 });
    T(s, "CHALLENGE PARTNER", { x: 0.6, y: 3.95, w: 3, h: 0.25, fontSize: 9, bold: true, charSpacing: 2, color: C.accent2 });
    s.addImage({ path: path.join(IMG, "liebherr_logo.png"), x: 0.6, y: 4.25, w: 1.8, h: 1.8 * 99 / 800, altText: "Liebherr logo", objectName: "Partner logo" });
    T(s, "Team Liebherr 5  ·  HNU Winter School 2026", { x: 0.6, y: 4.75, w: 5.6, h: 0.3, fontSize: 12, color: C.accent2 });
  }

  // 3 — Challenge
  {
    const s = slide("The challenge", null, "Intro");
    const st = [["FaStore", "~30", "retailer webshops"], ["FaListCheck", "~76", "LPR quality criteria"], ["FaClock", "3", "months between checks"]];
    for (let i = 0; i < 3; i++) {
      const [ic, n, l] = st[i];
      const x = 0.5 + i * 3.05;
      card(s, x, 1.4, 2.85, 2.3);
      await iconCircle(s, ic, x + 0.25, 1.6, 0.65, false);
      T(s, n, { x: x + 0.25, y: 2.35, w: 2.4, h: 0.75, fontSize: 40, bold: true, color: C.accent1, fontFace: THEME.headFontFace });
      T(s, l, { x: x + 0.25, y: 3.1, w: 2.4, h: 0.4, fontSize: 14 });
    }
    T(s, "Today Liebherr checks every webshop by hand. They want an AI tool that does it.", { x: 0.5, y: 4.1, w: 9, h: 0.6, fontSize: 18, bold: true, color: C.text2, valign: "middle" });
  }

  // 4 — Phase 1
  pres.addSection({ title: "Phase 1" });
  await divider(1, "Phase 1");
  {
    const s = slide("Our Design Challenge", 1, "Phase 1");
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 1.4, w: 9.0, h: 1.8, rectRadius: 0.12, fill: { color: H.accent1 }, line: { color: H.accent1 }, objectName: "Question" });
    T(s, "“How do we manage to improve the webshop quality assessment for Liebherr employees and their retail partners?”", { x: 0.85, y: 1.4, w: 8.3, h: 1.8, fontSize: 22, bold: true, color: C.background1, valign: "middle" });
    const ch = [["FaUserTie", "Users", "Liebherr employees and their retail partners. Topic: retail webshop quality (LPR)"], ["FaStar", "Wishes", "Automatic webshop check, comparable quality index, transparent rating, clear to-do list for retailers"], ["FaFaceFrown", "Complaints", "Manual and time-intensive, only every 3 months, inconsistent ratings, late feedback, complex criteria"]];
    for (let i = 0; i < 3; i++) {
      const [ic, h, t] = ch[i];
      const x = 0.5 + i * 3.05;
      await iconCircle(s, ic, x, 3.55, 0.6, false);
      T(s, h, { x: x + 0.75, y: 3.55, w: 2.2, h: 0.3, fontSize: 14, bold: true, color: C.accent1 });
      T(s, t, { x: x + 0.75, y: 3.85, w: 2.2, h: 1.2, fontSize: 12 });
    }
  }

  // 5 — Phase 2 techniques
  pres.addSection({ title: "Phase 2" });
  await divider(2, "Phase 2");
  {
    const s = slide("How we learned about the problem", 2, "Phase 2");
    const tech = [
      ["FaComments", "Expert interview", "Kickoff call with Liebherr", "They want one quality score per retailer, fair for all", false],
      ["FaEnvelopeOpenText", "Expert questions", "17 questions to Liebherr (Dominik), answered in writing", "Hardest to check: whether texts explain Liebherr features well", false],
      ["FaGlobe", "Webshop test", "We tried to read 5 shops with a tool", "3 of 5 shops work automatically", false],
    ];
    for (let i = 0; i < 3; i++) {
      const [ic, h, d, r, todo] = tech[i];
      const x = 0.5 + i * 3.05;
      card(s, x, 1.4, 2.85, 3.55);
      await iconCircle(s, ic, x + 0.25, 1.6, 0.65, true);
      T(s, h, { x: x + 0.25, y: 2.4, w: 2.4, h: 0.35, fontSize: 17, bold: true, color: C.text2 });
      T(s, d, { x: x + 0.25, y: 2.8, w: 2.4, h: 0.9, fontSize: 12, color: C.accent2 });
      if (todo) { T(s, "KEY RESULT", { x: x + 0.25, y: 3.85, w: 2.4, h: 0.25, fontSize: 10, bold: true, charSpacing: 1, color: C.accent1 }); todoTag(s, x + 0.25, 4.15); }
      else {
        T(s, "KEY RESULT", { x: x + 0.25, y: 3.85, w: 2.4, h: 0.25, fontSize: 10, bold: true, charSpacing: 1, color: C.accent1 });
        T(s, r, { x: x + 0.25, y: 4.13, w: 2.4, h: 0.75, fontSize: 14, bold: true });
      }
    }
  }

  // 6 — Phase 2 quote
  {
    const s = slide("What Liebherr told us", 2, "Phase 2");
    T(s, "“", { x: 0.5, y: 1.2, w: 1, h: 1.2, fontSize: 96, bold: true, color: YEL, fontFace: "Cambria" });
    T(s, "When I give them 4% for pictures, then everyone should have the 4% for pictures.", { x: 1.3, y: 1.65, w: 7.6, h: 1.4, fontSize: 26, italic: true, color: C.text2, valign: "middle" });
    T(s, "Liebherr, kickoff call", { x: 1.3, y: 3.1, w: 6, h: 0.3, fontSize: 13, color: C.accent2 });
    card(s, 1.3, 3.75, 7.6, 0.85);
    await iconCircle(s, "FaScaleBalanced", 1.45, 3.85, 0.65, true);
    T(s, "Every rating must be fair and backed by proof.", { x: 2.3, y: 3.75, w: 6.4, h: 0.85, fontSize: 17, bold: true, color: C.text2, valign: "middle" });
  }

  // Phase 2 — Dominik's answers
  {
    const s = slide("What Liebherr answered to our questions", 2, "Phase 2");
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
      const x = 0.5 + col * 3.05, y = 1.35 + row * 1.85;
      card(s, x, y, 2.85, 1.7);
      await iconCircle(s, cards[i][0], x + 0.18, y + 0.18, 0.5, true);
      T(s, cards[i][1], { x: x + 0.8, y: y + 0.18, w: 1.95, h: 0.5, fontSize: 14, bold: true, color: C.text2, valign: "middle" });
      T(s, cards[i][2], { x: x + 0.18, y: y + 0.8, w: 2.5, h: 0.85, fontSize: 11.5 });
    }
  }

  // 7 — Phase 3: Bob persona
  pres.addSection({ title: "Phase 3" });
  await divider(3, "Phase 3");
  {
    const s = slide("Meet Bob, our typical user", 3, "Phase 3");
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 1.35, w: 3.1, h: 3.6, rectRadius: 0.12, fill: { color: H.accent1 }, line: { color: H.accent1 }, objectName: "Persona card" });
    s.addShape(pres.shapes.OVAL, { x: 0.75, y: 1.6, w: 1.0, h: 1.0, fill: { color: YEL }, line: { color: YEL }, objectName: "Avatar" });
    s.addImage({ data: await icon("FaUser", H.dk1), x: 1.0, y: 1.82, w: 0.5, h: 0.56, altText: "Bob", objectName: "Avatar icon" });
    T(s, "Bob, 35", { x: 0.75, y: 2.8, w: 2.7, h: 0.45, fontSize: 24, bold: true, color: C.background1 });
    T(s, "Liebherr employee", { x: 0.75, y: 3.25, w: 2.7, h: 0.3, fontSize: 13, color: YEL });
    ["Single, no children", "2-room flat", "Funny, loves board games"].forEach((t, i) => {
      const y = 3.75 + i * 0.36;
      s.addShape(pres.shapes.OVAL, { x: 0.78, y: y + 0.1, w: 0.1, h: 0.1, fill: { color: YEL }, line: { color: YEL }, objectName: "Dot" });
      T(s, t, { x: 1.0, y, w: 2.5, h: 0.3, fontSize: 12.5, color: C.background1, valign: "middle" });
    });
    const cards = [
      ["FaUsers", "Relationships", "A lot of friends and a big family"],
      ["FaUserGroup", "Influencers", "His older brother works in the same field. His best friend at work is the reason he stayed at the company."],
      ["FaCat", "What he enjoys", "Playing with his cat, going to the pub, reading detective novels"],
      ["FaHouse", "His environment", "At home: his room, his cat, the kitchen, city noise. At work: his office and his friend."],
    ];
    for (let i = 0; i < 4; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 3.85 + col * 2.875, y = 1.35 + row * 1.85;
      card(s, x, y, 2.775, 1.75);
      await iconCircle(s, cards[i][0], x + 0.18, y + 0.18, 0.5, true);
      T(s, cards[i][1], { x: x + 0.8, y: y + 0.18, w: 1.85, h: 0.5, fontSize: 14, bold: true, color: C.text2, valign: "middle" });
      T(s, cards[i][2], { x: x + 0.18, y: y + 0.8, w: 2.45, h: 0.9, fontSize: 11.5 });
    }
  }
  // Phase 3: Empathy map board (drawn)
  {
    const s = slide("User Empathy Map: inside Bob’s head", 3, "Phase 3");
    const q = [
      ["FaEye", "Sees", "A lot of Excel, all day long", 0.5, 1.3],
      ["FaEarListen", "Hears", "Typing, phone calls, notifications on his phone", 5.9, 1.3],
      ["FaCloudRain", "Thinks & feels", "Just wants the workday to end. A bit depressed, but still optimistic.", 0.5, 2.6],
      ["FaCommentDots", "Says", "Complains about his job, and that AI will soon replace him", 5.9, 2.6],
    ];
    // connector lines to the centre
    s.addShape(pres.shapes.LINE, { x: 4.1, y: 2.45, w: 1.8, h: 0, line: { color: H.accent3, width: 1.5 }, objectName: "Connector" });
    for (const [ic, h, t, x, y] of q) {
      card(s, x, y, 3.6, 1.15);
      await iconCircle(s, ic, x + 0.15, y + 0.15, 0.45, true);
      T(s, h, { x: x + 0.7, y: y + 0.15, w: 2.8, h: 0.45, fontSize: 14, bold: true, color: C.text2, valign: "middle" });
      T(s, t, { x: x + 0.15, y: y + 0.65, w: 3.35, h: 0.48, fontSize: 11.5 });
    }
    s.addShape(pres.shapes.OVAL, { x: 4.3, y: 1.55, w: 1.4, h: 1.4, fill: { color: YEL }, line: { color: H.lt1, width: 4 }, objectName: "Bob centre" });
    s.addImage({ data: await icon("FaUser", H.dk1), x: 4.73, y: 1.85, w: 0.54, h: 0.6, altText: "Bob", objectName: "Bob icon" });
    T(s, "Bob", { x: 4.3, y: 2.95, w: 1.4, h: 0.3, fontSize: 14, bold: true, color: C.text2, align: "center" });
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
  }
  // Phase 3: User journey (as-is)
  {
    const s = slide("User Journey: Bob’s LPR audit today", 3, "Phase 3");
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
      s.addShape(pres.shapes.OVAL, { x: x + 0.05, y: 1.3, w: 0.4, h: 0.4, fill: { color: YEL }, line: { color: YEL }, objectName: "Step no" });
      T(s, String(i + 1), { x: x + 0.05, y: 1.3, w: 0.4, h: 0.4, fontSize: 13, bold: true, align: "center", valign: "middle" });
      T(s, h, { x: x + 0.5, y: 1.3, w: cw - 0.55, h: 0.4, fontSize: 12, bold: true, color: C.text2, valign: "middle" });
      T(s, d, { x: x + 0.05, y: 1.9, w: cw - 0.15, h: 0.75, fontSize: 11 });
      const cy = 2.8 + (3 - f) * 0.35;
      pts.push([x + cw / 2 - 0.1, cy]);
      card(s, x + 0.05, 4.0, cw - 0.12, 0.95, H.accent1);
      T(s, p, { x: x + 0.15, y: 4.0, w: cw - 0.3, h: 0.95, fontSize: 11, bold: true, color: C.background1, valign: "middle" });
    }
    s.addShape(pres.shapes.LINE, { x: x0 + 0.05, y: 2.8, w: 5 * cw - 0.12, h: 0, line: { color: H.accent3, width: 1, dashType: "dash" }, objectName: "Neutral line" });
    for (let i = 0; i < 4; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      s.addShape(pres.shapes.LINE, { x: ax + 0.1, y: Math.min(ay, by) + 0.1, w: bx - ax, h: Math.abs(by - ay) || 0.001, flipV: by < ay, line: { color: H.accent1, width: 2 }, objectName: "Feeling curve" });
    }
    for (const [px, py] of pts) s.addShape(pres.shapes.OVAL, { x: px, y: py, w: 0.2, h: 0.2, fill: { color: YEL }, line: { color: H.accent1, width: 1.5 }, objectName: "Feeling point" });
    T(s, "ok", { x: 0.5, y: 2.72, w: 1, h: 0.25, fontSize: 9, color: C.accent2 });
    T(s, "frustrated", { x: 0.5, y: 3.42, w: 1, h: 0.25, fontSize: 9, color: C.accent2 });
  }
  // 9 — Phase 3: all needs
  {
    const s = slide("User Needs: what Bob expects from a tool", 3, "Phase 3");
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

  // Phase 3: prioritised needs
  {
    const s = slide("Our focus: Bob’s 5 most important needs", 3, "Phase 3");
    const pr = [
      ["FaRobot", "Automatic check of the LPR criteria", "He spends his days in Excel"],
      ["FaScaleBalanced", "One fair score per retailer", "Liebherr: same rule for everyone"],
      ["FaCamera", "Proof for every verdict", "He must defend each rating"],
      ["FaBolt", "Much faster than by hand", "Audits take too much time"],
      ["FaUserCheck", "Bob keeps control", "He fears being replaced by AI"],
    ];
    for (let i = 0; i < 5; i++) {
      const x = 0.5 + i * 1.83;
      card(s, x, 1.35, 1.7, 3.6, i === 0 ? H.accent1 : H.lt2);
      T(s, String(i + 1), { x: x + 0.15, y: 1.45, w: 1.4, h: 0.7, fontSize: 36, bold: true, color: i === 0 ? YEL : C.accent3, fontFace: THEME.headFontFace });
      await iconCircle(s, pr[i][0], x + 0.15, 2.25, 0.55, true);
      T(s, pr[i][1], { x: x + 0.15, y: 2.95, w: 1.45, h: 0.95, fontSize: 13.5, bold: true, color: i === 0 ? C.background1 : C.text2 });
      T(s, pr[i][2], { x: x + 0.15, y: 3.95, w: 1.45, h: 0.85, fontSize: 11, color: i === 0 ? C.accent3 : C.accent2 });
    }
  }
  // Phase 4 — idea clusters
  pres.addSection({ title: "Phase 4" });
  await divider(4, "Phase 4");
  {
    const s = slide("Idea pool: 25 ideas in 7 clusters", 4, "Phase 4");
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
      const x = row === 0 ? 0.5 + col * 2.3 : 1.65 + col * 2.3, y = 1.35 + row * 1.85;
      card(s, x, y, 2.1, 1.7);
      await iconCircle(s, cl[i][0], x + 0.15, y + 0.15, 0.5, true);
      T(s, cl[i][1], { x: x + 1.55, y: y + 0.15, w: 0.4, h: 0.5, fontSize: 18, bold: true, color: C.accent3, align: "right", valign: "middle" });
      T(s, cl[i][2], { x: x + 0.15, y: y + 0.75, w: 1.85, h: 0.3, fontSize: 13.5, bold: true, color: C.text2 });
      T(s, cl[i][3], { x: x + 0.15, y: y + 1.05, w: 1.85, h: 0.6, fontSize: 11 });
    }
  }
  // Phase 4 — two idea profiles
  {
    const s = slide("Two idea profiles", 4, "Phase 4");
    const prof = [
      [true, "FaMagnifyingGlassChart", "HeLPR: automated LPR audit tool", [["For whom", "Bob and the Liebherr LPR team"], ["What it does", "Weekly checks, scores and ranks retailers, with proof"], ["Fit with needs", "Answers all 5 top needs; what Liebherr asked for"]]],
      [false, "FaRulerCombined", "“Will it fit?” shopper assistant", [["For whom", "Shoppers on retailer webshops"], ["What it does", "Helps choose the right fridge: niche size, door handle"], ["Fit with needs", "Fewer returns, but does not help Bob"]]],
    ];
    for (let i = 0; i < 2; i++) {
      const [sel, ic, h, rows] = prof[i];
      const x = 0.5 + i * 4.6;
      card(s, x, 1.35, 4.4, 3.65, sel ? H.accent1 : H.lt2);
      await iconCircle(s, ic, x + 0.2, 1.55, 0.6, true);
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 2.75, y: 1.65, w: 1.45, h: 0.36, rectRadius: 0.18, fill: { color: sel ? YEL : H.lt1 }, line: { color: sel ? YEL : H.accent3 }, objectName: "Status chip" });
      T(s, sel ? "SELECTED" : "NOT SELECTED", { x: x + 2.75, y: 1.65, w: 1.45, h: 0.36, fontSize: 10, bold: true, charSpacing: 1, align: "center", valign: "middle", color: sel ? C.text1 : C.accent2 });
      T(s, h, { x: x + 0.2, y: 2.3, w: 4.0, h: 0.5, fontSize: 16, bold: true, color: sel ? C.background1 : C.text2 });
      rows.forEach(([k, v], j) => {
        const y = 2.9 + j * 0.68;
        T(s, k.toUpperCase(), { x: x + 0.2, y, w: 4.0, h: 0.22, fontSize: 9, bold: true, charSpacing: 1, color: sel ? YEL : C.accent2 });
        T(s, v, { x: x + 0.2, y: y + 0.22, w: 4.0, h: 0.42, fontSize: 12, color: sel ? C.background1 : C.text1 });
      });
    }
  }
  // Phase 4 — choice
  {
    const s = slide("Our choice: a tool for Liebherr employees", 4, "Phase 4");
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 1.35, w: 4.0, h: 3.6, rectRadius: 0.12, fill: { color: H.accent1 }, line: { color: H.accent1 }, objectName: "Focus card" });
    await iconCircle(s, "FaBullseye", 0.75, 1.6, 0.7, false);
    T(s, "OUR FOCUS", { x: 0.75, y: 2.5, w: 3.5, h: 0.3, fontSize: 11, bold: true, charSpacing: 2, color: C.accent3 });
    T(s, "An internal audit tool that Bob uses to check, score and compare retailers", { x: 0.75, y: 2.85, w: 3.5, h: 1.3, fontSize: 18, bold: true, color: C.background1 });
    T(s, "Based on our needs and Liebherr’s answers", { x: 0.75, y: 4.3, w: 3.5, h: 0.4, fontSize: 12, color: C.accent3 });
    T(s, "What we dropped, and why", { x: 4.9, y: 1.35, w: 4.6, h: 0.35, fontSize: 15, bold: true, color: C.accent1 });
    const dr = [
      ["Upload mode for blocked shops", "Show “needs manual check” instead"],
      ["Retailer self-check portal", "Too much; reports cover it"],
      ["Shopper “will it fit?” helper", "Focus is the internal tool"],
      ["Accuracy test vs. manual audit", "No time in the hackathon"],
    ];
    dr.forEach(([a, b], i) => {
      const y = 1.8 + i * 0.62;
      s.addShape(pres.shapes.OVAL, { x: 4.9, y: y + 0.12, w: 0.3, h: 0.3, fill: { color: H.lt2 }, line: { color: H.lt2 }, objectName: "Dropped mark" });
      T(s, "✕", { x: 4.9, y: y + 0.12, w: 0.3, h: 0.3, fontSize: 10, bold: true, color: C.accent1, align: "center", valign: "middle" });
      T(s, a, { x: 5.35, y, w: 4.1, h: 0.28, fontSize: 13, bold: true, color: C.text2 });
      T(s, b, { x: 5.35, y: y + 0.27, w: 4.1, h: 0.28, fontSize: 11.5, color: C.accent2 });
    });
  }

  // Phase 5 — HeLPR hero
  pres.addSection({ title: "Phase 5" });
  await divider(5, "Phase 5");
  {
    const s = slide("Meet HeLPR, our prototype", 5, "Phase 5");
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 1.35, w: 3.6, h: 3.65, rectRadius: 0.12, fill: { color: H.accent1 }, line: { color: H.accent1 }, objectName: "Hero card" });
    await iconCircle(s, "FaMagnifyingGlassChart", 0.75, 1.6, 0.8, false);
    T(s, "HeLPR", { x: 0.75, y: 2.6, w: 3.2, h: 0.7, fontSize: 40, bold: true, color: C.background1, fontFace: THEME.headFontFace });
    T(s, "Checks retailer webshops against the LPR criteria, with proof for every verdict", { x: 0.75, y: 3.35, w: 3.15, h: 1.0, fontSize: 15, color: C.background1 });
    T(s, "Web app · AI judge + rule checks", { x: 0.75, y: 4.5, w: 3.2, h: 0.3, fontSize: 11, color: C.accent3 });
    const tiles = [
      ["FaRankingStar", "Overview", "Ranking of all retailers and the score trend"],
      ["FaClipboardCheck", "Scorecard", "Every criterion with evidence. Bob can correct the verdict or teach the AI."],
      ["FaSliders", "Criteria & weights", "Change priorities, switch criteria on or off, edit the AI instructions"],
      ["FaFilePdf", "Reports", "A to-do list for the retailer, as PDF or Excel"],
    ];
    for (let i = 0; i < 4; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 4.35 + col * 2.6, y = 1.35 + row * 1.875;
      card(s, x, y, 2.5, 1.775);
      await iconCircle(s, tiles[i][0], x + 0.18, y + 0.18, 0.5, true);
      T(s, tiles[i][1], { x: x + 0.8, y: y + 0.18, w: 1.6, h: 0.5, fontSize: 14, bold: true, color: C.text2, valign: "middle" });
      T(s, tiles[i][2], { x: x + 0.18, y: y + 0.8, w: 2.2, h: 0.9, fontSize: 11.5 });
    }
  }
  // Phase 5 — how an audit works
  {
    const s = slide("How an audit works", 5, "Phase 5");
    const st = [
      ["FaListOl", "Plan", "Picks 1–2 Liebherr products per SK class in each shop"],
      ["FaGears", "Check", "Rules first, AI judge second, a human last"],
      ["FaUserCheck", "Review", "If the AI is unsure, the criterion goes to Bob"],
      ["FaChartColumn", "Report", "Weighted score, return risks, to-do list"],
    ];
    for (let i = 0; i < 4; i++) {
      const x = 0.5 + i * 2.3;
      card(s, x, 1.35, 2.1, 2.5);
      await iconCircle(s, st[i][0], x + 0.7, 1.55, 0.7, true);
      T(s, `${i + 1}  ${st[i][1]}`, { x, y: 2.4, w: 2.1, h: 0.4, fontSize: 16, bold: true, color: C.text2, align: "center" });
      T(s, st[i][2], { x: x + 0.15, y: 2.85, w: 1.8, h: 0.9, fontSize: 12, align: "center" });
      if (i < 3) T(s, "›", { x: x + 2.07, y: 2.3, w: 0.26, h: 0.5, fontSize: 28, bold: true, color: C.accent3, align: "center", valign: "middle" });
    }
    const chips = [["FaStopwatch", "1–3 min per retailer"], ["FaCalendarCheck", "Weekly automatic audits"], ["FaBan", "Blocked shop → by hand"]];
    for (let i = 0; i < 3; i++) {
      const x = 0.5 + i * 3.05;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 4.2, w: 2.85, h: 0.65, rectRadius: 0.32, fill: { color: H.lt1 }, line: { color: H.accent3, width: 1.25 }, objectName: "Chip" });
      await iconCircle(s, chips[i][0], x + 0.1, 4.27, 0.5, false);
      T(s, chips[i][1], { x: x + 0.7, y: 4.2, w: 2.1, h: 0.65, fontSize: 13, bold: true, color: C.text2, valign: "middle" });
    }
  }
  // Phase 5 — needs to features
  {
    const s = slide("From Bob’s needs to HeLPR’s features", 5, "Phase 5");
    T(s, "BOB NEEDS…", { x: 0.5, y: 1.3, w: 3.8, h: 0.28, fontSize: 10, bold: true, charSpacing: 1, color: C.accent2 });
    T(s, "…SO HeLPR HAS", { x: 4.95, y: 1.3, w: 4.5, h: 0.28, fontSize: 10, bold: true, charSpacing: 1, color: C.accent1 });
    const rows = [
      ["Automatic check of the LPR criteria", "Audits on demand or every week"],
      ["One score per retailer", "Weighted LPR score per SK class, ranking"],
      ["Score history over time", "LPR score trend and audit history"],
      ["AI-readiness score", "Separate AI-ready score and AI shopper test"],
      ["Confidence to defend a rating", "Evidence: screenshot and reasoning"],
      ["Control over the verdicts", "Correct verdict, teach the AI"],
      ["Criteria editable without coding", "Criteria & weights page"],
    ];
    rows.forEach(([a, b], i) => {
      const y = 1.65 + i * 0.48;
      card(s, 0.5, y, 4.0, 0.4);
      T(s, a, { x: 0.65, y, w: 3.8, h: 0.4, fontSize: 12.5, valign: "middle" });
      T(s, "→", { x: 4.5, y, w: 0.45, h: 0.4, fontSize: 16, bold: true, color: C.accent1, align: "center", valign: "middle" });
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 4.95, y, w: 4.55, h: 0.4, rectRadius: 0.08, fill: { color: H.accent1 }, line: { color: H.accent1 }, objectName: "Feature" });
      T(s, b, { x: 5.1, y, w: 4.35, h: 0.4, fontSize: 12.5, bold: true, color: C.background1, valign: "middle" });
    });
  }
  // Phase 5 — screenshot slides
  const shots = [
    ["HeLPR: compare all retailers at a glance", "Overview", [["Ranking", "All retailers by LPR score"], ["Trend", "Is each retailer getting better?"], ["Return risks", "Missing info that leads to returns"]]],
    ["HeLPR: every verdict with proof", "Retailer scorecard", [["Evidence", "Screenshot and reasoning per criterion"], ["Correct", "Bob can change any verdict"], ["Teach the AI", "His feedback improves the next audit"]]],
    ["HeLPR: a clear to-do list for the retailer", "Report / to-do list", [["What to fix", "Every missing criterion, with a fix"], ["Deadline", "When it must be done"], ["PDF or Excel", "Ready to send to the retailer"]]],
  ];
  for (const [title, label, pts] of shots) {
    const s = slide(title, 5, "Phase 5");
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 1.3, w: 6.3, h: 3.75, rectRadius: 0.08, fill: { color: H.lt2 }, line: { color: H.accent3, width: 1.25, dashType: "dash" }, objectName: "Screenshot space" });
    s.addImage({ data: await icon("FaCamera", H.accent3), x: 3.35, y: 2.6, w: 0.6, h: 0.6, altText: "Screenshot placeholder", objectName: "Camera icon" });
    T(s, "Screenshot: " + label, { x: 0.5, y: 3.3, w: 6.3, h: 0.3, fontSize: 12, color: C.accent2, align: "center" });
    pts.forEach(([h, t], i) => {
      const y = 1.3 + i * 1.3;
      s.addShape(pres.shapes.OVAL, { x: 7.1, y, w: 0.45, h: 0.45, fill: { color: YEL }, line: { color: YEL }, objectName: "Point no" });
      T(s, String(i + 1), { x: 7.1, y, w: 0.45, h: 0.45, fontSize: 14, bold: true, align: "center", valign: "middle" });
      T(s, h, { x: 7.7, y: y - 0.02, w: 1.8, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
      T(s, t, { x: 7.7, y: y + 0.35, w: 1.8, h: 0.75, fontSize: 12 });
    });
  }

  // 11 — End
  {
    const s = pres.addSlide({ masterName: "TITLE", sectionTitle: "Phase 5" });
    s.background = { color: "2B2B2B" };
    await bookend(s);
    T(s, "Bob keeps the verdict. HeLPR does the legwork.", { x: 0.6, y: 0.9, w: 5.4, h: 2.1, fontSize: 32, bold: true, color: C.background1, valign: "bottom", fontFace: THEME.headFontFace });
    T(s, "Thank you!", { x: 0.6, y: 3.2, w: 5.4, h: 0.5, fontSize: 22, bold: true, color: YEL });
    T(s, "Team Liebherr 5  ·  HNU Winter School 2026", { x: 0.6, y: 3.75, w: 5.4, h: 0.4, fontSize: 14, color: C.accent3 });
  }

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("written", OUT);
})();
