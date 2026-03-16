// 假名题库：清音 + 浊音 + 半浊音 + 拗音
const KANA = [
  // 清音
  { kana: "あ", romaji: "a", set: "seion" },
  { kana: "い", romaji: "i", set: "seion" },
  { kana: "う", romaji: "u", set: "seion" },
  { kana: "え", romaji: "e", set: "seion" },
  { kana: "お", romaji: "o", set: "seion" },

  { kana: "か", romaji: "ka", set: "seion" },
  { kana: "き", romaji: "ki", set: "seion" },
  { kana: "く", romaji: "ku", set: "seion" },
  { kana: "け", romaji: "ke", set: "seion" },
  { kana: "こ", romaji: "ko", set: "seion" },

  { kana: "さ", romaji: "sa", set: "seion" },
  { kana: "し", romaji: "shi", set: "seion" },
  { kana: "す", romaji: "su", set: "seion" },
  { kana: "せ", romaji: "se", set: "seion" },
  { kana: "そ", romaji: "so", set: "seion" },

  { kana: "た", romaji: "ta", set: "seion" },
  { kana: "ち", romaji: "chi", set: "seion" },
  { kana: "つ", romaji: "tsu", set: "seion" },
  { kana: "て", romaji: "te", set: "seion" },
  { kana: "と", romaji: "to", set: "seion" },

  { kana: "な", romaji: "na", set: "seion" },
  { kana: "に", romaji: "ni", set: "seion" },
  { kana: "ぬ", romaji: "nu", set: "seion" },
  { kana: "ね", romaji: "ne", set: "seion" },
  { kana: "の", romaji: "no", set: "seion" },

  { kana: "は", romaji: "ha", set: "seion" },
  { kana: "ひ", romaji: "hi", set: "seion" },
  { kana: "ふ", romaji: "fu", set: "seion" },
  { kana: "へ", romaji: "he", set: "seion" },
  { kana: "ほ", romaji: "ho", set: "seion" },

  { kana: "ま", romaji: "ma", set: "seion" },
  { kana: "み", romaji: "mi", set: "seion" },
  { kana: "む", romaji: "mu", set: "seion" },
  { kana: "め", romaji: "me", set: "seion" },
  { kana: "も", romaji: "mo", set: "seion" },

  { kana: "や", romaji: "ya", set: "seion" },
  { kana: "ゆ", romaji: "yu", set: "seion" },
  { kana: "よ", romaji: "yo", set: "seion" },

  { kana: "ら", romaji: "ra", set: "seion" },
  { kana: "り", romaji: "ri", set: "seion" },
  { kana: "る", romaji: "ru", set: "seion" },
  { kana: "れ", romaji: "re", set: "seion" },
  { kana: "ろ", romaji: "ro", set: "seion" },

  { kana: "わ", romaji: "wa", set: "seion" },
  { kana: "を", romaji: "wo", set: "seion" },
  { kana: "ん", romaji: "n", set: "seion" },

  // 浊音
  { kana: "が", romaji: "ga", set: "dakuon" },
  { kana: "ぎ", romaji: "gi", set: "dakuon" },
  { kana: "ぐ", romaji: "gu", set: "dakuon" },
  { kana: "げ", romaji: "ge", set: "dakuon" },
  { kana: "ご", romaji: "go", set: "dakuon" },

  { kana: "ざ", romaji: "za", set: "dakuon" },
  { kana: "じ", romaji: "ji", set: "dakuon" },
  { kana: "ず", romaji: "zu", set: "dakuon" },
  { kana: "ぜ", romaji: "ze", set: "dakuon" },
  { kana: "ぞ", romaji: "zo", set: "dakuon" },

  { kana: "だ", romaji: "da", set: "dakuon" },
  { kana: "ぢ", romaji: "ji", set: "dakuon" },
  { kana: "づ", romaji: "zu", set: "dakuon" },
  { kana: "で", romaji: "de", set: "dakuon" },
  { kana: "ど", romaji: "do", set: "dakuon" },

  { kana: "ば", romaji: "ba", set: "dakuon" },
  { kana: "び", romaji: "bi", set: "dakuon" },
  { kana: "ぶ", romaji: "bu", set: "dakuon" },
  { kana: "べ", romaji: "be", set: "dakuon" },
  { kana: "ぼ", romaji: "bo", set: "dakuon" },

  // 半浊音（爆破音）
  { kana: "ぱ", romaji: "pa", set: "handakuon" },
  { kana: "ぴ", romaji: "pi", set: "handakuon" },
  { kana: "ぷ", romaji: "pu", set: "handakuon" },
  { kana: "ぺ", romaji: "pe", set: "handakuon" },
  { kana: "ぽ", romaji: "po", set: "handakuon" },

  // 拗音
  { kana: "きゃ", romaji: "kya", set: "youon" },
  { kana: "きゅ", romaji: "kyu", set: "youon" },
  { kana: "きょ", romaji: "kyo", set: "youon" },

  { kana: "ぎゃ", romaji: "gya", set: "youon" },
  { kana: "ぎゅ", romaji: "gyu", set: "youon" },
  { kana: "ぎょ", romaji: "gyo", set: "youon" },

  { kana: "しゃ", romaji: "sha", set: "youon" },
  { kana: "しゅ", romaji: "shu", set: "youon" },
  { kana: "しょ", romaji: "sho", set: "youon" },

  { kana: "じゃ", romaji: "ja", set: "youon" },
  { kana: "じゅ", romaji: "ju", set: "youon" },
  { kana: "じょ", romaji: "jo", set: "youon" },

  { kana: "ちゃ", romaji: "cha", set: "youon" },
  { kana: "ちゅ", romaji: "chu", set: "youon" },
  { kana: "ちょ", romaji: "cho", set: "youon" },

  { kana: "にゃ", romaji: "nya", set: "youon" },
  { kana: "にゅ", romaji: "nyu", set: "youon" },
  { kana: "にょ", romaji: "nyo", set: "youon" },

  { kana: "ひゃ", romaji: "hya", set: "youon" },
  { kana: "ひゅ", romaji: "hyu", set: "youon" },
  { kana: "ひょ", romaji: "hyo", set: "youon" },

  { kana: "びゃ", romaji: "bya", set: "youon" },
  { kana: "びゅ", romaji: "byu", set: "youon" },
  { kana: "びょ", romaji: "byo", set: "youon" },

  { kana: "ぴゃ", romaji: "pya", set: "youon" },
  { kana: "ぴゅ", romaji: "pyu", set: "youon" },
  { kana: "ぴょ", romaji: "pyo", set: "youon" },

  { kana: "みゃ", romaji: "mya", set: "youon" },
  { kana: "みゅ", romaji: "myu", set: "youon" },
  { kana: "みょ", romaji: "myo", set: "youon" },

  { kana: "りゃ", romaji: "rya", set: "youon" },
  { kana: "りゅ", romaji: "ryu", set: "youon" },
  { kana: "りょ", romaji: "ryo", set: "youon" },

  // 片假名清音
  { kana: "ア", romaji: "a", set: "seion" },
  { kana: "イ", romaji: "i", set: "seion" },
  { kana: "ウ", romaji: "u", set: "seion" },
  { kana: "エ", romaji: "e", set: "seion" },
  { kana: "オ", romaji: "o", set: "seion" },

  { kana: "カ", romaji: "ka", set: "seion" },
  { kana: "キ", romaji: "ki", set: "seion" },
  { kana: "ク", romaji: "ku", set: "seion" },
  { kana: "ケ", romaji: "ke", set: "seion" },
  { kana: "コ", romaji: "ko", set: "seion" },

  { kana: "サ", romaji: "sa", set: "seion" },
  { kana: "シ", romaji: "shi", set: "seion" },
  { kana: "ス", romaji: "su", set: "seion" },
  { kana: "セ", romaji: "se", set: "seion" },
  { kana: "ソ", romaji: "so", set: "seion" },

  { kana: "タ", romaji: "ta", set: "seion" },
  { kana: "チ", romaji: "chi", set: "seion" },
  { kana: "ツ", romaji: "tsu", set: "seion" },
  { kana: "テ", romaji: "te", set: "seion" },
  { kana: "ト", romaji: "to", set: "seion" },

  { kana: "ナ", romaji: "na", set: "seion" },
  { kana: "ニ", romaji: "ni", set: "seion" },
  { kana: "ヌ", romaji: "nu", set: "seion" },
  { kana: "ネ", romaji: "ne", set: "seion" },
  { kana: "ノ", romaji: "no", set: "seion" },

  { kana: "ハ", romaji: "ha", set: "seion" },
  { kana: "ヒ", romaji: "hi", set: "seion" },
  { kana: "フ", romaji: "fu", set: "seion" },
  { kana: "ヘ", romaji: "he", set: "seion" },
  { kana: "ホ", romaji: "ho", set: "seion" },

  { kana: "マ", romaji: "ma", set: "seion" },
  { kana: "ミ", romaji: "mi", set: "seion" },
  { kana: "ム", romaji: "mu", set: "seion" },
  { kana: "メ", romaji: "me", set: "seion" },
  { kana: "モ", romaji: "mo", set: "seion" },

  { kana: "ヤ", romaji: "ya", set: "seion" },
  { kana: "ユ", romaji: "yu", set: "seion" },
  { kana: "ヨ", romaji: "yo", set: "seion" },

  { kana: "ラ", romaji: "ra", set: "seion" },
  { kana: "リ", romaji: "ri", set: "seion" },
  { kana: "ル", romaji: "ru", set: "seion" },
  { kana: "レ", romaji: "re", set: "seion" },
  { kana: "ロ", romaji: "ro", set: "seion" },

  { kana: "ワ", romaji: "wa", set: "seion" },
  { kana: "ヲ", romaji: "wo", set: "seion" },
  { kana: "ン", romaji: "n", set: "seion" },

  // 片假名浊音
  { kana: "ガ", romaji: "ga", set: "dakuon" },
  { kana: "ギ", romaji: "gi", set: "dakuon" },
  { kana: "グ", romaji: "gu", set: "dakuon" },
  { kana: "ゲ", romaji: "ge", set: "dakuon" },
  { kana: "ゴ", romaji: "go", set: "dakuon" },

  { kana: "ザ", romaji: "za", set: "dakuon" },
  { kana: "ジ", romaji: "ji", set: "dakuon" },
  { kana: "ズ", romaji: "zu", set: "dakuon" },
  { kana: "ゼ", romaji: "ze", set: "dakuon" },
  { kana: "ゾ", romaji: "zo", set: "dakuon" },

  { kana: "ダ", romaji: "da", set: "dakuon" },
  { kana: "ヂ", romaji: "ji", set: "dakuon" },
  { kana: "ヅ", romaji: "zu", set: "dakuon" },
  { kana: "デ", romaji: "de", set: "dakuon" },
  { kana: "ド", romaji: "do", set: "dakuon" },

  { kana: "バ", romaji: "ba", set: "dakuon" },
  { kana: "ビ", romaji: "bi", set: "dakuon" },
  { kana: "ブ", romaji: "bu", set: "dakuon" },
  { kana: "ベ", romaji: "be", set: "dakuon" },
  { kana: "ボ", romaji: "bo", set: "dakuon" },

  // 片假名半浊音
  { kana: "パ", romaji: "pa", set: "handakuon" },
  { kana: "ピ", romaji: "pi", set: "handakuon" },
  { kana: "プ", romaji: "pu", set: "handakuon" },
  { kana: "ペ", romaji: "pe", set: "handakuon" },
  { kana: "ポ", romaji: "po", set: "handakuon" },

  // 片假名拗音
  { kana: "キャ", romaji: "kya", set: "youon" },
  { kana: "キュ", romaji: "kyu", set: "youon" },
  { kana: "キョ", romaji: "kyo", set: "youon" },

  { kana: "ギャ", romaji: "gya", set: "youon" },
  { kana: "ギュ", romaji: "gyu", set: "youon" },
  { kana: "ギョ", romaji: "gyo", set: "youon" },

  { kana: "シャ", romaji: "sha", set: "youon" },
  { kana: "シュ", romaji: "shu", set: "youon" },
  { kana: "ショ", romaji: "sho", set: "youon" },

  { kana: "ジャ", romaji: "ja", set: "youon" },
  { kana: "ジュ", romaji: "ju", set: "youon" },
  { kana: "ジョ", romaji: "jo", set: "youon" },

  { kana: "チャ", romaji: "cha", set: "youon" },
  { kana: "チュ", romaji: "chu", set: "youon" },
  { kana: "チョ", romaji: "cho", set: "youon" },

  { kana: "ニャ", romaji: "nya", set: "youon" },
  { kana: "ニュ", romaji: "nyu", set: "youon" },
  { kana: "ニョ", romaji: "nyo", set: "youon" },

  { kana: "ヒャ", romaji: "hya", set: "youon" },
  { kana: "ヒュ", romaji: "hyu", set: "youon" },
  { kana: "ヒョ", romaji: "hyo", set: "youon" },

  { kana: "ビャ", romaji: "bya", set: "youon" },
  { kana: "ビュ", romaji: "byu", set: "youon" },
  { kana: "ビョ", romaji: "byo", set: "youon" },

  { kana: "ピャ", romaji: "pya", set: "youon" },
  { kana: "ピュ", romaji: "pyu", set: "youon" },
  { kana: "ピョ", romaji: "pyo", set: "youon" },

  { kana: "ミャ", romaji: "mya", set: "youon" },
  { kana: "ミュ", romaji: "myu", set: "youon" },
  { kana: "ミョ", romaji: "myo", set: "youon" },

  { kana: "リャ", romaji: "rya", set: "youon" },
  { kana: "リュ", romaji: "ryu", set: "youon" },
  { kana: "リョ", romaji: "ryo", set: "youon" },
];

// 只包含基础假名的简单词汇，用于整词拼读
const WORDS = [
  { word: "ねこ", romaji: "neko", meaning: "猫，猫咪" },
  { word: "いぬ", romaji: "inu", meaning: "狗" },
  { word: "さくら", romaji: "sakura", meaning: "樱花" },
  { word: "あめ", romaji: "ame", meaning: "雨 / 糖" },
  { word: "やま", romaji: "yama", meaning: "山" },
  { word: "かわ", romaji: "kawa", meaning: "河流" },
  { word: "はな", romaji: "hana", meaning: "花" },
  { word: "あさ", romaji: "asa", meaning: "早晨" },
  { word: "よる", romaji: "yoru", meaning: "夜晚" },
  { word: "うみ", romaji: "umi", meaning: "大海" },
  { word: "て", romaji: "te", meaning: "手" },
  { word: "くち", romaji: "kuchi", meaning: "嘴" },
  { word: "みみ", romaji: "mimi", meaning: "耳朵" },
  { word: "こころ", romaji: "kokoro", meaning: "心，心灵" },
  { word: "はし", romaji: "hashi", meaning: "筷子 / 桥（依语境）" },
  { word: "あお", romaji: "ao", meaning: "蓝色 / 绿色（交通灯等）" },
  { word: "いえ", romaji: "ie", meaning: "家，房子" },
  { word: "うた", romaji: "uta", meaning: "歌" },
  { word: "おか", romaji: "oka", meaning: "小山坡" },
  { word: "そら", romaji: "sora", meaning: "天空" },
];

let currentMode = "recognition";

// 主题
function applyTheme(theme) {
  const root = document.documentElement;
  const t = theme === "light" || theme === "dark" ? theme : "light";
  root.setAttribute("data-theme", t);
  try {
    localStorage.setItem("oshiTheme", t);
  } catch (_) {}
  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.textContent = t === "dark" ? "夜间" : "日间";
  }
}

function initTheme() {
  let stored = null;
  try {
    stored = localStorage.getItem("oshiTheme");
  } catch (_) {}
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initial = stored === "dark" || stored === "light" ? stored : prefersDark ? "dark" : "light";
  applyTheme(initial);
  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || initial;
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);
    });
  }
}

// ① 乱序认读状态
let recCurrent = null;
let recStartTime = null;
let recStats = { total: 0, correct: 0, times: [] };
let recLogs = [];
let recSessionTarget = 50;
let recSessionFinished = false;
let recSessionQueue = [];
let recSessionIndex = 0;
let activeKanaSets = new Set(["seion"]);
let scriptMode = "hiragana"; // hiragana | katakana | mixed
let recLogPage = 1;
const REC_LOG_PAGE_SIZE = 50;

function playResultSound(ok) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const nowTime = ctx.currentTime;
  const baseFreq = ok ? 880 : 260;

  osc.frequency.setValueAtTime(baseFreq, nowTime);

  if (ok) {
    // 答对：短促上滑音
    osc.frequency.linearRampToValueAtTime(1175, nowTime + 0.18);
  } else {
    // 答错：稍低的下滑音
    osc.frequency.linearRampToValueAtTime(200, nowTime + 0.1);
    osc.frequency.linearRampToValueAtTime(150, nowTime + 0.2);
  }

  gain.gain.setValueAtTime(0.0001, nowTime);
  gain.gain.linearRampToValueAtTime(0.18, nowTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, nowTime + 0.25);

  osc.start(nowTime);
  osc.stop(nowTime + 0.27);
}

function getActiveKanaPool() {
  // 先按清浊拗音选择过滤
  const bySet = KANA.filter((item) => activeKanaSets.has(item.set || "seion"));
  // 再按文字种类过滤
  let byScript;
  if (scriptMode === "hiragana") {
    byScript = bySet.filter((k) => k.kana.charCodeAt(0) <= 0x309f); // 平假名区
  } else if (scriptMode === "katakana") {
    byScript = bySet.filter((k) => k.kana.charCodeAt(0) >= 0x30a0 && k.kana.charCodeAt(0) <= 0x30ff);
  } else {
    byScript = bySet;
  }
  if (byScript.length) return byScript;
  return bySet.length ? bySet : KANA;
}

function randomPick(array, exclude) {
  if (!array || !array.length) return null;
  if (array.length === 1) return array[0];
  let candidate;
  do {
    candidate = array[Math.floor(Math.random() * array.length)];
  } while (exclude && candidate === exclude);
  return candidate;
}

function now() {
  return performance.now();
}

function formatMs(ms) {
  if (!ms || !isFinite(ms)) return "0";
  return Math.round(ms);
}

function calcAvg(arr) {
  if (!arr.length) return 0;
  const sum = arr.reduce((a, b) => a + b, 0);
  return sum / arr.length;
}

function formatClock(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// 构建一组内的题目队列：在当前题库内尽量平均覆盖每个假名
function buildRecSessionQueue(target, pool) {
  const totalKana = pool.length;
  if (!totalKana) return [];

  let t = target;
  if (!Number.isFinite(t) || t <= 0) t = totalKana;

  const per = Math.floor(t / totalKana);
  const extra = t % totalKana;
  const indices = [];

  for (let i = 0; i < totalKana; i++) {
    for (let k = 0; k < per; k++) {
      indices.push(i);
    }
  }

  for (let i = 0; i < extra; i++) {
    indices.push(Math.floor(Math.random() * totalKana));
  }

  if (!indices.length) {
    for (let i = 0; i < totalKana; i++) indices.push(i);
  }

  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices;
}

// ---------- 模式切换 ----------
function initModeSwitch() {
  const buttons = document.querySelectorAll(".mode-btn");
  const sections = {
    recognition: document.getElementById("mode-recognition"),
    dictation: document.getElementById("mode-dictation"),
    words: document.getElementById("mode-words"),
  };

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      currentMode = mode;

      buttons.forEach((b) => b.classList.toggle("active", b === btn));

      Object.entries(sections).forEach(([key, sec]) => {
        sec.classList.toggle("active", key === mode);
      });
    });
  });
}

// ---------- ① 乱序认读（形→音） ----------
function initRecognition() {
  const elKana = document.getElementById("rec-kana");
  const elInput = document.getElementById("rec-input");
  const elSubmit = document.getElementById("rec-submit");
  const elSkip = document.getElementById("rec-skip");
  const elFeedback = document.getElementById("rec-feedback");
  const elStats = document.getElementById("rec-stats");
  const elTimer = document.getElementById("rec-timer");
  const elLogToggle = document.getElementById("rec-log-toggle");
  const elLogPanel = document.getElementById("rec-log-panel");
  const elLogBody = document.getElementById("rec-log-body");
  const elLogPrev = document.getElementById("rec-log-prev");
  const elLogNext = document.getElementById("rec-log-next");
  const elLogPagerInfo = document.getElementById("rec-log-pager-info");
  const elSessionSize = document.getElementById("rec-session-size");
  const elSessionStart = document.getElementById("rec-session-start");
  const elSessionStatus = document.getElementById("rec-session-status");
  const elSessionSummary = document.getElementById("rec-session-summary");
  const elSessionSummaryClose = document.getElementById("rec-session-summary-close");
  const elSummaryCount = document.getElementById("rec-summary-count");
  const elSummaryCorrectWrong = document.getElementById("rec-summary-correct-wrong");
  const elSummaryAccuracy = document.getElementById("rec-summary-accuracy");
  const elSummaryAvgTime = document.getElementById("rec-summary-avgtime");
  const elSummaryBestWorst = document.getElementById("rec-summary-best-worst");
  const elSummaryWeakness = document.getElementById("rec-summary-weakness");
  const poolChips = document.querySelectorAll("[data-kana-set]");
  const scriptChips = document.querySelectorAll("[data-script-mode]");

  function syncPoolChipsUI() {
    poolChips.forEach((chip) => {
      const id = chip.dataset.kanaSet;
      const active = activeKanaSets.has(id);
      chip.classList.toggle("pool-chip-active", active);
    });
    scriptChips.forEach((chip) => {
      const id = chip.dataset.scriptMode;
      chip.classList.toggle("pool-chip-active", id === scriptMode);
    });
  }

  poolChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const id = chip.dataset.kanaSet;
      if (!id) return;
      if (activeKanaSets.has(id)) {
        if (activeKanaSets.size > 1) {
          activeKanaSets.delete(id);
        }
      } else {
        activeKanaSets.add(id);
      }
      syncPoolChipsUI();
      // 题库变更时，重建本组题目队列
      recSessionPool = getActiveKanaPool();
      recSessionQueue = buildRecSessionQueue(recSessionTarget, recSessionPool);
      recSessionIndex = 0;
    });
  });

  scriptChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const id = chip.dataset.scriptMode;
      if (!id) return;
      scriptMode = id; // hiragana | katakana | mixed
      syncPoolChipsUI();
      recSessionPool = getActiveKanaPool();
      recSessionQueue = buildRecSessionQueue(recSessionTarget, recSessionPool);
      recSessionIndex = 0;
    });
  });

  syncPoolChipsUI();

  function renderLogs() {
    if (!elLogBody) return;

    const total = recLogs.length;
    const totalPages = Math.max(1, Math.ceil(total / REC_LOG_PAGE_SIZE));
    if (recLogPage > totalPages) recLogPage = totalPages;
    if (recLogPage < 1) recLogPage = 1;

    const startIndex = (recLogPage - 1) * REC_LOG_PAGE_SIZE;
    const slice = recLogs.slice(startIndex, startIndex + REC_LOG_PAGE_SIZE);

    elLogBody.innerHTML = slice
      .map((log, i) => {
        const globalIndex = startIndex + i + 1;
        const icon = log.ok ? "✔" : "✗";
        const rowClass = log.ok ? "log-ok" : "log-error";
        return `
          <tr class="${rowClass}">
            <td>${globalIndex}</td>
            <td>${log.kana}</td>
            <td>${log.romaji}</td>
            <td>${log.input || "-"}</td>
            <td>${icon}</td>
            <td>${log.reactionMs != null ? formatMs(log.reactionMs) + " ms" : "-"}</td>
            <td>${formatClock(log.timestamp)}</td>
          </tr>
        `;
      })
      .join("");

    if (elLogPagerInfo) {
      elLogPagerInfo.textContent = `第 ${totalPages ? recLogPage : 1}/${totalPages} 页 · 共 ${total} 题`;
    }
    if (elLogPrev) elLogPrev.disabled = recLogPage <= 1;
    if (elLogNext) elLogNext.disabled = recLogPage >= totalPages;
  }

  function pushLog(ok, reactionMs, input) {
    if (!recCurrent) return;
    recLogs.push({
      kana: recCurrent.kana,
      romaji: recCurrent.romaji,
      input,
      ok,
      reactionMs,
      timestamp: new Date(),
    });
    renderLogs();
  }

  function nextQuestion() {
    const pool = recSessionPool && recSessionPool.length ? recSessionPool : getActiveKanaPool();

    if (recSessionQueue && recSessionQueue.length && recSessionIndex < recSessionQueue.length) {
      const idx = recSessionQueue[recSessionIndex];
      recCurrent = pool[idx] || randomPick(pool, recCurrent);
      recSessionIndex += 1;
    } else {
      recCurrent = randomPick(pool, recCurrent);
    }

    elKana.textContent = recCurrent.kana;
    elInput.value = "";
    elInput.focus();
    elFeedback.textContent = "";
    elFeedback.className = "feedback";
    recStartTime = now();
    elTimer.textContent = "0 ms";
  }

  function updateStats(isCorrect, reactionMs) {
    recStats.total += 1;
    if (isCorrect) recStats.correct += 1;
    if (reactionMs != null) {
      recStats.times.push(reactionMs);
      if (recStats.times.length > 200) {
        recStats.times.shift();
      }
    }

    const acc =
      recStats.total > 0
        ? ((recStats.correct / recStats.total) * 100).toFixed(1)
        : "0.0";
    const avg = calcAvg(recStats.times);

    let text = `已答：${recStats.total} · 正确：${recStats.correct} · 准确率：${acc}% · 平均反应：${formatMs(
      avg,
    )} ms`;

    if (recStats.total >= 200 && avg <= 500 && acc >= 98) {
      text += " · ✅ 清音乱序认读已达标准";
    }

    elStats.textContent = text;

    if (elSessionStatus && recSessionTarget > 0) {
      elSessionStatus.textContent = `本组进度：${recStats.total}/${recSessionTarget} 题`;
      elSessionStatus.classList.add("active");
    }
  }

  function showSessionSummary() {
    if (!elSessionSummary) return;
    const logs = recLogs.slice();
    if (!logs.length) return;

    const total = logs.length;
    const correctLogs = logs.filter((l) => l.ok);
    const wrongLogs = logs.filter((l) => !l.ok);
    const correct = correctLogs.length;
    const wrong = wrongLogs.length;
    const accuracy = total ? (correct / total) * 100 : 0;

    const times = logs
      .map((l) => l.reactionMs)
      .filter((ms) => typeof ms === "number" && isFinite(ms));

    const avgTime = calcAvg(times);
    const bestTime = times.length ? Math.min(...times) : null;
    const worstTime = times.length ? Math.max(...times) : null;

    if (elSummaryCount) elSummaryCount.textContent = `${total} 题`;
    if (elSummaryCorrectWrong) elSummaryCorrectWrong.textContent = `${correct} / ${wrong}`;
    if (elSummaryAccuracy) elSummaryAccuracy.textContent = `${accuracy.toFixed(1)}%`;
    if (elSummaryAvgTime) {
      elSummaryAvgTime.textContent = times.length ? `${formatMs(avgTime)} ms` : "-";
    }
    if (elSummaryBestWorst) {
      if (bestTime == null || worstTime == null) {
        elSummaryBestWorst.textContent = "-";
      } else {
        elSummaryBestWorst.textContent = `${formatMs(bestTime)} ms / ${formatMs(
          worstTime,
        )} ms`;
      }
    }

    const byKana = new Map();
    for (const log of logs) {
      if (!byKana.has(log.kana)) {
        byKana.set(log.kana, {
          kana: log.kana,
          romaji: log.romaji,
          total: 0,
          correct: 0,
          times: [],
        });
      }
      const e = byKana.get(log.kana);
      e.total += 1;
      if (log.ok) e.correct += 1;
      if (typeof log.reactionMs === "number" && isFinite(log.reactionMs)) {
        e.times.push(log.reactionMs);
      }
    }

    const stats = Array.from(byKana.values()).map((e) => {
      const avg = calcAvg(e.times);
      const accKana = e.total ? (e.correct / e.total) * 100 : 0;
      return { ...e, avgTime: avg, accuracy: accKana };
    });

    const hardOnes = stats
      .filter((e) => e.total >= 2 && e.accuracy < 100)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    const slowOnes = stats
      .filter((e) => Number.isFinite(e.avgTime))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5);

    let weaknessHtml = "";
    if (hardOnes.length) {
      weaknessHtml += "<div>易错假名（按正确率从低到高）：</div><ul>";
      for (const e of hardOnes) {
        weaknessHtml += `<li>${e.kana} (${e.romaji})：总 ${e.total} 题，正确率 ${e.accuracy.toFixed(
          1,
        )}% ，平均 ${formatMs(e.avgTime)} ms</li>`;
      }
      weaknessHtml += "</ul>";
    }
    if (slowOnes.length) {
      weaknessHtml += "<div>反应最慢假名（按平均反应时间从慢到快）：</div><ul>";
      for (const e of slowOnes) {
        weaknessHtml += `<li>${e.kana} (${e.romaji})：平均 ${formatMs(
          e.avgTime,
        )} ms（共 ${e.total} 题）</li>`;
      }
      weaknessHtml += "</ul>";
    }

    if (!weaknessHtml) {
      weaknessHtml = "<div>本组数据太少，暂时看不出明显弱项。</div>";
    }

    if (elSummaryWeakness) {
      elSummaryWeakness.innerHTML = weaknessHtml;
    }

    if (elSessionStatus) {
      elSessionStatus.textContent = `本组完成：${total}/${recSessionTarget} 题 · 准确率 ${accuracy.toFixed(
        1,
      )}%`;
      elSessionStatus.classList.add("active");
    }

    elSessionSummary.classList.add("visible");
  }

  function checkSessionFinished() {
    const target = recSessionTarget || 0;
    if (!recSessionFinished && target > 0 && recStats.total >= target) {
      recSessionFinished = true;
      showSessionSummary();
    }
  }

  function startNewSession() {
    let target = parseInt(elSessionSize.value, 10);
    if (!Number.isFinite(target) || target <= 0) {
      target = 50;
      if (elSessionSize) elSessionSize.value = "50";
    }
    recSessionTarget = target;
    recSessionFinished = false;
    recStats = { total: 0, correct: 0, times: [] };
    recLogs = [];
    recLogPage = 1;
    recSessionPool = getActiveKanaPool();
    recSessionQueue = buildRecSessionQueue(recSessionTarget, recSessionPool);
    recSessionIndex = 0;

    renderLogs();
    elStats.textContent = "已答：0 · 正确：0 · 准确率：0% · 平均反应：0 ms";
    if (elSessionSummary) {
      elSessionSummary.classList.remove("visible");
    }
    if (elSessionStatus) {
      elSessionStatus.textContent = `本组进度：0/${recSessionTarget} 题`;
      elSessionStatus.classList.add("active");
    }
    nextQuestion();
  }

  function checkAnswer() {
    if (!recCurrent) return;
    const input = elInput.value.trim().toLowerCase();
    if (!input) return;

    const usedTime = now() - recStartTime;
    const ok = input === recCurrent.romaji;

    elTimer.textContent = `${formatMs(usedTime)} ms`;

    if (ok) {
      elFeedback.textContent = `正确：${recCurrent.kana} → ${recCurrent.romaji}`;
      elFeedback.className = "feedback ok";
    } else {
      elFeedback.textContent = `错误：你写的是 "${input}"，正确是 "${recCurrent.romaji}"`;
      elFeedback.className = "feedback error";
    }

    pushLog(ok, usedTime, input);
    updateStats(ok, usedTime);
    playResultSound(ok);
    checkSessionFinished();
    setTimeout(nextQuestion, 380);
  }

  elSubmit.addEventListener("click", checkAnswer);
  elInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      checkAnswer();
    }
  });

  elSkip.addEventListener("click", () => {
    updateStats(false, null);
    pushLog(false, null, "(skip)");
    playResultSound(false);
    checkSessionFinished();
    nextQuestion();
  });

  if (elLogToggle && elLogPanel) {
    elLogToggle.addEventListener("click", () => {
      elLogPanel.classList.toggle("visible");
    });
  }

  if (elLogPrev && elLogNext) {
    elLogPrev.addEventListener("click", () => {
      if (recLogPage > 1) {
        recLogPage -= 1;
        renderLogs();
      }
    });
    elLogNext.addEventListener("click", () => {
      const totalPages = Math.max(1, Math.ceil(recLogs.length / REC_LOG_PAGE_SIZE));
      if (recLogPage < totalPages) {
        recLogPage += 1;
        renderLogs();
      }
    });
  }

  if (elSessionStart && elSessionSize) {
    elSessionStart.addEventListener("click", startNewSession);
  }

  if (elSessionSummaryClose && elSessionSummary) {
    elSessionSummaryClose.addEventListener("click", () => {
      elSessionSummary.classList.remove("visible");
    });
  }

  if (elSessionSize && !elSessionSize.value) {
    elSessionSize.value = "50";
  }

  startNewSession();
}

// ---------- ② 乱序听写（音→形） ----------
function speakKana(kanaChar) {
  if (!window.speechSynthesis) {
    alert("当前浏览器不支持语音合成功能，建议使用 Chrome / Edge 浏览器。");
    return;
  }
  const utter = new SpeechSynthesisUtterance(kanaChar);
  utter.lang = "ja-JP";
  const voices = window.speechSynthesis.getVoices();
  const jaVoice =
    voices.find((v) => v.lang === "ja-JP") ||
    voices.find((v) => v.lang?.startsWith("ja-")) ||
    null;
  if (jaVoice) utter.voice = jaVoice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

function initDictation() {
  const elInput = document.getElementById("dic-input");
  const elPlay = document.getElementById("dic-play");
  const elNext = document.getElementById("dic-next");
  const elSubmit = document.getElementById("dic-submit");
  const elSkip = document.getElementById("dic-skip");
  const elFeedback = document.getElementById("dic-feedback");
  const elStats = document.getElementById("dic-stats");
  const elTimer = document.getElementById("dic-timer");

  function nextQuestion(playImmediately = false) {
    const pool = getActiveKanaPool();
    dicCurrent = randomPick(pool, dicCurrent);
    elInput.value = "";
    elInput.focus();
    elFeedback.textContent = "";
    elFeedback.className = "feedback";
    dicStartTime = null;
    elTimer.textContent = "0 ms";

    if (playImmediately) {
      speakKana(dicCurrent.kana);
      dicStartTime = now();
    }
  }

  function updateStats(isCorrect, reactionMs) {
    dicStats.total += 1;
    if (isCorrect) dicStats.correct += 1;
    if (reactionMs != null) {
      dicStats.times.push(reactionMs);
      if (dicStats.times.length > 200) {
        dicStats.times.shift();
      }
    }

    const acc =
      dicStats.total > 0
        ? ((dicStats.correct / dicStats.total) * 100).toFixed(1)
        : "0.0";
    const avg = calcAvg(dicStats.times);

    let text = `已答：${dicStats.total} · 正确：${dicStats.correct} · 准确率：${acc}% · 平均反应：${formatMs(
      avg,
    )} ms`;

    if (dicStats.total >= 200 && acc >= 98 && avg <= 500) {
      text += " · ✅ 听写清音已达标准";
    }

    elStats.textContent = text;
  }

  function checkAnswer() {
    if (!dicCurrent) return;
    const input = elInput.value.trim();
    if (!input) return;

    if (!dicStartTime) {
      dicStartTime = now();
    }

    const usedTime = now() - dicStartTime;
    const ok = input === dicCurrent.kana;

    elTimer.textContent = `${formatMs(usedTime)} ms`;

    if (ok) {
      elFeedback.textContent = `正确：${dicCurrent.kana}`;
      elFeedback.className = "feedback ok";
    } else {
      elFeedback.textContent = `错误：你写的是 "${input}"，正确是 "${dicCurrent.kana}"`;
      elFeedback.className = "feedback error";
    }

    updateStats(ok, usedTime);
    setTimeout(() => nextQuestion(true), 380);
  }

  elPlay.addEventListener("click", () => {
    if (!dicCurrent) return;
    speakKana(dicCurrent.kana);
    if (!dicStartTime) {
      dicStartTime = now();
    }
  });

  elNext.addEventListener("click", () => nextQuestion(true));
  elSubmit.addEventListener("click", checkAnswer);

  elInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      checkAnswer();
    }
  });

  elSkip.addEventListener("click", () => {
    updateStats(false, null);
    nextQuestion(true);
  });

  nextQuestion(true);
}

// ---------- ③ 纯平假名单词拼读 ----------
function speakWord(word) {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = "ja-JP";
  const voices = window.speechSynthesis.getVoices();
  const jaVoice =
    voices.find((v) => v.lang === "ja-JP") ||
    voices.find((v) => v.lang?.startsWith("ja-")) ||
    null;
  if (jaVoice) utter.voice = jaVoice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

function initWords() {
  const elWord = document.getElementById("word-display");
  const elPlay = document.getElementById("word-play");
  const elNext = document.getElementById("word-next");
  const elToggleAnswer = document.getElementById("word-toggle-answer");
  const elAnswer = document.getElementById("word-answer");
  const elRomaji = document.getElementById("word-romaji");
  const elMeaning = document.getElementById("word-meaning");
  const elStats = document.getElementById("word-stats");

  function nextWord() {
    wordCurrent = randomPick(WORDS, wordCurrent);
    elWord.textContent = wordCurrent.word;
    elRomaji.textContent = wordCurrent.romaji;
    elMeaning.textContent = wordCurrent.meaning;
    elAnswer.classList.remove("visible");
    wordCount += 1;
    elStats.textContent = `已练单词数：${wordCount}`;
    speakWord(wordCurrent.word);
  }

  elPlay.addEventListener("click", () => {
    if (!wordCurrent) return;
    speakWord(wordCurrent.word);
  });

  elNext.addEventListener("click", () => nextWord());

  elToggleAnswer.addEventListener("click", () => {
    elAnswer.classList.toggle("visible");
  });

  nextWord();
}

// ---------- 启动 ----------
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initModeSwitch();
  initRecognition();
  initDictation();
  initWords();
});
