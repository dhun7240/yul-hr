import "./globals.css";

export const metadata = {
  title: "YUL HR ERP",
  description: "노무법인 율 ERP",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-zinc-50 text-zinc-900">{children}</body>
    </html>
  );
}