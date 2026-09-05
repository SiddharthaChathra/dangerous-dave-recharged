export function applyTheme(theme: 'dark' | 'light'): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export function applyReducedMotion(enabled: boolean): void {
  document.documentElement.setAttribute('data-reduced-motion', String(enabled));
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
