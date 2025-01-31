import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/themeProvider";

import { Manrope } from "next/font/google";
import { Inter } from "next/font/google";
import localFont from "next/font/local";

import { GcmpLogo, JazzLogo } from "@/components/logos";
import { SiGithub, SiDiscord, SiTwitter } from "@icons-pack/react-simple-icons";
import { Nav } from "@/components/nav";

// If loading a variable font, you don't need to specify the font weight
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const pragmata = localFont({
    src: "../fonts/PragmataProR_0829.woff2",
    variable: "--font-pragmata",
});

export const metadata: Metadata = {
    title: "Create Next App",
    description: "Generated by create next app",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body
                className={[
                    manrope.variable,
                    pragmata.variable,
                    inter.className,
                    "flex flex-col items-center bg-stone-50 dark:bg-stone-950 overflow-x-hidden",
                ].join(" ")}
            >
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <Nav
                        mainLogo={<JazzLogo className="w-24" />}
                        items={[
                            { title: "Toolkit", href: "/" },
                            { title: "Global Mesh", href: "/mesh" },
                            { title: "Docs & Guides", href: "/docs" },
                            {
                                title: "Blog",
                                href: "https://gcmp.io/news",
                                firstOnRight: true,
                            },
                            {
                                title: "Releases",
                                href: "https://github.com/gardencmp/jazz/releases",
                            },
                            {
                                title: "Roadmap",
                                href: "https://github.com/orgs/gardencmp/projects/4/views/3",
                            },
                            {
                                title: "GitHub",
                                href: "https://github.com/gardencmp/jazz",
                                icon: <SiGithub className="w-5" />,
                            },
                            {
                                title: "Discord",
                                href: "https://discord.gg/utDMjHYg42",
                                icon: <SiDiscord className="w-5" />,
                            },
                            {
                                title: "X",
                                href: "https://x.com/jazz_tools",
                                icon: <SiTwitter className="w-5" />,
                            },
                        ]}
                    />
                    <main className="flex min-h-screen flex-col p-8 max-w-[80rem] w-full">
                        <article
                            className={[
                                "pt-20",
                                "prose lg:prose-lg max-w-none prose-stone dark:prose-invert",
                                "prose-headings:font-display",
                                "prose-h1:text-5xl lg:prose-h1:text-6xl prose-h1:font-medium prose-h1:tracking-tighter",
                                "prose-h2:text-2xl lg:prose-h2:text-3xl prose-h2:font-medium prose-h2:tracking-tight",
                                "prose-p:max-w-3xl prose-p:leading-snug",
                                "prose-strong:font-medium",
                                "prose-code:leading-tight prose-code:before:content-none prose-code:after:content-none prose-code:bg-stone-100 prose-code:dark:bg-stone-900 prose-code:p-1 prose-code:-my-1 prose-code:rounded",
                            ].join(" ")}
                        >
                            {children}
                        </article>
                    </main>
                    <footer className="flex mt-10 min-h-[15rem] -mb-20 bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-400 w-full justify-center">
                        <div className="p-8 max-w-[80rem] w-full flex gap-4">
                            <div className="flex-1 flex flex-col gap-2 text-sm">
                                <GcmpLogo monochrome className="w-32" />
                                <p className="mt-auto">
                                    © 2023
                                    <br />
                                    Garden Computing, Inc.
                                </p>
                            </div>
                            <div className="flex-1 flex flex-col gap-2 text-sm">
                                {/* <h1 className="font-medium">Resources</h1> */}
                            </div>
                            <div className="flex-1 flex flex-col gap-2 text-sm">
                                {/* <h1 className="font-medium">Legal</h1> */}
                            </div>
                            <div className="flex-1 flex flex-col gap-2 text-sm">
                                {/* <h1 className="font-medium">Newsletter</h1> */}
                            </div>
                        </div>
                    </footer>
                </ThemeProvider>
            </body>
        </html>
    );
}
