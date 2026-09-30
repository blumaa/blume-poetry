import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/* Architecture gates. Each one has a watched-to-fail test in
   scripts/gates.test.mjs; see docs/ARCHITECTURE.md for the rule behind it. */

const storageMessage =
  "Use lib/browserStorage (readStored/writeStored/useStored). One registry, guarded access, shared readers.";

const storageGate = {
  files: ["**/*.{ts,tsx}"],
  ignores: ["lib/browserStorage.ts", "**/*.test.{ts,tsx}", "__tests__/**"],
  rules: {
    "no-restricted-globals": [
      "error",
      { name: "localStorage", message: storageMessage },
      { name: "sessionStorage", message: storageMessage },
    ],
    "no-restricted-properties": [
      "error",
      { object: "window", property: "localStorage", message: storageMessage },
      { object: "window", property: "sessionStorage", message: storageMessage },
    ],
  },
};

const barrelPattern = {
  group: ["@/features/*/**"],
  message: "Import a feature through its barrel (@/features/<name>). Its files are private.",
};

const clientPattern = {
  group: ["@/lib/supabase/client"],
  message:
    "Browser queries live in features/<name>/api. Components call those functions, never the client.",
};

/* no-restricted-imports options replace, not merge, across configs, so the
   api override restates the barrel rule without the client ban. */
const importGate = {
  files: ["**/*.{ts,tsx}"],
  ignores: ["**/*.test.{ts,tsx}", "__tests__/**"],
  rules: {
    "no-restricted-imports": ["error", { patterns: [barrelPattern, clientPattern] }],
  },
};

const dataLayerGate = {
  files: ["features/*/api/**/*.ts", "lib/supabase/**/*.ts"],
  ignores: ["**/*.test.ts"],
  rules: {
    "no-restricted-imports": ["error", { patterns: [barrelPattern] }],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  storageGate,
  importGate,
  dataLayerGate,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
