# Animation Standard

## Root Provider

The app must be wrapped in `BaseMotionProvider`, which uses MotionConfig with `reducedMotion="user"`. This respects the user's reduced-motion preference by disabling transform/layout motion while keeping useful opacity or color transitions.

```tsx
<BaseMotionProvider>
  <BrowserRouter />
</BaseMotionProvider>
```

## Components

- `BaseFadeIn`: low-emphasis entrance for page regions.
- `BaseScaleIn`: small overlay or popover content.
- `BaseSlideIn`: side panels or stacked content.
- `BaseAnimatedSection`: semantic animated section wrapper.
- `BaseAnimatedForm`: animated form wrapper for dialogs and sheets.
- `BaseAnimatedList`: staggered lists where hierarchy matters.
- `BaseAnimatedPanel`: card or panel reveal.
- `BaseRouteTransition`: route-level transition only when the router flow remains stable.

Use `direction`, `offset`, and `transition` props for local tuning. Keep direct `framer-motion` imports inside `components/base/base-animation.tsx`; feature components should import base animation wrappers.

## Rules

- Keep dashboard motion subtle and short.
- Do not add autoplay looping background motion.
- Do not animate operational data in a way that hides freshness or status.
- Use transform and opacity only for entry/exit transitions.
- Prefer CSS transitions for hover/focus.
- Test with reduced motion enabled before shipping.

## Anti-Patterns

- Animated gradients or decorative motion backgrounds.
- Motion wrappers inside `components/ui` primitives.
- Direct `framer-motion` imports in pages or shared feature components.
- Long stagger delays on dense tables.
- Animating focus, text size, or layout in ways that cause shift.
