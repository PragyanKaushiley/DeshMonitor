import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Desh } from "@/components/landing/Desh";
import { LandingNav } from "@/components/landing/LandingNav";
import { PrivacyChoicesButton } from "@/components/consent/PrivacyChoicesButton";
import { VisitTracker } from "@/components/consent/VisitTracker";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Desh Monitor records about visits and accounts, why, and your choices.",
  alternates: { canonical: "/privacy" },
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl text-foreground">{title}</h2>
      <div className="space-y-3 text-base leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <LandingNav sceneLabel="PRIVACY" />
      <main className="mx-auto w-full max-w-2xl space-y-10 px-6 pt-32 pb-24">
        <header className="space-y-3">
          <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">LAST UPDATED SEPTEMBER 2026</p>
          <h1 className="font-display text-4xl text-foreground sm:text-5xl">Privacy policy</h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            <Desh /> Monitor is an independent project. This page explains what we record when you visit or use an
            account, why, and the choices you have.
          </p>
        </header>

        <Section title="When you visit">
          <p>
            Only if you choose <strong className="text-foreground">Accept</strong> in the privacy banner, we record
            each visit to understand who uses the site and how they find it:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>your IP address;</li>
            <li>
              your approximate location as estimated by our hosting provider — country, region, city, postal code,
              coordinates and time zone;
            </li>
            <li>your network provider;</li>
            <li>your browser, device and language settings;</li>
            <li>the page you visited, the site that referred you, and any campaign (UTM) tags in the link;</li>
            <li>when the visit started and how many pages you viewed.</li>
          </ul>
          <p>
            To group visits from the same browser we set a cookie (<code>dm_vid</code>) that lasts one year. If you
            choose <strong className="text-foreground">Decline</strong>, nothing is recorded and no such cookie is
            set; the site works exactly the same.
          </p>
        </Section>

        <Section title="When you have an account">
          <p>
            When you sign up or log in, we record the same connection details (IP address, approximate location,
            browser) with that login, to keep your account secure and let you recognise your sessions. Logins use a
            session cookie that lasts up to 30 days. If you signed in on a browser where you had accepted visit
            recording, earlier visits from that browser are linked to your account.
          </p>
        </Section>

        <Section title="Cookies and storage">
          <p>
            Everything below is set by this site alone — nothing is used for advertising, and nothing is shared with
            other companies. Only the first one depends on your choice in the privacy banner.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left font-mono text-[10px] tracking-[0.15em] text-foreground">
                  <th scope="col" className="py-2 pr-3 font-medium">NAME</th>
                  <th scope="col" className="py-2 pr-3 font-medium">WHAT IT IS</th>
                  <th scope="col" className="py-2 pr-3 font-medium">SET WHEN</th>
                  <th scope="col" className="py-2 pr-3 font-medium">LASTS</th>
                  <th scope="col" className="py-2 font-medium">NEEDS CONSENT</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["dm_vid", "Cookie", "You accept the banner", "1 year", "Yes — asked by the banner"],
                  ["session", "Cookie", "You log in or sign up", "30 days", "No — needed to stay logged in"],
                  ["dm_consent", "Browser storage", "You choose Accept or Decline", "Until cleared", "No — remembers your choice"],
                  ["theme", "Browser storage", "You switch light or dark", "Until cleared", "No — remembers your theme"],
                ].map(([name, kind, when, lasts, consent]) => (
                  <tr key={name} className="border-b border-border/60 align-top">
                    <td className="py-2 pr-3">
                      <code className="text-foreground">{name}</code>
                    </td>
                    <td className="py-2 pr-3">{kind}</td>
                    <td className="py-2 pr-3">{when}</td>
                    <td className="py-2 pr-3">{lasts}</td>
                    <td className="py-2">{consent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Who processes it">
          <p>
            The site and its API run on Cloudflare, which also provides the location estimate. Records are stored in
            a Neon PostgreSQL database, and active login sessions in Upstash Redis. We don&apos;t sell this data or
            share it with advertisers.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>Visit and login records are kept until you ask us to delete them.</p>
        </Section>

        <Section title="Your choices">
          <p>
            You can change or withdraw your choice at any time with{" "}
            <PrivacyChoicesButton className="text-foreground underline underline-offset-2" />. To access or delete
            the data recorded about you, contact us — contact email coming soon.
          </p>
        </Section>

        <Link href="/" className="inline-flex py-2 font-mono text-xs tracking-[0.2em] underline underline-offset-4">
          ← BACK TO HOME
        </Link>
      </main>
      <VisitTracker />
    </>
  );
}
