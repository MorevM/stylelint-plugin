# @morev/bem/block-variable <!-- @include: @/docs/_parts/sass-only.md -->

Ensures that the top-level block selector (assumed to be the component's root selector)
includes a variable that references the block name.

```scss
.the-component {
  $b: #{&}; // <- This block reference variable
}
```


<!-- @include: @/docs/_parts/bem-block.md -->

## Motivation

Component element states often depend on the block’s modifier. For example:

```scss{1,6}
.the-component {

  &__element {
    color: red;

    .the-component--active & {
      color: blue;
    }
  }
}
```

This increases the risk of typos, dead code during refactoring (e.g., when renaming a component), and unnecessary verbosity.

Defining a default variable in each component that references the block name is a good practice -
it establishes a consistent convention across all components and helps avoid these issues.

```scss{2,7} [With variable]
.the-component {
  $b: #{&}; // $b - first letter in the BEM abbreviation

  &__element {
    color: red;

    #{$b}--active & {
      color: blue;
    }
  }
}
```

## Rule options

All options are optional and have sensible default values. \
Almost all rule warnings are auto-fixable, except for multiple references to an element.

::: code-group

```js [Enabling a rule with recommended defaults]
// 📄 .stylelintrc.js

export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/block-variable': true,
  }
}
```

```js [Enabling a rule with custom options]
// 📄 .stylelintrc.js

export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/block-variable': [true, {
      name: 'b',
      interpolation: 'always',
      firstChild: true,
      replaceBlockName: true,
      separators: {
        element: '__',
        modifier: '--',
        modifierValue: '--',
      },
      messages: {
        missingVariable: (validName) =>
          `Missing block reference variable "${validName}".`
      }
    }],
  },
}
```

:::

::: details Show full type of the options

```ts
type BlockVariableOptions = {
  /**
   * The name of the variable containing the block reference.
   *
   * @default 'b' // based on the first letter of the BEM abbreviation.
   */
  name?: string;

  /**
   * Whether the reference must contain an interpolation.
   *
   * @default 'always'
   */
  interpolation?: 'always' | 'never' | 'ignore';

  /**
   * Whether a block reference should be the first declaration of an element.
   *
   * @default true
   */
  firstChild?: boolean;

  /**
   * Whether to automatically replace hardcoded occurrences of the block name
   * inside nested selectors with the corresponding block variable.
   *
   * @default true
   */
  replaceBlockName?: boolean;

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
   * If provided, they override the default error messages.
   */
  messages?: {
    /**
     * Reported when the component is missing the required block reference variable.
     *
     * @param   validName   The expected variable name (with leading `$`), e.g. `"$b"`.
     *
     * @returns             The error message to report.
     */
    missingVariable?: (validName: string) => string;

    /**
     * Reported when the block reference variable exists but is not the
     * first declaration in the component's root selector.
     *
     * @param   validName   The expected variable name (with leading `$`), e.g. `"$b"`.
     * @param   selector    The component root selector (e.g., ".the-component").
     *
     * @returns             The error message to report.
     */
    variableNotFirst?: (validName: string, selector: string) => string;

    /**
     * Reported when the variable exists but its name does not match the expected one.
     *
     * @param   expected   The expected variable name (with leading `$`), e.g. `"$b"`.
     * @param   actual     The actual variable name found (with leading `$`).
     *
     * @returns            The error message to report.
     */
    invalidVariableName?: (expected: string, actual: string) => string;

    /**
     * Reported when the variable exists but its value is invalid for the current `interpolation` setting.
     *
     * @param   actual    The value found (e.g., ".the-component" or "&").
     * @param   allowed   List of allowed values (e.g., ['"#{&}"', '"&"'] after quoting).
     *
     * @returns           The error message to report.
     */
    invalidVariableValue?: (actual: string, allowed: string[]) => string;

    /**
     * Reported when multiple variables that reference the block are defined.
     *
     * @param   foundName      A non-expected variable name encountered (with leading `$`).
     * @param   expectedName   The single expected variable name (with leading `$`).
     *
     * @returns                The error message to report.
     */
    duplicatedVariable?: (foundName: string, expectedName: string) => string;

    /**
     * Reported when a hardcoded block name is used instead of a safe reference.
     *
     * @param   blockSelector   The hardcoded block selector found (e.g., ".the-component").
     * @param   variableRef     The block reference variable that should be used (e.g., "#{$b}").
     * @param   context         Where the hardcoded selector was found.
     *                          - `root`: `.foo { .foo__el {} }`
     *                          - `nested`: `.foo { &__el { .foo__bar {} } }`
     * @param   fixable         Whether the case can be safely auto-fixed.
     *
     * @returns                 The error message to report.
     */
    hardcodedBlockName?: (
      blockSelector: string,
      variableRef: string,
      context: 'root' | 'nested',
      fixable: boolean,
    ) => string;
  };
};
```

:::

<!-- @include: @/docs/_parts/stylelint-wide-options.md -->

---

### `name`

The name of the variable containing the block reference.

```ts
/**
 * @default 'b' // based on the first letter of the BEM abbreviation
 */
type NameOption = string;
```

::: tip
You might prefer using the full name "block" if you avoid abbreviations (which is also a good practice),
but in practice, clearly distinguishing the variable from others matters more than strictly avoiding abbreviations.
:::

#### Examples

```scss
// Config: [true, { name: 'b' }]

// ✅ The variable exists, correctly references the block,
// ✅ and uses the expected name
.the-component {
  $b: #{&};
}

// ❌ The variable exists and correctly references the block,
// ❌ but its name does not match the expected one
.the-component {
  $block: #{&};
}

// ❌ The variable exists with the correct name,
// ❌ but it does not use a reference to block
.the-component {
  $b: .the-component;
}

// ❌ Multiple variables referencing the block are defined
.the-component {
  $b: #{&};
  $block: #{&};
}

// ❌ The variable referencing the block is missing.
.the-component {}
```

---

### `interpolation`

Whether the reference must contain an interpolation.

```ts
/**
 * @default 'always'
 */
type InterpolationOption = 'always' | 'never' | 'ignore';
```

#### Options:

* `always` - always use interpolation, `#{&}` is valid **(default value)**;
* `never` - never use interpolation, `&` is valid;
* `ignore` - consider both to be valid, `&` and `#{&}` are valid values.

::: details Why `always` is the default value?
The variable itself doesn't require interpolation to work, so different formats are allowed. \
However, if you create additional variables that build on it (like element references),
using interpolation is **mandatory** according to SASS:

```scss
.the-component {
  $b: #{&};                 // may work without interpolation
  $element: #{$b}__element; // won't work without interpolation
}
```

Therefore, to maximize consistency, `always` is the default value.
:::

#### Examples

::: code-group

```scss [always]
// config: [true, { interpolation: 'always' }]

// ✅ The variable uses interpolation
.the-component {
  $b: #{&};
}

// ❌ The variable do not use interpolation
.the-component {
  $b: &;
}
```

```scss [never]
// config: [true, { interpolation: 'never' }]

// ❌ The variable uses interpolation
.the-component {
  $b: #{&};
}

// ✅ The variable do not use interpolation
.the-component {
  $b: &;
}
```

```scss [ignore]
// config: [true, { interpolation: 'ignore' }]

// ✅ The variable use interpolation
.the-component {
  $b: #{&};
}

// ✅ The variable do not use interpolation
.the-component {
  $b: &;
}
```

:::

---

### `firstChild`

Whether the block reference should be the first declaration of an element.

```ts
/**
 * @default true
 */
type FirstChildOption = boolean;
```

This creates a consistent structure for every component and sets clear expectations for how a component should start.

#### Examples

::: code-group

```scss [true]
// Config: [true, { firstChild: true }]

// ✅ Variable is the first declaration of the element
.the-component {
  $b: #{&};
  color: red;
}

// ❌ Variable is not the first declaration of the element
.the-component {
  color: red;
  $b: #{&};
}
```

```scss [false]
// Config: [true, { firstChild: false }]

// ✅ Variable is the first declaration of the element
.the-component {
  $b: #{&};
  color: red;
}

// ✅ Variable is not the first declaration of the element, but still valid
.the-component {
  color: red;
  $b: #{&};
}
```

:::

### `replaceBlockName`

Whether to automatically replace hardcoded block names with the block variable
in descendant selectors, or with `&` when safely possible in root selectors.

```ts
/**
 * @default true
 */
type ReplaceBlockNameOption = boolean;
```

When enabled *(default behavior)*, the rule scans nested selectors within the component block
and replaces any hardcoded usages of the block name
(e.g., `.the-component--active`) with the correct block variable (e.g., `#{$b}--active`).

This prevents typos, improves maintainability, and ensures consistent use of variables.

#### Examples

::: code-group

```scss{5} [Before]
.the-component {
  $b: #{&};

  &__element {
    .the-component--active & {
      color: blue;
    }
  }
}
```

```scss{5} [After auto-fix]
.the-component {
  $b: #{&};

  &__element {
    #{$b}--active & {
      color: blue;
    }
  }
}
```

:::

::: info
This applies only to occurrences of the block name inside the current component's scope. \
Ambiguous cases (e.g. root-level selectors without `&`, where both `&--mod` and `& &--mod` could be valid) are **reported only** and not auto-fixed.
:::

---

### `separators`

<!-- @include: @/docs/_parts/separators.md#header -->

---

### `messages`

<!-- @include: @/docs/_parts/custom-messages.md#header -->

Each message function lets you override a specific violation. \
Refer to the function signatures below to see which arguments are passed
for each case and how you can use them in your custom messages.

#### Example

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/block-variable': [true, {
      messages: {
        missingVariable: (validName) =>
          `⛔ Define ${validName} in the component root selector.`,

        variableNotFirst: (validName, selector) =>
          `⚠️ ${validName} must be the first declaration in "${selector}".`,

        invalidVariableName: (expected, actual) =>
          `⛔ Wrong variable name: expected "${expected}", got "${actual}".`,

        invalidVariableValue: (actual, allowed) =>
          `⛔ Invalid value "${actual}". Allowed: ${allowed.join(' or ')}.`,

        duplicatedVariable: (foundName, expectedName) =>
          `⛔ Duplicate block variables (e.g., "${foundName}"). Keep a single "${expectedName}".`,

        hardcodedBlockName: (blockSelector, variableRef, context, fixable) =>
          `⛔ Hardcoded block "${blockSelector}" found. Use ${variableRef} instead.`,
      },
    }],
  },
}
```

::: details Show function signatures

```ts
export type MessagesOption = {
  /**
   * Missing block reference variable in the component root.
   *
   * @param validName  Expected variable name with a leading `$`, e.g. `"$b"`.
   * @returns          Error message.
   */
  missingVariable?: (validName: string) => string;

  /**
   * Variable exists but is not the first declaration in the root selector.
   *
   * @param validName  Expected variable name with `$`, e.g. `"$b"`.
   * @param selector   Component root selector, e.g. ".the-component".
   * @returns          Error message.
   */
  variableNotFirst?: (validName: string, selector: string) => string;

  /**
   * Variable exists but its name is different from the expected one.
   *
   * @param expected   Expected name with `$`, e.g. `"$b"`.
   * @param actual     Actual name found with `$`.
   * @returns          Error message.
   */
  invalidVariableName?: (expected: string, actual: string) => string;

  /**
   * Variable exists but its value doesn't match the `interpolation` setting.
   *
   * @param actual     Value found (e.g., ".the-component" or "&").
   * @param allowed    List of allowed values (e.g., ['#{&}', '&']).
   * @returns          Error message.
   */
  invalidVariableValue?: (actual: string, allowed: string[]) => string;

  /**
   * Multiple variables that reference the block are defined.
   *
   * @param foundName      An extra variable name encountered with `$`.
   * @param expectedName   The single expected variable name with `$`.
   * @returns              Error message.
   */
  duplicatedVariable?: (foundName: string, expectedName: string) => string;

    /**
     * Reported when a hardcoded block name is used instead of a safe reference.
     *
     * @param   blockSelector   The hardcoded block selector found (e.g., ".the-component").
     * @param   variableRef     The block reference variable that should be used (e.g., "#{$b}").
     * @param   context         Where the hardcoded selector was found.
     *                          - `root`: `.foo { .foo__el {} }`
     *                          - `nested`: `.foo { &__el { .foo__bar {} } }`
     * @param   fixable         Whether the case can be safely auto-fixed.
     *
     * @returns                 The error message to report.
     */
    hardcodedBlockName?: (
      blockSelector: string,
      variableRef: string,
      context: 'root' | 'nested',
      fixable: boolean,
    ) => string;
};
```

:::

<!-- @include: @/docs/_parts/custom-messages.md#formatting -->
