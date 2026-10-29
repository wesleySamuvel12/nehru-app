import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const inter = { variable: "" };
const jakarta = { variable: "" };
const geistMono = { variable: "" };

export const metadata: Metadata = {
  title: "Nehru International School — Unified School ERP",
  description:
    "Premium school operating system: admissions, academics, attendance, examinations, fees, HR, transport, hostel, library, health, communication and analytics in one connected platform.",
  keywords: ["school ERP", "school management", "education software", "student information system"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1320" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${jakarta.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){if(typeof window==='undefined')return;var isNoise=function(s){if(!s||typeof s!=='string')return false;return s.indexOf('chrome-extension://')!==-1||s.indexOf('chrome: call method')!==-1||s.indexOf('bekkpoinfafbjglppgdobfdeckghdhlo')!==-1||s.indexOf('bis_skin_checked')!==-1;};window.addEventListener('error',function(e){var src=(e.filename||'')+' '+(e.message||'')+' '+(e.error&&e.error.stack?e.error.stack:'');if(isNoise(src)){e.preventDefault();e.stopImmediatePropagation();return true;}},true);window.addEventListener('unhandledrejection',function(e){var r=e.reason;var msg=(r&&(r.message||r.stack||String(r)))||'';if(isNoise(msg)){e.preventDefault();e.stopImmediatePropagation();return true;}},true);try{var clean=function(el){if(!el||el.nodeType!==1)return;if(el.hasAttribute('bis_skin_checked'))el.removeAttribute('bis_skin_checked');if(el.hasAttribute('bis_register'))el.removeAttribute('bis_register');var a=el.attributes;if(a){for(var i=a.length-1;i>=0;i--){var n=a[i].name;if(n&&(n.indexOf('bis_')===0||n.indexOf('__processed_')===0)){el.removeAttribute(n);}}}};var obs=new MutationObserver(function(muts){for(var i=0;i<muts.length;i++){var m=muts[i];if(m.type==='attributes'){var name=m.attributeName;if(name&&(name==='bis_skin_checked'||name==='bis_register'||name.indexOf('bis_')===0||name.indexOf('__processed_')===0)){m.target.removeAttribute(name);}}else if(m.type==='childList'){for(var j=0;j<m.addedNodes.length;j++){var n=m.addedNodes[j];clean(n);if(n.querySelectorAll){var list=n.querySelectorAll('[bis_skin_checked],[bis_register]');for(var k=0;k<list.length;k++)clean(list[k]);}}}}});obs.observe(document.documentElement,{attributes:true,subtree:true,childList:true});}catch(err){}})();`,
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
          <Toaster />
          <Sonner position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
