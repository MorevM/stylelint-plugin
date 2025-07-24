# @morev/bem/selector-pattern

Enforces naming patterns for BEM entities.

## Overview

This rule allows you to enforce naming conventions for different parts of BEM-based selectors.

**You can define specific patterns for:**

| Entity             | Example                                  |
| ------------------ | ---------------------------------------- |
| BEM block          | .`the-component`__element--theme--dark   |
| BEM element        | .the-component__`element`--theme--dark   |
| BEM modifier name  | .the-component__element--`theme`--dark   |
| BEM modifier value | .the-component__element--theme--`dark`   |

::: info The rule also supports:

✅ Predefined keywords for common naming styles (`'KEBAB_CASE'`, `'PASCAL_CASE'`, etc.) \
✅ Wildcards inside string patterns - `'foo-*'` \
✅ Multiple patterns per entity \
✅ Complete disallowing of modifier values \
✅ Ignoring specific BEM blocks \
✅ Custom error messages
:::

## Rule options

All options are optional and have sensible default values.

::: code-group

```js [Enabling a rule with recommended defaults]
// 📄 .stylelintrc.js

export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/pattern': true,
  }
}
```

```js [Enabling a rule with custom options]
// 📄 .stylelintrc.js

export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/pattern': [true, {
      blockPattern: 'KEBAB_CASE',
      elementPattern: /^[a-z][0-9a-z]*(?:-[0-9a-z]+)*$/,
      modifierNamePattern: 'KEBAB_CASE',
      modifierValuePattern: 'KEBAB_CASE',
      elementSeparator: '__',
      modifierSeparator: '--',
      modifierValueSeparator: '--',
      ignoreBlocks: ['swiper-*', 'u-*'],
      messages: {
        block: (name, fullSelector, patterns) => {
          return `Unexpected block name ${name}`;
        },
      },
    }],
  },
}
```

:::

::: details Show full type of the options

```ts
type BemPatternOptions = Partial<{
  /**
   * Allowed pattern(s) for BEM block names.
   *
   * Supports RegExp, string (including wildcard patterns),
   * or keywords like `KEBAB_CASE`.
   *
   * @default KEBAB_CASE_REGEXP
   */
  blockPattern: string | RegExp | Array<string | RegExp>;

  /**
   * Allowed pattern(s) for BEM element names.
   *
   * Supports RegExp, string (including wildcard patterns),
   * or keywords like `KEBAB_CASE`.
   *
   * @default KEBAB_CASE_REGEXP
   */
  elementPattern: string | RegExp | Array<string | RegExp>;

  /**
   * Allowed pattern(s) for BEM modifier names.
   *
   * Supports RegExp, string (including wildcard patterns),
   * or keywords like `KEBAB_CASE`.
   *
   * @default KEBAB_CASE_REGEXP
   */
  modifierNamePattern: string | RegExp | Array<string | RegExp>;

  /**
   * Allowed pattern(s) for BEM modifier values.
   *
   * Supports RegExp, string (including wildcard patterns),
   * or keywords like `KEBAB_CASE`. \
   * Use `false` to forbid modifier values entirely.
   *
   * @default KEBAB_CASE_REGEXP
   */
  modifierValuePattern: false | string | RegExp | Array<string | RegExp>;

  /**
   * String used as the BEM element separator.
   *
   * @default '__'
   */
  elementSeparator: string;

  /**
   * String used as the BEM modifier separator.
   *
   * @default '--'
   */
  modifierSeparator: string;

  /**
   * String used as the BEM modifier value separator.
   *
   * @default '--'
   */
  modifierValueSeparator: string;

  /**
   * Block names to ignore completely.
   * Each entry can be a string (optionally with wildcards)
   * or a regular expression.
   *
   * @default []
   */
  ignoreBlocks: Array<string | RegExp>;

  /**
   * Custom message functions for each entity.
   * If provided, overrides the default error messages.
   */
  messages: Partial<{
    /**
     * Custom message for BEM block violations.
     *
     * @param   name           Detected block name.
     * @param   fullSelector   Full resolved BEM selector for the violation.
     * @param   patterns       Allowed patterns in object form.
     *
     * @returns                Error message.
     */
    block: (name: string, fullSelector: string, patterns: ProcessedPattern[]) => string;

    /**
     * Custom message for BEM element violations.
     *
     * @param   name           Detected element name.
     * @param   fullSelector   Full resolved BEM selector for the violation.
     * @param   patterns       Allowed patterns in object form.
     *
     * @returns                Error message.
     */
    element: (name: string, fullSelector: string, patterns: ProcessedPattern[]) => string;

    /**
     * Custom message for BEM modifier name violations.
     *
     * @param   name           Detected modifier name.
     * @param   fullSelector   Full resolved BEM selector for the violation.
     * @param   patterns       Allowed patterns in object form.
     *
     * @returns                Error message.
     */
    modifierName: (name: string, fullSelector: string, patterns: ProcessedPattern[]) => string;

    /**
     * Custom message for BEM modifier value violations.
     *
     * @param   name           Detected modifier value.
     * @param   fullSelector   Full resolved BEM selector for the violation.
     * @param   patterns       Allowed patterns in object form.
     *
     * @returns                Error message.
     */
    modifierValue: (name: string, fullSelector: string, patterns: ProcessedPattern[] | false) => string;
  }>;
}>
```

:::

### Patterns

All of the `blockPattern`, `elementPattern`, `modifierNamePattern`, `modifierValuePattern` options
define the allowed naming patterns for different parts of your selectors.

::: warning Note
The options shown below are not defaults or best practices. \
They simply demonstrate the flexibility of configuration.
:::

Each option may accept:

::: details `string`

Interpreted as a `RegExp` in string form (if enclosed in `/` with optional flags),
as a pattern supporting wildcards, or a predefined keyword representing a popular pattern preset.

```js [Example config]
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/pattern': [true, {
      blockPattern: 'component-*', // [!code focus]
      elementPattern: 'KEBAB_CASE', // [!code focus]
      modifierName: 'is-*', // [!code focus]
    },
  },
}
```

---

```scss
// ✅ Block name matches the pattern `'component-*'`
// ✅ Element name matches the pattern `KEBAB_CASE`
// ✅ Modifier name matches the pattern `is-*`
.component-foo__some-element--is-active {}

// ❌ Block name does not match the pattern ``'component-*'`
// ✅ Element name matches the pattern `KEBAB_CASE`
// ✅ Modifier name matches the pattern `is-*`
.the-component__element--is-active {}

// ✅ Block name matches the pattern `'component-*'`
// ✅ The element is absent and not validated
// ❌ Modifier name does not match the pattern `is-*`
.component-foo--active {}

// ✅ Block name matches the pattern `'component-*'`
// ❌ The element does not match the pattern `KEBAB_CASE`
// ✅ Modifier name is absent and not validated
.component-foo__FooElement {}
```

#### Available string keywords

The plugin provides common naming presets as convenient keywords.

| Keyword       | Description                              | Exported RegExp Name |
| ------------- | ---------------------------------------- | -------------------- |
| `KEBAB_CASE`  | lowercase-words-separated-by-hyphens     | `KEBAB_CASE_REGEXP`  |
| `SNAKE_CASE`  | lowercase_words_separated_by_underscores | `SNAKE_CASE_REGEXP`  |
| `PASCAL_CASE` | WordsStartWithUppercase                  | `PASCAL_CASE_REGEXP` |
| `CAMEL_CASE`  | firstWordLowercase                       | `CAMEL_CASE_REGEXP`  |

The corresponding regular expressions are also exported from the package for use in custom tooling
using a named export from `/constants`:

```ts
import {
  KEBAB_CASE_REGEXP, PASCAL_CASE_REGEXP, CAMEL_CASE_REGEXP, SNAKE_CASE_REGEXP
} from '@morev/stylelint-plugin/constants';
```

:::

::: details `RegExp`

A regular expression for advanced matching, if the configuration format allows it. \
For example, `yaml` and `json` configurations do not support direct `RegExp` usage -
use string-based format described above if your config is written using such formats.

```js [Example config]
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/pattern': [true, {
      blockPattern: /^component-[a-z-]+/, // [!code focus]
    },
  },
}
```

---

```scss
// ✅ Block name matches the pattern `/^component-[a-z-]+/`
.component-foo__element {}

// ❌ Block name does not match the pattern `/^component-[a-z-]+/`
.foo-component__element {}
```

::: tip
The package provides several popular patterns as named exports from `/constants`,
in case you want to use them in your own tooling.

```ts
import {
  KEBAB_CASE_REGEXP, PASCAL_CASE_REGEXP, CAMEL_CASE_REGEXP, SNAKE_CASE_REGEXP
} from '@morev/stylelint-plugin/constants';
```

:::

::: details `array`

A list of any combination of the above.

```js [Example config]
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/pattern': [true, {
      modifierNamePattern: ['is-*', /.*foo.*/], // [!code focus]
    },
  },
}
```

---

```scss
// ✅ Modifier name matches the pattern `'is-*'`
.the-component--is-active {}

// ✅ Modifier name match the pattern `/.*foo.*/`
.the-component--foo-bar {}
.the-component--bar-foo {}

// ✅ Modifier name is absent and not validated
.the-component__element {}

// ❌ Modifier name does not match any of the defined patterns
.the-component--baz {}
```

:::

#### Disabling modifier values

Some teams prefer a simplified BEM structure where **modifiers are always flat** -
that is, modifier *names* encode their full meaning without a separate value part.

```scss
// Instead of
.block--theme--dark {}

// ...they write:
.block--theme-dark {}
```

This approach enforces a strict three-level model:

1. block
1. element
1. modifier

It avoids introducing a fourth, optional level (modifier value)
which can complicate mental parsing and tooling logic.

---

To enforce this model, set the `modifierValuePattern` to `false`. \
This disables the use of separate modifier values entirely:

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/pattern': [true, {
      modifierValuePattern: false, // [!code focus]
    }],
  },
}
```

This will disallow any BEM selector that contains a separate modifier value. \
If you're using flattened values, they will be treated as part of the modifier name,
and validated against `modifierNamePattern`.

##### Example

```scss
// ✅ Valid: modifier is flattened into one name
.block--theme-dark {}

// ❌ Invalid: separate modifier name + value
.block--theme--dark {}
```

---

### Separators

The rule supports different naming conventions for BEM entities by allowing you
to configure the separators between block elements, modifiers, and modifier values.

This flexibility ensures compatibility with all popular BEM styles described in the
official [BEM methodology naming convention](https://en.bem.info/methodology/naming-convention/)
or even custom ones.

#### Available separators

| Option                   | Default | Description                                         |
| ------------------------ | ------- | --------------------------------------------------- |
| `elementSeparator`       | `__`    | Separator between block and element.                |
| `modifierSeparator`      | `--`    | Separator between block/element and modifier name.  |
| `modifierValueSeparator` | `--`    | Separator between modifier name and modifier value. |

#### Configuration examples

::: details `Two Dashes` style (default)

::: code-group

```js [Example config]
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/pattern': [true, {
      elementSeparator: '__',
      modifierSeparator: '--',
      modifierValueSeparator: '--',
    },
  },
}
```

```scss [BEM example]
.block {}
.block__element {}
.block__element--modifier-name {}
.block__element--modifier-name--value {}

.block--modifier {}
.block--modifier-name--value {}
```

:::

::: details `Traditional` style

::: code-group

```js [Example config]
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/pattern': [true, {
      elementSeparator: '__',
      modifierSeparator: '_',
      modifierValueSeparator: '_',
    },
  },
}
```

```scss [BEM example]
.block {}
.block__element {}
.block__element_modifier-name {}
.block__element_modifier-name_value {}

.block--modifier-name {}
.block--modifier-name_value {}
```

:::


::: details `React` style

::: code-group

```js [Example config]
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/pattern': [true, {
      elementSeparator: '-',
      modifierSeparator: '_',
      modifierValueSeparator: '_',
    },
  },
}
```

```scss [BEM example]
.Block {}
.Block-Element {}
.Block-Element_modifierName {}
.Block-Element_modifierName_value {}

.Block_modifierName {}
.Block_modifierName_value {}
```

:::

The rule does not enforce any specific separator style.
You can fully adapt it to match your team's preferred BEM convention by adjusting the separator options.

For details on naming principles, refer to the official [BEM methodology guide](https://en.bem.info/methodology/naming-convention/).

### Ignoring specific blocks (`ignoreBlocks`)

In some projects, not all class names are strictly controlled by your codebase or team conventions.
**For example, you might need to override:**

* Classes generated by third-party libraries.
* Global or legacy utility blocks.
* System-wide technical classes that don't follow your BEM patterns.

#### Configuration examples

::: details Ignore by exact name

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/pattern': [true, {
      ignoreBlocks: ['legacy-component'] // [!code focus]
    },
  },
}
```

---

```scss [BEM example]
// ✅ All selectors related to the .legacy-component block are completely ignored
.legacy-component.FOO_b-a-r {}
.legacy-component__ELEMENT {}
.legacy-component--MoDiFiEr {}
```

:::

::: details Ignore by wildcard pattern

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/pattern': [true, {
      ignoreBlocks: ['swiper-*'] // [!code focus]
    },
  },
}
```

---

```scss [BEM example]
// ✅ All selectors that begin with `.swiper-` are completely ignored
.swiper-slide.swiper-slide-active {}
```

:::

::: details Ignore by regular expression

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/pattern': [true, {
      ignoreBlocks: [/.*foo.*/] // [!code focus]
    },
  },
}
```

---

```scss [BEM example]
// ✅ All blocks containing `foo` are completely ignored
.Block-foo__Do-WHATEVER_you-want-here {}
.foo.IS_ACTIVE {}
```

:::

#### Notes

* The rule matches `ignoreBlocks` **only** against the block part of the selector.
* If the block name matches, the entire selector is excluded from validation.
* You can mix plain strings, wildcards, and regular expressions in the same list.

### Custom messages (`messages`)

The rule provides built-in error messages for BEM entities and utility classes. \
If you want to customize these messages - for example, to match your team's tone of voice,
to translate them, or to integrate with specific tooling -
you can provide custom message functions via the `messages` option.

Each message function receives the detected entity name, full resolved BEM selectors
and the list of expected patterns.

#### Example

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/pattern': [true, {
      messages: {
        block: (name, fullSelector, patterns) =>
          `⛔ Block name "${name}" is invalid. It must follow: ${patterns.map(p => p.source).join(', ')}`,

        element: (name) =>
          `⚠️ Element "${name}" doesn't look good.`,

        modifierValue: (name, fullSelector, patterns) => {
          if (patterns === false) {
            return `Modifier values in "${fullSelector}" are completely forbidden.`;
          }

          return `Modifier value "${name}" must match: ${patterns.map(p => p.source).join(', ')}`;
        },
      },
    }],
  },
}
```

::: details Show function signatures

```ts
type ProcessedPattern = {
  /**
   * The raw configuration value, cast to a string.
   */
  source: string;

  /**
   * The value cast to a RegExp, which is
   * applied for matching inside the rule.
   */
  regexp: RegExp;
};

export type MessagesOption = Partial<{
  /**
   * Custom message for BEM block violations.
   *
   * @param   name       Detected block name.
   * @param   patterns   Allowed patterns in object form.
   *
   * @returns            Error message.
   */
  block: (name: string, patterns: ProcessedPattern[]) => string;

  /**
   * Custom message for BEM element violations.
   *
   * @param   name       Detected element name.
   * @param   patterns   Allowed patterns in object form.
   *
   * @returns            Error message.
   */
  element: (name: string, patterns: ProcessedPattern[]) => string;

  /**
   * Custom message for BEM modifier name violations.
   *
   * @param   name       Detected modifier name.
   * @param   patterns   Allowed patterns in object form.
   *
   * @returns            Error message.
   */
  modifierName: (name: string, patterns: ProcessedPattern[]) => string;

  /**
   * Custom message for BEM modifier value violations.
   *
   * @param   name       Detected modifier value.
   * @param   patterns   Allowed patterns in object form.
   *
   * @returns            Error message.
   */
  modifierValue: (name: string, patterns: ProcessedPattern[]) => string;

  /**
   * Custom message for utility class violations.
   *
   * @param   name       Detected utility class name.
   * @param   patterns   Allowed patterns in object form
   *                     or `false` if utilities are forbidden.
   *
   * @returns            Error message.
   */
  utility: (name: string, patterns: ProcessedPattern[] | false) => string;
}>
```

:::

#### Notes

* You don't need to override all message functions - you can override only needed ones;
* You are free to generate simple static strings or fully dynamic messages;
* The `patterns` array contains objects with a `.source` property holding the original pattern string.
