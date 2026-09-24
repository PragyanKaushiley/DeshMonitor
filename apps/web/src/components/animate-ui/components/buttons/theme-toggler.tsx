'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { VariantProps } from 'class-variance-authority';

import {
  ThemeToggler as ThemeTogglerPrimitive,
  type ThemeTogglerProps as ThemeTogglerPrimitiveProps,
  type ThemeSelection,
  type Resolved,
} from '@/components/animate-ui/primitives/effects/theme-toggler';
import { buttonVariants } from '@/components/animate-ui/components/buttons/icon';
import { cn } from '@/lib/utils';

const getIcon = (
  effective: ThemeSelection,
  resolved: Resolved,
  modes: ThemeSelection[],
) => {
  const theme = modes.includes('system') ? effective : resolved;
  return theme === 'system' ? (
    <Monitor />
  ) : theme === 'dark' ? (
    <Moon />
  ) : (
    <Sun />
  );
};

const getNextTheme = (
  effective: ThemeSelection,
  resolved: Resolved,
  modes: ThemeSelection[],
): ThemeSelection => {
  // "system" is intentionally never one of `modes` for this app — the OS
  // preference only decides the *initial* resolved theme. Once the user
  // hasn't picked explicitly yet (effective === "system"), toggling should
  // flip away from whatever is currently showing (`resolved`), not jump to
  // a fixed first mode — otherwise a system-light visitor's first click
  // would be a no-op.
  if (!modes.includes(effective)) {
    return resolved === 'dark' ? 'light' : 'dark';
  }
  const i = modes.indexOf(effective);
  const next = modes[(i + 1) % modes.length];
  return next ?? 'light';
};

type ThemeTogglerButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    modes?: ThemeSelection[];
    onImmediateChange?: ThemeTogglerPrimitiveProps['onImmediateChange'];
    direction?: ThemeTogglerPrimitiveProps['direction'];
  };

function ThemeTogglerButton({
  variant = 'default',
  size = 'default',
  modes = ['light', 'dark'],
  direction = 'ltr',
  onImmediateChange,
  onClick,
  className,
  ...props
}: ThemeTogglerButtonProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <ThemeTogglerPrimitive
      theme={theme as ThemeSelection}
      resolvedTheme={resolvedTheme as Resolved}
      setTheme={setTheme}
      direction={direction}
      {...(onImmediateChange ? { onImmediateChange } : {})}
    >
      {({ effective, resolved, toggleTheme }) => (
        <button
          data-slot="theme-toggler-button"
          className={cn(buttonVariants({ variant, size, className }))}
          onClick={(e) => {
            onClick?.(e);
            toggleTheme(getNextTheme(effective, resolved, modes));
          }}
          {...props}
        >
          {getIcon(effective, resolved, modes)}
        </button>
      )}
    </ThemeTogglerPrimitive>
  );
}

export { ThemeTogglerButton, type ThemeTogglerButtonProps };
