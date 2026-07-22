"use client";
import { useEffect, useState } from "react";
import { preview } from "@/lib/srs.mjs";

const GRADES = [
  { g: "again", label: "Quên" },
  { g: "hard", label: "Khó" },
  { g: "good", label: "Nhớ" },
  { g: "easy", label: "Dễ" },
];

export default function Review() {
  const [due, setDue] = useState(null);
  const [total, setTotal] = useState(0);
  const [flip, setFlip] = useState(false);

  const load = () =>
    fetch("/api/review").then((r) => r.json()).then((d) => { setDue(d.due); setTotal(d.total); setFlip(false); });
  useEffect(() => { load(); }, []);

  async function grade(id, g) {
    await fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, grade: g }) });
    load();
  }

  if (!due) return <p className="muted" style={{ marginTop: 40 }}>Đang tải…</p>;

  if (due.length === 0)
    return (
      <div className="card empty" style={{ marginTop: 40 }}>
        <div className="display">Hôm nay không còn thẻ nào cần ôn</div>
        {total === 0
          ? "Thêm từ mới ở bước Rút kinh nghiệm của mỗi phiên luyện — thẻ sẽ tự xuất hiện ở đây theo lịch."
          : `Toàn bộ ${total} thẻ đều chưa đến hạn. Quay lại vào ngày mai nhé.`}
      </div>
    );

  const card = due[0];
  return (
    <div style={{ marginTop: 30 }}>
      <p className="muted small" style={{ textAlign: "center" }}>Còn {due.length} thẻ đến hạn hôm nay</p>
      <div className="card fc">
        <div className="front">{card.front}</div>
        {flip ? (
          <>
            <div className="back">{card.back || "(chưa có nghĩa)"}</div>
            <div className="grades">
              {GRADES.map(({ g, label }) => (
                <button key={g} className={"btn" + (g === "good" ? " primary" : "")} onClick={() => grade(card.id, g)}>
                  {label}
                  <span className="iv">{preview(card, g)}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="grades">
            <button className="btn primary" onClick={() => setFlip(true)}>Hiện nghĩa</button>
          </div>
        )}
      </div>
    </div>
  );
}
