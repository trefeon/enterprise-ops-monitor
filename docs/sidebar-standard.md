# Sidebar Standard

## Rule

Use `BaseSidebar` and `BaseSidebarNav` for all app navigation. Sidebar primitives from `components/ui/sidebar` are reserved for the base layer.

## Nav Type

```ts
type BaseNavItem = {
  title: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  disabled?: boolean;
  children?: BaseNavItem[];
};
```

## Child Menu Example

```tsx
const adminItems: BaseNavItem[] = [
  {
    title: 'Admin',
    icon: Shield,
    children: [
      { title: 'Users', href: '/users', icon: Users },
      { title: 'Roles', href: '/roles', icon: Lock },
    ],
  },
];

<BaseSidebarNav items={adminItems} pathname={location.pathname} onNavigate={closeMobileSidebar} />;
```

## Permission Filtering

Filter route config before passing items to the base sidebar. Use `hasPermission(user, permission)`; do not compare `user.role` directly.

## Behavior To Preserve

- Active route state.
- Child menu groups.
- Mobile close after navigation.
- Local collapsed state.
- Profile footer and logout action.
- Keyboard-accessible nav buttons.

## Anti-Patterns

- Do not build custom sidebars in pages.
- Do not add string icon APIs.
- Do not duplicate route lists between shell and feature pages.
- Do not hide unauthorized routes with CSS; filter the nav config before render.
