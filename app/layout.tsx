import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Periskope Chat",
  description: "Real-time chat application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-['Segoe_UI',_'Helvetica_Neue',_Helvetica,_'Lucida_Grande',_Arial,_Ubuntu,_Cantarell,_'Fira_Sans',_sans-serif]">{children}</body>
    </html>
  );
}
