// Watched-to-fail tests for the architecture gates in eslint.config.mjs.
// A gate that never fails is a wish, not a rule. Run: bun run test:gates
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESLint } from 'eslint';

const eslint = new ESLint();

async function ruleIds(code, filePath) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map((m) => m.ruleId);
}

test('storage gate: bare localStorage outside browserStorage fails', async () => {
  const ids = await ruleIds("export const x = localStorage.getItem('a');\n", 'components/Probe.tsx');
  assert.ok(ids.includes('no-restricted-globals'));
});

test('storage gate: window.sessionStorage outside browserStorage fails', async () => {
  const ids = await ruleIds("export const x = window.sessionStorage.getItem('a');\n", 'app/Probe.tsx');
  assert.ok(ids.includes('no-restricted-properties'));
});

test('storage gate: browserStorage itself may touch storage', async () => {
  const ids = await ruleIds("export const x = localStorage.getItem('a');\n", 'lib/browserStorage.ts');
  assert.ok(!ids.includes('no-restricted-globals'));
});
