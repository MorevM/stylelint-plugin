::: details Show info about Stylelint-wide options

Every rule in this plugin also supports the standard Stylelint per-rule options (`disableFix`, `severity`, `url`, `reportDisables`, and `message`),
even though they are not explicitly reflected in the type definitions to avoid unnecessary noise.

---

Note: the `message` option is technically available, but its use is discouraged: each rule already provides a typed [`messages`](#messages) object,
which not only offers IDE autocompletion but also supports multiline strings and automatically handles indentation.

---

For more information, see the official [Stylelint configuration docs](https://stylelint.io/user-guide/configure/#rules).

:::
