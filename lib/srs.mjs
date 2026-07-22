// Lặp lại ngắt quãng SM-2 (giống Anki) — dùng chung server + client + script mail.
export const DAY = 86400000;

const SEPS = [" : ", " :", "::", ":", " ~ ", "~", " = ", "=", " – ", " - ", " — "];
export function parseVocab(raw) {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      let front = line, back = "";
      for (const s of SEPS) {
        const i = line.indexOf(s);
        if (i > -1) {
          front = line.slice(0, i).trim();
          back = line.slice(i + s.length).trim();
          break;
        }
      }
      return { front, back };
    })
    .filter((x) => x.front);
}

export function newCard(front, back, testId) {
  return {
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    front, back, testId: testId || null,
    ease: 2.5, reps: 0, lapses: 0, interval: 0,
    due: Date.now(), createdAt: Date.now(),
  };
}

// Xem trước khoảng cách kế tiếp nếu bấm nút này (không đổi thẻ).
export function preview(card, grade) {
  let { ease, reps, interval } = card;
  if (grade === "again") return "10 phút";
  if (grade === "hard") interval = reps === 0 ? 1 : Math.max(1, Math.round(interval * 1.2));
  else if (grade === "good") interval = reps === 0 ? 1 : reps === 1 ? 3 : Math.round(interval * ease);
  else if (grade === "easy") interval = reps === 0 ? 4 : Math.round(interval * ease * 1.35);
  return `${Math.max(1, interval)} ngày`;
}

export function applyGrade(card, grade) {
  const now = Date.now();
  if (grade === "again") {
    card.reps = 0;
    card.lapses = (card.lapses || 0) + 1;
    card.ease = Math.max(1.3, card.ease - 0.2);
    card.interval = 0;
    card.due = now + 10 * 60 * 1000;
  } else if (grade === "hard") {
    card.ease = Math.max(1.3, card.ease - 0.15);
    card.interval = card.reps === 0 ? 1 : Math.max(1, Math.round(card.interval * 1.2));
    card.reps++;
    card.due = now + card.interval * DAY;
  } else if (grade === "good") {
    card.interval = card.reps === 0 ? 1 : card.reps === 1 ? 3 : Math.round(card.interval * card.ease);
    card.reps++;
    card.due = now + card.interval * DAY;
  } else if (grade === "easy") {
    card.ease = card.ease + 0.15;
    card.interval = card.reps === 0 ? 4 : Math.round(card.interval * card.ease * 1.35);
    card.reps++;
    card.due = now + card.interval * DAY;
  }
  return card;
}
