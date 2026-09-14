const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        console: "readonly",
        exports: "writable",
        module: "writable",
        process: "readonly",
        require: "readonly",
      },
    },
    rules: {
      "no-restricted-globals": ["error", "name", "length"],
    },
  },
  { files: ["shared/**/*.mjs"], languageOptions: { sourceType: "module" } },
  {
    files: ["**/*.spec.*"],
    languageOptions: {
      globals: {
        after: "readonly",
        afterEach: "readonly",
        before: "readonly",
        beforeEach: "readonly",
        describe: "readonly",
        it: "readonly",
      },
    },
  },
];
