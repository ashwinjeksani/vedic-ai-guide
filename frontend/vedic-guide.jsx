import React, { useState, useRef, useEffect } from "react";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  The agent's mind now lives on the SERVER (server/prompt.js, and    */
/*  the dev proxy in vite.config.js). The browser sends only           */
/*  { provider, lang, messages } — any client-supplied system prompt   */
/*  is ignored by the backend. This is the core prompt-injection fix.  */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Library data — curated essence with fresh, original renderings     */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  i18n — UI localization (English, Hindi, Telugu, Chinese)          */
/*  Sanskrit verses & Devanagari titles are primary sources: not      */
/*  translated. The guide's chat answers are localized at request     */
/*  time by the SERVER, which appends the language instruction.        */
/* ------------------------------------------------------------------ */


const LANGUAGES = [
  { id: "en", label: "English", native: "English" },
  { id: "hi", label: "Hindi", native: "हिन्दी" },
  { id: "te", label: "Telugu", native: "తెలుగు" },
  { id: "zh", label: "Chinese", native: "中文" },
];

// The reply-language instruction is appended to the system prompt on the
// SERVER (server/prompt.js); the frontend just sends the `lang` id.

// The label the UI uses to detect and style the guide's "In practice" block,
// per language. The splitter checks all of these plus the literal "In practice:".
const IN_PRACTICE_LABELS = {
  en: "In practice",
  hi: "व्यवहार में",
  te: "ఆచరణలో",
  zh: "实践中",
};

const STRINGS = {
  en: {
    // nav
    nav_reading: "The Way of Reading",
    nav_ask: "Ask the Guide",
    nav_library: "The Library",
    nav_sources: "Sources",
    lang_label: "Language",

    // hero
    hero_eyebrow_ref: "Ṛg Veda 10.129",
    hero_title: "Before being and non-being, there was the question.",
    hero_sub:
      "A guide that carries the essence of the Vedas — and knows the difference between what is eternal and what was written for its time.",
    hero_cta_ask: "Ask the guide",
    hero_cta_read: "Read the sources",
    hero_scroll: "scroll ↓",

    // method
    method_eyebrow: "The method",
    method_title: "How this guide reads five thousand years of text",
    method_lede:
      "The tradition itself gives us the tools. Not everything in the corpus makes the same kind of claim — and the texts say so.",
    method1_h: "Hear what is eternal",
    method1_gloss: "śruti — that which was heard",
    method1_p:
      "The Vedas and Upaniṣads speak of consciousness, dharma, and the Self — claims meant to hold in any century. This is the layer the guide treats as principle.",
    method1_eg:
      "Gravity was true before anyone named it. \"You are not your thoughts\" is that kind of claim — a description of how things are, not a rule of any era.",
    method2_h: "Place what was written for its time",
    method2_gloss: "smṛti — that which is remembered",
    method2_p:
      "The Gītā, epics, Purāṇas, and law codes like the Manusmṛti applied those principles to ancient societies. Manu 1.85 admits it: dharma differs by age. When smṛti conflicts with śruti, the tradition's own rule is that śruti prevails.",
    method2_eg:
      "Think of a company handbook from 1975 — sincere, binding in its day, absurd for judging remote work. Keep its concern for fairness; retire its clauses.",
    method3_h: "Carry the essence forward",
    method3_gloss: "deśa · kāla · pātra",
    method3_p:
      "Place, time, person. A rule was calibrated to its circumstance; the principle beneath it travels. The guide keeps the question a text was answering, not the answer frozen in its era.",
    method3_eg:
      "\"Don't overload the bullock cart\" becomes \"don't overload the truck.\" The vehicle changed; the care behind the rule didn't.",
    method_note_pre:
      "The seers wrote in story and symbol so a farmer and a philosopher could carry the same truth at different depths. ",
    method_note_em: "To read literally is to read less, not more.",

    // ask
    ask_eyebrow: "The guide",
    ask_title: "Ask anything. Get the essence, not the dogma.",
    ask_lede:
      "Everyday questions welcome — work, anger, grief, purpose. The guide answers from the texts, cites its sources, closes with a real-world example, and tells you when a rule belonged to another age.",
    launcher_p:
      "The guide floats with you now. Open it from the glowing bindu in the corner and it stays at your side while you scroll and read — drag it anywhere on the screen.",
    launcher_open: "Open the guide",

    // dock
    dock_voice: "Voice",
    dock_minimize: "Minimize",
    dock_empty_1: "Begin with whatever is actually on your mind.",
    dock_empty_2: "The guide will meet you there.",
    dock_placeholder: "Ask the guide…",
    dock_send: "Ask",
    dock_consulting: "consulting the texts…",
    dock_error: "The guide could not be reached. Ask again in a moment.",
    label_you: "You",

    // auth
    auth_gate_title: "Register to ask",
    auth_gate_p:
      "Sanātana uses a passkey — your device's fingerprint, face, or PIN. No password to remember.",
    auth_username: "Choose a name",
    auth_register: "Create passkey",
    auth_have: "Already registered?",
    auth_login: "Sign in",
    auth_signin_title: "Sign in",
    auth_signin_p: "Use your passkey to continue.",
    auth_need_account: "Need an account?",
    auth_signout: "Sign out",
    guest_label: "Guest",
    auth_signin_optional: "Sign in / Register",
    auth_pending_note:
      "You're asking as a guest — up to 10 questions a day. Register a passkey and get allowlisted for unlimited access.",
    auth_limit_title: "You've reached today's free questions",
    auth_limit_p:
      "Guests get 10 questions a day. Register a passkey and ask the admin for unlimited access.",
    auth_admin_hello: "You are the admin.",
    auth_working: "Working…",
    auth_err_generic: "Something went wrong. Try again.",
    auth_err_taken: "That name is taken. Pick another.",

    // admin
    admin_title: "Allowlist",
    admin_refresh: "Refresh",
    admin_col_user: "User",
    admin_col_status: "Status",
    admin_col_used: "Used",
    admin_col_action: "Action",
    admin_approve: "Allowlist",
    admin_revoke: "Revoke",
    admin_status_pending: "pending",
    admin_status_allowlisted: "allowlisted",
    admin_empty: "No users yet.",

    // library
    lib_eyebrow: "The library",
    lib_title: "The sources, laid open",
    lib_lede:
      "A curated map of the corpus — what each text is, when it arose, and one verse that carries its heart. Complete canonical texts are linked under Complete Texts.",
    lib_tab_vedas: "The Four Vedas",
    lib_tab_upanishads: "Upaniṣads",
    lib_tab_upavedas: "Upavedas & Vedāṅgas",
    lib_tab_smriti: "Smṛti Texts",
    lib_tab_sources: "Complete Texts",
    lib_reading_in_time: "Reading in time",
    lib_open_archive: "Open archive →",
    lib_disclaimer:
      "Renderings above are plain-language glosses meant to open a door, not settle a scholarly question. Dates are approximate and debated; the tradition is older than any manuscript of it.",

    // footer
    footer_p:
      "Sanātana interprets; it does not pronounce. Schools of Vedānta disagree with one another, scholars dispute dates and readings, and the guide will tell you when they do. Where the texts say the same Self dwells in all beings, that is where this guide stands.",
    footer_fine: "śruti · smṛti · viveka — built with three.js & Claude",
  },

  hi: {
    nav_reading: "पढ़ने की विधि",
    nav_ask: "मार्गदर्शक से पूछें",
    nav_library: "ग्रंथालय",
    nav_sources: "स्रोत",
    lang_label: "भाषा",

    hero_eyebrow_ref: "ऋग्वेद १०.१२९",
    hero_title: "सत् और असत् से पहले, केवल प्रश्न था।",
    hero_sub:
      "एक मार्गदर्शक जो वेदों का सार धारण करता है — और जानता है कि क्या शाश्वत है और क्या अपने युग के लिए लिखा गया था।",
    hero_cta_ask: "मार्गदर्शक से पूछें",
    hero_cta_read: "स्रोत पढ़ें",
    hero_scroll: "नीचे जाएँ ↓",

    method_eyebrow: "विधि",
    method_title: "यह मार्गदर्शक पाँच हज़ार वर्षों के ग्रंथों को कैसे पढ़ता है",
    method_lede:
      "परंपरा स्वयं हमें साधन देती है। समस्त ग्रंथ एक ही प्रकार का दावा नहीं करते — और ग्रंथ स्वयं यह कहते हैं।",
    method1_h: "जो शाश्वत है उसे सुनें",
    method1_gloss: "श्रुति — जो सुनी गई",
    method1_p:
      "वेद और उपनिषद् चेतना, धर्म और आत्मा की बात करते हैं — ऐसे सत्य जो किसी भी युग में टिकते हैं। यही वह परत है जिसे मार्गदर्शक सिद्धांत मानता है।",
    method1_eg:
      "गुरुत्वाकर्षण नाम मिलने से पहले भी सत्य था। \"आप अपने विचार नहीं हैं\" — यह उसी प्रकार का कथन है, किसी युग का नियम नहीं, बल्कि यथार्थ का वर्णन।",
    method2_h: "जो अपने युग के लिए लिखा गया उसे उसके स्थान पर रखें",
    method2_gloss: "स्मृति — जो स्मरण की गई",
    method2_p:
      "गीता, महाकाव्य, पुराण और मनुस्मृति जैसे धर्मशास्त्र उन सिद्धांतों को प्राचीन समाज पर लागू करते हैं। मनु १.८५ स्वयं स्वीकार करता है: धर्म युग के अनुसार बदलता है। जब स्मृति श्रुति से टकराती है, तो परंपरा का अपना नियम है कि श्रुति ही प्रबल होती है।",
    method2_eg:
      "१९७५ की किसी कंपनी की नियमावली सोचिए — अपने समय में सच्ची और बाध्यकारी, पर आज के रिमोट कार्य को आँकने के लिए बेतुकी। उसकी निष्पक्षता की भावना रखें; उसके नियम छोड़ दें।",
    method3_h: "सार को आगे ले जाएँ",
    method3_gloss: "देश · काल · पात्र",
    method3_p:
      "स्थान, समय, व्यक्ति। कोई नियम अपनी परिस्थिति के अनुरूप बना था; उसके नीचे का सिद्धांत यात्रा करता है। मार्गदर्शक उस प्रश्न को रखता है जिसका उत्तर ग्रंथ दे रहा था, न कि उस युग में जमे उत्तर को।",
    method3_eg:
      "\"बैलगाड़ी पर अधिक भार मत लादो\" अब \"ट्रक पर अधिक भार मत लादो\" बन जाता है। वाहन बदला; नियम के पीछे की सावधानी नहीं।",
    method_note_pre:
      "ऋषियों ने कथा और प्रतीक में लिखा ताकि किसान और दार्शनिक दोनों एक ही सत्य को अलग-अलग गहराई से धारण कर सकें। ",
    method_note_em: "शब्दशः पढ़ना कम पढ़ना है, अधिक नहीं।",

    ask_eyebrow: "मार्गदर्शक",
    ask_title: "कुछ भी पूछें। सार पाएँ, हठधर्म नहीं।",
    ask_lede:
      "रोज़मर्रा के प्रश्न स्वागत हैं — कार्य, क्रोध, शोक, उद्देश्य। मार्गदर्शक ग्रंथों से उत्तर देता है, स्रोत बताता है, एक वास्तविक उदाहरण से समाप्त करता है, और बताता है कि कब कोई नियम किसी और युग का था।",
    launcher_p:
      "मार्गदर्शक अब आपके साथ तैरता है। कोने में चमकते बिंदु से इसे खोलें और यह पढ़ते-स्क्रॉल करते समय आपके साथ रहता है — इसे स्क्रीन पर कहीं भी खींचें।",
    launcher_open: "मार्गदर्शक खोलें",

    dock_voice: "स्वर",
    dock_minimize: "छोटा करें",
    dock_empty_1: "जो सचमुच आपके मन में है, उसी से आरंभ करें।",
    dock_empty_2: "मार्गदर्शक वहीं आपसे मिलेगा।",
    dock_placeholder: "मार्गदर्शक से पूछें…",
    dock_send: "पूछें",
    dock_consulting: "ग्रंथों से परामर्श…",
    dock_error: "मार्गदर्शक तक नहीं पहुँच सके। क्षण भर में पुनः पूछें।",
    label_you: "आप",

    auth_gate_title: "पूछने के लिए पंजीकरण करें",
    auth_gate_p:
      "सनातन पासकी का उपयोग करता है — आपके उपकरण की अँगुली-छाप, चेहरा या पिन। कोई पासवर्ड याद रखने की आवश्यकता नहीं।",
    auth_username: "एक नाम चुनें",
    auth_register: "पासकी बनाएँ",
    auth_have: "पहले से पंजीकृत हैं?",
    auth_login: "साइन इन करें",
    auth_signin_title: "साइन इन",
    auth_signin_p: "जारी रखने के लिए अपनी पासकी का उपयोग करें।",
    auth_need_account: "खाता चाहिए?",
    auth_signout: "साइन आउट",
    guest_label: "अतिथि",
    auth_signin_optional: "साइन इन / रजिस्टर",
    auth_pending_note:
      "व्यवस्थापक की स्वीकृति तक आपकी पहुँच सीमित है। आप अभी एक प्रश्न पूछ सकते हैं।",
    auth_limit_title: "आपने अपना निःशुल्क प्रश्न उपयोग कर लिया",
    auth_limit_p:
      "पूर्ण पहुँच के लिए व्यवस्थापक से अनुमति-सूची में जोड़ने को कहें।",
    auth_admin_hello: "आप व्यवस्थापक हैं।",
    auth_working: "कार्य हो रहा है…",
    auth_err_generic: "कुछ गड़बड़ हुई। पुनः प्रयास करें।",
    auth_err_taken: "यह नाम पहले से लिया गया है। दूसरा चुनें।",

    admin_title: "अनुमति-सूची",
    admin_refresh: "ताज़ा करें",
    admin_col_user: "उपयोगकर्ता",
    admin_col_status: "स्थिति",
    admin_col_used: "उपयोग",
    admin_col_action: "क्रिया",
    admin_approve: "अनुमति दें",
    admin_revoke: "रद्द करें",
    admin_status_pending: "प्रतीक्षारत",
    admin_status_allowlisted: "अनुमत",
    admin_empty: "अभी कोई उपयोगकर्ता नहीं।",

    lib_eyebrow: "ग्रंथालय",
    lib_title: "स्रोत, खुले हुए",
    lib_lede:
      "समग्र का एक चयनित मानचित्र — प्रत्येक ग्रंथ क्या है, कब रचा गया, और एक श्लोक जो उसका हृदय धारण करता है। पूर्ण प्रामाणिक ग्रंथ 'पूर्ण ग्रंथ' के अंतर्गत जुड़े हैं।",
    lib_tab_vedas: "चार वेद",
    lib_tab_upanishads: "उपनिषद्",
    lib_tab_upavedas: "उपवेद और वेदांग",
    lib_tab_smriti: "स्मृति ग्रंथ",
    lib_tab_sources: "पूर्ण ग्रंथ",
    lib_reading_in_time: "समय में पढ़ना",
    lib_open_archive: "संग्रह खोलें →",
    lib_disclaimer:
      "ऊपर के अनुवाद सरल भाषा की व्याख्याएँ हैं जो द्वार खोलती हैं, किसी विद्वत्तापूर्ण प्रश्न का निर्णय नहीं करतीं। तिथियाँ अनुमानित और विवादित हैं; परंपरा अपनी किसी भी पांडुलिपि से पुरानी है।",

    footer_p:
      "सनातन व्याख्या करता है; घोषणा नहीं करता। वेदांत के विभिन्न सम्प्रदाय आपस में असहमत हैं, विद्वान तिथियों और पाठों पर विवाद करते हैं, और मार्गदर्शक आपको बताएगा कि कब। जहाँ ग्रंथ कहते हैं कि वही एक आत्मा सभी प्राणियों में वास करती है, वहीं यह मार्गदर्शक खड़ा है।",
    footer_fine: "श्रुति · स्मृति · विवेक — three.js और Claude से निर्मित",
  },

  te: {
    nav_reading: "చదివే విధానం",
    nav_ask: "మార్గదర్శిని అడగండి",
    nav_library: "గ్రంథాలయం",
    nav_sources: "మూలాలు",
    lang_label: "భాష",

    hero_eyebrow_ref: "ఋగ్వేదం ౧౦.౧౨౯",
    hero_title: "ఉనికి, అనునికికి ముందు — కేవలం ప్రశ్న ఉండేది.",
    hero_sub:
      "వేదాల సారాన్ని మోసే మార్గదర్శిని — శాశ్వతమైనది ఏది, తన కాలానికి రాయబడినది ఏది అనే తేడాను ఎరిగినది.",
    hero_cta_ask: "మార్గదర్శినిని అడగండి",
    hero_cta_read: "మూలాలను చదవండి",
    hero_scroll: "క్రిందికి ↓",

    method_eyebrow: "విధానం",
    method_title: "ఈ మార్గదర్శిని ఐదు వేల సంవత్సరాల గ్రంథాలను ఎలా చదువుతుంది",
    method_lede:
      "సంప్రదాయమే మనకు సాధనాలను ఇస్తుంది. సమస్త గ్రంథాలు ఒకే రకమైన వాదనను చేయవు — ఆ విషయాన్ని గ్రంథాలే చెబుతాయి.",
    method1_h: "శాశ్వతమైనదాన్ని వినండి",
    method1_gloss: "శ్రుతి — వినబడినది",
    method1_p:
      "వేదాలు, ఉపనిషత్తులు చైతన్యం, ధర్మం, ఆత్మ గురించి మాట్లాడతాయి — ఏ శతాబ్దంలోనైనా నిలిచే సత్యాలు. మార్గదర్శిని దీన్ని సూత్రంగా భావిస్తుంది.",
    method1_eg:
      "గురుత్వాకర్షణ పేరు పెట్టకముందే నిజం. \"మీరు మీ ఆలోచనలు కారు\" — అది అలాంటి కథనమే; ఏ యుగపు నియమం కాదు, యథార్థపు వర్ణన.",
    method2_h: "తన కాలానికి రాసినదాన్ని దాని స్థానంలో ఉంచండి",
    method2_gloss: "స్మృతి — స్మరించబడినది",
    method2_p:
      "గీత, ఇతిహాసాలు, పురాణాలు, మనుస్మృతి వంటి ధర్మశాస్త్రాలు ఆ సూత్రాలను ప్రాచీన సమాజాలకు వర్తింపజేశాయి. మను ౧.౮౫ స్వయంగా అంగీకరిస్తుంది: ధర్మం యుగానుసారం మారుతుంది. స్మృతి శ్రుతితో విభేదిస్తే, శ్రుతియే గెలుస్తుందన్నది సంప్రదాయపు నియమం.",
    method2_eg:
      "౧౯౭౫ నాటి కంపెనీ నియమావళిని ఊహించండి — ఆ కాలంలో నిజాయితీగా, బద్ధంగా ఉండేది, కానీ నేటి రిమోట్ పనిని అంచనా వేయడానికి అసంబద్ధం. దాని న్యాయబుద్ధిని ఉంచండి; నిబంధనలను వదిలేయండి.",
    method3_h: "సారాన్ని ముందుకు తీసుకెళ్లండి",
    method3_gloss: "దేశ · కాల · పాత్ర",
    method3_p:
      "స్థలం, కాలం, వ్యక్తి. ఒక నియమం దాని పరిస్థితికి తగినట్టు రూపొందింది; దాని కింది సూత్రం ప్రయాణిస్తుంది. గ్రంథం సమాధానమిస్తున్న ప్రశ్నను మార్గదర్శిని ఉంచుతుంది, ఆ యుగంలో గడ్డకట్టిన సమాధానాన్ని కాదు.",
    method3_eg:
      "\"ఎద్దుబండిపై ఎక్కువ భారం వేయకు\" అనేది \"ట్రక్కుపై ఎక్కువ భారం వేయకు\" అవుతుంది. వాహనం మారింది; నియమం వెనుకటి శ్రద్ధ మారలేదు.",
    method_note_pre:
      "రైతు, తత్త్వవేత్త ఇద్దరూ ఒకే సత్యాన్ని వేర్వేరు లోతుల్లో మోయగలిగేలా ఋషులు కథ, ప్రతీకల్లో రాశారు. ",
    method_note_em: "అక్షరాలా చదవడం తక్కువ చదవడమే, ఎక్కువ కాదు.",

    ask_eyebrow: "మార్గదర్శిని",
    ask_title: "ఏదైనా అడగండి. సారాన్ని పొందండి, మతాంధతను కాదు.",
    ask_lede:
      "నిత్య జీవితపు ప్రశ్నలకు స్వాగతం — పని, కోపం, దుఃఖం, ఉద్దేశ్యం. మార్గదర్శిని గ్రంథాల నుండి సమాధానమిస్తుంది, మూలాలను చూపుతుంది, వాస్తవ ఉదాహరణతో ముగిస్తుంది, ఒక నియమం మరో యుగానికి చెందినప్పుడు చెబుతుంది.",
    launcher_p:
      "మార్గదర్శిని ఇప్పుడు మీతో తేలుతుంది. మూలలో మెరిసే బిందువు నుండి తెరవండి — మీరు చదువుతూ స్క్రోల్ చేస్తున్నప్పుడు అది మీ పక్కనే ఉంటుంది. తెరపై ఎక్కడికైనా లాగండి.",
    launcher_open: "మార్గదర్శినిని తెరవండి",

    dock_voice: "స్వరం",
    dock_minimize: "చిన్నదిగా",
    dock_empty_1: "మీ మనసులో నిజంగా ఉన్నదానితో ప్రారంభించండి.",
    dock_empty_2: "మార్గదర్శిని అక్కడే మిమ్మల్ని కలుస్తుంది.",
    dock_placeholder: "మార్గదర్శినిని అడగండి…",
    dock_send: "అడుగు",
    dock_consulting: "గ్రంథాలను సంప్రదిస్తోంది…",
    dock_error: "మార్గదర్శినిని చేరలేకపోయాం. క్షణంలో మళ్లీ అడగండి.",
    label_you: "మీరు",

    auth_gate_title: "అడగడానికి నమోదు చేసుకోండి",
    auth_gate_p:
      "సనాతన పాస్‌కీని వాడుతుంది — మీ పరికరపు వేలిముద్ర, ముఖం లేదా పిన్. గుర్తుంచుకోవలసిన పాస్‌వర్డ్ లేదు.",
    auth_username: "ఒక పేరు ఎంచుకోండి",
    auth_register: "పాస్‌కీ సృష్టించండి",
    auth_have: "ఇప్పటికే నమోదయ్యారా?",
    auth_login: "సైన్ ఇన్",
    auth_signin_title: "సైన్ ఇన్",
    auth_signin_p: "కొనసాగించడానికి మీ పాస్‌కీని వాడండి.",
    auth_need_account: "ఖాతా కావాలా?",
    auth_signout: "సైన్ అవుట్",
    guest_label: "అతిథి",
    auth_signin_optional: "సైన్ ఇన్ / నమోదు",
    auth_pending_note:
      "నిర్వాహకుడు ఆమోదించే వరకు మీ ప్రవేశం పరిమితం. ఇప్పుడు మీరు ఒక ప్రశ్న అడగవచ్చు.",
    auth_limit_title: "మీ ఉచిత ప్రశ్నను వాడేశారు",
    auth_limit_p:
      "పూర్తి ప్రవేశం కోసం అనుమతి-జాబితాలో చేర్చమని నిర్వాహకుడిని అడగండి.",
    auth_admin_hello: "మీరు నిర్వాహకులు.",
    auth_working: "జరుగుతోంది…",
    auth_err_generic: "ఏదో తప్పు జరిగింది. మళ్లీ ప్రయత్నించండి.",
    auth_err_taken: "ఆ పేరు తీసుకోబడింది. వేరొకటి ఎంచుకోండి.",

    admin_title: "అనుమతి-జాబితా",
    admin_refresh: "రిఫ్రెష్",
    admin_col_user: "వినియోగదారు",
    admin_col_status: "స్థితి",
    admin_col_used: "వాడకం",
    admin_col_action: "చర్య",
    admin_approve: "అనుమతించు",
    admin_revoke: "ఉపసంహరించు",
    admin_status_pending: "వేచి ఉంది",
    admin_status_allowlisted: "అనుమతించబడింది",
    admin_empty: "ఇంకా వినియోగదారులు లేరు.",

    lib_eyebrow: "గ్రంథాలయం",
    lib_title: "మూలాలు, తెరిచి ఉంచబడ్డాయి",
    lib_lede:
      "సమగ్రపు ఒక ఎంపిక చేసిన పటం — ప్రతి గ్రంథం ఏమిటి, ఎప్పుడు పుట్టింది, దాని హృదయాన్ని మోసే ఒక శ్లోకం. పూర్తి ప్రామాణిక గ్రంథాలు 'పూర్తి గ్రంథాల' కింద అనుసంధానించబడ్డాయి.",
    lib_tab_vedas: "నాలుగు వేదాలు",
    lib_tab_upanishads: "ఉపనిషత్తులు",
    lib_tab_upavedas: "ఉపవేదాలు & వేదాంగాలు",
    lib_tab_smriti: "స్మృతి గ్రంథాలు",
    lib_tab_sources: "పూర్తి గ్రంథాలు",
    lib_reading_in_time: "కాలంలో చదవడం",
    lib_open_archive: "సంగ్రహం తెరవండి →",
    lib_disclaimer:
      "పైన ఇచ్చిన అనువాదాలు ద్వారం తెరిచే సరళ భాషా వివరణలు, ఏ పండిత ప్రశ్నను తేల్చేవి కావు. తేదీలు అంచనావే, వివాదాస్పదమే; సంప్రదాయం దాని ఏ ప్రతి కంటేనైనా పురాతనమైనది.",

    footer_p:
      "సనాతన వ్యాఖ్యానిస్తుంది; ప్రకటించదు. వేదాంత సంప్రదాయాలు ఒకదానితో ఒకటి విభేదిస్తాయి, పండితులు తేదీలు, పాఠాలపై వాదిస్తారు, ఎప్పుడు అలా జరిగిందో మార్గదర్శిని చెబుతుంది. అదే ఒక్క ఆత్మ సకల ప్రాణుల్లో వసిస్తుందని గ్రంథాలు చెప్పే చోటే ఈ మార్గదర్శిని నిలుస్తుంది.",
    footer_fine: "శ్రుతి · స్మృతి · వివేక — three.js మరియు Claudeతో నిర్మించబడింది",
  },

  zh: {
    nav_reading: "解读之道",
    nav_ask: "向导师提问",
    nav_library: "典籍库",
    nav_sources: "来源",
    lang_label: "语言",

    hero_eyebrow_ref: "《梨俱吠陀》10.129",
    hero_title: "在有与无之前，唯有那个问题。",
    hero_sub:
      "一位承载吠陀精髓的向导——并且懂得区分何为永恒、何为为其时代而写。",
    hero_cta_ask: "向导师提问",
    hero_cta_read: "阅读来源",
    hero_scroll: "向下滚动 ↓",

    method_eyebrow: "方法",
    method_title: "这位向导如何解读五千年的典籍",
    method_lede:
      "传统本身给了我们工具。整部典籍并非都作出同一种主张——典籍自己也这样说。",
    method1_h: "聆听永恒者",
    method1_gloss: "śruti（天启）——所听闻者",
    method1_p:
      "吠陀与奥义书谈论意识、法与自我——这些主张意在任何世纪都成立。向导把这一层视为原则。",
    method1_eg:
      "重力在被命名之前就是真的。“你不是你的念头”正是这类主张——是对实相的描述，而非某个时代的规则。",
    method2_h: "把为其时代而写者放回原位",
    method2_gloss: "smṛti（圣传）——所忆念者",
    method2_p:
      "《薄伽梵歌》、史诗、往世书，以及《摩奴法论》一类法典，把那些原则应用于古代社会。摩奴1.85自己承认：法随时代而异。当圣传与天启冲突时，传统自身的规则是天启为准。",
    method2_eg:
      "想象一本1975年的公司手册——在当时真诚而有约束力，用来评判远程办公却荒谬。保留它对公平的关切，废弃它的条款。",
    method3_h: "把精髓传承下去",
    method3_gloss: "deśa · kāla · pātra（地·时·人）",
    method3_p:
      "地点、时间、人。规则是为其处境而定的；其下的原则却能流传。向导保留典籍所回答的问题，而非冻结在那个时代的答案。",
    method3_eg:
      "“不要给牛车超载”变成“不要给卡车超载”。载具变了，规则背后的用心没变。",
    method_note_pre:
      "先知们以故事与象征书写，好让农夫与哲人都能在各自的深度承载同一真理。",
    method_note_em: "照字面读，是读得更少，而非更多。",

    ask_eyebrow: "向导",
    ask_title: "尽管发问。求其精髓，而非教条。",
    ask_lede:
      "欢迎日常问题——工作、愤怒、悲伤、意义。向导从典籍作答，标注来源，以一个现实例子收尾，并会告诉你某条规则何时属于另一个时代。",
    launcher_p:
      "向导现在与你同行。从角落里发光的明点打开它，你滚动阅读时它始终在侧——可拖到屏幕任意处。",
    launcher_open: "打开向导",

    dock_voice: "声音",
    dock_minimize: "最小化",
    dock_empty_1: "从你心中真正挂念的事开始。",
    dock_empty_2: "向导会在那里与你相会。",
    dock_placeholder: "向导师提问……",
    dock_send: "提问",
    dock_consulting: "正在查阅典籍……",
    dock_error: "无法连接向导。请稍后再问。",
    label_you: "你",

    auth_gate_title: "注册后提问",
    auth_gate_p:
      "Sanātana 使用通行密钥——你设备的指纹、面容或 PIN。无需记忆密码。",
    auth_username: "取一个名字",
    auth_register: "创建通行密钥",
    auth_have: "已经注册？",
    auth_login: "登录",
    auth_signin_title: "登录",
    auth_signin_p: "使用你的通行密钥继续。",
    auth_need_account: "需要账户？",
    auth_signout: "登出",
    guest_label: "访客",
    auth_signin_optional: "登录 / 注册",
    auth_pending_note:
      "在管理员批准之前，你的访问受限。现在可以提一个问题。",
    auth_limit_title: "你已用完免费提问",
    auth_limit_p: "请管理员把你加入允许名单以获得完整访问。",
    auth_admin_hello: "你是管理员。",
    auth_working: "处理中……",
    auth_err_generic: "出错了，请重试。",
    auth_err_taken: "该名字已被占用，请另选。",

    admin_title: "允许名单",
    admin_refresh: "刷新",
    admin_col_user: "用户",
    admin_col_status: "状态",
    admin_col_used: "已用",
    admin_col_action: "操作",
    admin_approve: "加入名单",
    admin_revoke: "撤销",
    admin_status_pending: "待批",
    admin_status_allowlisted: "已允许",
    admin_empty: "暂无用户。",

    lib_eyebrow: "典籍库",
    lib_title: "摊开的来源",
    lib_lede:
      "一份经过甄选的典籍地图——每部典籍是什么、何时出现，以及承载其核心的一节经文。完整的经典原文列于“完整原文”下。",
    lib_tab_vedas: "四吠陀",
    lib_tab_upanishads: "奥义书",
    lib_tab_upavedas: "副吠陀与吠陀支",
    lib_tab_smriti: "圣传典籍",
    lib_tab_sources: "完整原文",
    lib_reading_in_time: "置于时代中读",
    lib_open_archive: "打开档案 →",
    lib_disclaimer:
      "以上译述是为开一扇门的通俗释义，并非裁定学术争议。年代为约数且有争议；传统比它的任何一部抄本都更古老。",

    footer_p:
      "Sanātana 只作诠释，不作裁断。吠檀多各派彼此不合，学者们对年代与读法争论不休，向导会告诉你何处如此。典籍说同一自我居于万物之中——这位向导正立于此处。",
    footer_fine: "śruti · smṛti · viveka — 由 three.js 与 Claude 构建",
  },
};

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

/* The applied Vedas (Upavedas) and the six limbs (Vedāṅgas) — the branches of
   knowledge that grew from the Vedic root but face the practical world. */
LIBRARY.upavedas = [
  {
    dev: "आयुर्वेदः",
    name: "Āyurveda",
    meta: "Upaveda of the Ṛg (or Atharva) Veda · the science of life",
    essence:
      "Health as balance, not conquest. The body read as a field of forces to be kept in harmony, long before the word 'holistic' existed.",
    sa: "āyur asmin vidyate anena vā āyur vindatīti āyurvedaḥ",
    en: "That by which life is known, or by which life is attained — this is Āyurveda: the knowledge of living, not merely of curing.",
    ref: "Caraka Saṁhitā, Sūtrasthāna",
    context:
      "An applied science, empirical and evolving. Read it as the ancestor of a living medical tradition, not a fixed prescription — its wisdom is the orientation toward balance, not every remedy in it.",
  },
  {
    dev: "धनुर्वेदः",
    name: "Dhanurveda",
    meta: "Upaveda of the Yajur Veda · the discipline of the warrior",
    essence:
      "The martial arts as inner training. Aim, breath, and restraint — the bow as a teacher of steadiness under pressure.",
    sa: "dhanur-vede ca niṣṇātaḥ",
    en: "Skilled in the science of the bow — where the true target is the wavering mind, and mastery means acting without agitation.",
    ref: "Dhanurveda tradition (Agni Purāṇa 249–252)",
    context:
      "A martial manual of its era. Take the discipline — focus, control, the ethics of when not to loose the arrow — rather than the literal weaponcraft.",
  },
  {
    dev: "गान्धर्ववेदः",
    name: "Gāndharvaveda",
    meta: "Upaveda of the Sāma Veda · music, dance, and aesthetics",
    essence:
      "Sound as a path. The arts treated not as decoration but as a way to refine attention and touch the transcendent.",
    sa: "nāda-brahma",
    en: "Sound itself as the absolute — the tradition that hears in music a discipline of the spirit, not only a pleasure of the ear.",
    ref: "Gāndharvaveda; later, the Nāṭyaśāstra",
    context:
      "The aesthetic sciences. Their claim — that beauty and attention can be cultivated like any other skill — travels intact into any age.",
  },
  {
    dev: "स्थापत्यवेदः",
    name: "Sthāpatyaveda",
    meta: "Upaveda of the Atharva Veda · architecture & the ordered world",
    essence:
      "Building as alignment. Space arranged so that the outer structure mirrors an inner order — the root of Vāstu and temple design.",
    sa: "yathā piṇḍe tathā brahmāṇḍe",
    en: "As in the individual form, so in the cosmos — the principle that a well-made space echoes the order of the whole.",
    ref: "Sthāpatyaveda; Arthaśāstra for statecraft",
    context:
      "Ancient design and civic science. The enduring idea is that environments shape minds; the specific rules were tuned to their materials and climate.",
  },
  {
    dev: "षड्वेदाङ्गानि",
    name: "The Six Vedāṅgas",
    meta: "The 'limbs of the Veda' · the tools that preserve and unlock it",
    essence:
      "Six auxiliary sciences that keep the Vedas legible: Śikṣā (phonetics), Chandas (metre), Vyākaraṇa (grammar), Nirukta (etymology), Jyotiṣa (astronomy/time), Kalpa (ritual procedure).",
    sa: "chandaḥ pādau tu vedasya hastau kalpo 'tha paṭhyate",
    en: "Metre is the feet of the Veda, ritual its hands, grammar its face — the limbs by which the body of knowledge stands and moves.",
    ref: "Pāṇinīya Śikṣā 41–42",
    context:
      "Method, not doctrine. These are the engineering behind the tradition — how a purely oral corpus was transmitted for millennia without drift. Grammar and phonetics here are among the most rigorous ever devised.",
  },
  {
    dev: "आगमाः · तन्त्राणि",
    name: "Āgamas & Tantras",
    meta: "Sectarian scripture · Śaiva, Vaiṣṇava, Śākta streams",
    essence:
      "The practical theologies of temple, mantra, and ritual worship — how devotion was actually structured and lived, alongside the philosophical corpus.",
    sa: "āgataṁ śiva-vaktrebhyaḥ",
    en: "That which has come down — the revealed manuals of worship, deity, and practice that shaped lived religion as much as the Vedas shaped thought.",
    ref: "Āgama tradition (Śaiva, Pāñcarātra, Śākta)",
    context:
      "Distinct revelation streams, sometimes in tension with Vedic orthodoxy. Read them as the architecture of devotional practice; their ritual detail is bound to sect and setting, their contemplative core is broadly shared.",
  },
];
// Real-world prompts, localized per language. Access as SUGGESTIONS[lang].
const SUGGESTIONS = {
  en: [
    "I'm burning out at work and can't switch off.",
    "At my age, I feel like a burden to my family.",
    "I carry guilt over things I can't undo — how do I let go?",
    "Am I failing my kids by working this much?",
    "My children have their own lives and I feel alone.",
    "I'm older now and full of regret. Is it too late to change?",
    "I'm afraid of dying. What do the texts say about death?",
    "How do I parent without trying to control everything?",
    "In old age, how do I find purpose when my role is gone?",
    "Is it wrong to put my family before honesty at work?",
    "How do I decide when both right choices hurt someone?",
    "I compare myself to everyone and never feel enough.",
  ],
  hi: [
    "काम के बोझ से थक चुका हूँ, मन शांत ही नहीं होता।",
    "इस उम्र में लगता है कि मैं परिवार पर बोझ हूँ।",
    "जो हो चुका उसे बदल नहीं सकता — यह अपराधबोध कैसे छोड़ूँ?",
    "इतना काम करके क्या मैं अपने बच्चों के साथ अन्याय कर रहा हूँ?",
    "बच्चे अपनी दुनिया में व्यस्त हैं और मैं अकेला महसूस करता हूँ।",
    "अब उम्र हो चली, बहुत पछतावा है। क्या बदलने में देर हो गई?",
    "मुझे मृत्यु का भय है। ग्रंथ मृत्यु के बारे में क्या कहते हैं?",
    "बच्चों पर नियंत्रण किए बिना उनका पालन कैसे करूँ?",
    "बुढ़ापे में, जब भूमिका ही न रही, तो जीवन का अर्थ कैसे पाऊँ?",
    "क्या सच्चाई से पहले परिवार को रखना ग़लत है?",
    "जब दोनों सही रास्ते किसी को दुख दें, तो कैसे चुनूँ?",
    "मैं हर किसी से अपनी तुलना करता हूँ और कभी संतुष्ट नहीं होता।",
  ],
  te: [
    "పనితో అలసిపోయాను, మనసు నిమ్మళించడమే లేదు.",
    "ఈ వయసులో నా కుటుంబానికి భారంగా అనిపిస్తోంది.",
    "జరిగిపోయినది మార్చలేను — ఈ అపరాధభావాన్ని ఎలా వదిలించుకోవాలి?",
    "ఇంత పని చేస్తూ నా పిల్లలకు అన్యాయం చేస్తున్నానా?",
    "పిల్లలు వాళ్ల జీవితాల్లో మునిగిపోయారు, నేను ఒంటరిగా అనిపిస్తోంది.",
    "వయసు మీద పడింది, చాలా పశ్చాత్తాపం. మారడానికి ఆలస్యమైందా?",
    "నాకు మరణ భయం ఉంది. మరణం గురించి గ్రంథాలు ఏమి చెబుతాయి?",
    "పిల్లలను అదుపు చేయకుండా ఎలా పెంచాలి?",
    "వృద్ధాప్యంలో, పాత్రే లేనప్పుడు జీవితానికి అర్థం ఎలా వెతకాలి?",
    "నిజాయితీ కంటే కుటుంబాన్ని ముందు ఉంచడం తప్పా?",
    "రెండు సరైన దారులూ ఎవరినో బాధపెడితే ఎలా నిర్ణయించుకోవాలి?",
    "అందరితో పోల్చుకుంటూ నేనెప్పుడూ సరిపోనని అనిపిస్తుంది.",
  ],
  zh: [
    "工作让我精疲力尽，怎么也放松不下来。",
    "到了这个年纪，我觉得自己成了家人的负担。",
    "有些事无法挽回，我该如何放下愧疚？",
    "这样拼命工作，是不是亏欠了孩子？",
    "孩子们都有自己的生活，我感到很孤单。",
    "我年纪大了，满是悔恨。现在改变还来得及吗？",
    "我害怕死亡。典籍是如何看待死亡的？",
    "如何不事事掌控地养育孩子？",
    "年老了，角色不再，我该如何找到人生的意义？",
    "把家庭放在诚实之前，是错的吗？",
    "当两个正确的选择都会伤到人，我该如何抉择？",
    "我总和别人比较，永远觉得自己不够好。",
  ],
};


/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * The guide ends answers, where applicable, with a paragraph beginning
 * "In practice:" (or its translated label). Split it out so the UI can
 * render the real-world example as its own highlighted block. We match
 * the English label plus each localized label from IN_PRACTICE_LABELS.
 */
function splitExample(text) {
  const labels = ["In practice", ...Object.values(IN_PRACTICE_LABELS)];
  const alt = labels
    .map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const re = new RegExp("(^|\\n)\\s*(?:" + alt + ")\\s*[:：]", "i");
  const m = text.match(re);
  if (!m || m.index == null) return { body: text, example: null };
  const body = text.slice(0, m.index).trim();
  const example = text
    .slice(m.index)
    .replace(new RegExp("^\\s*(?:" + alt + ")\\s*[:：]\\s*", "i"), "")
    .trim();
  if (!body || !example) return { body: text, example: null };
  return { body, example };
}

/* ------------------------------------------------------------------ */
/*  Auth — passkey (WebAuthn) client calls to the backend             */
/*  These talk to the routes in server/index.js. The browser needs    */
/*  @simplewebauthn/browser installed in the frontend project.        */
/* ------------------------------------------------------------------ */

async function postJSON(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || data.message || "request_failed");
    err.code = data.error;
    throw err;
  }
  return data;
}

// Lazy-load the WebAuthn browser helpers so the library UI still renders
// even if the package isn't present (e.g. static preview without a backend).
async function webauthn() {
  const mod = await import("@simplewebauthn/browser");
  return mod;
}

async function apiRegister(username) {
  const options = await postJSON("/api/auth/register/options", { username });
  const { startRegistration } = await webauthn();
  const attResp = await startRegistration({ optionsJSON: options });
  return postJSON("/api/auth/register/verify", { username, attResp });
}

async function apiLogin(username) {
  const options = await postJSON("/api/auth/login/options", { username });
  const { startAuthentication } = await webauthn();
  const authResp = await startAuthentication({ optionsJSON: options });
  return postJSON("/api/auth/login/verify", { username, authResp });
}

async function apiMe() {
  const res = await fetch("/api/auth/me", { credentials: "same-origin" });
  if (!res.ok) return null;
  return (await res.json()).user;
}

async function apiLogout() {
  return postJSON("/api/auth/logout");
}

async function apiAdminList() {
  const res = await fetch("/api/admin/users", { credentials: "same-origin" });
  if (!res.ok) throw new Error("admin_only");
  return (await res.json()).users;
}

async function apiAdminSetStatus(userId, status) {
  return postJSON("/api/admin/set-status", { userId, status });
}

/* ------------------------------------------------------------------ */
/*  Language chooser — a click-to-open dropdown (not a flat button row) */
/* ------------------------------------------------------------------ */

function LangSelect({ lang, setLang, label, className = "", up = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LANGUAGES.find((l) => l.id === lang) || LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span className={`lang-select ${up ? "up" : ""} ${className}`} ref={ref}>
      {label && <span className="lang-label">{label}</span>}
      <button
        type="button"
        className="lang-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={current.label}
      >
        <span className="lang-current">{current.native}</span>
        <span className="lang-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="lang-menu" role="listbox">
          {LANGUAGES.map((l) => (
            <li key={l.id} role="option" aria-selected={lang === l.id}>
              <button
                type="button"
                className={`lang-option ${lang === l.id ? "active" : ""}`}
                onClick={() => {
                  setLang(l.id);
                  setOpen(false);
                }}
              >
                <span className="lang-native">{l.native}</span>
                <span className="lang-en">{l.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}

export default function SanatanaGuide() {
  const mountRef = useRef(null);
  const chatEndRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const dockOpenRef = useRef(false);
  const dragRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("vedas");
  const [dockOpen, setDockOpen] = useState(false);
  const [unread, setUnread] = useState(false);

  // i18n + auth + admin state
  const [lang, setLang] = useState("en");
  const [user, setUser] = useState(null); // null = signed out
  const [authMode, setAuthMode] = useState("register"); // 'register' | 'login'
  const [authName, setAuthName] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authNote, setAuthNote] = useState(null);
  const [limitReached, setLimitReached] = useState(false);
  const [limitMsg, setLimitMsg] = useState(null);
  const [showAuth, setShowAuth] = useState(false); // auth panel is opt-in now
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
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

  /* ---------------- floating dock behaviour ------------------------ */

  // Mirror dockOpen into a ref so async replies know if the panel is closed.
  useEffect(() => {
    dockOpenRef.current = dockOpen;
  }, [dockOpen]);

  // Focus the composer whenever the dock opens.
  useEffect(() => {
    if (dockOpen && inputRef.current) inputRef.current.focus();
  }, [dockOpen]);

  // Esc closes the dock.
  useEffect(() => {
    if (!dockOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setDockOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dockOpen]);

  // If the viewport shrinks to the mobile sheet, drop any dragged position.
  useEffect(() => {
    const onR = () => {
      const p = panelRef.current;
      if (!p) return;
      if (window.innerWidth < 720) {
        p.style.left = "";
        p.style.top = "";
        p.style.right = "";
        p.style.bottom = "";
      }
    };
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  // Drag the panel by its header (desktop only). position:fixed keeps it
  // pinned to the viewport, so it stays with you as the page scrolls.
  const startDrag = (e) => {
    if (window.innerWidth < 720) return;
    if (e.target.closest("button")) return;
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };

    const move = (ev) => {
      const s = dragRef.current;
      if (!s) return;
      const w = panel.offsetWidth;
      const h = panel.offsetHeight;
      const x = Math.min(Math.max(8, ev.clientX - s.dx), window.innerWidth - w - 8);
      const y = Math.min(Math.max(8, ev.clientY - s.dy), window.innerHeight - h - 8);
      panel.style.left = x + "px";
      panel.style.top = y + "px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const openDock = () => {
    setDockOpen(true);
    setUnread(false);
  };

  /* ---------------- chat ------------------------------------------- */
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, loading, dockOpen]);


  /* ---------------- i18n helper ------------------------------------ */
  const t = (key) => (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;

  /* ---------------- auth ------------------------------------------- */

  // Check for an existing session on mount.
  useEffect(() => {
    let alive = true;
    apiMe()
      .then((u) => {
        if (alive) setUser(u);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const doRegister = async () => {
    const name = authName.trim();
    if (!name || authBusy) return;
    setAuthBusy(true);
    setAuthError(null);
    setAuthNote(null);
    try {
      const r = await apiRegister(name);
      setUser(r.user);
      setLimitReached(false);
      setShowAuth(false);
      if (r.note) setAuthNote(r.note);
    } catch (e) {
      setAuthError(e.code === "conflict" || /taken/i.test(e.message) ? t("auth_err_taken") : t("auth_err_generic"));
    } finally {
      setAuthBusy(false);
    }
  };

  const doLogin = async () => {
    const name = authName.trim();
    if (!name || authBusy) return;
    setAuthBusy(true);
    setAuthError(null);
    setAuthNote(null);
    try {
      const r = await apiLogin(name);
      setUser(r.user);
      setLimitReached(false);
      setShowAuth(false);
    } catch (e) {
      setAuthError(t("auth_err_generic"));
    } finally {
      setAuthBusy(false);
    }
  };

  const doLogout = async () => {
    try {
      await apiLogout();
    } catch (e) {
      /* ignore */
    }
    setUser(null);
    setShowAdmin(false);
    setAdminUsers([]);
    setLimitReached(false);
  };

  /* ---------------- admin ------------------------------------------ */
  const loadAdmin = async () => {
    try {
      const rows = await apiAdminList();
      setAdminUsers(rows);
    } catch (e) {
      /* not admin or unavailable */
    }
  };

  const openAdmin = () => {
    setShowAdmin(true);
    loadAdmin();
  };

  const setStatus = async (userId, status) => {
    try {
      await apiAdminSetStatus(userId, status);
      loadAdmin();
    } catch (e) {
      /* ignore */
    }
  };

  /* ---------------- chat ------------------------------------------- */
  const send = async (preset) => {
    const content = (preset != null ? preset : input).trim();
    if (!content || loading) return;

    // Guests can ask too (rate-limited on the server). Don't send if the
    // daily limit was already hit and the user isn't allowlisted.
    if (limitReached && user?.status !== "allowlisted") {
      openDock();
      return;
    }

    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      // The server owns the system prompt, model, and token limits — the
      // browser sends only the conversation, the provider, and the language.
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          provider: "anthropic",
          lang,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.status === 401) {
        // Session expired — drop to guest state and let them keep asking.
        setUser(null);
        setLoading(false);
        return;
      }
      if (res.status === 403) {
        // Daily limit hit; show the request-access state with the server note.
        const info = await res.json().catch(() => ({}));
        setLimitMsg(info.message || null);
        setLimitReached(true);
        setLoading(false);
        return;
      }

      const data = await res.json();
      const reply = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      if (!reply) throw new Error("empty response");
      setMessages([...next, { role: "assistant", content: reply }]);
      if (!dockOpenRef.current) setUnread(true);
    } catch (e) {
      setError(t("dock_error"));
    } finally {
      setLoading(false);
    }
  };

  // Ask from anywhere on the page: open the dock and send in one gesture.
  const askFromPage = (question) => {
    openDock();
    send(question);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const tabs = [
    { id: "vedas", label: t("lib_tab_vedas"), tag: "śruti" },
    { id: "upanishads", label: t("lib_tab_upanishads"), tag: "śruti" },
    { id: "upavedas", label: t("lib_tab_upavedas"), tag: "aṅga" },
    { id: "smriti", label: t("lib_tab_smriti"), tag: "smṛti" },
    { id: "sources", label: t("lib_tab_sources"), tag: "links" },
  ];

  const renderGuideMessage = (content) => {
    const { body, example } = splitExample(content);
    return (
      <React.Fragment>
        {body}
        {example && (
          <div className="msg-example">
            <strong>{IN_PRACTICE_LABELS[lang] || "In practice"}</strong>
            {example}
          </div>
        )}
      </React.Fragment>
    );
  };

  const allowlisted = user?.status === "allowlisted";
  const atLimit = limitReached && !allowlisted;

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
        .nav-links { display: flex; gap: 28px; align-items: center; }
        .nav-links a, .nav-links button.nav-ask {
          font-family: var(--mono); font-size: 12px; letter-spacing: 0.16em;
          text-transform: uppercase; color: var(--ash);
          background: transparent; border: none;
        }
        .nav-links a:hover, .nav-links button.nav-ask:hover { color: var(--ember); text-decoration: none; }
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
        .sana .btn.small { padding: 10px 16px; font-size: 12px; }
        .sana .btn:disabled { opacity: 0.5; cursor: default; transform: none; }
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
          padding: 30px 28px 32px; display: flex; flex-direction: column;
        }
        .method-card .step {
          font-family: var(--deva); color: var(--copper); font-size: 17px; letter-spacing: 0.05em;
        }
        .method-card h3 {
          font-family: var(--display); font-weight: 400; font-size: 24px; margin: 14px 0 6px;
        }
        .method-card .gloss { font-family: var(--mono); font-size: 11.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ember); }
        .method-card p { color: var(--ash); margin-top: 14px; font-size: 18px; }
        .method-eg {
          margin-top: 18px; padding-top: 16px; border-top: 1px dashed var(--line);
          font-size: 16.5px; color: #CFC9E0; font-style: italic;
        }
        .method-eg strong {
          display: block; font-style: normal; font-family: var(--mono);
          font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase;
          color: var(--copper); margin-bottom: 6px;
        }
        .method-note {
          margin-top: 40px; padding: 30px 34px; border-left: 2px solid var(--ember);
          background: linear-gradient(90deg, var(--ember-soft), transparent 70%);
          font-size: 21px; font-style: italic; max-width: 62ch;
        }
        .method-note em { color: var(--ember); font-style: italic; }

        /* ---------- ask section (launcher) ---------- */
        .launcher {
          text-align: center; background: var(--raised); border: 1px solid var(--line);
          border-radius: 6px; padding: 48px 30px 42px;
          box-shadow: 0 30px 80px rgba(0,0,0,0.45);
        }
        .launcher .om-big {
          font-family: var(--deva); font-size: 46px; color: var(--ember);
          display: block; margin-bottom: 14px;
        }
        .launcher p { color: var(--ash); max-width: 48ch; margin: 0 auto 24px; }
        .chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 26px; justify-content: center; }
        .chip {
          font-family: var(--mono); font-size: 12.5px; letter-spacing: 0.02em;
          color: var(--ash); background: transparent; border: 1px solid rgba(154,149,175,0.35);
          border-radius: 100px; padding: 9px 16px; transition: all 0.15s ease;
        }
        .chip:hover { border-color: var(--ember); color: var(--ember); }

        /* ---------- shared chat pieces ---------- */
        .chat-empty { text-align: center; color: var(--ash); padding: 26px 10px 30px; font-size: 17px; }
        .chat-empty .om-big { font-family: var(--deva); font-size: 38px; color: var(--ember); opacity: 0.9; display: block; margin-bottom: 12px; }
        .msg { margin-bottom: 20px; display: flex; }
        .msg.user { justify-content: flex-end; }
        .msg-bubble { max-width: 88%; padding: 13px 16px; border-radius: 4px; white-space: pre-wrap; font-size: 17px; }
        .msg.user .msg-bubble { background: var(--ember-soft); border: 1px solid rgba(232,163,61,0.3); }
        .msg.guide .msg-bubble { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); }
        .msg-label { font-family: var(--mono); font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--copper); display: block; margin-bottom: 8px; }
        .msg-example {
          margin-top: 14px; padding: 12px 14px; border-left: 2px solid var(--ember);
          background: var(--ember-soft); border-radius: 0 3px 3px 0; font-size: 16.5px;
        }
        .msg-example strong {
          display: block; font-family: var(--mono); font-weight: 500;
          font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--ember); margin-bottom: 6px;
        }
        .chat-wait { display: flex; align-items: center; gap: 12px; color: var(--ash); font-style: italic; padding: 0 0 20px; font-size: 17px; }
        .chat-wait .pulse {
          width: 10px; height: 10px; border-radius: 50%; background: var(--ember);
          animation: sanaPulse 1.6s ease-in-out infinite;
        }
        @keyframes sanaPulse { 0%,100% { transform: scale(0.7); opacity: 0.5; } 50% { transform: scale(1.15); opacity: 1; } }
        .chat-error { color: #E88A6A; padding: 0 16px 12px; font-size: 16px; }

        /* ---------- floating guide dock ---------- */
        .dock {
          position: fixed; right: 22px; bottom: 22px; z-index: 90;
          width: min(420px, calc(100vw - 24px));
          max-height: min(640px, calc(100vh - 44px));
          display: none; flex-direction: column;
          background: rgba(17,14,32,0.94);
          backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
          border: 1px solid var(--line); border-radius: 10px; overflow: hidden;
          box-shadow: 0 24px 70px rgba(0,0,0,0.6), 0 0 0 1px rgba(232,163,61,0.06);
        }
        .dock.open { display: flex; animation: dockIn 0.22s ease; }
        @keyframes dockIn { from { transform: translateY(14px); opacity: 0; } to { transform: none; opacity: 1; } }
        .dock-head {
          display: flex; align-items: center; gap: 10px; padding: 12px 14px;
          border-bottom: 1px solid var(--line); background: rgba(11,10,20,0.55);
          cursor: grab; user-select: none; touch-action: none;
        }
        .dock-head:active { cursor: grabbing; }
        .dock-title {
          flex: 1; display: flex; align-items: center; gap: 9px;
          font-family: var(--display); font-size: 16px; letter-spacing: 0.1em;
        }
        .dock-title .om-mark { font-family: var(--deva); color: var(--ember); font-size: 19px; line-height: 1; }
        .dock-min {
          background: transparent; border: none; color: var(--ash);
          font-size: 18px; line-height: 1; padding: 4px 9px; border-radius: 4px;
        }
        .dock-min:hover { color: var(--ember); background: var(--ember-soft); }
        .dock-log { flex: 1; overflow-y: auto; padding: 18px 16px 4px; min-height: 180px; }
        .dock-log::-webkit-scrollbar { width: 8px; }
        .dock-log::-webkit-scrollbar-thumb { background: rgba(232,163,61,0.25); border-radius: 4px; }
        .dock-chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 16px 14px; }
        .dock-chips .chip { font-size: 11.5px; padding: 7px 13px; }
        .dock-input {
          display: flex; gap: 8px; border-top: 1px solid var(--line);
          padding: 10px; background: rgba(11,10,20,0.5);
        }
        .dock-input textarea {
          flex: 1; resize: none; background: transparent; border: none; color: #EDE9F5;
          font-family: var(--body); font-size: 17px; line-height: 1.45;
          min-height: 44px; max-height: 120px; padding: 10px;
        }
        .dock-input textarea::placeholder { color: rgba(154,149,175,0.7); }
        .dock-input textarea:focus { outline: none; }
        .dock-input .btn { align-self: flex-end; }
        @media (max-width: 720px) {
          .dock {
            right: 0; left: 0; bottom: 0; width: 100%;
            max-height: 78vh; border-radius: 14px 14px 0 0;
            border-left: none; border-right: none; border-bottom: none;
          }
          .dock-head { cursor: default; }
        }

        /* ---------- floating action button ---------- */
        .fab {
          position: fixed; right: 22px; bottom: 22px; z-index: 89;
          width: 62px; height: 62px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: radial-gradient(circle at 32% 30%, #F2B657, var(--ember) 60%, #C9812A);
          border: 1px solid rgba(255,238,204,0.5); color: #1A1206;
          font-family: var(--deva); font-size: 28px; line-height: 1;
          box-shadow: 0 10px 32px rgba(232,163,61,0.3), 0 4px 14px rgba(0,0,0,0.5);
          transition: transform 0.15s ease;
          animation: fabBreath 7s ease-in-out infinite;
        }
        .fab:hover { transform: scale(1.07); }
        .fab.hidden { display: none; }
        @keyframes fabBreath {
          0%, 100% { box-shadow: 0 10px 32px rgba(232,163,61,0.22), 0 4px 14px rgba(0,0,0,0.5); }
          50% { box-shadow: 0 10px 44px rgba(232,163,61,0.5), 0 4px 14px rgba(0,0,0,0.5); }
        }
        .fab-dot {
          position: absolute; top: 3px; right: 3px; width: 13px; height: 13px;
          border-radius: 50%; background: #E85D4A; border: 2px solid var(--night);
        }
        @media (max-width: 720px) { .fab { right: 16px; bottom: 16px; } }

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

        /* ---------- language switcher (click-to-open dropdown) ---------- */
        .lang-select { position: relative; display: inline-flex; align-items: center; gap: 6px; }
        .lang-select .lang-label {
          font-family: var(--mono); font-size: 10px; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--ash);
        }
        .lang-trigger {
          display: inline-flex; align-items: center; gap: 6px;
          background: transparent; border: 1px solid var(--line); color: var(--manuscript);
          border-radius: 999px; padding: 5px 12px; font-size: 13px;
          font-family: var(--deva); transition: all 0.18s;
        }
        .lang-trigger:hover { border-color: var(--ember); color: var(--manuscript); }
        .lang-select .lang-caret { font-family: var(--body); font-size: 10px; color: var(--ash); transition: transform 0.18s; }
        .lang-trigger[aria-expanded="true"] { border-color: var(--ember); color: var(--ember); }
        .lang-trigger[aria-expanded="true"] .lang-caret { transform: rotate(180deg); color: var(--ember); }
        .lang-menu {
          position: absolute; top: calc(100% + 6px); right: 0; z-index: 120;
          min-width: 168px; margin: 0; padding: 6px; list-style: none;
          background: rgba(17,14,32,0.98); border: 1px solid var(--line);
          border-radius: 10px; box-shadow: 0 18px 50px rgba(0,0,0,0.55);
          backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
          animation: langIn 0.16s ease;
        }
        .lang-select.up .lang-menu { top: auto; bottom: calc(100% + 6px); }
        @keyframes langIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
        .lang-option {
          display: flex; align-items: baseline; gap: 10px; width: 100%;
          background: transparent; border: none; color: var(--manuscript);
          border-radius: 7px; padding: 8px 10px; text-align: left; transition: background 0.15s;
        }
        .lang-option:hover { background: rgba(232,163,61,0.10); }
        .lang-option.active { background: var(--ember-soft); color: var(--ember); }
        .lang-option .lang-native { font-family: var(--deva); font-size: 15px; }
        .lang-option .lang-en { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ash); margin-left: auto; }
        @media (max-width: 720px) {
          .nav-lang-desktop { display: none; }
        }
        .dock-lang { display: flex; padding: 10px 16px 0; }
        .dock-lang .lang-menu { right: auto; left: 0; }

        /* ---------- auth gate ---------- */
        .auth {
          position: relative;
          padding: 22px 20px; text-align: center;
          border-bottom: 1px solid var(--line); background: rgba(11,10,20,0.35);
        }
        .auth-close {
          position: absolute; top: 8px; right: 10px;
          background: transparent; border: none; color: var(--ash);
          font-size: 22px; line-height: 1; cursor: pointer; padding: 2px 6px;
        }
        .auth-close:hover { color: var(--ember); }
        .auth .om-big { font-family: var(--deva); font-size: 40px; color: var(--ember); display: block; margin-bottom: 12px; }
        .auth h3 { font-family: var(--display); font-weight: 400; font-size: 22px; margin-bottom: 10px; }
        .auth p { color: var(--ash); font-size: 15.5px; max-width: 34ch; margin: 0 auto 18px; line-height: 1.5; }
        .auth-field {
          width: 100%; background: rgba(11,10,20,0.5); border: 1px solid var(--line);
          color: #EDE9F5; font-family: var(--body); font-size: 17px;
          border-radius: 4px; padding: 12px 14px; margin-bottom: 12px;
        }
        .auth-field::placeholder { color: rgba(154,149,175,0.7); }
        .auth-field:focus { outline: none; border-color: var(--ember); }
        .auth .btn { width: 100%; text-align: center; }
        .auth-switch {
          margin-top: 16px; font-size: 14px; color: var(--ash);
        }
        .auth-switch button {
          background: transparent; border: none; color: var(--ember);
          font: inherit; text-decoration: underline; text-underline-offset: 3px; cursor: pointer;
        }
        .auth-error { color: #E88A6A; font-size: 14.5px; margin-bottom: 12px; }
        .auth-note { color: var(--ember); font-size: 14.5px; margin-top: 12px; }

        /* signed-in identity row inside the dock header area */
        .dock-id {
          display: flex; align-items: center; gap: 8px; padding: 8px 16px;
          border-bottom: 1px solid var(--line); font-size: 13px; color: var(--ash);
        }
        .dock-id .who { flex: 1; }
        .dock-id .who b { color: var(--manuscript); font-weight: 500; }
        .dock-id .who.guest { font-style: italic; color: var(--ash); }
        .limit-box .btn { margin-top: 16px; }
        .dock-id .tag-admin {
          font-family: var(--mono); font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--ember); border: 1px solid var(--ember); border-radius: 999px; padding: 2px 7px;
        }
        .dock-id button {
          background: transparent; border: none; color: var(--ash);
          font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
          cursor: pointer;
        }
        .dock-id button:hover { color: var(--ember); }

        /* limit-reached state */
        .limit-box { text-align: center; padding: 26px 20px; }
        .limit-box h3 { font-family: var(--display); font-weight: 400; font-size: 21px; color: var(--ember); margin-bottom: 10px; }
        .limit-box p { color: var(--ash); font-size: 15.5px; max-width: 34ch; margin: 0 auto; line-height: 1.5; }

        /* ---------- admin panel ---------- */
        .admin {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(11,10,20,0.82); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .admin-card {
          width: min(680px, 100%); max-height: 82vh; overflow-y: auto;
          background: var(--raised); border: 1px solid var(--line); border-radius: 10px;
          padding: 26px 26px 22px; box-shadow: 0 30px 80px rgba(0,0,0,0.6);
        }
        .admin-head { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
        .admin-head h3 { font-family: var(--display); font-weight: 400; font-size: 24px; flex: 1; }
        .admin-table { width: 100%; border-collapse: collapse; font-size: 15px; }
        .admin-table th {
          text-align: left; font-family: var(--mono); font-size: 10px; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--ash); padding: 8px 10px; border-bottom: 1px solid var(--line);
        }
        .admin-table td { padding: 10px; border-bottom: 1px solid rgba(232,163,61,0.08); color: #EDE9F5; }
        .admin-table td .uname { font-weight: 500; }
        .status-pill {
          font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
          padding: 3px 9px; border-radius: 999px; border: 1px solid var(--line);
        }
        .status-pill.allowlisted { color: var(--ember); border-color: var(--ember); background: var(--ember-soft); }
        .status-pill.pending { color: var(--ash); }
        .admin-empty { color: var(--ash); font-style: italic; padding: 20px 0; text-align: center; }
      `}</style>

      {/* ------------------------------ nav ------------------------- */}
      <nav className="nav">
        <div className="nav-brand">
          <span className="om-mark">ॐ</span> SANĀTANA
        </div>
        <div className="nav-links">
          <a href="#reading">{t("nav_reading")}</a>
          <button className="nav-ask" onClick={openDock}>
            {t("nav_ask")}
          </button>
          <a href="#library">{t("nav_library")}</a>
          <a href="#sources" onClick={() => setTab("sources")}>
            {t("nav_sources")}
          </a>
          <LangSelect
            lang={lang}
            setLang={setLang}
            label={t("lang_label")}
            className="nav-lang-desktop"
          />
        </div>
      </nav>

      {/* ------------------------------ hero ------------------------ */}
      <header className="hero">
        <div className="hero-canvas" ref={mountRef} aria-hidden="true" />
        <div className="hero-veil" />
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="om deva">नासदीय सूक्त</span> · {t("hero_eyebrow_ref")}
          </span>
          <h1>{t("hero_title")}</h1>
          <p className="sub">{t("hero_sub")}</p>
          <div className="hero-ctas">
            <button className="btn" onClick={openDock}>
              {t("hero_cta_ask")}
            </button>
            <a className="btn ghost" href="#library">
              {t("hero_cta_read")}
            </a>
          </div>
        </div>
        <div className="hero-scroll">{t("hero_scroll")}</div>
      </header>

      {/* --------------------------- reading method ----------------- */}
      <section className="section" id="reading">
        <div className="shell">
          <div className="section-head">
            <span className="eyebrow">{t("method_eyebrow")}</span>
            <h2>{t("method_title")}</h2>
            <p className="lede">{t("method_lede")}</p>
          </div>

          <div className="method">
            <div className="method-card">
              <span className="step deva">॥ १ ॥</span>
              <h3>{t("method1_h")}</h3>
              <span className="gloss">{t("method1_gloss")}</span>
              <p>{t("method1_p")}</p>
              <div className="method-eg">
                <strong>{IN_PRACTICE_LABELS[lang] || "In practice"}</strong>
                {t("method1_eg")}
              </div>
            </div>
            <div className="method-card">
              <span className="step deva">॥ २ ॥</span>
              <h3>{t("method2_h")}</h3>
              <span className="gloss">{t("method2_gloss")}</span>
              <p>{t("method2_p")}</p>
              <div className="method-eg">
                <strong>{IN_PRACTICE_LABELS[lang] || "In practice"}</strong>
                {t("method2_eg")}
              </div>
            </div>
            <div className="method-card">
              <span className="step deva">॥ ३ ॥</span>
              <h3>{t("method3_h")}</h3>
              <span className="gloss">{t("method3_gloss")}</span>
              <p>{t("method3_p")}</p>
              <div className="method-eg">
                <strong>{IN_PRACTICE_LABELS[lang] || "In practice"}</strong>
                {t("method3_eg")}
              </div>
            </div>
          </div>

          <div className="method-note">
            {t("method_note_pre")}
            <em>{t("method_note_em")}</em>
          </div>
        </div>
      </section>

      <div className="rule" aria-hidden="true">
        <span>॥ ॐ ॥</span>
      </div>

      {/* --------------------- ask section (launcher) ---------------- */}
      <section className="section" id="ask">
        <div className="shell" style={{ maxWidth: 820 }}>
          <div className="section-head" style={{ textAlign: "center" }}>
            <span className="eyebrow">{t("ask_eyebrow")}</span>
            <h2>{t("ask_title")}</h2>
            <p className="lede" style={{ margin: "14px auto 0" }}>
              {t("ask_lede")}
            </p>
          </div>

          <div className="launcher">
            <span className="om-big" aria-hidden="true">
              ॐ
            </span>
            <p>{t("launcher_p")}</p>
            <button className="btn" onClick={openDock}>
              {t("launcher_open")}
            </button>
            <div className="chips">
              {(SUGGESTIONS[lang] || SUGGESTIONS.en).map((s) => (
                <button
                  key={s}
                  className="chip"
                  onClick={() => askFromPage(s)}
                  disabled={loading}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------- library ----------------------- */}
      <section className="section library" id="library">
        <div className="shell">
          <div className="section-head">
            <span className="eyebrow">{t("lib_eyebrow")}</span>
            <h2>{t("lib_title")}</h2>
            <p className="lede">{t("lib_lede")}</p>
          </div>

          <div className="lib-tabs" role="tablist" id="sources">
            {tabs.map((tb) => (
              <button
                key={tb.id}
                role="tab"
                aria-selected={tab === tb.id}
                className={`lib-tab ${tab === tb.id ? "active" : ""}`}
                onClick={() => setTab(tb.id)}
              >
                {tb.label}
                <span className="t">· {tb.tag}</span>
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
                      <strong>{t("lib_reading_in_time")}</strong>
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
                    {t("lib_open_archive")}
                  </a>
                </div>
              ))}
            </div>
          )}

          <p className="lib-disclaimer">{t("lib_disclaimer")}</p>
        </div>
      </section>

      {/* ---------------------------- footer ------------------------ */}
      <footer className="footer">
        <div className="om-close">॥ ॐ शान्तिः शान्तिः शान्तिः ॥</div>
        <p>{t("footer_p")}</p>
        <div className="fine">{t("footer_fine")}</div>
      </footer>

      {/* ----------------- floating guide dock + bindu --------------- */}
      <div
        className={`dock ${dockOpen ? "open" : ""}`}
        role="dialog"
        aria-label="Sanātana"
        ref={panelRef}
      >
        <div className="dock-head" onPointerDown={startDrag}>
          <span className="dock-title">
            <span className="om-mark">ॐ</span> SANĀTANA
          </span>
          <button
            className="dock-min"
            onClick={() => setDockOpen(false)}
            aria-label={t("dock_minimize")}
            title={t("dock_minimize")}
          >
            —
          </button>
        </div>

        {/* language row */}
        <div className="dock-lang">
          <LangSelect lang={lang} setLang={setLang} label={t("lang_label")} />
        </div>

        {/* identity / sign-in row — sign-in is now optional, not a gate */}
        <div className="dock-id">
          {user ? (
            <React.Fragment>
              <span className="who">
                <b>{user.username}</b>
                {user.role === "admin" && <span className="tag-admin"> admin</span>}
              </span>
              {user.role === "admin" && (
                <button onClick={openAdmin}>{t("admin_title")}</button>
              )}
              <button onClick={doLogout}>{t("auth_signout")}</button>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <span className="who guest">{t("guest_label")}</span>
              <button
                onClick={() => {
                  setShowAuth((v) => !v);
                  setAuthError(null);
                }}
                aria-expanded={showAuth}
              >
                {t("auth_signin_optional")}
              </button>
            </React.Fragment>
          )}
        </div>

        {/* on-demand auth panel (register / login) */}
        {!user && showAuth && (
          <div className="auth">
            <button
              className="auth-close"
              onClick={() => setShowAuth(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h3>
              {authMode === "register" ? t("auth_gate_title") : t("auth_signin_title")}
            </h3>
            <p>{authMode === "register" ? t("auth_gate_p") : t("auth_signin_p")}</p>
            {authError && <div className="auth-error">{authError}</div>}
            <input
              className="auth-field"
              value={authName}
              onChange={(e) => setAuthName(e.target.value)}
              placeholder={t("auth_username")}
              aria-label={t("auth_username")}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  authMode === "register" ? doRegister() : doLogin();
              }}
            />
            <button
              className="btn"
              onClick={authMode === "register" ? doRegister : doLogin}
              disabled={authBusy || !authName.trim()}
            >
              {authBusy
                ? t("auth_working")
                : authMode === "register"
                ? t("auth_register")
                : t("auth_login")}
            </button>
            {authNote && <div className="auth-note">{authNote}</div>}
            <div className="auth-switch">
              {authMode === "register" ? (
                <React.Fragment>
                  {t("auth_have")}{" "}
                  <button onClick={() => { setAuthMode("login"); setAuthError(null); }}>
                    {t("auth_login")}
                  </button>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  {t("auth_need_account")}{" "}
                  <button onClick={() => { setAuthMode("register"); setAuthError(null); }}>
                    {t("auth_register")}
                  </button>
                </React.Fragment>
              )}
            </div>
          </div>
        )}

        {/* chat log — always visible */}
        <div className="dock-log" aria-live="polite">
          {!allowlisted && messages.length === 0 && !loading && (
            <div className="chat-empty" style={{ paddingBottom: 14 }}>
              {t("auth_pending_note")}
            </div>
          )}
          {messages.length === 0 && !loading && (
            <div className="chat-empty">
              <span className="om-big">ॐ</span>
              {t("dock_empty_1")}
              <br />
              {t("dock_empty_2")}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role === "user" ? "user" : "guide"}`}>
              <div className="msg-bubble">
                <span className="msg-label">
                  {m.role === "user" ? t("label_you") : "Sanātana"}
                </span>
                {m.role === "user" ? m.content : renderGuideMessage(m.content)}
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-wait">
              <span className="pulse" /> {t("dock_consulting")}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {error && <div className="chat-error">{error}</div>}

        {/* limit state replaces the composer; otherwise the composer */}
        {atLimit ? (
          <div className="limit-box">
            <h3>{t("auth_limit_title")}</h3>
            <p>{limitMsg || t("auth_limit_p")}</p>
            {!user && (
              <button
                className="btn"
                onClick={() => {
                  setAuthMode("register");
                  setShowAuth(true);
                }}
              >
                {t("auth_register")}
              </button>
            )}
          </div>
        ) : (
          <React.Fragment>
            {messages.length === 0 && !loading && (
              <div className="dock-chips">
                {(SUGGESTIONS[lang] || SUGGESTIONS.en).slice(0, 3).map((s) => (
                  <button key={s} className="chip" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="dock-input">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t("dock_placeholder")}
                aria-label={t("dock_placeholder")}
                rows={1}
              />
              <button
                className="btn small"
                onClick={() => send()}
                disabled={loading || !input.trim()}
              >
                {t("dock_send")}
              </button>
            </div>
          </React.Fragment>
        )}
      </div>

      <button
        className={`fab ${dockOpen ? "hidden" : ""}`}
        onClick={openDock}
        aria-label={t("nav_ask")}
        title={t("nav_ask")}
      >
        <span aria-hidden="true">ॐ</span>
        {unread && <span className="fab-dot" aria-hidden="true" />}
      </button>

      {/* ----------------------- admin panel ------------------------ */}
      {showAdmin && user && user.role === "admin" && (
        <div className="admin" onClick={() => setShowAdmin(false)}>
          <div className="admin-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-head">
              <h3>{t("admin_title")}</h3>
              <button className="btn small ghost" onClick={loadAdmin}>
                {t("admin_refresh")}
              </button>
              <button className="dock-min" onClick={() => setShowAdmin(false)} aria-label="close">
                ✕
              </button>
            </div>
            {adminUsers.length === 0 ? (
              <div className="admin-empty">{t("admin_empty")}</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t("admin_col_user")}</th>
                    <th>{t("admin_col_status")}</th>
                    <th>{t("admin_col_used")}</th>
                    <th>{t("admin_col_action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <span className="uname">{u.username}</span>
                        {u.role === "admin" && <span className="tag-admin"> admin</span>}
                      </td>
                      <td>
                        <span className={`status-pill ${u.status}`}>
                          {u.status === "allowlisted"
                            ? t("admin_status_allowlisted")
                            : t("admin_status_pending")}
                        </span>
                      </td>
                      <td>{u.questions_used}</td>
                      <td>
                        {u.role !== "admin" &&
                          (u.status === "allowlisted" ? (
                            <button
                              className="btn small ghost"
                              onClick={() => setStatus(u.id, "pending")}
                            >
                              {t("admin_revoke")}
                            </button>
                          ) : (
                            <button
                              className="btn small"
                              onClick={() => setStatus(u.id, "allowlisted")}
                            >
                              {t("admin_approve")}
                            </button>
                          ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
