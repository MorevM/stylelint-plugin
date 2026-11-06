::: details 🧱 How the BEM block is determined

Some BEM linters — like [postcss-bem-linter](https://github.com/postcss/postcss-bem-linter) —
require you to define the block name explicitly using a comment (`/** @define the-component */`)
or derive it from the filename via configuration.

This plugin takes a different, much simpler approach:

---

> **The first base block declaration in the file determines the component's block.**
> **If none exists, the block name is derived from the first element or modifier.**

---

✅ **Why this is enough** \
In a component-oriented architecture, there is rarely a reason to define more than one block per file.
This convention keeps block detection consistent across rules
without additional annotations or configuration.

---

❓ **What if you need more control?** \
If your project uses a different structure, this assumption may not work well.

This plugin doesn't currently support custom block resolution logic or in-file annotations —
mostly because there's little evidence it's needed. \
But if you have a real use case — feel free to open an issue and describe your use case.

:::
