import "./globals.css";
import Header from "@/components/Header";

export const metadata = {
  title: "IELTS Listening — phiên luyện hai màu mực",
  description: "Luyện Listening theo đúng quy trình sửa tay: scan đề, hai lần nghe, check, transcript, chép chính tả, rút kinh nghiệm.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Header />
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
