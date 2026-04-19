# CLAUDE.md – Project Design & Engineering Guidelines

## Core Principles
1. **Think Before Coding**
   - State assumptions explicitly.
   - Ask questions if requirements are unclear.
   - Propose alternatives before implementing.

2. **Simplicity First**
   - Write the minimal necessary code.
   - Avoid over-engineering or "future-proofing."
   - Prefer 50 lines over 200 if functionally equivalent.

3. **Surgical Changes**
   - Modify **only** the code needed to solve the task.
   - Do not refactor unrelated code or change formatting.

4. **Goal-Driven Execution**
   - Every task must have a verifiable outcome (e.g., "Make the button 20% larger and centered").
   - Changes must be testable.

---

## UI/UX Rules
### Design System
- **Material Design 3 Expressive** (rounded corners, soft shadows, dynamic color).
- **Brand Palette:**
  - Bright Azure (#00AAFF) – Primary
  - Atlantis Green (#97CF26) – Secondary
  - Light Red (#FF6163) – CTA
  - Violet Punk (#A169F7) – Accent
  - African Turquoise (#000000) – Text/Contrast

### Visual Language
- **"Ball Attraction" Metaphor** – Dynamic spheres as key elements.
- **"Collider" Aesthetic** – Orbiting UI elements for cohesion.
- **Typography:** Modern sans-serif (high readability on all devices).

### Accessibility
- **WCAG-compliant contrast** (test with [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)).
- **Platform-aware controls** (desktop vs. mobile interactions).

---

## Codebase Rules
### CSS/Styling
- Use **CSS variables** for colors and spacing.
- Prefer **utility classes** (e.g., Tailwind) for consistency.
- **Dark mode:** Ensure all text is readable (no black-on-black).

### React/TSX
- **Minimal state** – Avoid unnecessary `useState` or `useEffect`.
- **Component isolation** – Each component should do one thing well.
- **No prop drilling** – Use context or composition if needed.

### Testing
- **Visual regression tests** for UI changes.
- **Contrast checks** for dark/light mode.
- **Hover/active states** must be explicitly tested.

---

## Example Tasks
### ❌ Bad
> "Improve the upload button."

### ✅ Good
> "Make the 'Upload Photo' button:
> - 24px taller, pill-shaped, centered.
> - Color: #FF6163 (Light Red).
> - Hover effect: scale(1.05) + 2px upward movement + soft glow shadow.
> - Verify contrast in dark mode."
