function splitSelectors(prelude) {
  const selectors = [];
  let start = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let quote = null;
  for (let index = 0; index < prelude.length; index += 1) {
    const char = prelude[index];
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "(") parenDepth += 1;
    else if (char === ")") parenDepth = Math.max(0, parenDepth - 1);
    else if (char === "[") bracketDepth += 1;
    else if (char === "]") bracketDepth = Math.max(0, bracketDepth - 1);
    else if (char === "," && parenDepth === 0 && bracketDepth === 0) {
      selectors.push(prelude.slice(start, index).trim());
      start = index + 1;
    }
  }
  selectors.push(prelude.slice(start).trim());
  return selectors.filter(Boolean);
}

function findMatchingBrace(css, openIndex) {
  let depth = 1;
  let quote = null;
  for (let index = openIndex + 1; index < css.length; index += 1) {
    const char = css[index];
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (css.startsWith("/*", index)) {
      const end = css.indexOf("*/", index + 2);
      index = end < 0 ? css.length : end + 1;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function scanScope(css, scope, duplicates) {
  const seen = new Set();
  let cursor = 0;
  while (cursor < css.length) {
    while (cursor < css.length && /\s/.test(css[cursor])) cursor += 1;
    if (css.startsWith("/*", cursor)) {
      const end = css.indexOf("*/", cursor + 2);
      cursor = end < 0 ? css.length : end + 2;
      continue;
    }
    if (cursor >= css.length) break;

    let quote = null;
    let parenDepth = 0;
    let bracketDepth = 0;
    let boundary = -1;
    let terminator = "";
    for (let index = cursor; index < css.length; index += 1) {
      const char = css[index];
      if (quote) {
        if (char === "\\") index += 1;
        else if (char === quote) quote = null;
        continue;
      }
      if (css.startsWith("/*", index)) {
        const end = css.indexOf("*/", index + 2);
        index = end < 0 ? css.length : end + 1;
        continue;
      }
      if (char === '"' || char === "'") quote = char;
      else if (char === "(") parenDepth += 1;
      else if (char === ")") parenDepth = Math.max(0, parenDepth - 1);
      else if (char === "[") bracketDepth += 1;
      else if (char === "]") bracketDepth = Math.max(0, bracketDepth - 1);
      else if (parenDepth === 0 && bracketDepth === 0 && (char === "{" || char === ";")) {
        boundary = index;
        terminator = char;
        break;
      }
    }
    if (boundary < 0) break;
    const prelude = css.slice(cursor, boundary).trim();
    if (terminator === ";") {
      cursor = boundary + 1;
      continue;
    }
    const close = findMatchingBrace(css, boundary);
    if (close < 0) throw new Error(`Unclosed CSS block in ${scope}: ${prelude}`);
    const body = css.slice(boundary + 1, close);
    if (prelude.startsWith("@media") || prelude.startsWith("@supports") || prelude.startsWith("@container") || prelude.startsWith("@layer")) {
      scanScope(body, `${scope} > ${prelude}`, duplicates);
    } else if (!prelude.startsWith("@")) {
      for (const selector of splitSelectors(prelude)) {
        if (seen.has(selector)) duplicates.push(`${scope}: ${selector}`);
        seen.add(selector);
      }
    }
    cursor = close + 1;
  }
}

export function findDuplicateSelectors(css) {
  const duplicates = [];
  scanScope(css, "root", duplicates);
  return duplicates;
}
