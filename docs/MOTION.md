# Motion in Cerca Liceo

The motion system is intentionally progressive: capable devices receive polished transitions while constrained Android devices receive a stable static interface.

## Where The Policy Lives

- Tier selection and reveal observation: `src/lib/motion.js`
- Motion styles and compatibility overrides: the final motion section in `src/App.css`
- Tier contract tests: `tests/motion.test.js`

## Adding Motion To A Section

1. Add `data-motion-reveal` to the section that should enter on scroll.
2. Reuse `.is-motion-visible`; do not create another IntersectionObserver.
3. Animate descendants only in `html.motion-rich`.
4. Use only `transform` and `opacity`.
5. Add explicit static fallbacks for lite, reduced, and Android compatibility modes when the base styles are not already sufficient.
6. Validate the changed section in the browser at mobile width before deployment.

## Reference From The Home Screen

```css
html.motion-rich.motion-observer-ready [data-motion-reveal] {
  opacity: 0;
  transform: translateY(24px) scale(0.975);
  transition:
    opacity 560ms cubic-bezier(0.2, 0.82, 0.25, 1),
    transform 560ms cubic-bezier(0.2, 0.82, 0.25, 1);
}

html.motion-rich.motion-observer-ready [data-motion-reveal].is-motion-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}
```

This is the shared section entrance. Component microinteractions should be shorter, usually 180-350 ms.

## Do Not Use

```css
/* Paint-heavy and unsafe for the devices we support. */
filter: blur(...);
backdrop-filter: blur(...);
transition: box-shadow ...;
animation: decorative-loop 2s infinite;
```

The goal is not maximum movement. The goal is clear feedback, hierarchy, and a page that remains reliable on the phones used in the neighborhood.

