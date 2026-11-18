import "./globals.css";

export const metadata = {
  title: "DicoNouchi – Dictionnaire Nouchi-Français",
  description: "Découvre et comprends les mots, expressions, proverbes et citations du Nouchi ivoirien.",
  applicationName: "DicoNouchi",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "DicoNouchi",
    statusBarStyle: "black-translucent"
  },
  icons: {
    apple: "/logo-diconouchi.jpg"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#123f32"
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}