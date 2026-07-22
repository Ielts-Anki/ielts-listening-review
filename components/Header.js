"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Header() {
  const path = usePathname();
  const [due, setDue] = useState(0);
  useEffect(() => {
    fetch("/api/review").then((r) => r.json()).then((d) => setDue(d.due?.length || 0)).catch(() => {});
  }, [path]);
  const is = (p) => (p === "/" ? path === "/" || path.startsWith("/test") : path.startsWith(p));
  return (
    <header className="top">
      <div className="top-in">
        <Link href="/" className="brand">
          <span className="ink-dot"><i /><i /></span>
          <h1>IELTS Listening</h1>
        </Link>
        <nav className="tabs">
          <Link href="/" className={is("/") ? "active" : ""}>Thư viện</Link>
          <Link href="/review" className={is("/review") ? "active" : ""}>
            Ôn thẻ{due > 0 && <span className="badge-due">{due}</span>}
          </Link>
          <Link href="/stats" className={is("/stats") ? "active" : ""}>Sổ lỗi</Link>
        </nav>
      </div>
    </header>
  );
}
