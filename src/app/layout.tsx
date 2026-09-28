import type { Metadata } from "next";
import { ThemeProvider } from "@/shared/components/providers/theme-provider";
import { Toaster } from "@/shared/components/ui/sonner";
import "./globals.css";
import { america } from "@/public/fonts/font_index";

export const metadata: Metadata = {
	title: {
		default: "OpenMonetis | Suas finanças, do seu jeito",
		template: "%s | OpenMonetis",
	},
	description:
		"Controle suas finanças pessoais de forma simples e transparente.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="pt-BR"
			className={`${america.variable} ${america.className}`}
			suppressHydrationWarning
		>
			<head>
				<meta name="apple-mobile-web-app-title" content="OpenMonetis" />
			</head>
			<body className="subpixel-antialiased" suppressHydrationWarning>
				<ThemeProvider attribute="class" defaultTheme="light">
					{children}
					<Toaster position="top-right" />
				</ThemeProvider>
			</body>
		</html>
	);
}
