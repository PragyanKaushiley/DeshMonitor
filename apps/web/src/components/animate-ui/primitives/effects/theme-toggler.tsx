'use client';

import * as React from 'react';
import { flushSync } from 'react-dom';

type ThemeSelection = 'light' | 'dark' | 'system';
type Resolved = 'light' | 'dark';
type Direction = 'btt' | 'ttb' | 'ltr' | 'rtl';

type ChildrenRender =
  | React.ReactNode
  | ((state: {
      resolved: Resolved;
      effective: ThemeSelection;
      toggleTheme: (theme: ThemeSelection) => void;
    }) => React.ReactNode);

function getSystemEffective(): Resolved {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getClipKeyframes(direction: Direction): [string, string] {
  switch (direction) {
    case 'ltr':
      return ['inset(0 100% 0 0)', 'inset(0 0 0 0)'];
    case 'rtl':
      return ['inset(0 0 0 100%)', 'inset(0 0 0 0)'];
    case 'ttb':
      return ['inset(0 0 100% 0)', 'inset(0 0 0 0)'];
    case 'btt':
      return ['inset(100% 0 0 0)', 'inset(0 0 0 0)'];
    default:
      return ['inset(0 100% 0 0)', 'inset(0 0 0 0)'];
  }
}

type ThemeTogglerProps = {
  theme: ThemeSelection;
  resolvedTheme: Resolved;
  setTheme: (theme: ThemeSelection) => void;
  direction?: Direction;
  onImmediateChange?: (theme: ThemeSelection) => void;
  children?: ChildrenRender;
};

function ThemeToggler({
  theme,
  resolvedTheme,
  setTheme,
  onImmediateChange,
  direction = 'ltr',
  children,
  ...props
}: ThemeTogglerProps) {
  const [preview, setPreview] = React.useState<null | {
    effective: ThemeSelection;
    resolved: Resolved;
  }>(null);
  const [current, setCurrent] = React.useState<{
    effective: ThemeSelection;
    resolved: Resolved;
  }>({
    effective: theme,
    resolved: resolvedTheme,
  });

  React.useEffect(() => {
    if (
      preview &&
      theme === preview.effective &&
      resolvedTheme === preview.resolved
    ) {
      setPreview(null);
    }
  }, [theme, resolvedTheme, preview]);

  const [fromClip, toClip] = getClipKeyframes(direction);

  const toggleTheme = React.useCallback(
    async (theme: ThemeSelection) => {
      const resolved = theme === 'system' ? getSystemEffective() : theme;

      setCurrent({ effective: theme, resolved });
      onImmediateChange?.(theme);

      if (theme === 'system' && resolved === resolvedTheme) {
        setTheme(theme);
        return;
      }

      // The circular reveal sweeps the whole screen, so it is skipped for
      // visitors who ask for reduced motion: the theme just switches.
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!document.startViewTransition || reduceMotion) {
        flushSync(() => {
          setPreview({ effective: theme, resolved });
        });
        setTheme(theme);
        return;
      }

      // `.ready` rejects (InvalidStateError) whenever the browser aborts the
      // transition — e.g. the document was hidden mid-flight, or another
      // transition pre-empted it. That's routine, not exceptional: swallow
      // it here so a failed *animation* never blocks the underlying
      // `setTheme` call below — otherwise the theme choice silently fails
      // to persist (next-themes state/localStorage stay on the old value
      // even though the DOM's `dark` class already flipped).
      // Snapshots taken for the transition don't render backdrop-filter
      // (notably in Safari), so a translucent, blurred bar would show what's
      // behind it until the switch completes. While this flag is on, such
      // surfaces go opaque (see the nav); it's cleared when the transition
      // is fully done.
      const root = document.documentElement;
      root.dataset.themeSwitching = '';
      const transition = document.startViewTransition(() => {
        flushSync(() => {
          setPreview({ effective: theme, resolved });
          root.classList.toggle('dark', resolved === 'dark');
        });
      });
      void transition.finished
        .catch(() => {})
        .finally(() => {
          delete root.dataset.themeSwitching;
        });

      await transition.ready.catch(() => {});

      document.documentElement
        .animate(
          { clipPath: [fromClip, toClip] },
          {
            duration: 700,
            easing: 'ease-in-out',
            pseudoElement: '::view-transition-new(root)',
          },
        )
        .finished.catch(() => {})
        .finally(() => {
          setTheme(theme);
        });
    },
    [onImmediateChange, resolvedTheme, fromClip, toClip, setTheme],
  );

  return (
    <React.Fragment {...props}>
      {typeof children === 'function'
        ? children({
            effective: current.effective,
            resolved: current.resolved,
            toggleTheme,
          })
        : children}
      <style>{`::view-transition-old(root), ::view-transition-new(root){animation:none;mix-blend-mode:normal;}`}</style>
    </React.Fragment>
  );
}

export {
  ThemeToggler,
  type ThemeTogglerProps,
  type ThemeSelection,
  type Resolved,
  type Direction,
};
