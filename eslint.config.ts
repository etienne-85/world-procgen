import { defineConfig } from "eslint/config";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([{
    extends: compat.extends("prettier"),

    plugins: {
        "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 12,
        sourceType: "module",

        parserOptions: {
            requireConfigFile: false,
        },
    },

    rules: {
        camelcase: "off",
        "no-var": "error",
        "object-shorthand": "error",

        "prefer-const": ["error", {
            destructuring: "any",
        }],

        "prefer-rest-params": "error",
        "prefer-spread": "error",
        "prefer-object-spread": "error",
        "prefer-destructuring": "error",
        "prefer-numeric-literals": "error",

        // "import/order": ["error", {
        //     "newlines-between": "always",
        // }],

        "no-throw-literal": 0,
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": ["error"],
    },
}]);