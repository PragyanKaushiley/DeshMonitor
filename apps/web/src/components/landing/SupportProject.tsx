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
          className="mt-2 inline-flex items-center gap-2 font-mono text-xs tracking-[0.2em] text-foreground underline underline-offset-4 hover:text-muted-foreground"
        >
          BUY ME A COFFEE ☕
        </a>
      </div>
    </section>
  );
}
