# Cerca Liceo - Engineering Guardrails

These instructions apply to the entire repository.

## Protect Existing Behavior

- Read the relevant screen, shared helpers, tests, and existing CSS before editing.
- Keep changes scoped to one screen or component unless the user explicitly requests a broader refactor.
- Do not replace working flows, Supabase policies, mobile compatibility rules, or visual systems while making a cosmetic change.
- Work with unrelated local changes and untracked files. Do not delete or revert them.

## Motion System

The application already owns its adaptive motion policy in `src/lib/motion.js`. It assigns one of these classes to `<html>`:

- `motion-rich`: enhanced motion for capable devices.
- `motion-lite`: static or very light presentation for constrained devices.
- `motion-reduced`: accessibility mode for reduced-motion preferences.

`android-compat` is an additional safety class used for Android devices that previously showed GPU rendering artifacts.

### Rules For Every Visual Change

- Animate only `transform` and `opacity`.
- Never animate `box-shadow`, `filter`, `backdrop-filter`, `mask-image`, `width`, `height`, `top`, `left`, layout, or paint-heavy properties.
- Never introduce `backdrop-filter` or animated blur as decoration.
- Use 180-350 ms for button/card microinteractions. Existing section reveals may keep their established duration, but do not make them longer or more complex.
- Never use `animation: infinite` except for an explicit, short-lived loading indicator.
- Keep no more than one or two noticeable animations active in the same viewport.
- Do not add `will-change` permanently. Add it only during a measured interaction and remove it afterward.
- Do not apply `contain: paint` without checking shadows, menus, tooltips, and content that can overflow.
- `@supports` only detects CSS syntax support; it is not permission to enable expensive rendering on weak hardware.
- New scroll reveals must use `data-motion-reveal` and the existing IntersectionObserver behavior. Do not create a second observer or parallel tier system.
- Do not edit `src/lib/motion.js` for a component-level animation. Edit it only when the task explicitly changes tier selection or reveal infrastructure.

### Existing Reveal Pattern

Markup:

```jsx
<section
  className="example-panel"
  data-motion-reveal
  style={{ '--motion-order': 2 }}
>
  ...
</section>
```

CSS:

```css
html.motion-rich .example-panel.is-motion-visible .example-card {
  animation: cercaResultReveal 280ms cubic-bezier(0.2, 0.82, 0.25, 1) both;
}

html.motion-lite .example-card,
html.motion-reduced .example-card,
html.android-compat .example-card {
  animation: none;
  opacity: 1;
  transform: none;
}
```

Use the current `search-panel`, `home-search-chips`, and `today-panel-featured` rules in `src/App.css` as the visual reference. Copy their architecture, not necessarily every effect.

## Rich Decorative Layer

This is a narrow exception for an optional decorative 3D layer. It does not relax any rule for `motion-lite`, `motion-reduced`, or `android-compat`.

- CSS 3D transforms (`perspective`, `rotateX`, `rotateY`, `rotateZ`, and `translateZ`) are allowed only inside `html.motion-rich` and only for sections marked with `data-decorative-3d`.
- A `data-decorative-3d` section may contain multiple transformed decorative elements because they still animate only `transform` and `opacity`.
- WebGL/Three.js is optional and must be loaded through a dynamic import only when all of these conditions are true:
  - `<html>` currently has `motion-rich`.
  - `window.WebGLRenderingContext` exists.
  - The decorative section is close enough to the viewport to be useful.
- Prefer `React.lazy` and `Suspense` so Three.js and React Three Fiber remain in a separate chunk.
- The static skeleton/fallback is the default render. It must remain complete and attractive for `motion-lite`, `motion-reduced`, `android-compat`, browsers without WebGL, and failed dynamic imports.
- Never download or mount the 3D bundle in `motion-lite`, `motion-reduced`, or `android-compat`.
- Pause the WebGL render loop when the decorative section leaves the viewport.
- If the shared motion policy downgrades the page from `motion-rich`, unmount the WebGL layer and return to the static fallback without reloading.
- The 3D layer is decorative only: headings, calls to action, navigation, and product information must remain normal accessible HTML outside the canvas.
- Do not modify the existing safety rules for `motion-lite`, `motion-reduced`, or `android-compat` while implementing this exception.

## Mobile Compatibility

- Cerca Liceo is mobile-first and must remain usable on older Xiaomi and Samsung Android phones.
- Minimum supported layout width is 320 px; verify 360 px as the primary low-end Android viewport.
- Text, actions, and fixed navigation must not overlap or cause horizontal scrolling.
- Compatibility modes must render all content immediately with `animation: none`, full opacity, and no transforms.
- A visual improvement is not complete until normal and compatibility modes are both checked.

## Required Validation

For every code change, run:

```bash
npm run lint
npm test -- --run
npm run build
```

For motion or responsive changes, also verify:

1. `motion-rich`: below-the-fold elements reveal only when entering the viewport.
2. `motion-lite`, `motion-reduced`, and `android-compat`: content is immediately visible and static.
3. No horizontal overflow at 360 px and the narrowest supported viewport.
4. No console errors on the changed flow.
5. Production deployment serves the new asset hashes before reporting completion.

If tier logic changes, update `tests/motion.test.js` in the same change.
