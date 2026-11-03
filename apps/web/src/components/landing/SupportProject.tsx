import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { PrivacyChoicesButton } from "@/components/consent/PrivacyChoicesButton";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";

const BMC_URL = "https://buymeacoffee.com/pragyankyx";

export function SupportProject() {
  return (
    <section className="w-full border-t border-border bg-background px-6 py-16 sm:px-12 md:px-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center">
        {/* One profile card: who I am, why, and the way to support the work.
            Wide, to line up with the grid above it: identity on the left,
            the words on the right. */}
        <div className="w-full rounded-xl border border-border bg-card/80 p-6 text-left shadow-(--shadow-card) sm:p-8 md:flex md:gap-8 dark:border-white/10">
          {/* A wide square portrait, centred in its column, with the name under it. */}
          <div className="flex flex-col items-center justify-center gap-4 text-center md:w-52 md:shrink-0 md:border-r md:border-border md:pr-8">
            {/* Placeholder portrait: replace public/profile/pragyan.svg (or point
                src at a new image) with a square photo. */}
            <Image
              src="/profile/pragyan.svg"
              alt="Portrait of Pragyan"
              width={208}
              height={208}
              className="aspect-square w-36 rounded-lg object-cover ring-1 ring-teal-700 dark:ring-teal-400"
            />
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[11px] tracking-[0.2em] text-foreground">PRAGYAN</span>
              <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">SOFTWARE DEVELOPER</span>
            </div>
          </div>
          <div className="mt-5 flex flex-col justify-center md:mt-0">
            <p className="text-sm leading-relaxed text-muted-foreground">
              I&apos;m Pragyan, a software developer who loves building things, breaking things, and occasionally
              wondering why I decided to build them in the first place.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              If you find my work useful or interesting, you can support me with a coffee. It helps me keep
              building, experimenting, and turning questionable ideas into actual products.
            </p>
            <div className="mt-4 border-t border-border pt-3 max-md:text-center">
              <a
                href={BMC_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-block py-3 font-mono text-xs tracking-[0.2em] text-foreground hover:text-muted-foreground"
              >
                {/* The underline is a border under the whole phrase: a text underline
                    is clipped away beneath the gradient text. */}
                <span className="border-b border-current pb-0.5">
                  <AnimatedGradientText colorFrom="var(--grad-from)" colorTo="var(--grad-to)" speed={1.5}>
                    BUY ME A COFFEE
                  </AnimatedGradientText>
                  <span aria-hidden className="relative -top-[3px] ml-2 align-middle text-[15px] leading-none">
                    ☕
                  </span>
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Attribution required by the licences of the map data used on this page. */}
        <p className="mt-8 max-w-xl text-xs leading-relaxed text-muted-foreground">
          India boundary and state borders by the <ExternalLink href="https://github.com/datameet/maps">DataMeet India community</ExternalLink> (
          <ExternalLink href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</ExternalLink>). World boundaries
          from <ExternalLink href="https://www.naturalearthdata.com/">Natural Earth</ExternalLink>.
        </p>
        <p className="flex gap-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="inline-block py-3 underline underline-offset-2 hover:text-foreground">
            Privacy policy
          </Link>
          <PrivacyChoicesButton className="py-3 underline underline-offset-2 hover:text-foreground" />
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
