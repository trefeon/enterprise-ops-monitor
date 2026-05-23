# Forms And Date Picker

## BaseFormField

Use `BaseFormField` for label, description, required, and error text.

```tsx
<BaseFormField label="Branch" required error={errors.branch}>
  <Select value={branch} onValueChange={setBranch}>
    <SelectTrigger>
      <SelectValue placeholder="Select branch" />
    </SelectTrigger>
    <SelectContent>{items}</SelectContent>
  </Select>
</BaseFormField>
```

## Date Picker

Use `BaseDatePicker` or the compatibility `DatePicker` wrapper. Do not use raw date inputs in pages.

```tsx
<BaseDatePicker
  label="Operational date"
  value={date}
  onChange={setDate}
  placeholder="Pick date"
  clearable
/>
```

Use app date helpers for operational formatting and persistence. Keep API date strings in the page state and convert at the boundary.

## Login Form

`BaseLoginForm` owns the visual and accessibility structure. The page owns auth state, demo credential typing, navigation, support modal behavior, and calls to `useAuth().login`.

```tsx
<BaseLoginForm
  values={form}
  onValuesChange={setForm}
  loading={loading}
  error={error}
  onSubmit={handleSubmit}
  rememberMe={rememberMe}
  onRememberMeChange={setRememberMe}
  forgotPasswordSlot={<Button variant="link">Support</Button>}
/>
```

## File Upload

Use `BaseFileUploadControl` for file inputs. Hidden raw file inputs are allowed only inside that base component.

## Accessibility

- Every field needs a visible or programmatic label.
- Required fields must expose required state.
- Validation errors should be text, not color only.
- Password fields should support visibility toggles where useful.
- Date picker trigger must be reachable by keyboard and show focus ring.
