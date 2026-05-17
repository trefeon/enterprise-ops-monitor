# Enterprise Operations Monitor UI QA Checklist

## Design-system consistency

- [ ] All pages use the same page shell padding (`px-page-x py-page-y`) and section gaps (`gap-section` / `space-y-section`).
- [ ] No page has custom borders (only `border-border` and its opacity variants).
- [ ] No page uses arbitrary Tailwind values (`p-[..]`, `text-[..]`, `rounded-[..]`, `shadow-[..]`, etc.).
- [ ] No inline `style={...}` exists in any page component.

## Typography

- [ ] Page titles/subtitles match the reference pages.
- [ ] Table headers/rows use the same sizes and casing.

## Tables

- [ ] Header row style matches reference pages.
- [ ] Row height is consistent (`h-row`).
- [ ] Cell padding is consistent (`px-cell-x py-cell-y`).
- [ ] Empty states look identical.

## Forms & toolbars

- [ ] Inputs/selects/buttons have consistent height, border, and focus ring.
- [ ] Toolbars wrap consistently on mobile.

## Regression sweep

- [ ] Dashboard/Home matches reference spacing and card styles.
- [ ] EOD Monitor matches reference spacing and table styles.
- [ ] EOD By Area matches reference spacing and table styles.
- [ ] Data Toko matches reference spacing and table styles.
- [ ] After-Hours page matches reference spacing, card styles, and table states.
- [ ] After-Hours settings panel renders quick presets (Telegram + Webhook Gateway Group) and helper hints correctly.
- [ ] After-Hours templates show initial/final fields with schedule labels.
- [ ] Login page has no inline styles and uses design tokens.
