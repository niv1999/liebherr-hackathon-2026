// Builds Liebherr5_DesignThinking_Journey.pptx — light, visual, white & blue.
// Run: APPLY_THEME=<pptx skill>/scripts/apply_theme.js NODE_PATH=<node_modules> node build_journey_deck.js out.pptx <imgdir>
// Needs liebherr_logo.png (app/backend/lpr/reference/) and empathy.jpg in <imgdir>.
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
    await deco(s);
    T(s, "LIEBHERR CHALLENGE  ·  DESIGN THINKING", { x: 0.6, y: 0.8, w: 5.6, h: 0.3, fontSize: 11, bold: true, charSpacing: 2, color: C.accent1 });
    T(s, "Our Design Thinking journey", { x: 0.6, y: 1.4, w: 5.6, h: 1.6, fontSize: 36, bold: true, color: C.text2, valign: "bottom", fontFace: THEME.headFontFace });
    T(s, "Smarter webshop checks for Liebherr", { x: 0.6, y: 3.15, w: 5.6, h: 0.6, fontSize: 18, color: C.accent1 });
    T(s, "CHALLENGE PARTNER", { x: 0.6, y: 3.95, w: 3, h: 0.25, fontSize: 9, bold: true, charSpacing: 2, color: C.accent2 });
    s.addImage({ path: path.join(IMG, "liebherr_logo.png"), x: 0.6, y: 4.25, w: 1.8, h: 1.8 * 99 / 800, altText: "Liebherr logo", objectName: "Partner logo" });
    T(s, "Team Liebherr 5  ·  HNU Winter School 2026", { x: 0.6, y: 4.75, w: 5.6, h: 0.3, fontSize: 12, color: C.accent2 });
  }

  // 2 — Journey
  {
    const s = slide("Where we are", null, "Intro");
    s.addShape(pres.shapes.LINE, { x: 0.95, y: 2.95, w: 7.8, h: 0, line: { color: H.accent3, width: 3 }, objectName: "Line" });
    s.addShape(pres.shapes.LINE, { x: 0.95, y: 2.95, w: 5.2, h: 0, line: { color: YEL, width: 3 }, objectName: "Progress" });
    for (let i = 0; i < 7; i++) {
      const x = 0.5 + i * 1.3;
      dot(s, i + 1, x + 0.15, 2.65, 0.6, i < 5);
      T(s, PH[i], { x: x - 0.05, y: 3.45, w: 1.3, h: 0.6, fontSize: 12, bold: i < 5, align: "center", color: i < 5 ? C.text2 : C.accent2 });
    }
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.65, y: 2.0, w: 5.8, h: 0.38, rectRadius: 0.19, fill: { color: H.lt2 }, line: { color: H.lt2 }, objectName: "Done pill" });
    T(s, "Done", { x: 0.65, y: 2.0, w: 5.8, h: 0.38, fontSize: 12, bold: true, color: C.accent1, align: "center", valign: "middle" });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.6, y: 2.0, w: 2.85, h: 0.38, rectRadius: 0.19, fill: { color: H.lt1 }, line: { color: H.accent3, width: 1, dashType: "dash" }, objectName: "Next pill" });
    T(s, "Next", { x: 6.6, y: 2.0, w: 2.85, h: 0.38, fontSize: 12, bold: true, color: C.accent2, align: "center", valign: "middle" });
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
  {
    const s = slide("Meet Bob, our typical user", 3, "Phase 3");
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 1.35, w: 3.1, h: 2.0, rectRadius: 0.12, fill: { color: H.accent1 }, line: { color: H.accent1 }, objectName: "Persona card" });
    s.addShape(pres.shapes.OVAL, { x: 0.7, y: 1.55, w: 0.8, h: 0.8, fill: { color: H.lt1 }, line: { color: H.lt1 }, objectName: "Avatar" });
    s.addImage({ data: await icon("FaUser", H.accent1), x: 0.9, y: 1.73, w: 0.4, h: 0.44, altText: "Bob", objectName: "Avatar icon" });
    T(s, "Bob, 35", { x: 1.65, y: 1.6, w: 1.9, h: 0.4, fontSize: 22, bold: true, color: C.background1 });
    T(s, "Liebherr employee", { x: 1.65, y: 2.0, w: 1.9, h: 0.3, fontSize: 12, color: C.accent3 });
    T(s, "Single, no children · 2-room flat · funny · loves board games", { x: 0.7, y: 2.55, w: 2.75, h: 0.7, fontSize: 12.5, color: C.background1 });
    s.addImage({ path: path.join(IMG, "empathy.jpg"), x: 0.5, y: 3.5, w: 3.1, h: 3.1 / 1.776, altText: "Photo of our User Empathy Map", objectName: "Empathy map photo" });
    const cards = [
      ["FaUsers", "Relationships", "A lot of friends and a big family"],
      ["FaUserGroup", "Influencers", "His older brother works in the same field. His best friend at work is the reason he stayed at the company."],
      ["FaCat", "What he enjoys", "Playing with his cat, going to the pub, reading detective novels"],
      ["FaHouse", "His environment", "At home: his room, his cat, the kitchen, city noise. At work: his office and his friend."],
    ];
    for (let i = 0; i < 4; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 3.85 + col * 2.875, y = 1.35 + row * 1.85;
      card(s, x, y, 2.775, 1.7);
      await iconCircle(s, cards[i][0], x + 0.18, y + 0.18, 0.5, true);
      T(s, cards[i][1], { x: x + 0.8, y: y + 0.18, w: 1.85, h: 0.5, fontSize: 14, bold: true, color: C.text2, valign: "middle" });
      T(s, cards[i][2], { x: x + 0.18, y: y + 0.8, w: 2.45, h: 0.85, fontSize: 11.5 });
    }
  }
  // 8 — Phase 3: Bob at work
  {
    const s = slide("Bob at work: what he sees, thinks and needs", 3, "Phase 3");
    const cards = [
      ["FaEye", "Sees", "A lot of Excel, all day long", false],
      ["FaEarListen", "Hears", "Typing, phone calls, notifications on his phone", false],
      ["FaCommentDots", "Says", "Complains about his job, and that AI will soon replace him", false],
      ["FaCloudRain", "Thinks & feels", "Just wants the workday to end so he can rest. A bit depressed, but still optimistic.", false],
      ["FaTriangleExclamation", "Frustrations & worries", "Time-consuming work, burned out, overwhelmed. Biggest fear: being replaced by AI.", true],
      ["FaBullseye", "Job to be done", "Feels stuck in his comfort zone. A new AI tool would give him more responsibility and new skills.", true],
    ];
    for (let i = 0; i < 6; i++) {
      const col = i % 3, row = Math.floor(i / 3);
      const x = 0.5 + col * 3.05, y = 1.35 + row * 1.85;
      const hi = cards[i][3];
      card(s, x, y, 2.85, 1.7, hi ? H.accent1 : H.lt2);
      await iconCircle(s, cards[i][0], x + 0.18, y + 0.18, 0.5, !hi);
      T(s, cards[i][1], { x: x + 0.8, y: y + 0.18, w: 1.95, h: 0.5, fontSize: 14, bold: true, color: hi ? C.background1 : C.text2, valign: "middle" });
      T(s, cards[i][2], { x: x + 0.18, y: y + 0.8, w: 2.5, h: 0.85, fontSize: 12, color: hi ? C.background1 : C.text1 });
    }
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

  // Phase 4 — idea clusters
  pres.addSection({ title: "Phase 4" });
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
    todoTag(s, 4.9, 4.4);
    T(s, "2 idea profiles", { x: 6.4, y: 4.4, w: 3, h: 0.28, fontSize: 12, valign: "middle" });
  }

  // Phase 5 — HeLPR hero
  pres.addSection({ title: "Phase 5" });
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
  // Phase 5 — screenshots
  {
    const s = slide("HeLPR in action", 5, "Phase 5");
    [["Overview: ranking of the retailers"], ["Scorecard: one retailer, with evidence"]].forEach(([cap], i) => {
      const x = 0.5 + i * 4.6;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.35, w: 4.4, h: 2.75, rectRadius: 0.1, fill: { color: H.lt2 }, line: { color: H.accent3, width: 1.25, dashType: "dash" }, objectName: "Screenshot frame" });
      todoTag(s, x + 1.525, 2.45);
      T(s, "Paste a screenshot here", { x, y: 2.85, w: 4.4, h: 0.3, fontSize: 11, color: C.accent2, align: "center" });
      T(s, cap, { x, y: 4.2, w: 4.4, h: 0.3, fontSize: 13, bold: true, color: C.text2, align: "center" });
    });
  }

  // 10 — Next
  pres.addSection({ title: "Next" });
  {
    const s = slide("Coming next", null, "Next");
    const nx = [["FaRoute", "Phase 3", "User Journey + top needs"], ["FaLightbulb", "Phase 4", "2 idea profiles"], ["FaVial", "Phase 6", "Test with Liebherr"], ["FaBriefcase", "Phase 7", "Business model"]];
    for (let i = 0; i < 4; i++) {
      const [ic, n, h] = nx[i];
      const x = 0.5 + i * 2.3;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.4, w: 2.1, h: 3.0, rectRadius: 0.1, fill: { color: H.lt1 }, line: { color: H.accent3, width: 1.25, dashType: "dash" }, objectName: "Next card" });
      await iconCircle(s, ic, x + 0.65, 1.7, 0.8, false);
      T(s, n, { x, y: 2.65, w: 2.1, h: 0.3, fontSize: 12, color: C.accent2, align: "center" });
      T(s, h, { x: x + 0.1, y: 2.95, w: 1.9, h: 0.7, fontSize: 15, bold: true, color: C.text2, align: "center" });
      todoTag(s, x + 0.375, 3.85);
    }
  }

  // 11 — End
  {
    const s = pres.addSlide({ masterName: "TITLE", sectionTitle: "Next" });
    await deco(s);
    T(s, "Thank you", { x: 0.6, y: 1.4, w: 5.6, h: 1.6, fontSize: 36, bold: true, color: C.text2, valign: "bottom", fontFace: THEME.headFontFace });
    T(s, "Team Liebherr 5  ·  HNU Winter School 2026", { x: 0.6, y: 3.15, w: 5.6, h: 0.6, fontSize: 18, color: C.accent1 });
  }

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("written", OUT);
})();
