import assert from "node:assert/strict";
import test from "node:test";
import { findDuplicateSelectors } from "../scripts/css-contract.mjs";

test("CSS contract reports duplicate selectors only inside the same scope", () => {
  const css = `.a, .b { color: red; }\n.a { padding: 1px; }\n@media (max-width: 600px) { .a { color: blue; } }`;
  assert.deepEqual(findDuplicateSelectors(css), ["root: .a"]);
});

test("CSS contract treats repeated selectors in separate media scopes independently", () => {
  const css = `@media (max-width: 600px) { .a { color: red; } }\n@media (min-width: 601px) { .a { color: blue; } }`;
  assert.deepEqual(findDuplicateSelectors(css), []);
});
