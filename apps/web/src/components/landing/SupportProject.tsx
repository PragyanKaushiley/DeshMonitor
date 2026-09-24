import Link from "next/link";
import type { ReactNode } from "react";
import { PrivacyChoicesButton } from "@/components/consent/PrivacyChoicesButton";

const BMC_URL = "https://buymeacoffee.com/pragyankyx";

export function SupportProject() {
  return (
    <section className="w-full border-t border-border bg-background px-6 py-16 sm:px-12">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
        <p className="text-sm leading-relaxed text-muted-foreground">
          I&apos;m Pragyan, a software developer who loves building things, breaking things, and occasionally
          wondering why I decided to build them in the first place.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          If you find my work useful or interesting, you can support me with a coffee. ☕ It helps me keep
          building, experimenting, and turning questionable ideas into actual products.
        </p>
        <a
          href={BMC_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-2 inline-flex items-center gap-2 py-2 font-mono text-xs tracking-[0.2em] text-foreground underline underline-offset-4 hover:text-muted-foreground"
        >
          BUY ME A COFFEE ☕
        </a>

        {/* Attribution required by the licences of the map data used on this page. */}
        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
          India boundary by the <ExternalLink href="https://github.com/datameet/maps">DataMeet India community</ExternalLink> (
          <ExternalLink href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</ExternalLink>). India outline by
          Theo10011 and Amog via <ExternalLink href="https://commons.wikimedia.org/wiki/File:India_outline.svg">Wikimedia Commons</ExternalLink> (
          <ExternalLink href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</ExternalLink>). World boundaries from{" "}
          <ExternalLink href="https://www.naturalearthdata.com/">Natural Earth</ExternalLink>.
        </p>
        <p className="flex gap-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            Privacy policy
          </Link>
          <PrivacyChoicesButton className="underline underline-offset-2 hover:text-foreground" />
        </p>
      </div>
    </section>
  );
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className="underline underline-offset-2 hover:text-foreground">
      {children}
    </a>
  );
}
