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

import { rawColours, stylesheetViolations } from './tokenGate.mjs';

test('token gate: a raw colour in a stylesheet fails', () => {
  assert.deepEqual(rawColours('.a { color: #ef4444; }\n.b { box-shadow: 0 1px rgb(0 0 0 / 0.1); }'), [
    { line: 1, value: '#ef4444' },
    { line: 2, value: 'rgb(0 0 0 / 0.1)' },
  ]);
});

test('token gate: tokens pass', () => {
  assert.deepEqual(rawColours('.a { color: var(--mds-text-primary); }'), []);
});

test('token gate: app stylesheets carry no raw colour', () => {
  assert.deepEqual(stylesheetViolations(), []);
});

test('size gate: a component over 300 lines fails', async () => {
  const code = 'export const x = 1;\n'.repeat(301);
  const ids = await ruleIds(code, 'components/Probe.tsx');
  assert.ok(ids.includes('max-lines'));
});

test('size gate: a component at 300 lines passes', async () => {
  const code = 'export const x = 1;\n'.repeat(300);
  const ids = await ruleIds(code, 'components/Probe.tsx');
  assert.ok(!ids.includes('max-lines'));
});

const linkButton =
  "import Link from 'next/link';\nimport { Button } from '@/components/mds';\nexport const B = () => <Button as={Link} href=\"/\">Home</Button>;\n";

test('link gate: Button as={Link} fails; server components cannot pass Link', async () => {
  const ids = await ruleIds(linkButton, 'app/Probe.tsx');
  assert.ok(ids.includes('no-restricted-syntax'));
});

test('link gate: ButtonLink passes', async () => {
  const code = "import { ButtonLink } from '@/components/mds';\nexport const B = () => <ButtonLink href=\"/\">Home</ButtonLink>;\n";
  const ids = await ruleIds(code, 'app/Probe.tsx');
  assert.ok(!ids.includes('no-restricted-syntax'));
});
