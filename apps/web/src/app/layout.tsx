import type { Metadata } from "next";
import { Toaster } from "sonner";
import { outfit, dmSans, jetbrainsMono } from "@/lib/fonts";
import { AuthProvider } from "@/providers/auth-provider";
import { JotaiProvider } from "@/providers/jotai-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import "./globals.css";

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('lemonfin-theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch(e) {}
})();
`;

export const metadata: Metadata = {
  title: "LemonFin",
  description: "Controle financeiro inteligente via WhatsApp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${outfit.variable} ${dmSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <AuthProvider>
          <JotaiProvider>
            <ThemeProvider>
              {children}
              <Toaster
                position="top-right"
                richColors
                duration={3000}
                toastOptions={{
                  style: { fontFamily: "var(--font-dm-sans)" },
                }}
              />
            </ThemeProvider>
          </JotaiProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
