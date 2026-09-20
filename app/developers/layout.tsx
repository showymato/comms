import type { Metadata } from "next";
import { DocsShell } from "@/components/developers/docs-shell";
import { Footer } from "@/components/site/footer";
import { SiteNav } from "@/components/site/site-nav";

export const metadata: Metadata = { title: { default: "Developers", template: "%s · COMMS Developers" } };

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <DocsShell>{children}</DocsShell>
      <Footer />
    </>
  );
}
