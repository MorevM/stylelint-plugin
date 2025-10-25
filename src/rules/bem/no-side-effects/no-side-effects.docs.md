# @morev/bem/no-side-effects

Disallows selectors that apply styles outside the scope of the current BEM block.

```scss
.the-component {
  // ✅ OK: pseudo-element on the block
  &::before {}

  // ✅ OK: element within the same block
  &__element {

    // ❌ Side effect: generic element inside BEM element
    div {} // [!code error]
  }

  // ✅ OK: internal interaction between block elements
  &__link:hover &__foo {}

  // ❌ Side effect: unrelated component selector
  .foo-component {} // [!code error]
}

// ❌ Side effect: unrelated component selector on the root level
.another-component {} // [!code error]
```

<!-- @include: @/docs/_parts/bem-block.md -->

## Motivation

The purpose of this rule is to enforce strict encapsulation within BEM components.

BEM components **SHOULD NOT** apply styles to other components or elements. \
Each component's file is expected to contain styles that are **self-contained and local to the block it defines**.

When a component styles something outside its own block — e.g., targeting other components, elements, or global tags —
it breaks encapsulation and creates implicit dependencies between unrelated files.

Restricting each file to styling only its own block helps maintain a clear separation of concerns
and prevents styles from leaking across component boundaries.


## Rule options

All options are optional and come with recommended default values.

::: code-group

```js [Enabling a rule without options]
// 📄 .stylelintrc.js

export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-side-effects': true,
  }
}
```

```js [Enabling a rule with custom options]
// 📄 .stylelintrc.js

export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-side-effects': [true, {
      ignore: ['.swiper-*', 'span'],
      separators: {
        element: '__',
        modifier: '--',
        modifierValue: '--',
      },
      messages: {
        rejected: (selector) =>
          `Do not use side-effects like ${selector}.`,
      }
    }],
  }
}
```

:::

::: details Show full type of the options

```ts
export type NoSideEffectsOptions = {
  /**
   * Selectors to ignore (allowed side-effects). \
   * Each entry can be a string (optionally with wildcards) or a regular expression.
   *
   * @default []
   */
  ignore?: Array<string | RegExp>;


  /**
   * Object that defines BEM separators used to distinguish blocks, elements, modifiers, and modifier values. \
   * This allows the rule to work correctly with non-standard BEM naming conventions.
   */
  separators?: {
    /**
     * String used as the BEM element separator.
     *
     * @default '__'
     */
    element?: string;

    /**
     * String used as the BEM modifier separator.
     *
     * @default '--'
     */
    modifier?: string;

    /**
     * String used as the BEM modifier value separator.
     *
     * @default '--'
     */
    modifierValue?: string;
  }

  /**
   * Custom message functions for rule violations.
   * If provided, overrides the default error messages.
   */
  messages?: {
    /**
     * Custom message for a rejected selector.
     *
     * @param   selector   The offending selector, e.g. `> .side-effect`.
     *
     * @returns            The error message to report.
     */
    rejected?: (selector: string) => string;
  };
}
```

:::

<!-- @include: @/docs/_parts/stylelint-wide-options.md -->

---

### `ignore`

Some side effects are either **unavoidable** or **intentionally allowed** in certain workflows.
The `ignore` option provides an escape hatch for such cases by letting you explicitly whitelist selectors
that should be excluded from validation.

#### Common use cases

* **Third-party integration** — when targeting DOM structures from libraries like Swiper, Tippy, etc.,
  which don't follow your BEM conventions and cannot be styled otherwise.
* **Minor inline elements** — in some cases, developers choose not to introduce a dedicated BEM element for simple internal markup
  (e.g. `<span>` for currency symbol ), and instead write quick selectors like `.block__price span`.

While such cases are debatable from a strict BEM perspective,
the `ignore` option gives you control over which selectors to allow based on your team’s standards.

#### Configuration examples

::: details Ignore by exact name

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-side-effects': [true, {
      ignore: ['.some-component'] // [!code focus]
    },
  },
}
```

---

```scss [BEM example]
// ✅ Side effect on `.some-component` does not trigger warnings
.the-component .some-component {}

.the-component {
  .some-component {}
}
```

:::

::: details Ignore by wildcard pattern

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-side-effects': [true, {
      ignore: ['.swiper-*'] // [!code focus]
    },
  },
}
```

---

```scss [BEM example]
// ✅ Side effects on classes starting with `.swiper-` do not trigger warnings.
.the-component {
  .swiper-slide {}
  .swiper-pagination {}
  .swiper-navigation {}
}
```

:::

::: details Ignore by regular expression

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-side-effects': [true, {
      ignore: [/.*swiper.*/] // [!code focus]
    },
  },
}
```

---

```scss [BEM example]
// ✅ Any side effects containing `swiper` do not trigger warnings.
.the-component {
  div span .swiper-slide a {}
}
```

:::

#### Notes

* Each resolved side-effect selector is tested against all patterns in the list. \
  If at least one pattern matches, the selector is skipped and no warning is reported.
* Matching is performed against the entire resolved side-effect selector, not its individual parts. \
  For example, if the selector `.block__price span` is reported, then `'span'` does not match —
  use `'*span'` (string) or `/.*\sspan/` (RegExp) to allow such side-effects.
* You can mix plain strings, wildcards, and regular expressions in the same list.

---

### `separators`

<!-- @include: @/docs/_parts/separators.md#header -->

---

### `messages`

<!-- @include: @/docs/_parts/custom-messages.md#header -->

Message function receives the detected side-effect selector as an argument.

#### Example

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-side-effects': [true, {
      messages: {
        rejected: (selector) =>
          `⛔ Do not use side-effects like "${selector}".`,
        },
      },
    }],
  },
}
```

::: details Show function signature

```ts
export type MessagesOption = {
  /**
   * Custom message for a rejected selector.
   *
   * @param   selector   The offending selector, e.g. `> .side-effect`.
   *
   * @returns            The error message to report.
   */
  rejected?: (selector: string) => string;
};
```

:::

<!-- @include: @/docs/_parts/custom-messages.md#formatting -->
