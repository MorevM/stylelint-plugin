# Installation

::: danger Requirements

* **Node** version: >=18.12.0
* **Stylelint** version: >= 16

:::

Install the package `@morev/stylelint-plugin` alongside `stylelint`:

::: code-group

```sh [npm]
npm add -D @morev/stylelint-plugin stylelint
```

```sh [yarn]
yarn add -D @morev/stylelint-plugin stylelint
```

```sh [pnpm]
pnpm add -D @morev/stylelint-plugin stylelint
```

::: info
As specified [in the documentation](https://stylelint.io/developer-guide/plugins/#peer-dependencies),
Stylelint must not be shipped together with a plugin. \
For more details, you can check the [related issue](https://github.com/stylelint/stylelint/issues/2812)
and [PR](https://github.com/stylelint/stylelint/pull/2850) where this recommendation was discussed.
:::
