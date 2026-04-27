import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "commitlint.config.js",
    "functions/**",
  ]),
  {
    rules: {
      // These are experimental React Compiler rules (react-hooks v5+) included in
      // Next.js 16. They are too strict for standard React patterns and not yet
      // appropriate for production codebases that don't use the React Compiler.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      // Unescaped entities in JSX text are fine — enforcing &apos; hurts readability.
      "react/no-unescaped-entities": "off",
      // Allow _ prefix convention for intentionally unused destructured variables.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
