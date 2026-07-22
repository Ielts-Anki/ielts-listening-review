"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function scoreClass(pct) {
  if (pct >= 80) return "good";
  if (pct >= 60) return "mid";
  return "bad";
}

export default function Library() {
  const router = useRouter();
  const [tests, setTests] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ source: "Cambridge 18", testNo: "1", part: "1", title: "", link: "", qFrom: "1", qTo: "10" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/tests").then((r) => r.json()).then((d) => setTests(d.tests));
  }, []);

  const groups = useMemo(() => {
    const g = new Map();
    for (const t of tests || []) {
      if (!g.has(t.source)) g.set(t.source, []);
      g.get(t.source).push(t);
    }
    for (const arr of g.values())
      arr.sort((a, b) => String(a.testNo).localeCompare(String(b.testNo), "vi", { numeric: true }) || a.part - b.part);
    return [...g.entries()];
  }, [tests]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/tests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await r.json();
    setBusy(false);
    router.push(`/test/${d.test.id}`);
  }

  return (
    <div>
      <div className="row" style={{ marginTop: 26, justifyContent: "space-between" }}>
        <div>
          <div className="display" style={{ fontSize: 24, fontWeight: 700 }}>Thư viện bài nghe</div>
          <div className="muted small">Nhóm theo nguồn — mỗi bài hiện điểm lần gần nhất và các lần trước đó.</div>
        </div>
        <button className="btn primary" onClick={() => setShowForm(!showForm)}>{showForm ? "Đóng" : "+ Thêm bài nghe"}</button>
      </div>

      {showForm && (
        <form className="card pad" style={{ marginTop: 16 }} onSubmit={create}>
          <div className="row" style={{ alignItems: "flex-end" }}>
            <div className="field" style={{ width: 160 }}>
              <label>Nguồn</label>
              <input value={form.source} onChange={set("source")} placeholder="Cambridge 18" required />
            </div>
            <div className="field" style={{ width: 80 }}>
              <label>Test</label>
              <input value={form.testNo} onChange={set("testNo")} placeholder="1" />
            </div>
            <div className="field" style={{ width: 90 }}>
              <label>Part</label>
              <select value={form.part} onChange={set("part")}>
                {[1, 2, 3, 4].map((p) => <option key={p} value={p}>Part {p}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1, minWidth: 180 }}>
              <label>Tên bài (tuỳ chọn)</label>
              <input value={form.title} onChange={set("title")} placeholder="VD: Holiday rental enquiry" />
            </div>
          </div>
          <div className="row" style={{ alignItems: "flex-end", marginTop: 12 }}>
            <div className="field" style={{ flex: 1, minWidth: 220 }}>
              <label>Link đề / audio gốc (tuỳ chọn)</label>
              <input value={form.link} onChange={set("link")} placeholder="https://…" />
            </div>
            <div className="field" style={{ width: 90 }}>
              <label>Câu từ</label>
              <input value={form.qFrom} onChange={set("qFrom")} inputMode="numeric" />
            </div>
            <div className="field" style={{ width: 90 }}>
              <label>đến</label>
              <input value={form.qTo} onChange={set("qTo")} inputMode="numeric" />
            </div>
            <button className="btn primary" disabled={busy}>{busy ? "Đang tạo…" : "Tạo & bắt đầu luyện"}</button>
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>
            App không kèm sẵn đề hay audio Cambridge — bạn dán link hoặc chọn file audio của mình ở bước nghe.
          </p>
        </form>
      )}

      {tests && tests.length === 0 && (
        <div className="card empty" style={{ marginTop: 40 }}>
          <div className="display">Chưa có bài nghe nào</div>
          Bấm “+ Thêm bài nghe” để tạo phiên luyện đầu tiên — chỉ cần Nguồn, Part và dải số câu.
        </div>
      )}

      {groups.map(([source, arr]) => (
        <section key={source}>
          <div className="source-h">
            <h3>{source}</h3>
            <span className="count">{arr.length} bài</span>
          </div>
          <div className="test-grid">
            {arr.map((t) => {
              const last = t.sessions[t.sessions.length - 1];
              const pct = last ? Math.round((last.score / last.total) * 100) : null;
              return (
                <Link key={t.id} href={`/test/${t.id}`} className="card test-card">
                  <div className="test-meta">
                    {t.testNo && <span className="chip">Test {t.testNo}</span>}
                    <span className="chip part">Part {t.part}</span>
                    {t.draft && <span className="chip" style={{ background: "var(--amber-soft)", color: "var(--amber)" }}>đang dở</span>}
                  </div>
                  <div className="test-title">{t.title || `Câu ${t.questions[0]?.num}–${t.questions[t.questions.length - 1]?.num}`}</div>
                  <div className="score-line">
                    {last ? (
                      <>
                        <span className={`score-big ${scoreClass(pct)}`}>{last.score}/{last.total}</span>
                        <span className="spark" title="Các lần làm trước">
                          {t.sessions.slice(-8).map((s, i) => {
                            const p = s.total ? s.score / s.total : 0;
                            return <i key={i} className={p >= 0.8 ? "hi" : ""} style={{ height: `${Math.max(15, p * 100)}%` }} />;
                          })}
                        </span>
                      </>
                    ) : (
                      <span className="small muted">chưa làm</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
