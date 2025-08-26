# Contribution Guidelines

[На русском языке → CONTRIBUTING_RU.md](./CONTRIBUTING_RU.md)

Thank you for considering contributing to this project! 👏

Contributions are welcome in many forms - from documentation tweaks to new Stylelint rules. \
This guide will help you get started smoothly.

---

## 🏳️ Language

Use English whenever possible. \
Russian is acceptable if it helps you express the idea more clearly. \
Feel free to reach out via any of the direct contacts listed in [my profile](https://github.com/MorevM)
if that's more convenient for you.

---

## 💌 Issues & PRs

* Please use the provided **issue and PR templates** when possible - they help keep reports and contributions clear and structured;
* If your case doesn't fit any template, feel free to open a plain issue/PR, but try to provide enough context;
* Prefer discussing large ideas in an issue **before** sending a PR.

### Useful links

* [Guide: Contributing to a project](https://docs.github.com/en/get-started/exploring-projects-on-github/contributing-to-a-project)
* [Guide: Creating a pull request](https://help.github.com/articles/creating-a-pull-request/)
* [Create a new issue](https://github.com/MorevM/stylelint-plugin/issues/new/choose)
* [Open a pull request](https://github.com/MorevM/stylelint-plugin/compare)

---

## ⚙️ Development workflow

This project requires **Node.js 22 or higher** and **pnpm v10** for development. \
End-users can install and run the plugin with **Node.js 18 or higher**.

---

### Setup

```bash
pnpm install
```

---

### Common scripts

* **`pnpm prepare`** \
  Runs `generate-meta` and installs Git hooks via [lefthook](https://github.com/evilmartians/lefthook). \
  Runs automatically after `pnpm install`.

* **`pnpm test`** \
  Runs the full test suite with [vitest](https://vitest.dev/).

* **`pnpm test:dev`** \
  Starts Vitest in watch mode with a minimal reporter. \
  You can limit the scope to matching files, e.g. `pnpm test:dev no-unused-variables.impl`
  will only run tests from files containing that substring in their path.

* **`pnpm lint`** \
  Runs both ESLint and Stylelint across the codebase. \
  No separate formatter is used. ESLint (with the [Stylistic plugin](https://eslint.style/)) acts as a code formatter.

* **`pnpm lint:fix`** \
  Same as `lint`, but with autofix enabled.

* **`pnpm build`** \
  Generates rule metadata (schemas) and bundles the project.

* **`pnpm docs:dev`** \
  Starts the **VitePress** dev server for documentation.

* **`pnpm docs:build`** \
  Regenerates rule metadata and builds static docs.

* **`pnpm docs:preview`** \
  Runs a local preview of the built docs.

* **`pnpm generate-meta`** \
  Generates rule metadata and schemas from source code.
  This script is invoked before build/docs/release to ensure consistency.

---

### Editor integration & hooks

* If you use **ESLint extension** in your editor, formatting fixes will be applied automatically on save.
* Pre-commit hooks are installed via [lefthook](https://github.com/evilmartians/lefthook):
  * Commit messages are validated against [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/);
  * Linting runs on staged files to prevent committing invalid code.

---

## ✒️ Ways to contribute

* Fix a bug
* Improve or add documentation
* Propose a new rule
* Suggest enhancements or options for existing rules
* Improve performance or internal code organization
* Share the project (blog posts, social media)

---

## ✅ Good practices

* Keep PRs small and focused
* Include minimal **❌ incorrect / ✅ correct** code examples
* Update rule docs when behavior changes
* Ensure tests cover both valid and invalid cases
* Discuss breaking changes before implementing
