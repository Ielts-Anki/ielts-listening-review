"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Player from "@/components/Player";
import { isCorrect, splitSentences, diffWords, highlightTranscript } from "@/lib/text.mjs";

const STEPS = ["Scan đề", "Nghe lần 1", "Nghe lần 2", "Check", "Transcript", "Chép chính tả", "Rút kinh nghiệm"];
const GUESS_TYPES = ["", "số", "ngày / giờ", "tên riêng", "danh từ", "danh từ số nhiều", "động từ", "tính từ", "khác"];
const REASONS = ["nghe nhầm", "chưa biết từ", "sai chính tả", "bẫy paraphrase"];

export default function TestPage() {
  const { id } = useParams();
  const router = useRouter();
  const [test, setTest] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // num -> {r1, r2}
  const [mistakes, setMistakes] = useState({}); // num -> reason
  const [vocabRaw, setVocabRaw] = useState("");
  const [sessionSaved, setSessionSaved] = useState(false);
  const [vocabDone, setVocabDone] = useState(0);
  const [uploading, setUploading] = useState(false);
  const loaded = useRef(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    fetch(`/api/tests/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setTest(d.test);
        const dr = d.test?.draft;
        if (dr) {
          setStep(dr.step || 0);
          setAnswers(dr.answers || {});
          setMistakes(dr.mistakes || {});
          setVocabRaw(dr.vocabRaw || "");
          setSessionSaved(!!dr.sessionSaved);
        }
        loaded.current = true;
      });
  }, [id]);

  // Tự lưu nháp — đóng máy giữa chừng cũng không mất phiên đang làm.
  const saveDraft = useCallback((next) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch(`/api/tests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: next }),
      });
    }, 700);
  }, [id]);

  useEffect(() => {
    if (!loaded.current || !test) return;
    saveDraft({ step, answers, mistakes, vocabRaw, sessionSaved });
  }, [step, answers, mistakes, vocabRaw, sessionSaved, saveDraft, test]);

  const patch = useCallback(async (body) => {
    const r = await fetch(`/api/tests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (d.test) setTest(d.test);
    return d.test;
  }, [id]);

  const setQ = (num, field, value) => {
    const qs = test.questions.map((q) => (q.num === num ? { ...q, [field]: value } : q));
    setTest({ ...test, questions: qs });
  };
  const saveQuestions = () => patch({ questions: test.questions });

  const setAns = (num, round, value) => {
    setAnswers((prev) => ({ ...prev, [num]: { ...prev[num], [round]: value } }));
  };

  // Kết quả chấm — tính lại từ answers + key mỗi lần render.
  const results = useMemo(() => {
    if (!test) return null;
    let score = 0, changedRight = 0, changedWrong = 0;
    const rows = test.questions.map((q) => {
      const a = answers[q.num] || {};
      const r1 = a.r1 || "";
      const r2 = a.r2 !== undefined && a.r2 !== "" ? a.r2 : r1;
      const changed = r2.trim() !== r1.trim() && (r1 || r2);
      const ok1 = isCorrect(r1, q.key);
      const ok2 = isCorrect(r2, q.key);
      if (ok2) score++;
      let changeTag = null;
      if (changed && !ok1 && ok2) { changeTag = "saved"; changedRight++; }
      if (changed && ok1 && !ok2) { changeTag = "ruined"; changedWrong++; }
      return { q, r1, r2, changed, ok1, ok2, changeTag };
    });
    return { rows, score, total: test.questions.length, changedRight, changedWrong };
  }, [test, answers]);

  const keysReady = test?.questions.every((q) => (q.key || "").trim());

  async function grade() {
    await patch({ questions: test.questions });
    const payload = {
      answers,
      score: results.score,
      total: results.total,
      changedRight: results.changedRight,
      changedWrong: results.changedWrong,
      part: test.part,
      mistakes: {},
    };
    if (!sessionSaved) {
      await patch({ addSession: payload });
      setSessionSaved(true);
    } else {
      await patch({ updateLastSession: payload });
    }
  }

  async function saveMistakes(next) {
    setMistakes(next);
    if (sessionSaved) await patch({ updateLastSession: { mistakes: next } });
  }

  async function addVocab() {
    if (!vocabRaw.trim()) return;
    const r = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw: vocabRaw, testId: id }),
    });
    const d = await r.json();
    setVocabDone(d.added);
    setVocabRaw("");
  }

  async function finish() {
    await patch({ draft: null });
    router.push("/");
  }

  async function uploadAudio(file) {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/audio", { method: "POST", body: fd });
    const d = await r.json();
    setUploading(false);
    if (d.url) patch({ audioUrl: d.url });
  }

  if (!test) return <p className="muted" style={{ marginTop: 40 }}>Đang tải…</p>;

  const wrongRows = results.rows.filter((r) => !r.ok2 && (r.r1 || r.r2 || r.q.key));
  const segs = highlightTranscript(test.transcript, test.questions);
  const sentences = splitSentences(test.transcript);

  return (
    <div>
      <div className="row" style={{ marginTop: 22, justifyContent: "space-between" }}>
        <div>
          <div className="test-meta" style={{ marginBottom: 4 }}>
            <span className="chip">{test.source}</span>
            {test.testNo && <span className="chip">Test {test.testNo}</span>}
            <span className="chip part">Part {test.part}</span>
          </div>
          <div className="display" style={{ fontSize: 22, fontWeight: 700 }}>
            {test.title || `Câu ${test.questions[0]?.num}–${test.questions[test.questions.length - 1]?.num}`}
          </div>
          {test.link && <a className="small" href={test.link} target="_blank" rel="noreferrer">Mở link đề gốc ↗</a>}
        </div>
        <button className="btn danger" onClick={async () => { if (confirm("Xoá bài này và toàn bộ lịch sử?")) { await fetch(`/api/tests/${id}`, { method: "DELETE" }); router.push("/"); } }}>Xoá bài</button>
      </div>

      <div className="stepper" role="tablist">
        {STEPS.map((s, i) => (
          <button key={s} className={"step-chip" + (i === step ? " now" : i < step ? " done" : "")} onClick={() => setStep(i)}>
            <span className="n">{i < step ? "✓" : i + 1}</span>{s}
          </button>
        ))}
      </div>

      {/* ============ 1. SCAN ĐỀ ============ */}
      {step === 0 && (
        <div className="card pad">
          <p className="muted small" style={{ marginTop: 0 }}>
            Trước khi bật audio: đọc đề và với mỗi chỗ trống, <b>đoán loại đáp án</b>. Sau bước Check, app sẽ đối chiếu dự đoán này với đáp án thật.
          </p>
          <div className="row" style={{ alignItems: "flex-end", marginBottom: 16 }}>
            <div className="field" style={{ flex: 1, minWidth: 240 }}>
              <label>Audio — dán link file trực tiếp (mp3/m4a…)</label>
              <input value={test.audioUrl} onChange={(e) => setTest({ ...test, audioUrl: e.target.value })} onBlur={() => patch({ audioUrl: test.audioUrl })} placeholder="https://…/audio.mp3 hoặc chọn file bên cạnh" />
            </div>
            <label className="btn">
              {uploading ? "Đang tải lên…" : "Chọn file từ máy"}
              <input type="file" accept="audio/*" hidden onChange={(e) => uploadAudio(e.target.files?.[0])} />
            </label>
          </div>
          {test.questions.map((q) => (
            <div key={q.num} className="q-row" style={{ gridTemplateColumns: "34px 1fr 190px" }}>
              <div className="q-num">{q.num}</div>
              <input className="ink-input" style={{ color: "var(--ink)", fontFamily: "Inter" }} placeholder="Nội dung / ngữ cảnh câu hỏi (tuỳ chọn)" value={q.text} onChange={(e) => setQ(q.num, "text", e.target.value)} onBlur={saveQuestions} />
              <select value={q.guessType} onChange={(e) => { setQ(q.num, "guessType", e.target.value); }} onBlur={saveQuestions} style={{ border: "1px solid var(--rule)", borderRadius: 8, padding: "6px 8px" }}>
                {GUESS_TYPES.map((g) => <option key={g} value={g}>{g || "— đoán loại đáp án —"}</option>)}
              </select>
            </div>
          ))}
          <div className="row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
            <button className="btn primary" onClick={async () => { await saveQuestions(); setStep(1); }}>Xong, vào nghe lần 1 →</button>
          </div>
        </div>
      )}

      {/* ============ 2. NGHE LẦN 1 — MỰC XANH ============ */}
      {step === 1 && (
        <div className="card pad">
          <p className="muted small" style={{ marginTop: 0 }}>
            Nghe một lượt và điền bằng <b style={{ color: "var(--blue)" }}>mực xanh</b>. Chưa chắc cũng cứ điền — lần 2 mới là lúc sửa.
          </p>
          <Player src={test.audioUrl} />
          {!test.audioUrl && <p className="small" style={{ color: "var(--amber)" }}>Chưa có audio — quay lại bước Scan đề để dán link hoặc chọn file.</p>}
          <div className="sheet" style={{ marginTop: 14 }}>
            {test.questions.map((q) => (
              <div key={q.num} className="q-row">
                <div className="q-num">{q.num}</div>
                <div>
                  <input className="ink-input blue" value={answers[q.num]?.r1 || ""} onChange={(e) => setAns(q.num, "r1", e.target.value)} autoComplete="off" spellCheck={false} />
                  {(q.text || q.guessType) && <div className="q-note">{q.text}{q.text && q.guessType ? " · " : ""}{q.guessType && <>đoán: <b>{q.guessType}</b></>}</div>}
                </div>
              </div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
            <button className="btn primary" onClick={() => setStep(2)}>Nghe lần 2 →</button>
          </div>
        </div>
      )}

      {/* ============ 3. NGHE LẦN 2 — MỰC ĐỎ ============ */}
      {step === 2 && (
        <div className="card pad">
          <p className="muted small" style={{ marginTop: 0 }}>
            Nghe lại và sửa. Ô nào bạn đổi sẽ chuyển sang <b style={{ color: "var(--red)" }}>mực đỏ</b>, bản cũ gạch đi — đúng như đổi bút trên giấy.
          </p>
          <Player src={test.audioUrl} />
          <div className="sheet" style={{ marginTop: 14 }}>
            {test.questions.map((q) => {
              const a = answers[q.num] || {};
              const r1 = a.r1 || "";
              const cur = a.r2 !== undefined ? a.r2 : r1;
              const changed = a.r2 !== undefined && a.r2.trim() !== r1.trim();
              return (
                <div key={q.num} className="q-row">
                  <div className="q-num">{q.num}</div>
                  <div>
                    <input className={"ink-input " + (changed ? "red" : "blue")} value={cur} onChange={(e) => setAns(q.num, "r2", e.target.value)} autoComplete="off" spellCheck={false} />
                    {changed && r1 && <span className="was">{r1}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
            <button className="btn primary" onClick={() => setStep(3)}>Check đáp án →</button>
          </div>
        </div>
      )}

      {/* ============ 4. CHECK ============ */}
      {step === 3 && (
        <div className="card pad">
          {!keysReady && (
            <>
              <p className="muted small" style={{ marginTop: 0 }}>
                Nhập <b>đáp án đúng</b> từ answer key (nhiều phương án cách nhau bằng “/”, phần tuỳ chọn để trong ngoặc — VD: <span className="mono">(the) library</span>).
              </p>
              <div className="sheet">
                {test.questions.map((q) => (
                  <div key={q.num} className="q-row">
                    <div className="q-num">{q.num}</div>
                    <input className="ink-input" style={{ color: "var(--green)" }} value={q.key} onChange={(e) => setQ(q.num, "key", e.target.value)} autoComplete="off" spellCheck={false} placeholder="đáp án đúng" />
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="row" style={{ margin: "14px 0" }}>
            <button className="btn primary" disabled={!keysReady} onClick={grade}>{sessionSaved ? "Chấm lại & cập nhật phiên" : "Chấm điểm & lưu phiên"}</button>
            {!keysReady && <span className="small muted">Điền đủ đáp án đúng rồi mới chấm được.</span>}
            {keysReady && <button className="btn ghost" onClick={() => { const qs = test.questions.map((q) => ({ ...q, key: "" })); setTest({ ...test, questions: qs }); setSessionSaved(sessionSaved); }}>Sửa đáp án đúng</button>}
          </div>

          {sessionSaved && (
            <>
              <div className="verdict">
                <span className={`big ${results.score / results.total >= 0.8 ? "" : ""}`} style={{ color: results.score / results.total >= 0.8 ? "var(--green)" : results.score / results.total >= 0.6 ? "var(--amber)" : "var(--red)" }}>
                  {results.score}/{results.total}
                </span>
                <span className="tag saved">lần 2 cứu được {results.changedRight} câu</span>
                <span className="tag ruined">lần 2 làm hỏng {results.changedWrong} câu</span>
              </div>
              <table className="check">
                <thead>
                  <tr><th className="mono">#</th><th>Đoán loại</th><th>Lần 1</th><th>Lần 2</th><th>Đáp án</th><th>Kết quả</th></tr>
                </thead>
                <tbody>
                  {results.rows.map(({ q, r1, r2, changed, ok2, changeTag }) => (
                    <tr key={q.num}>
                      <td className="mono">{q.num}</td>
                      <td className="small muted">{q.guessType || "—"}</td>
                      <td className="mono"><span className="ans-r1">{r1 || "—"}</span></td>
                      <td className="mono">{changed ? <span className="ans-r2">{r2 || "—"}</span> : <span className="muted">=</span>}</td>
                      <td className="mono" style={{ color: "var(--green)", fontWeight: 600 }}>{q.key}</td>
                      <td>
                        <span className={"tag " + (ok2 ? "ok" : "no")}>{ok2 ? "đúng" : "sai"}</span>{" "}
                        {changeTag === "saved" && <span className="tag saved">đổi đúng</span>}
                        {changeTag === "ruined" && <span className="tag ruined">đổi sai</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
                <button className="btn primary" onClick={() => setStep(4)}>Xem transcript →</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============ 5. TRANSCRIPT ============ */}
      {step === 4 && (
        <div className="card pad">
          {!test.transcript ? (
            <>
              <p className="muted small" style={{ marginTop: 0 }}>Dán transcript của bài (từ sách hoặc nguồn của bạn). App sẽ tự tìm và đánh dấu vị trí từng đáp án.</p>
              <textarea className="field" style={{ width: "100%", minHeight: 220, border: "1px solid var(--rule)", borderRadius: 9, padding: 10, lineHeight: 1.7 }} value={test.transcript} onChange={(e) => setTest({ ...test, transcript: e.target.value })} placeholder="Dán transcript vào đây…" />
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn primary" onClick={() => patch({ transcript: test.transcript })}>Lưu transcript</button>
              </div>
            </>
          ) : (
            <>
              <div className="q-jump">
                {test.questions.map((q) => (
                  <button key={q.num} onClick={() => document.getElementById(`ans-${q.num}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>
                    {q.num}
                  </button>
                ))}
                <button className="btn ghost small" onClick={() => patch({ transcript: "" })}>Sửa transcript</button>
              </div>
              <div className="transcript">
                {segs.map((s, i) =>
                  s.qnum ? (
                    <mark key={i} id={`ans-${s.qnum}`}><span className="mnum">{s.qnum}</span>{s.text}</mark>
                  ) : (
                    <span key={i}>{s.text}</span>
                  )
                )}
              </div>
              <p className="small muted">Bấm số câu để nhảy tới đoạn chứa đáp án — đọc quanh đó để hiểu vì sao ra đáp án. Đáp án không tìm thấy trong transcript sẽ không có nút highlight (thường do transcript viết khác chính tả).</p>
            </>
          )}
          <div className="row" style={{ marginTop: 14, justifyContent: "space-between" }}>
            <button className="btn ghost" onClick={() => setStep(6)}>Bỏ qua chép chính tả →</button>
            <button className="btn primary" onClick={() => setStep(5)}>Chép chính tả →</button>
          </div>
        </div>
      )}

      {/* ============ 6. CHÉP CHÍNH TẢ ============ */}
      {step === 5 && (
        <div className="card pad">
          <p className="muted small" style={{ marginTop: 0 }}>
            Transcript được giấu đi theo từng câu. Nghe (dùng ⟲ 3s và 0.75x thoải mái), gõ lại, rồi bấm <b>So khớp</b> — đúng xanh, thiếu gạch xám, thừa/sai gạch đỏ.
          </p>
          <Player src={test.audioUrl} />
          {test.link && (
            <p className="small"><a href={test.link} target="_blank" rel="noreferrer">Hoặc mở chép chính tả bên DOL ↗</a></p>
          )}
          {sentences.length === 0 && <p className="small" style={{ color: "var(--amber)" }}>Chưa có transcript — quay lại bước Transcript để dán trước.</p>}
          <div style={{ marginTop: 12 }}>
            {sentences.map((sent, i) => <DictRow key={i} idx={i + 1} sent={sent} />)}
          </div>
          <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
            <button className="btn primary" onClick={() => setStep(6)}>Rút kinh nghiệm →</button>
          </div>
        </div>
      )}

      {/* ============ 7. RÚT KINH NGHIỆM ============ */}
      {step === 6 && (
        <div>
          <div className="card pad">
            <h2 className="section" style={{ marginTop: 0 }}>Vì sao sai?</h2>
            {wrongRows.length === 0 ? (
              <p className="muted small">Không có câu sai — ghi nhận một phiên sạch sẽ 🎯</p>
            ) : (
              <table className="check">
                <thead><tr><th className="mono">#</th><th>Bạn điền</th><th>Đáp án</th><th>Lý do sai</th></tr></thead>
                <tbody>
                  {wrongRows.map(({ q, r2 }) => (
                    <tr key={q.num}>
                      <td className="mono">{q.num}</td>
                      <td className="mono"><span className="ans-r2">{r2 || "—"}</span></td>
                      <td className="mono" style={{ color: "var(--green)" }}>{q.key}</td>
                      <td>
                        <div className="row" style={{ gap: 6 }}>
                          {REASONS.map((r) => (
                            <button key={r} className={"btn small" + (mistakes[q.num] === r ? " primary" : "")} style={{ padding: "4px 10px", fontSize: 12.5 }} onClick={() => saveMistakes({ ...mistakes, [q.num]: r })}>
                              {r}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card pad" style={{ marginTop: 14 }}>
            <h2 className="section" style={{ marginTop: 0 }}>Từ mới → flashcard</h2>
            <p className="muted small">Mỗi dòng một từ, dạng <span className="mono">từ : nghĩa</span>. Thẻ sẽ tự lên lịch ôn lặp lại ngắt quãng ở tab “Ôn thẻ”.</p>
            <textarea style={{ width: "100%", minHeight: 130, border: "1px solid var(--rule)", borderRadius: 9, padding: 10, lineHeight: 1.8, fontFamily: "JetBrains Mono" }} value={vocabRaw} onChange={(e) => setVocabRaw(e.target.value)} placeholder={"accommodation : chỗ ở\nfortnight : hai tuần"} />
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn blue" onClick={addVocab} disabled={!vocabRaw.trim()}>Tạo thẻ</button>
              {vocabDone > 0 && <span className="tag ok">đã thêm {vocabDone} thẻ</span>}
            </div>
          </div>

          <div className="row" style={{ marginTop: 18, justifyContent: "flex-end" }}>
            <button className="btn primary" onClick={finish}>Hoàn tất phiên ✓</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DictRow({ idx, sent }) {
  const [typed, setTyped] = useState("");
  const [shown, setShown] = useState(false);
  const diff = shown ? diffWords(typed, sent) : null;
  return (
    <div className="dict-sent">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="idx">Câu {idx} · {sent.split(/\s+/).length} từ</span>
        {diff && <span className="acc" style={{ color: diff.accuracy >= 80 ? "var(--green)" : diff.accuracy >= 50 ? "var(--amber)" : "var(--red)" }}>{diff.accuracy}%</span>}
      </div>
      {!shown ? (
        <div className="row" style={{ marginTop: 8 }}>
          <input className="ink-input blue" style={{ flex: 1 }} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Gõ lại câu bạn nghe được…" spellCheck={false}
            onKeyDown={(e) => { if (e.key === "Enter" && typed.trim()) setShown(true); }} />
          <button className="btn" onClick={() => setShown(true)} disabled={!typed.trim()}>So khớp</button>
        </div>
      ) : (
        <div className="dict-diff" style={{ marginTop: 8 }}>
          {diff.parts.map((p, i) => <span key={i} className={"dw " + p.state}>{p.word}</span>)}
          <div><button className="btn ghost small" onClick={() => { setShown(false); }}>Thử lại</button></div>
        </div>
      )}
    </div>
  );
}
