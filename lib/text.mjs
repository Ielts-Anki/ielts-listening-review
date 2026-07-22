// Chuẩn hoá 1 đáp án để so sánh: bỏ hoa/thường, khoảng trắng thừa, dấu câu đuôi, dấu phẩy trong số.
export function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/(\d),(\d)/g, "$1$2")
    .replace(/[.,;!?"“”]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Đáp án đúng có thể có nhiều phương án: "colour / color" hoặc phần tuỳ chọn "(the) library".
export function isCorrect(answer, key) {
  const a = norm(answer);
  if (!a) return false;
  const alts = String(key || "")
    .split("/")
    .map((k) => k.trim())
    .filter(Boolean);
  for (const alt of alts) {
    const full = norm(alt.replace(/[()]/g, ""));
    const without = norm(alt.replace(/\([^)]*\)/g, ""));
    if (a === full || a === without) return true;
  }
  return false;
}

// Tách transcript thành câu (cho chế độ chép chính tả).
export function splitSentences(t) {
  return String(t || "")
    .replace(/\r/g, "")
    .split(/(?<=[.?!])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

function tokens(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'\- ]+/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
}

// Diff từ theo LCS: trả về mảng {word, state} với state = ok | missing | extra
// so khớp bản gõ của người dùng với câu gốc trong transcript.
export function diffWords(typedText, targetText) {
  const a = tokens(typedText);
  const b = tokens(targetText);
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) { out.push({ word: b[j], state: "ok" }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ word: a[i], state: "extra" }); i++; }
    else { out.push({ word: b[j], state: "missing" }); j++; }
  }
  while (i < m) out.push({ word: a[i++], state: "extra" });
  while (j < n) out.push({ word: b[j++], state: "missing" });
  const okCount = out.filter((x) => x.state === "ok").length;
  return { parts: out, accuracy: n ? Math.round((okCount / n) * 100) : 0 };
}

// Tìm vị trí đáp án của từng câu hỏi trong transcript.
// Trả về mảng đoạn: {text} hoặc {text, qnum} để render highlight.
export function highlightTranscript(transcript, questions) {
  const t = String(transcript || "");
  const lower = t.toLowerCase();
  const hits = [];
  for (const q of questions || []) {
    const key = String(q.key || "").split("/")[0].replace(/\([^)]*\)/g, "").trim();
    if (!key) continue;
    const idx = lower.indexOf(key.toLowerCase());
    if (idx > -1) hits.push({ start: idx, end: idx + key.length, qnum: q.num });
  }
  hits.sort((x, y) => x.start - y.start);
  // bỏ các hit chồng lấn
  const clean = [];
  let last = -1;
  for (const h of hits) {
    if (h.start >= last) { clean.push(h); last = h.end; }
  }
  const segs = [];
  let pos = 0;
  for (const h of clean) {
    if (h.start > pos) segs.push({ text: t.slice(pos, h.start) });
    segs.push({ text: t.slice(h.start, h.end), qnum: h.qnum });
    pos = h.end;
  }
  if (pos < t.length) segs.push({ text: t.slice(pos) });
  return segs;
}
