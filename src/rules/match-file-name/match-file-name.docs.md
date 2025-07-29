# @morev/bem/match-file-name

Requires the file name to begin with the name of the BEM block it represents.

::: code-group

```scss [the-component.scss]
// ✅ The file name matches the name of the block
.the-component {}
```

```scss [the-component.styles.scss]
// ✅ The file name begins with the block name
.the-component {}
```

```scss [index.scss]
// ❌ The file name does not match the name of the block
.the-component {}
```

:::

::: tip
If no BEM block is detected in the file, this rule does nothing.
:::

## Motivation

A well-structured component (especially in modern component-based frameworks)
follows the principle of separation of concerns - separate files for markup,
styles, documentation, i18n, tests, and so on:

```sh{3}
/the-component
├── the-component.vue
├── the-component.scss
├── the-component.i18n.yaml
├── the-component.test.ts
├── the-component.stories.ts
└── ...
```

This approach is especially valuable when using the BEM methodology. \
If a component's name matches the name of a BEM block (as it should),
it makes navigating the project much easier: when we see a block named "the-component" in the HTML,
we can be 100% sure there's a corresponding `the-component.scss` file containing its styles.
We know that it is the only source of truth for the component, and we can jump to it instantly.

It also improves the DX - different style files can be edited independently,
and IDE tabs show clear, descriptive names instead of a dozen identical `index.scss` files.

## Rule options

All options are optional and come with recommended default values.

::: code-group

```js [Enabling a rule without options]
// 📄 .stylelintrc.js

export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/match-file-name': true,
  }
}
```

```js [Enabling a rule with options]
// 📄 .stylelintrc.js

export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/match-file-name': [true, {
      caseSensitive: true,
      matchDirectory: false,
    }],
  }
}
```

:::

### `caseSensitive`

Requires the beginning of the file name to match the block name exactly, including case sensitivity.

```ts
/**
 * @default true
 */
type CaseSensitiveOption = boolean;
```

#### Examples

::: code-group

```scss [caseSensitive: true (default)]
// ✅ The file name begins with the block name
// 📄 the-component.scss
.the-component {}

// ✅ The file name begins with the block name
// 📄 the-component.styles.scss
.the-component {}

// ❌ The file name matches the block name, but case is different.
// 📄 the-component.scss
.TheComponent {}

// ❌ The file name does not begin with the block name
// 📄 index.scss
.foo-component {}
```

```scss [caseSensitive: false]
// ✅ The file name begins with the block name
// 📄 the-component.scss
.the-component {}

// ✅ The file name begins with the block name
// 📄 the-component.styles.scss
.the-component {}

// ✅ The file name matches the block name, but case is different.
// 📄 the-component.scss
.TheComponent {}

// ❌ The file name does not begin with the block name
// 📄 index.scss
.foo-component {}
```

:::

### `matchDirectory`

Whether to use the name of the containing directory instead of the file name for block name comparison.

```ts
/**
 * @default false
 */
type MatchDirectoryOption = boolean;
```

#### Examples

```scss
// ✅ The directory name matches the block name
// 📄 /the-component/index.scss
.the-component {}

// ❌ The directory name does not match the block name
// 📄 /bar-component/index.scss
.the-component {}
```

#### Notes

* The `caseSensitive` option applies regardless of whether `matchDirectory` is enabled.
* When both options are enabled, the rule compares the directory name to the block name,
  respecting case sensitivity if `caseSensitive` is `true`.
