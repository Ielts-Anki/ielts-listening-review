"use client";
import { useRef, useState } from "react";

// Trình phát audio: tua lùi/tới 3s, đổi tốc độ — phím tắt J (lùi), K (play/pause), L (tới).
export default function Player({ src }) {
  const ref = useRef(null);
  const [speed, setSpeed] = useState(1);
  const skip = (s) => { if (ref.current) ref.current.currentTime = Math.max(0, ref.current.currentTime + s); };
  const setRate = (r) => { setSpeed(r); if (ref.current) ref.current.playbackRate = r; };
  const onKey = (e) => {
    if (e.key === "j" || e.key === "J") { skip(-3); e.preventDefault(); }
    if (e.key === "l" || e.key === "L") { skip(3); e.preventDefault(); }
    if (e.key === "k" || e.key === "K") {
      const a = ref.current;
      if (a) a.paused ? a.play() : a.pause();
      e.preventDefault();
    }
  };
  if (!src) return null;
  return (
    <div className="player" onKeyDown={onKey} tabIndex={0}>
      <audio ref={ref} src={src} controls preload="metadata" />
      <div className="ctl">
        <button className="btn" onClick={() => skip(-3)}>⟲ 3s</button>
        <button className="btn" onClick={() => skip(3)}>3s ⟳</button>
        {[0.75, 1, 1.25].map((r) => (
          <button key={r} className={"btn" + (speed === r ? " primary" : "")} onClick={() => setRate(r)}>
            {r}x
          </button>
        ))}
        <span className="small muted" style={{ alignSelf: "center" }}>
          Phím tắt khi focus vào player: <span className="kbd">J</span> lùi 3s · <span className="kbd">K</span> phát/dừng · <span className="kbd">L</span> tới 3s
        </span>
      </div>
    </div>
  );
}
