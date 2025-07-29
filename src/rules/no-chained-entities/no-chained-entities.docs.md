# @morev/bem/no-chained-entities

Disallows splitting BEM entities across multiple chained `&` selectors in SCSS.

::: info SASS/SCSS-only
This rule applies only to SASS/SCSS files and has no effect on plain CSS files.
:::

::: code-group

```scss [❌ Bad component structure]
.the-header {
  $b: &;

  &__primary {
    // ...some element styles

    &-actions {
      // ...some element styles

      &-button {
        // ...some element styles

        &--log-in {
          // ...modifier styles
        }

        &--favorites {
          // ...modifier styles
        }
      }
    }
  }
}
```

```scss [✅ Good component structure]
.the-header {
  $b: &;

  &__primary {
    // ...some element styles
  }

  &__primary-actions {
    // ...some element styles
  }

  &__primary-actions-button {
    // ...some element styles

    &--log-in {
      // ...modifier styles
    }

    &--favorites {
      // ...modifier styles
    }
  }
}
```

:::

## Motivation

At first glance, splitting BEM selectors into smaller nested parts using `&` *might* seem elegant or even efficient —
you avoid repetition and reuse existing context. \
But in real-world maintenance, this approach quickly turns into a problem.

Imagine you're debugging a button from the example above.

* You see this in the HTML: `class="the-header__primary-actions-button"`;
* You recognize it as the `primary-actions-button` element of the `the-header` block;
* You open `the-header.scss` and search for it — but nothing comes up.

Why? Because it was built piece by piece:

```scss
&__primary {
  &-actions {
    &-button {}
  }
}
```

Now you’re forced to mentally reconstruct the full class name from nested fragments:
`&__primary` → `&__primary-actions` → `&__primary-actions-button`.

This mental effort adds up, especially in large codebases with deep nesting.

But when selectors are written as complete BEM entities at each level, they're easy to find with a simple text search.
Looking for an element? You'll find it. Looking for its modifier? It's right there — inside the corresponding element block.
No reconstruction, no guesswork.

::: danger Long story short — don't split BEM entities ✂️
**Words break by syllables — BEM breaks by entities.** \
Write each full entity on its own nesting level for clarity and searchability.
:::

## Rule options

All options are optional and have sensible default values.

::: code-group

```js [Enabling a rule with recommended defaults]
// 📄 .stylelintrc.js

export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-chained-entities': true,
  }
}
```

```js [Enabling a rule with custom options]
// 📄 .stylelintrc.js

export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-chained-entities': [true, {
      disallowNestedModifierValues: false,
      separators: {
        element: '__',
        modifier: '--',
        modifierValue: '--',
      }
      messages: {
        element: (actual, expected) => {
          return `
            ⛔ Unexpected chained BEM element ${actual}.
            Use ${expected} at parent level instead.
          `;
        },
        // ...other custom messages
      },
    }],
  },
}
```

:::

::: details Show full type of the rule options

```ts
export type NoChainedEntitiesSecondaryOption = {
  /**
   * Whether to disallow nesting for modifier values.
   *
   * @default false
   */
  disallowNestedModifierValues?: boolean;

  /**
   * Custom message functions for each violation type.
   * If provided, overrides the default error messages.
   */
  messages?: {
    /**
     * Custom message for chained BEM block violations.
     *
     * @param   actual     Actual BEM selector found in the source code.
     * @param   expected   Expected BEM selector.
     *
     * @returns            Error message.
     */
    block?: (actual: string, expected: string) => string;

    /**
     * Custom message for chained BEM element violations.
     *
     * @param   actual     Actual BEM selector found in the source code.
     * @param   expected   Expected BEM selector.
     *
     * @returns            Error message.
     */
    element?: (actual: string, expected: string) => string;

    /**
     * Custom message for chained BEM modifier violations.
     *
     * @param   actual     Actual BEM selector found in the source code.
     * @param   expected   Expected BEM selector.
     *
     * @returns            Error message.
     */
    modifierName?: (actual: string, expected: string) => string;

    /**
     * Custom message for chained BEM modifier value violations.
     *
     * @param   actual     Actual BEM selector found in the source code.
     * @param   expected   Expected BEM selector.
     *
     * @returns            Error message.
     */
    modifierValue?: (actual: string, expected: string) => string;

    /**
     * Custom message for nested BEM modifier values.
     *
     * @param   actual     Actual BEM selector found in the source code.
     * @param   expected   Expected BEM selector.
     *
     * @returns            Error message.
     */
    nestedModifierValue?: (actual: string, expected: string) => string;
  };

  /**
   * Object that defines BEM separators used to distinguish blocks, elements, modifiers, and modifier values. \
   * This allows the rule to work correctly with non-standard BEM naming conventions.
   *
   * @default { element: '__', modifier: '--', modifierValue: '--' }
   */
  separators?: {
    /**
     * Separator between block and element.
     *
     * @default '__'
     */
    element?: string;

    /**
     * Separator between block/element and modifier name.
     *
     * @default '--'
     */
    modifier?: string;

    /**
     * Separator between modifier name and modifier value.
     *
     * @default '--'
     */
    modifierValue?: string;
  };
};
```

:::

---

### `disallowNestedModifierValues`

Enforces that modifier values must be expressed as flat, single-level selectors rather than nested under modifier names.

```ts
/**
 * @default false
 */
type DisallowNestedModifierValuesOption = boolean;
```

Some teams prefer to keep the BEM structure strictly three-leveled,
without introducing an extra nesting level for modifier values:

1. `block`
1. `[element]`
1. `[modifier[-value]]`


```scss
// ❌ Nested modifier values — not allowed with this option
.app-button {
  &--variant {
    &--primary {}
    &--secondary {}
  }
}

// ✅ Flat modifier values — allowed
.app-button {
  &--variant--primary {}
  &--variant--secondary {}
}
```

This keeps selectors simple and consistent, and makes each full modifier easily searchable and traceable in code.

---

### `separators`

<!-- @include: @/docs/_parts/separators.md -->

---

### `messages`

<!-- @include: @/docs/_parts/custom-messages.md#header -->

Each message function receives the detected selector and expected (correct) selector as a suggestion.

#### Example

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-chained-entities': [true, {
      messages: {
        block: (actual, expected) =>
          `⛔ Do not split block names like "${actual}". Rewrite to ${expected}.`,

        nestedModifierValue: (actual, expected) => {
          return `
            Do not nest modifier values - prefer flat form.
            Write "${expected}" at the parent level instead of "${actual}".
          `
        },
      },
    }],
  },
}
```

::: details Show function signatures

```ts
export type MessagesOption = {
  /**
   * Custom message for chained BEM block violations.
   *
   * @param   actual     Actual BEM selector found in the source code.
   * @param   expected   Expected BEM selector.
   *
   * @returns            Error message.
   */
  block?: (actual: string, expected: string) => string;

  /**
   * Custom message for chained BEM element violations.
   *
   * @param   actual     Actual BEM selector found in the source code.
   * @param   expected   Expected BEM selector.
   *
   * @returns            Error message.
   */
  element?: (actual: string, expected: string) => string;

  /**
   * Custom message for chained BEM modifier violations.
   *
   * @param   actual     Actual BEM selector found in the source code.
   * @param   expected   Expected BEM selector.
   *
   * @returns            Error message.
   */
  modifierName?: (actual: string, expected: string) => string;

  /**
   * Custom message for chained BEM modifier value violations.
   *
   * @param   actual     Actual BEM selector found in the source code.
   * @param   expected   Expected BEM selector.
   *
   * @returns            Error message.
   */
  modifierValue?: (actual: string, expected: string) => string;

  /**
   * Custom message for nested BEM modifier values.
   *
   * @param   actual     Actual BEM selector found in the source code.
   * @param   expected   Expected BEM selector.
   *
   * @returns            Error message.
   */
  nestedModifierValue?: (actual: string, expected: string) => string;
};
```

:::

<!-- @include: @/docs/_parts/custom-messages.md#formatting -->
