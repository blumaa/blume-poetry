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

const clientImport = "import { createClient } from '@/lib/supabase/client';\nexport const c = createClient;\n";

test('data gate: browser supabase client outside a feature api fails', async () => {
  const ids = await ruleIds(clientImport, 'components/Probe.tsx');
  assert.ok(ids.includes('no-restricted-imports'));
});

test('data gate: a feature component may not query directly', async () => {
  const ids = await ruleIds(clientImport, 'features/poems/Probe.tsx');
  assert.ok(ids.includes('no-restricted-imports'));
});

test('data gate: a feature api module may use the client', async () => {
  const ids = await ruleIds(clientImport, 'features/poems/api/probe.ts');
  assert.ok(!ids.includes('no-restricted-imports'));
});

test('feature gate: reaching past a feature barrel fails', async () => {
  const code = "import { PoemEditor } from '@/features/poems/PoemEditor';\nexport const p = PoemEditor;\n";
  const ids = await ruleIds(code, 'app/Probe.tsx');
  assert.ok(ids.includes('no-restricted-imports'));
});

test('feature gate: the barrel is the way in', async () => {
  const code = "import { PoemEditor } from '@/features/poems';\nexport const p = PoemEditor;\n";
  const ids = await ruleIds(code, 'app/Probe.tsx');
  assert.ok(!ids.includes('no-restricted-imports'));
});
