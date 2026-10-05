// @ts-check
import {defineConfig} from 'eslint/config';
import tseslint from 'typescript-eslint';

// Eslint configuration object for src, unifying the former
// melinda-commons JS rules with backend-commons' TypeScript rules.
export default defineConfig(
  [
    {
      files: [
        "src/*"
      ],
      ignores: ['node_modules/**', "**/.*", "**/dist/"],
      extends: [
        tseslint.configs.recommended,
        tseslint.configs.stylistic
      ],
      linterOptions: {
        reportUnusedInlineConfigs: "error",
        reportUnusedDisableDirectives: true
      },
      rules: {
        "array-callback-return": [
          "error",
          {
            "checkForEach": true
          }
        ],
        "eqeqeq": ["error", "always"],
        "max-depth": ["warn", 4],
        "max-lines": ["warn", 500],
        "max-lines-per-function": ["warn", {"max": 100}],
        "no-console": "warn",
        "no-const-assign": "error",
        "no-else-return": ["error", {allowElseIf: false}],
        "no-plusplus": [
          "error",
          {
            "allowForLoopAfterthoughts": true
          }
        ],
        // The base rule does not understand TS syntax (interface method
        // params etc.) - the typescript-eslint variant is used instead.
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            "argsIgnorePattern": "next"
          }
        ],
        "no-var": "error",
        "no-warning-comments": "off",
        "prefer-destructuring": ["error", {
          "array": true,
          "object": true
        }],
        "prefer-const": ["error", {
          "destructuring": "any",
          "ignoreReadBeforeAssign": false
        }],
        "radix": "error"
      }
    }
  ]
);
