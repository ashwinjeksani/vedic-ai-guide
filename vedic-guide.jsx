import React, { useState, useRef, useEffect } from "react";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  The agent's mind — hermeneutic rules for reading the Vedic corpus  */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `You are Sanatana, a Vedic guide living inside a web app. Your knowledge spans the Hindu corpus: the four Vedas (Samhitas, Brahmanas, Aranyakas), the principal Upanishads, the Bhagavad Gita, the Itihasas (Ramayana, Mahabharata), the Puranas, the Dharmashastras, and the six darshanas including Yoga and Vedanta.

Your hermeneutic rules. Never break these:

1. DISTINGUISH SHRUTI FROM SMRITI. Shruti ("that which was heard" - the Vedas and Upanishads) carries timeless principles about consciousness, dharma, and the Self. Smriti ("that which is remembered" - the Gita, epics, Puranas, and Dharmashastras such as the Manusmriti) is human composition applying those principles to a specific time, place, and society.

2. SMRITI IS TIME-BOUND BY ITS OWN ADMISSION. Manusmriti 1.85 itself says dharma differs by age (yuga-dharma). Social regulations in the Dharmashastras - rules of caste, gender, punishment, occupation - were calibrated for ancient societies and do not bind the present. When asked about them, say so plainly, then extract whatever underlying principle is worth keeping, if any.

3. WHEN SMRITI CONFLICTS WITH SHRUTI, SHRUTI PREVAILS. This is the tradition's own rule of precedence, not a modern invention.

4. NEVER READ LITERALLY WHAT WAS WRITTEN AS METAPHOR, STORY, OR PEDAGOGY. The seers encoded subtle knowledge in narrative and symbol so that everyone - not only scholars - could carry it. Fire, battle, gods, demons, churned oceans: interpret at the level of meaning. Reading literally is reading less, not more.

5. ANSWER FOR THE REGULAR PERSON. Take everyday questions - anger, work, grief, money, family, fear, purpose - and answer from the essence of Vedic thought: the mahavakyas, karma-yoga, the gunas, the Self beyond the mind, the witness of experience. Practical first, metaphysical second.

6. CITE BRIEFLY so the person can go read: e.g. (Katha Upanishad 1.2.20), (Gita 2.47), (Brihadaranyaka 1.3.28). One or two citations per answer is enough.

7. BE HONEST ABOUT DEBATE. Schools differ - Advaita, Vishishtadvaita, Dvaita; scholars dispute dates and readings. Prefer "the texts suggest" over pronouncements. Never claim divine or priestly authority.

8. NEVER USE THE TEXTS TO JUSTIFY DISCRIMINATION by birth, caste, or gender. If asked about such passages, explain their historical context, then point to the shruti principle that the same Self dwells in all beings (Isha Upanishad 6).

9. KEEP ANSWERS GROUNDED AND SHORT - usually 120 to 220 words. Plain language first; Sanskrit terms explained in passing, not paraded. You may open with a single short verse when it genuinely fits. Avoid bullet lists unless the person asks for steps.

10. YOU ARE A GUIDE, NOT A GURU. For medical, legal, or psychological crises, gently point toward professional help alongside any wisdom you offer.`;

/* ------------------------------------------------------------------ */
/*  Library data — curated essence with fresh, original renderings     */
/* ------------------------------------------------------------------ */

const LIBRARY = {
  vedas: [
    {
      dev: "ऋग्वेदः",
      name: "Rig Veda",
      meta: "c. 1500–1200 BCE · 10 maṇḍalas · 10,552 verses",
      essence:
        "The oldest layer. Hymns of vision — fire, dawn, rivers, cosmos — and the first great questions asked out loud.",
      ref: "Ṛg Veda 10.129 — Nāsadīya Sūkta, the Hymn of Creation",
      sa: "nāsad āsīn no sad āsīt tadānīm",
      en: "Then there was neither non-being nor being. Who truly knows how it arose? Perhaps even the one who looks down from the highest heaven knows — or perhaps not even he.",
    },
    {
      dev: "सामवेदः",
      name: "Sāma Veda",
      meta: "c. 1200 BCE · 1,875 verses, nearly all set from the Rig",
      essence:
        "The Rig turned into melody. Knowledge carried as music, because what is sung is remembered — and felt.",
      ref: "Chāndogya Upaniṣad 1.1.2 (of the Sāma tradition)",
      sa: "vācaḥ ṛg rasaḥ, ṛcaḥ sāma rasaḥ",
      en: "Of speech, the Rig is the essence; of the Rig, the Sāma is the essence — meaning distilled until it can be sung.",
    },
    {
      dev: "यजुर्वेदः",
      name: "Yajur Veda",
      meta: "c. 1200–1000 BCE · prose formulas of the rite, in two recensions",
      essence:
        "The manual of the ritual — and inside the mechanics, an ethics of attention: every act done as offering.",
      ref: "Śukla Yajur Veda 36.18",
      sa: "mitrasyāhaṁ cakṣuṣā sarvāṇi bhūtāni samīkṣe",
      en: "May I look upon all beings with the eye of a friend.",
    },
    {
      dev: "अथर्ववेदः",
      name: "Atharva Veda",
      meta: "c. 1200–1000 BCE · 730 hymns of daily life",
      essence:
        "The Veda of the household — healing, harvest, harmony, protection. Proof that the sacred included the ordinary.",
      ref: "Atharva Veda 12.1 — Pṛthvī Sūkta, the Hymn to the Earth",
      sa: "mātā bhūmiḥ putro 'haṁ pṛthivyāḥ",
      en: "The earth is my mother, and I am her child.",
    },
  ],
  upanishads: [
    {
      dev: "ईशोपनिषद्",
      name: "Īśā",
      meta: "Śukla Yajur Veda · 18 verses",
      essence: "Renounce by seeing rightly: the One envelops all that moves.",
      sa: "īśāvāsyam idaṁ sarvam",
      en: "All this — whatever moves in this moving world — is dwelt in by the One. Enjoy by letting go; covet no one's wealth.",
      ref: "Īśā 1",
    },
    {
      dev: "केनोपनिषद्",
      name: "Kena",
      meta: "Sāma Veda · 4 sections",
      essence: "The knower behind knowing.",
      sa: "yan manasā na manute",
      en: "That which the mind cannot think, but by which the mind thinks — know that alone to be the real, not what is worshipped here.",
      ref: "Kena 1.6",
    },
    {
      dev: "कठोपनिषद्",
      name: "Kaṭha",
      meta: "Kṛṣṇa Yajur Veda · the boy Naciketas questions Death",
      essence: "What survives the body, asked to Death's own face.",
      sa: "na jāyate mriyate vā vipaścit",
      en: "The knowing Self is not born and does not die. Unborn, eternal, ancient — it is not slain when the body is slain.",
      ref: "Kaṭha 1.2.18",
    },
    {
      dev: "मुण्डकोपनिषद्",
      name: "Muṇḍaka",
      meta: "Atharva Veda · higher and lower knowledge",
      essence: "Two birds on one tree: the one who eats, the one who watches.",
      sa: "satyam eva jayate",
      en: "Truth alone prevails, not falsehood — the words on India's national emblem come from here.",
      ref: "Muṇḍaka 3.1.6",
    },
    {
      dev: "माण्डूक्योपनिषद्",
      name: "Māṇḍūkya",
      meta: "Atharva Veda · 12 verses, the shortest",
      essence: "AUM mapped to waking, dream, deep sleep — and the fourth.",
      sa: "so 'yam ātmā catuṣpāt",
      en: "This Self has four quarters: the waking state, the dreaming state, deep sleep, and turīya — the silent awareness in which the other three appear.",
      ref: "Māṇḍūkya 2–7",
    },
    {
      dev: "तैत्तिरीयोपनिषद्",
      name: "Taittirīya",
      meta: "Kṛṣṇa Yajur Veda · the five sheaths",
      essence: "Peel the layers — food, breath, mind, insight — bliss remains.",
      sa: "satyaṁ vada · dharmaṁ cara",
      en: "Speak the truth. Walk your dharma. Never neglect learning — the graduation speech given three thousand years ago.",
      ref: "Taittirīya 1.11",
    },
    {
      dev: "छान्दोग्योपनिषद्",
      name: "Chāndogya",
      meta: "Sāma Veda · dialogues of father and son",
      essence: "The great statement a father gives his son, nine times over.",
      sa: "tat tvam asi",
      en: "That thou art — the reality you are searching for outside is the very awareness doing the searching.",
      ref: "Chāndogya 6.8.7",
    },
    {
      dev: "बृहदारण्यकोपनिषद्",
      name: "Bṛhadāraṇyaka",
      meta: "Śukla Yajur Veda · the largest and among the oldest",
      essence: "The Self as the light of lights; the prayer of every seeker.",
      sa: "asato mā sad gamaya",
      en: "From the unreal, lead me to the real. From darkness, lead me to light. From death, lead me to what does not die.",
      ref: "Bṛhadāraṇyaka 1.3.28",
    },
  ],
  smriti: [
    {
      dev: "भगवद्गीता",
      name: "Bhagavad Gītā",
      meta: "Smṛti · c. 200 BCE – 200 CE · 700 verses within the Mahābhārata",
      essence:
        "The Upaniṣads restated on a battlefield, so philosophy could reach anyone with a duty and a doubt.",
      sa: "karmaṇy evādhikāras te mā phaleṣu kadācana",
      en: "Your right is to the work alone, never to its fruits — act fully, release the outcome.",
      ref: "Gītā 2.47",
      context:
        "Written as a wartime dialogue precisely so ordinary people could grasp Vedantic ideas through story. Read the battle as the human condition, not a call to arms.",
    },
    {
      dev: "मनुस्मृतिः",
      name: "Manusmṛti",
      meta: "Dharmaśāstra · c. 200 BCE – 200 CE · a legal-social code",
      essence:
        "A society's attempt, in its own era, to answer: how should duty, law, and order be arranged?",
      sa: "anye kṛtayuge dharmās tretāyāṁ dvāpare 'pare",
      en: "The dharmas of one age differ from those of another — the text itself says its rules are calibrated to their era (1.85).",
      ref: "Manusmṛti 1.85",
      context:
        "This is the clearest case of time-bound smṛti. Its social regulations — caste, gender, punishment — belonged to an ancient agrarian order and do not bind today; by the tradition's own rule, wherever it conflicts with śruti, śruti prevails. Keep its questions, not its answers.",
    },
    {
      dev: "रामायणम् · महाभारतम्",
      name: "The Itihāsas",
      meta: "Epic history · Rāmāyaṇa (~24,000 verses) · Mahābhārata (~100,000)",
      essence:
        "Dharma taught through dilemma. No character is spared a hard choice — that is the curriculum.",
      sa: "yato dharmas tato jayaḥ",
      en: "Where dharma is, there victory is — the Mahābhārata's refrain, earned through eighteen books of moral complexity.",
      ref: "Mahābhārata (refrain)",
      context:
        "Itihāsa means \"thus it happened,\" but the epics teach by situation, not statute. Their contradictions are deliberate: dharma is subtle, and the story is the argument.",
    },
    {
      dev: "पुराणानि",
      name: "The Purāṇas",
      meta: "Smṛti · 18 major purāṇas · cosmology, genealogy, story",
      essence:
        "Knowledge made graspable for every listener — the Upaniṣads translated into narrative, image, and devotion.",
      sa: "purāṇa — \"of ancient times\"",
      en: "Vast cycles of creation and dissolution, gods and asuras — symbol systems for truths the abstract texts state in one line.",
      ref: "e.g. Bhāgavata, Viṣṇu, Śiva Purāṇas",
      context:
        "The Purāṇas were the mass medium of their age. Read the mythology as encoded psychology and cosmology, not as literal chronicle.",
    },
    {
      dev: "योगसूत्राणि",
      name: "Yoga Sūtras of Patañjali",
      meta: "Darśana · c. 200 BCE – 400 CE · 196 aphorisms",
      essence: "The mind, observed and mapped — a manual, not a mythology.",
      sa: "yogaś citta-vṛtti-nirodhaḥ",
      en: "Yoga is the settling of the mind's turnings; then the seer rests in its own nature.",
      ref: "Yoga Sūtra 1.2–1.3",
      context:
        "One of six darśanas (schools). Its eight limbs are a practice architecture that translates directly to modern life — ethics, discipline, breath, attention, absorption.",
    },
  ],
  sources: [
    {
      name: "Vedic Heritage Portal",
      org: "Government of India, IGNCA",
      desc: "Audio, manuscripts, and full texts of the four Vedas with recensions.",
      url: "https://vedicheritage.gov.in",
    },
    {
      name: "GRETIL",
      org: "University of Göttingen",
      desc: "Machine-readable Sanskrit e-texts: Vedas, Upaniṣads, śāstras, epics.",
      url: "http://gretil.sub.uni-goettingen.de/gretil.html",
    },
    {
      name: "Sacred-Texts: Hinduism",
      org: "Internet Sacred Text Archive",
      desc: "Public-domain translations — complete Rig Veda, Upaniṣads, Gītā, Manu.",
      url: "https://sacred-texts.com/hin/",
    },
    {
      name: "Wisdom Library",
      org: "wisdomlib.org",
      desc: "Cross-linked translations of Purāṇas, śāstras, and glossaries.",
      url: "https://www.wisdomlib.org",
    },
    {
      name: "Internet Archive",
      org: "archive.org",
      desc: "Scanned critical editions — Max Müller's Sacred Books of the East and more.",
      url: "https://archive.org/details/sacredbooksofeast",
    },
  ],
};

const SUGGESTIONS = [
  "Does the Manusmriti still apply today?",
  "How do I deal with anger, according to the Gita?",
  "What does tat tvam asi mean for daily life?",
  "How should I think about karma at work?",
  "Why did the rishis write in stories and symbols?",
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SanatanaGuide() {
  const mountRef = useRef(null);
  const chatEndRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("vedas");
  const [provider, setProvider] = useState("anthropic");

  /* ---------------- three.js: the breathing bindu-mandala ---------- */
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      300
    );
    camera.position.set(0, -6, 40);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    group.rotation.x = -0.62; // tilt, like a yantra seen on an altar
    scene.add(group);

    const ember = new THREE.Color("#E8A33D");
    const copper = new THREE.Color("#B0653A");
    const ash = new THREE.Color("#6E6890");

    const disposables = [];
    const rings = [];
    const RING_COUNT = 9;

    for (let i = 0; i < RING_COUNT; i++) {
      const radius = 3.4 + i * 2.4;
      const count = 240 + i * 150;
      const petals = 8 + (i % 3) * 4; // 8 / 12 / 16 lotus pattern
      const t = i / (RING_COUNT - 1);

      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const c = new THREE.Color();

      for (let j = 0; j < count; j++) {
        const theta = (j / count) * Math.PI * 2;
        const wobble =
          1 + 0.075 * Math.sin(theta * petals) + (Math.random() - 0.5) * 0.05;
        const r = radius * wobble;
        positions[j * 3] = Math.cos(theta) * r;
        positions[j * 3 + 1] = Math.sin(theta) * r;
        positions[j * 3 + 2] = (Math.random() - 0.5) * 1.4;

        if (t < 0.5) c.copy(ember).lerp(copper, t * 2);
        else c.copy(copper).lerp(ash, (t - 0.5) * 2);
        const v = 0.85 + Math.random() * 0.3;
        colors[j * 3] = c.r * v;
        colors[j * 3 + 1] = c.g * v;
        colors[j * 3 + 2] = c.b * v;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({
        size: 0.16 - i * 0.006,
        vertexColors: true,
        transparent: true,
        opacity: 0.95 - t * 0.4,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const pts = new THREE.Points(geo, mat);
      pts.userData.speed = (i % 2 === 0 ? 1 : -1) * (0.055 - i * 0.004);
      group.add(pts);
      rings.push(pts);
      disposables.push(geo, mat);
    }

    // the bindu — a glowing point of origin
    const cv = document.createElement("canvas");
    cv.width = cv.height = 256;
    const ctx = cv.getContext("2d");
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(255,238,204,1)");
    grad.addColorStop(0.25, "rgba(232,163,61,0.9)");
    grad.addColorStop(0.6, "rgba(176,101,58,0.22)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(cv);
    const binduMat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const bindu = new THREE.Sprite(binduMat);
    bindu.scale.set(8, 8, 1);
    group.add(bindu);
    disposables.push(binduMat);

    // nakshatra field — distant stars
    const starCount = 700;
    const starPos = new Float32Array(starCount * 3);
    for (let s = 0; s < starCount; s++) {
      starPos[s * 3] = (Math.random() - 0.5) * 200;
      starPos[s * 3 + 1] = (Math.random() - 0.5) * 140;
      starPos[s * 3 + 2] = -30 - Math.random() * 60;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.22,
      color: new THREE.Color("#8E8AA0"),
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
    disposables.push(starGeo, starMat);

    const mouse = { x: 0, y: 0 };
    const onMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("pointermove", onMove);

    const clock = new THREE.Clock();
    let raf = 0;

    const renderFrame = () => {
      const t = clock.getElapsedTime();
      rings.forEach((p) => {
        p.rotation.z = t * p.userData.speed;
      });
      // a slow breath — roughly the rhythm of deep pranayama
      const breath = 1 + 0.035 * Math.sin((t * Math.PI * 2) / 7);
      group.scale.set(breath, breath, breath);
      binduMat.opacity = 0.7 + 0.3 * Math.sin((t * Math.PI * 2) / 7);
      stars.rotation.z = t * 0.004;
      camera.position.x += (mouse.x * 3.5 - camera.position.x) * 0.03;
      camera.position.y += (-6 + mouse.y * 2.5 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };

    const animate = () => {
      renderFrame();
      raf = requestAnimationFrame(animate);
    };

    if (prefersReduced) {
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    } else {
      animate();
    }

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (prefersReduced) {
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      disposables.forEach((d) => d.dispose());
      tex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  /* ---------------- chat ------------------------------------------- */
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, loading]);

  const send = async (preset) => {
    const content = (preset != null ? preset : input).trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model: provider === "openai" ? "gpt-4o" : "claude-sonnet-5",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      if (!reply) throw new Error("empty response");
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setError("The guide could not be reached. Ask again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const tabs = [
    { id: "vedas", label: "The Four Vedas", tag: "śruti" },
    { id: "upanishads", label: "Upaniṣads", tag: "śruti" },
    { id: "smriti", label: "Smṛti Texts", tag: "smṛti" },
    { id: "sources", label: "Complete Texts", tag: "links" },
  ];

  /* ---------------- render ----------------------------------------- */
  return (
    <div className="sana">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Marcellus&family=Crimson+Pro:ital,wght@0,400;0,500;0,600;1,400;1,500&family=IBM+Plex+Mono:wght@400;500&family=Noto+Serif+Devanagari:wght@400;600&display=swap');

        .sana {
          --night: #0B0A14;
          --raised: #17142A;
          --line: rgba(232,163,61,0.16);
          --ember: #E8A33D;
          --ember-soft: rgba(232,163,61,0.12);
          --copper: #B0653A;
          --ash: #9A95AF;
          --manuscript: #EFE4C9;
          --manuscript-deep: #E4D5B0;
          --ink: #2B2015;
          --ink-soft: #6B5A42;
          --display: 'Marcellus', 'Palatino Linotype', Georgia, serif;
          --body: 'Crimson Pro', Georgia, 'Times New Roman', serif;
          --mono: 'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace;
          --deva: 'Noto Serif Devanagari', 'Nirmala UI', 'Mangal', serif;

          background: var(--night);
          color: #EDE9F5;
          font-family: var(--body);
          font-size: 19px;
          line-height: 1.6;
          min-height: 100vh;
        }
        .sana * { box-sizing: border-box; margin: 0; padding: 0; }
        .sana ::selection { background: rgba(232,163,61,0.35); }
        html { scroll-behavior: smooth; }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          .sana *, .sana *::before, .sana *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
        .sana a { color: var(--ember); text-decoration: none; }
        .sana a:hover { text-decoration: underline; text-underline-offset: 3px; }
        .sana button { font: inherit; cursor: pointer; }
        .sana :focus-visible { outline: 2px solid var(--ember); outline-offset: 3px; border-radius: 2px; }

        .deva { font-family: var(--deva); }
        .eyebrow {
          font-family: var(--mono); font-size: 12px; letter-spacing: 0.22em;
          text-transform: uppercase; color: var(--ember);
        }
        .eyebrow .om { font-family: var(--deva); text-transform: none; letter-spacing: 0; }

        /* ---------- nav ---------- */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 32px;
          background: linear-gradient(rgba(11,10,20,0.85), rgba(11,10,20,0.55) 70%, transparent);
          backdrop-filter: blur(8px);
        }
        .nav-brand {
          font-family: var(--display); font-size: 20px; letter-spacing: 0.14em;
          color: #EDE9F5; display: flex; align-items: center; gap: 12px;
        }
        .nav-brand .om-mark {
          font-family: var(--deva); color: var(--ember); font-size: 24px; line-height: 1;
        }
        .nav-links { display: flex; gap: 28px; }
        .nav-links a {
          font-family: var(--mono); font-size: 12px; letter-spacing: 0.16em;
          text-transform: uppercase; color: var(--ash);
        }
        .nav-links a:hover { color: var(--ember); text-decoration: none; }
        @media (max-width: 720px) { .nav-links { display: none; } }

        /* ---------- hero ---------- */
        .hero { position: relative; height: 100vh; min-height: 640px; overflow: hidden; }
        .hero-canvas { position: absolute; inset: 0; }
        .hero-veil {
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse at 50% 42%, transparent 30%, rgba(11,10,20,0.55) 72%, var(--night) 100%);
        }
        .hero-copy {
          position: relative; z-index: 2; height: 100%;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center; padding: 0 24px; pointer-events: none;
        }
        .hero-copy > * { pointer-events: auto; }
        .hero h1 {
          font-family: var(--display); font-weight: 400;
          font-size: clamp(34px, 5.4vw, 66px); line-height: 1.14;
          letter-spacing: 0.01em; max-width: 15ch; margin: 22px 0 18px;
          text-shadow: 0 2px 30px rgba(11,10,20,0.9);
        }
        .hero p.sub {
          max-width: 52ch; color: var(--ash); font-size: clamp(17px, 1.6vw, 21px);
          text-shadow: 0 1px 20px rgba(11,10,20,0.9);
        }
        .hero-ctas { display: flex; gap: 14px; margin-top: 34px; flex-wrap: wrap; justify-content: center; }
        .sana .btn {
          display: inline-block; text-decoration: none;
          font-family: var(--mono); font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase;
          padding: 14px 26px; border-radius: 2px; border: 1px solid var(--ember);
          background: var(--ember); color: #1A1206; transition: transform 0.15s ease, background 0.2s ease;
        }
        .sana .btn:hover { transform: translateY(-1px); background: #F2B657; text-decoration: none; }
        .sana .btn.ghost { background: transparent; color: var(--ember); }
        .sana .btn.ghost:hover { background: var(--ember-soft); }
        .hero-scroll {
          position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%);
          font-family: var(--mono); font-size: 11px; letter-spacing: 0.28em; text-transform: uppercase;
          color: var(--ash); z-index: 2;
        }

        /* ---------- sections ---------- */
        .section { padding: 110px 24px; position: relative; }
        .shell { max-width: 1060px; margin: 0 auto; }
        .section-head { margin-bottom: 56px; }
        .section-head h2 {
          font-family: var(--display); font-weight: 400;
          font-size: clamp(28px, 3.6vw, 44px); letter-spacing: 0.02em; margin-top: 14px;
        }
        .section-head p.lede { color: var(--ash); max-width: 62ch; margin-top: 14px; font-size: 20px; }
        .rule { display: flex; align-items: center; gap: 14px; margin: 0 auto; max-width: 1060px; }
        .rule::before, .rule::after { content: ""; flex: 1; height: 1px; background: var(--line); }
        .rule span { font-family: var(--deva); color: var(--copper); font-size: 15px; }

        /* ---------- reading method ---------- */
        .method { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
        @media (max-width: 860px) { .method { grid-template-columns: 1fr; } }
        .method-card {
          background: var(--raised); border: 1px solid var(--line); border-radius: 4px;
          padding: 30px 28px 32px;
        }
        .method-card .step {
          font-family: var(--deva); color: var(--copper); font-size: 17px; letter-spacing: 0.05em;
        }
        .method-card h3 {
          font-family: var(--display); font-weight: 400; font-size: 24px; margin: 14px 0 6px;
        }
        .method-card .gloss { font-family: var(--mono); font-size: 11.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ember); }
        .method-card p { color: var(--ash); margin-top: 14px; font-size: 18px; }
        .method-note {
          margin-top: 40px; padding: 30px 34px; border-left: 2px solid var(--ember);
          background: linear-gradient(90deg, var(--ember-soft), transparent 70%);
          font-size: 21px; font-style: italic; max-width: 62ch;
        }
        .method-note em { color: var(--ember); font-style: italic; }

        /* ---------- chat ---------- */
        .chat-frame {
          background: var(--raised); border: 1px solid var(--line); border-radius: 6px;
          overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.45);
        }
        .chat-log { max-height: 480px; min-height: 220px; overflow-y: auto; padding: 30px 28px 10px; }
        .chat-log::-webkit-scrollbar { width: 8px; }
        .chat-log::-webkit-scrollbar-thumb { background: rgba(232,163,61,0.25); border-radius: 4px; }
        .chat-empty { text-align: center; color: var(--ash); padding: 30px 10px 40px; }
        .chat-empty .om-big { font-family: var(--deva); font-size: 44px; color: var(--ember); opacity: 0.9; display: block; margin-bottom: 14px; }
        .msg { margin-bottom: 22px; display: flex; }
        .msg.user { justify-content: flex-end; }
        .msg-bubble { max-width: 76%; padding: 14px 18px; border-radius: 4px; white-space: pre-wrap; }
        .msg.user .msg-bubble { background: var(--ember-soft); border: 1px solid rgba(232,163,61,0.3); }
        .msg.guide .msg-bubble { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); }
        .msg-label { font-family: var(--mono); font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--copper); display: block; margin-bottom: 8px; }
        .chat-wait { display: flex; align-items: center; gap: 12px; color: var(--ash); font-style: italic; padding: 0 0 22px; }
        .chat-wait .pulse {
          width: 10px; height: 10px; border-radius: 50%; background: var(--ember);
          animation: sanaPulse 1.6s ease-in-out infinite;
        }
        @keyframes sanaPulse { 0%,100% { transform: scale(0.7); opacity: 0.5; } 50% { transform: scale(1.15); opacity: 1; } }
        .chat-error { color: #E88A6A; padding: 0 28px 16px; font-size: 17px; }
        .provider-row { display: flex; align-items: center; gap: 8px; padding: 12px 18px 0; }
        .provider-label { color: var(--ash); font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; margin-right: 4px; }
        .provider-btn {
          background: transparent; border: 1px solid var(--line); color: var(--ash);
          border-radius: 999px; padding: 5px 14px; font-size: 14px; transition: all 0.2s;
        }
        .provider-btn:hover:not(:disabled) { border-color: var(--ember); color: var(--manuscript); }
        .provider-btn.active { background: var(--ember-soft); border-color: var(--ember); color: var(--ember); }
        .provider-btn:disabled { opacity: 0.5; cursor: default; }
        .chat-input { display: flex; gap: 12px; border-top: 1px solid var(--line); padding: 18px; background: rgba(11,10,20,0.5); }
        .chat-input textarea {
          flex: 1; resize: none; background: transparent; border: none; color: #EDE9F5;
          font-family: var(--body); font-size: 19px; line-height: 1.5; min-height: 54px; padding: 12px;
        }
        .chat-input textarea::placeholder { color: rgba(154,149,175,0.7); }
        .chat-input textarea:focus { outline: none; }
        .chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
        .chip {
          font-family: var(--mono); font-size: 12.5px; letter-spacing: 0.02em;
          color: var(--ash); background: transparent; border: 1px solid rgba(154,149,175,0.35);
          border-radius: 100px; padding: 9px 16px; transition: all 0.15s ease;
        }
        .chip:hover { border-color: var(--ember); color: var(--ember); }

        /* ---------- library (manuscript room) ---------- */
        .library { background: var(--manuscript); color: var(--ink); }
        .library .eyebrow { color: var(--copper); }
        .library .section-head p.lede { color: var(--ink-soft); }
        .lib-tabs { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 44px; }
        .lib-tab {
          font-family: var(--mono); font-size: 12.5px; letter-spacing: 0.1em; text-transform: uppercase;
          background: transparent; color: var(--ink-soft);
          border: 1px solid rgba(107,90,66,0.4); border-radius: 2px; padding: 11px 18px;
          transition: all 0.15s ease;
        }
        .lib-tab .t { font-family: var(--deva); text-transform: none; letter-spacing: 0; opacity: 0.75; margin-left: 8px; }
        .lib-tab:hover { border-color: var(--copper); color: var(--copper); }
        .lib-tab.active { background: var(--ink); color: var(--manuscript); border-color: var(--ink); }
        .lib-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 22px; }
        @media (max-width: 860px) { .lib-grid { grid-template-columns: 1fr; } }
        .lib-card {
          background: rgba(255,251,240,0.6); border: 1px solid rgba(107,90,66,0.28);
          border-radius: 4px; padding: 30px 30px 28px;
        }
        .lib-card .dev-title { font-family: var(--deva); font-size: 26px; color: var(--copper); }
        .lib-card h3 { font-family: var(--display); font-weight: 400; font-size: 25px; margin-top: 4px; }
        .lib-card .meta { font-family: var(--mono); font-size: 11.5px; letter-spacing: 0.08em; color: var(--ink-soft); margin-top: 8px; }
        .lib-card .essence { margin-top: 16px; font-size: 19px; }
        .verse { margin-top: 20px; padding: 16px 20px; border-left: 2px solid var(--copper); background: rgba(176,101,58,0.07); }
        .verse .sa { font-style: italic; font-weight: 500; color: #7A4526; font-size: 18px; }
        .verse .en { margin-top: 8px; font-size: 18px; color: var(--ink); }
        .verse .ref { font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-soft); display: block; margin-top: 10px; }
        .context-note {
          margin-top: 18px; padding: 14px 18px; border: 1px dashed rgba(107,90,66,0.5); border-radius: 3px;
          font-size: 16.5px; color: var(--ink-soft);
        }
        .context-note strong { color: var(--copper); font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; display: block; margin-bottom: 6px; }
        .src-list { display: grid; gap: 16px; }
        .src-row {
          display: flex; justify-content: space-between; align-items: baseline; gap: 20px;
          border-bottom: 1px solid rgba(107,90,66,0.3); padding: 18px 6px;
        }
        .src-row .l h3 { font-family: var(--display); font-weight: 400; font-size: 23px; }
        .src-row .l .org { font-family: var(--mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-soft); margin-top: 4px; }
        .src-row .l p { color: var(--ink-soft); margin-top: 8px; font-size: 17.5px; max-width: 58ch; }
        .src-row a.go { font-family: var(--mono); font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--copper); white-space: nowrap; }
        @media (max-width: 640px) { .src-row { flex-direction: column; } }
        .lib-disclaimer { margin-top: 36px; font-size: 16.5px; color: var(--ink-soft); font-style: italic; max-width: 70ch; }

        /* ---------- footer ---------- */
        .footer { padding: 90px 24px 60px; text-align: center; }
        .footer .om-close { font-family: var(--deva); color: var(--ember); font-size: 30px; }
        .footer p { color: var(--ash); max-width: 58ch; margin: 18px auto 0; font-size: 17.5px; }
        .footer .fine { font-family: var(--mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; margin-top: 34px; color: rgba(154,149,175,0.6); }
      `}</style>

      {/* ------------------------------ nav ------------------------- */}
      <nav className="nav">
        <div className="nav-brand">
          <span className="om-mark">ॐ</span> SANĀTANA
        </div>
        <div className="nav-links">
          <a href="#reading">The Way of Reading</a>
          <a href="#ask">Ask the Guide</a>
          <a href="#library">The Library</a>
          <a href="#sources" onClick={() => setTab("sources")}>
            Sources
          </a>
        </div>
      </nav>

      {/* ------------------------------ hero ------------------------ */}
      <header className="hero">
        <div className="hero-canvas" ref={mountRef} aria-hidden="true" />
        <div className="hero-veil" />
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="om deva">नासदीय सूक्त</span> · Ṛg Veda 10.129
          </span>
          <h1>Before being and non-being, there was the question.</h1>
          <p className="sub">
            A guide that carries the essence of the Vedas — and knows the
            difference between what is eternal and what was written for its
            time.
          </p>
          <div className="hero-ctas">
            <a className="btn" href="#ask">
              Ask the guide
            </a>
            <a className="btn ghost" href="#library">
              Read the sources
            </a>
          </div>
        </div>
        <div className="hero-scroll">scroll ↓</div>
      </header>

      {/* --------------------------- reading method ----------------- */}
      <section className="section" id="reading">
        <div className="shell">
          <div className="section-head">
            <span className="eyebrow">The method</span>
            <h2>How this guide reads five thousand years of text</h2>
            <p className="lede">
              The tradition itself gives us the tools. Not everything in the
              corpus makes the same kind of claim — and the texts say so.
            </p>
          </div>

          <div className="method">
            <div className="method-card">
              <span className="step deva">॥ १ ॥</span>
              <h3>Hear what is eternal</h3>
              <span className="gloss">śruti — that which was heard</span>
              <p>
                The Vedas and Upaniṣads speak of consciousness, dharma, and the
                Self — claims meant to hold in any century. This is the layer
                the guide treats as principle.
              </p>
            </div>
            <div className="method-card">
              <span className="step deva">॥ २ ॥</span>
              <h3>Place what was written for its time</h3>
              <span className="gloss">smṛti — that which is remembered</span>
              <p>
                The Gītā, epics, Purāṇas, and law codes like the Manusmṛti
                applied those principles to ancient societies. Manu 1.85 admits
                it: dharma differs by age. When smṛti conflicts with śruti,
                the tradition's own rule is that śruti prevails.
              </p>
            </div>
            <div className="method-card">
              <span className="step deva">॥ ३ ॥</span>
              <h3>Carry the essence forward</h3>
              <span className="gloss">deśa · kāla · pātra</span>
              <p>
                Place, time, person. A rule was calibrated to its
                circumstance; the principle beneath it travels. The guide keeps
                the question a text was answering, not the answer frozen in its
                era.
              </p>
            </div>
          </div>

          <div className="method-note">
            The seers wrote in story and symbol so a farmer and a philosopher
            could carry the same truth at different depths.{" "}
            <em>To read literally is to read less, not more.</em>
          </div>
        </div>
      </section>

      <div className="rule" aria-hidden="true">
        <span>॥ ॐ ॥</span>
      </div>

      {/* ------------------------------ chat ------------------------ */}
      <section className="section" id="ask">
        <div className="shell" style={{ maxWidth: 820 }}>
          <div className="section-head" style={{ textAlign: "center" }}>
            <span className="eyebrow">The guide</span>
            <h2>Ask anything. Get the essence, not the dogma.</h2>
            <p className="lede" style={{ margin: "14px auto 0" }}>
              Everyday questions welcome — work, anger, grief, purpose. The
              guide answers from the texts, cites its sources, and tells you
              when a rule belonged to another age.
            </p>
          </div>

          <div className="chat-frame">
            <div className="chat-log">
              {messages.length === 0 && !loading && (
                <div className="chat-empty">
                  <span className="om-big">ॐ</span>
                  Begin with whatever is actually on your mind.
                  <br />
                  The guide will meet you there.
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`msg ${m.role === "user" ? "user" : "guide"}`}>
                  <div className="msg-bubble">
                    <span className="msg-label">
                      {m.role === "user" ? "You" : "Sanātana"}
                    </span>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="chat-wait">
                  <span className="pulse" /> consulting the texts…
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            {error && <div className="chat-error">{error}</div>}
            <div className="provider-row">
              <span className="provider-label">Guide's voice</span>
              {[
                { id: "anthropic", label: "Claude" },
                { id: "openai", label: "OpenAI" },
              ].map((p) => (
                <button
                  key={p.id}
                  className={`provider-btn ${provider === p.id ? "active" : ""}`}
                  onClick={() => setProvider(p.id)}
                  disabled={loading}
                  aria-pressed={provider === p.id}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="chat-input">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask the guide — e.g. how do I stop worrying about results?"
                aria-label="Your question for the guide"
                rows={2}
              />
              <button
                className="btn"
                onClick={() => send()}
                disabled={loading || !input.trim()}
                style={{ alignSelf: "flex-end", opacity: loading || !input.trim() ? 0.5 : 1 }}
              >
                Ask
              </button>
            </div>
          </div>

          <div className="chips">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chip" onClick={() => send(s)} disabled={loading}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------- library ----------------------- */}
      <section className="section library" id="library">
        <div className="shell">
          <div className="section-head">
            <span className="eyebrow">The library</span>
            <h2>The sources, laid open</h2>
            <p className="lede">
              A curated map of the corpus — what each text is, when it arose,
              and one verse that carries its heart. Complete canonical texts
              are linked under Complete Texts.
            </p>
          </div>

          <div className="lib-tabs" role="tablist" id="sources">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`lib-tab ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                <span className="t">· {t.tag}</span>
              </button>
            ))}
          </div>

          {tab !== "sources" && (
            <div className="lib-grid">
              {LIBRARY[tab].map((item) => (
                <article className="lib-card" key={item.name}>
                  <div className="dev-title deva">{item.dev}</div>
                  <h3>{item.name}</h3>
                  <div className="meta">{item.meta}</div>
                  <p className="essence">{item.essence}</p>
                  <div className="verse">
                    <div className="sa">{item.sa}</div>
                    <div className="en">{item.en}</div>
                    <span className="ref">{item.ref}</span>
                  </div>
                  {item.context && (
                    <div className="context-note">
                      <strong>Reading in time</strong>
                      {item.context}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          {tab === "sources" && (
            <div className="src-list">
              {LIBRARY.sources.map((s) => (
                <div className="src-row" key={s.name}>
                  <div className="l">
                    <h3>{s.name}</h3>
                    <div className="org">{s.org}</div>
                    <p>{s.desc}</p>
                  </div>
                  <a className="go" href={s.url} target="_blank" rel="noreferrer">
                    Open archive →
                  </a>
                </div>
              ))}
            </div>
          )}

          <p className="lib-disclaimer">
            Renderings above are plain-language glosses meant to open a door,
            not settle a scholarly question. Dates are approximate and debated;
            the tradition is older than any manuscript of it.
          </p>
        </div>
      </section>

      {/* ---------------------------- footer ------------------------ */}
      <footer className="footer">
        <div className="om-close">॥ ॐ शान्तिः शान्तिः शान्तिः ॥</div>
        <p>
          Sanātana interprets; it does not pronounce. Schools of Vedānta
          disagree with one another, scholars dispute dates and readings, and
          the guide will tell you when they do. Where the texts say the same
          Self dwells in all beings, that is where this guide stands.
        </p>
        <div className="fine">śruti · smṛti · viveka — built with three.js & Claude</div>
      </footer>
    </div>
  );
}
