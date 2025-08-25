# Usage

## Anatomy of plugin rules

All rules from the plugin are namespaced with `@morev/` prefix and the additional category prefix:
`@morev/{category-name}/{rule-name}`. \
Refer to the [Rules](/rules/) page for the complete list of categories and rules.

---

The plugin provides several rules, and the ones in the `base` and `sass` categories are widely applicable and make sense for any style file. \
In contrast, rules in the `bem` category are designed for BEM component files only;
applying them to other files (like `reset.css` or a custom `globals.css`) will likely produce false positives.

In most projects, BEM components can be distinguished from other style files by their file paths.
For this reason, it is recommended to use the [`overrides`](https://stylelint.io/user-guide/configure/#overrides)
option to enable these rules selectively.

::: info Note
While the general rules can be enabled globally under `rules`,
they are also presented in the documentation using `overrides`
for consistency with the BEM-specific rules.
:::

## Enabling the rules

* Create the [`.stylelintrc` config file](https://stylelint.io/user-guide/configure/) *(or open the existing one)*;
* Add `@morev/stylelint-plugin` to the [`plugins`](https://stylelint.io/user-guide/configure/#plugins) array;

::: details Show example

::: code-group

```js [.stylelintrc.js]
/** @type {import('stylelint').Config} */
export default {
  plugins: [
    '@morev/stylelint-plugin', // [!code ++]
  ],
}
```

:::

* Add the general rules from the `base` and `sass` categories to the [`overrides`](https://stylelint.io/user-guide/configure/#overrides) array
(or directly to the `rules` object - it's safe to do so);

::: details Show example

::: code-group

```js [Adding via overrides option]
/** @type {import('stylelint').Config} */
export default {
  plugins: [
    '@morev/stylelint-plugin',
  ],
  overrides: [ // [!code ++]
    { // [!code ++]
      files: ['**/*.{css,scss}'], // [!code ++]
      rules: { // [!code ++]
        '@morev/base/no-selectors-in-at-rules': true, // [!code ++]
        '@morev/sass/no-unused-variables': true, // [!code ++]
      }, // [!code ++]
    }, // [!code ++]
  ], // [!code ++]
}

```

```js [Adding directly to rules object]
/** @type {import('stylelint').Config} */
export default {
  plugins: [
    '@morev/stylelint-plugin',
  ],
  rules: { // [!code ++]
    '@morev/base/no-selectors-in-at-rules': true, // [!code ++]
    '@morev/sass/no-unused-variables': true, // [!code ++]
    // ...another rules of your config // [!code ++]
  }, // [!code ++]
}

```

:::

* Add the rules from the `bem` category under `overrides`, using the `files` field to restrict them to the exact paths of BEM components

::: details Show example

```js
/** @type {import('stylelint').Config} */
export default {
  plugins: [
    '@morev/stylelint-plugin',
  ],
  overrides: [ // [!code ++]
    { // [!code ++]
      files: ['./path/to/components/**/*.{css,scss}'], // [!code ++]
      rules: { // [!code ++]
        '@morev/bem/block-variable': true, // [!code ++]
        '@morev/bem/match-file-name': true, // [!code ++]
        '@morev/bem/no-block-properties': [true, { // [!code ++]
          presets: ['EXTERNAL_GEOMETRY', 'CONTEXT'], // [!code ++]
        }], // [!code ++]
        '@morev/bem/no-chained-entities': true, // [!code ++]
        '@morev/bem/no-side-effects': true, // [!code ++]
        '@morev/bem/selector-pattern': true, // [!code ++]
      }, // [!code ++]
    }, // [!code ++]
  ], // [!code ++]
}

```

:::


## Typed version of the configuration

::: warning Important note
If you are using JSON or YAML configuration format, this approach will not work for you - use the traditional way of enabling rules described above.
:::

If you are using the JS configuration format, for a better DX you can use a typed wrapper function to enable rules along with their defaults.

The plugin exports a JS function `createDefineRules`, which provides IDE autocompletion for plugin rules and their options.

---

![Example of IDE's autocomplete](/images/define-rules-2.jpg)

---

![Example of IDE's autocomplete](/images/define-rules-1.jpg)

---

This makes it faster and clearer to understand which options are available for configuration,
as well as to quickly jump to the documentation if needed.

In addition, many BEM rules accept a `separators` object, which, obviously, will be the same across all rules.
With this function, you can avoid duplicating this option in each of those rules.

### Example configuration with comments

```js
// 1. Import the factory from the plugin.
import { createDefineRules } from '@morev/stylelint-plugin';

// 2. Create a function, optionally providing global options,
//    so you don't need to duplicate them across BEM rules that require them.
const defineRules = createDefineRules({
  separators: {
    element: '__',
    modifier: '--',
    modifierValue: '--',
  },
});

// 3. Use this function to define rules and get
//    IDE autocompletion and property hints built-in.

/** @type {import('stylelint').Config} */
export default {
  plugins: [
    '@morev/stylelint-plugin',
  ],
  overrides: [
    // Some plugin rules are applicable to any style files,
    // even those that are not BEM component styles.
    {
      files: ['**/*.{css,scss}'],
      rules: defineRules({
        '@morev/base/no-selectors-in-at-rules': [true, {}],
        '@morev/sass/no-unused-variables': [true, {
          ignore: ['b'],
        }],
      })
    },
    // BEM rules should only be applied to BEM components.
    // so we restrict these rules to specific paths.
    {
      files: ['./path/to/components/**/*.{css,scss}'],
      rules: defineRules({
        '@morev/bem/block-variable': [true, {}],
        '@morev/bem/match-file-name': [true, {}],
        '@morev/bem/no-block-properties': [true, {
          presets: ['EXTERNAL_GEOMETRY', 'CONTEXT'],
          ignoreBlocks: ['*swiper*'],
        }],
        '@morev/bem/no-chained-entities': [true, {}],
        '@morev/bem/no-side-effects': [true, {
          ignore: [
            '*swiper*',
          ],
        }],
        '@morev/bem/selector-pattern': [true, {}],
      }),
    },
  ],
}
```
