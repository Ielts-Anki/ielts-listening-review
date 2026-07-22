"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const REASONS = ["nghe nhầm", "chưa biết từ", "sai chính tả", "bẫy paraphrase"];
const COLORS = { "nghe nhầm": "var(--blue)", "chưa biết từ": "var(--amber)", "sai chính tả": "var(--red)", "bẫy paraphrase": "#7a4fa6" };

export default function Stats() {
  const [tests, setTests] = useState(null);
  const [part, setPart] = useState(0); // 0 = tất cả
  useEffect(() => { fetch("/api/tests").then((r) => r.json()).then((d) => setTests(d.tests)); }, []);

  const data = useMemo(() => {
    if (!tests) return null;
    const byReason = Object.fromEntries(REASONS.map((r) => [r, 0]));
    const byPart = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const history = [];
    for (const t of tests) {
      for (const s of t.sessions || []) {
        if (part && t.part !== part) continue;
        history.push({ test: t, s });
        for (const reason of Object.values(s.mistakes || {})) {
          if (byReason[reason] !== undefined) byReason[reason]++;
          byPart[t.part] = (byPart[t.part] || 0) + 1;
        }
      }
    }
    history.sort((a, b) => a.s.date - b.s.date);
    const max = Math.max(1, ...Object.values(byReason));
    return { byReason, byPart, history, max };
  }, [tests, part]);

  if (!data) return <p className="muted" style={{ marginTop: 40 }}>Đang tải…</p>;

  const totalMistakes = Object.values(data.byReason).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="row" style={{ marginTop: 26, justifyContent: "space-between" }}>
        <div>
          <div className="display" style={{ fontSize: 24, fontWeight: 700 }}>Sổ lỗi</div>
          <div className="muted small">Bạn hay sai kiểu gì — gộp từ phần “Vì sao sai” của mọi phiên luyện.</div>
        </div>
        <div className="row">
          {[0, 1, 2, 3, 4].map((p) => (
            <button key={p} className={"btn" + (part === p ? " primary" : "")} onClick={() => setPart(p)}>
              {p === 0 ? "Tất cả" : `Part ${p}`}
            </button>
          ))}
        </div>
      </div>

      <div className="card pad" style={{ marginTop: 16 }}>
        {totalMistakes === 0 ? (
          <p className="muted small" style={{ margin: 0 }}>Chưa có dữ liệu — gắn nhãn lý do sai ở bước Rút kinh nghiệm để sổ lỗi bắt đầu ghi.</p>
        ) : (
          <div className="reason-grid">
            {REASONS.map((r) => (
              <div key={r} className="reason-row">
                <span className="small" style={{ fontWeight: 650 }}>{r}</span>
                <div className="bar"><i style={{ width: `${(data.byReason[r] / data.max) * 100}%`, background: COLORS[r] }} /></div>
                <span className="mono small" style={{ textAlign: "right" }}>{data.byReason[r]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <h2 className="section">Lịch sử các phiên</h2>
      <div className="card pad">
        {data.history.length === 0 ? (
          <p className="muted small" style={{ margin: 0 }}>Chưa có phiên nào.</p>
        ) : (
          <table className="check">
            <thead><tr><th>Ngày</th><th>Bài</th><th className="mono">Điểm</th><th>Lần 2 cứu / hỏng</th></tr></thead>
            <tbody>
              {data.history.slice().reverse().map(({ test, s }) => (
                <tr key={s.id}>
                  <td className="small muted">{new Date(s.date).toLocaleDateString("vi-VN")}</td>
                  <td><Link href={`/test/${test.id}`}>{test.source} {test.testNo && `· Test ${test.testNo}`} · Part {test.part}</Link></td>
                  <td className="mono" style={{ fontWeight: 700 }}>{s.score}/{s.total}</td>
                  <td>
                    <span className="tag saved">+{s.changedRight ?? 0}</span>{" "}
                    <span className="tag ruined">−{s.changedWrong ?? 0}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
