// Token gate: colours come from tokens. A raw colour in a stylesheet is a
// second source for the palette and drifts from the theme (see
// docs/ARCHITECTURE.md). Only token files may hold literal colours.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const COLOUR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\((?![^)]*var\()[^)]*\)|(?<![\w-])(?:white|black)(?![\w-])/g;
const ROOTS = ['app', 'components', 'features', 'layouts'];
const TOKEN_DIR = join('app', 'tokens');
// globals.css declares the app-only tokens; only its declarations may be literal.
const TOKEN_DECLARATIONS = join('app', 'globals.css');

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));

export function rawColours(css, { allowDeclarations = false } = {}) {
  return stripComments(css)
    .split('\n')
    .flatMap((text, i) =>
      allowDeclarations && /^\s*--[\w-]+\s*:/.test(text)
        ? []
        : [...text.matchAll(COLOUR)].map((m) => ({ line: i + 1, value: m[0] }))
    );
}

function stylesheets(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return path === TOKEN_DIR ? [] : stylesheets(path);
    return entry.name.endsWith('.css') ? [path] : [];
  });
}

export function stylesheetViolations() {
  return ROOTS.flatMap(stylesheets).flatMap((file) =>
    rawColours(readFileSync(file, 'utf8'), { allowDeclarations: file === TOKEN_DECLARATIONS }).map(
      (v) => ({ file, ...v })
    )
  );
}
