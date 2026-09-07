# @morev/bem/selector-variable-pattern <!-- @include: @/docs/_parts/sass-only.md -->

Enforces naming patterns for SASS variables containing BEM selectors.

```scss
.the-component {
  $item: #{&}__item;
/* ↑ This variable name */
}
```

## Motivation

Selector variables make it easier to reference BEM elements from different parts of a component.
When their names match the elements they represent, you can understand a reference
without looking up its declaration.

This rule establishes that convention by default and lets you define your own naming policy
based on the selector, variable, and surrounding rule.

## Rule options

All options are optional and have sensible default values. \
Violations with an exact expected name can be auto-fixed when the variable can be safely renamed.

::: code-group

```js [Enabling a rule with recommended defaults]
// 📄 .stylelintrc.js

export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/selector-variable-pattern': true,
  },
}
```

```js [Enabling a rule with custom options]
// 📄 .stylelintrc.js

export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/selector-variable-pattern': [true, {
      resolve: ({ selector, variable, owner }) => {
        if (!owner || owner.depth > 1) return;
        if (selector.block !== owner.block) return;
        if (variable.reference === 'variable') return;
        if (!selector.element) return;

        return [
          selector.element,
          selector.modifierName,
          selector.modifierValue,
        ].filter(Boolean).join('-');
      },
      separators: {
        element: '__',
        modifier: '--',
        modifierValue: '--',
      },
    }],
  },
}
```

:::

::: details Show full type of the options

```ts
type SelectorVariablePatternOptions = {
  /**
   * Overrides the default naming policy for selector variables.
   * See the resolver context below for the available fields.
   */
  resolve?: (
    context: SelectorVariablePatternContext,
  ) => string | RegExp | null | undefined;

  /**
   * Separators used to distinguish BEM elements, modifiers, and modifier values.
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
  };

  /**
   * Custom message functions for rule violations.
   */
  messages?: {
    /**
     * Reported when a variable name does not match the resolved expectation.
     *
     * @param   actualName   Actual variable name without the leading `$`.
     * @param   expected     Exact name or regular expression returned by the resolver.
     * @param   context      BEM selector variable context.
     *
     * @returns              Error message.
     */
    invalidName?: (
      actualName: string,
      expected: string | RegExp,
      context: SelectorVariablePatternContext,
    ) => string;
  };
};
```

:::

<!-- @include: @/docs/_parts/stylelint-wide-options.md -->

---

### `resolve`

Allows you to configure the variable naming policy based on the resolved BEM selector,
variable, and surrounding rule.

```ts
type ResolveOption = (
  context: SelectorVariablePatternContext,
) => string | RegExp | null | undefined;

type SelectorVariablePatternContext = {
  selector: {
    value: string;
    bemSelector: string;
    block: string;
    element: string | null;
    modifierName: string | null;
    modifierValue: string | null;
  };

  variable: {
    name: string;
    value: string;
    reference: 'self' | 'variable' | null;
  };

  owner: {
    selector: string;
    block: string | null;
    depth: number;
    path: readonly string[];
  } | null;
};
```

#### Default behavior

By default, the rule checks variables declared directly in block selectors
and representing an element of the same BEM block:

- Plain elements require the exact element name;
- Modified elements require the variable name to contain the element name.
  The modifier name and value do not affect the expected pattern.

Blocks, elements of another block, aliases to other variables, stylesheet-root variables,
and variables declared in nested selectors are skipped.

```scss
// Config: true

.the-component {
  $b: #{&}; // ✅ Block references are skipped
  $item: #{$b}__item; // ✅ Exact element name
  $item-active: #{$b}__item--active; // ✅ Contains the element name

  $wrong: #{$b}__label; // ❌ Expected `$label`
  $active: #{$b}__item--active; // ❌ Does not contain `item`

  $alias: $item; // ✅ Aliases are skipped
  $foreign: '.another-block__item'; // ✅ Elements of another block are skipped

  &__wrapper {
    $nested: #{$b}__item; // ✅ Variables in nested selectors are skipped
  }
}
```

#### Custom naming policy

A custom resolver replaces the default policy, including its scope restrictions.
It receives statically resolved BEM selector variables from the stylesheet root
and selectors at every nesting depth, including aliases and selectors from other blocks.
Use the callback context to decide which variables to check.

| Return value          | Behavior                                                 | Auto-fix   |
| --------------------- | -------------------------------------------------------- | ---------- |
| `string`              | Requires the exact variable name, without `$`.           | When safe. |
| `RegExp`              | Tests the variable name without `$` against the pattern. | No.        |
| `null` or `undefined` | Skips the variable.                                      | No.        |

##### Examples

::: details Exact name

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/selector-variable-pattern': [true, {
      resolve: ({ selector }) => {
        if (!selector.element) return;

        return [
          selector.element,
          selector.modifierName,
          selector.modifierValue,
        ].filter(Boolean).join('-');
      },
    }],
  },
}
```

---

```scss
.the-tabs {
  $tab: #{&}__tab; // ✅ Element name
  $tab-active: #{&}__tab--active; // ✅ Element and modifier name
  $tab-size-large: #{&}__tab--size--large; // ✅ Element, modifier name, and modifier value

  $active: #{&}__tab--active; // ❌ Expected `$tab-active`
  $tab-large: #{&}__tab--size--large; // ❌ Expected `$tab-size-large`

  $block: #{&}; // ✅ No element name, so the resolver returns `undefined`
}
```

:::

::: details Pattern

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/selector-variable-pattern': [true, {
      resolve: () => /^selector-/,
    }],
  },
}
```

---

```scss
.the-tabs {
  $selector-block: #{&}; // ✅ Starts with `selector-`
  $selector-tab: #{&}__tab; // ✅ Starts with `selector-`
  $selector-active-tab: #{&}__tab--active; // ✅ Starts with `selector-`

  $tab: #{&}__tab; // ❌ Missing `selector-` prefix; no auto-fix
  $active-tab: #{&}__tab--active; // ❌ Missing `selector-` prefix; no auto-fix
}
```

:::

::: details Skip

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/selector-variable-pattern': [true, {
      resolve: ({ selector }) => {
        if (selector.block.startsWith('legacy-')) return null;
        return selector.element;
      },
    }],
  },
}
```

---

```scss
.legacy-component {
  $anything: #{&}__item; // ✅ Skipped because the resolver returns `null`
}

.the-component {
  $item: #{&}__item; // ✅ Exact element name
  $wrong: #{&}__item; // ❌ Expected `$item`
}
```

:::

#### Resolver context

The callback receives an object with three fields: `selector`, `variable`, and `owner`.

##### `selector`

Contains the complete resolved variable value and the individual parts of its single BEM entity.
Missing optional entity parts are represented by `null`.

```scss
.the-component {
  $item: '#{&}__item--size--large:hover';
}
```

For `$item`, the relevant fields are:

```js
{
  value: '.the-component__item--size--large:hover',
  bemSelector: '.the-component__item--size--large',
  block: 'the-component',
  element: 'item',
  modifierName: 'size',
  modifierValue: 'large',
}
```

##### `variable`

Contains the current name without `$`, the raw declaration value, and the kind of reference
that forms its complete value:

- `variable` for an alias to another SASS variable, including simple interpolation;
- `self` for a reference to the current `&` context;
- `null` when the value contains literal selector syntax or combines multiple parts.

```scss
.the-component {
  $item: #{&}__item;       // `null`
  $alias: $item;           // `variable`
  $interpolated: #{$item}; // `variable`
  $self: #{&};             // `self`
}
```

This lets a resolver enforce a dedicated name for variables that capture their owner selector:

```js
// Within the rule options
resolve: ({ variable }) => {
  if (variable.reference === 'variable') return null;
  if (variable.reference === 'self') return 'self';
}
```

##### `owner`

Contains the resolved selector of the rule where the variable is declared. `block` is set only
when that selector contains one unambiguous BEM entity. `path` contains the authored selectors
from the outermost rule to the owner, while `depth` is the variable declaration's selector
nesting level and equals `path.length`. At-rule wrappers do not affect either field.

For a variable declared inside `.the-component { &__wrapper {} }`, the owner context contains:

```js
{
  selector: '.the-component__wrapper',
  block: 'the-component',
  depth: 2,
  path: ['.the-component', '&__wrapper'],
}
```

A variable declared directly at the stylesheet root is at level `0` and has no selector owner,
so the resolver receives `owner: null`. A top-level selector owner starts at `depth: 1`.

Selectors from another block still reach the resolver. The callback can compare the blocks and
return `null` or `undefined` when they should be ignored:

```js
// Within the rule options
resolve: ({ selector, owner }) => {
  if (owner && selector.block !== owner.block) return null;
  if (owner && owner.depth > 1) return null;
  return selector.element;
}
```

---

### `separators`

<!-- @include: @/docs/_parts/separators.md#header -->

<!-- @include: @/docs/_parts/separators.md#footer -->

---

### `messages`

<!-- @include: @/docs/_parts/custom-messages.md#header -->

The `invalidName` function receives the actual variable name, the expected name or pattern,
and the same context as the resolver. \
`actualName` and string `expected` values do not include the leading `$`.

#### Example

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/selector-variable-pattern': [true, {
      messages: {
        invalidName: (actualName, expected, context) =>
          `Variable "$${actualName}" must match "${expected}" for "${context.selector.bemSelector}".`,
      },
    }],
  },
}
```

::: details Show function signature

```ts
type MessagesOption = {
  /**
   * Reported when a variable name does not match the resolved expectation.
   *
   * @param   actualName   Actual variable name without the leading `$`.
   * @param   expected     Exact name or regular expression returned by the resolver.
   * @param   context      BEM selector variable context.
   *
   * @returns              Error message.
   */
  invalidName?: (
    actualName: string,
    expected: string | RegExp,
    context: SelectorVariablePatternContext,
  ) => string;
};
```

:::

<!-- @include: @/docs/_parts/custom-messages.md#formatting -->

## Additional notes

### Supported values

Unknown variables, complex SASS expressions, selector lists, and values containing multiple
BEM entities are skipped, even with a custom resolver.
The rule only checks values that resolve to a single selector containing exactly one BEM entity.
Variables declared inside selector lists are also skipped because they have more than one possible owner.

### Auto-fix

When the resolver returns a valid SASS variable name as a string,
the rule can rename the declaration and its local references.
If a rename could affect another variable or a reference outside the local rule scope,
the violation is reported without a fix.

The rule also avoids renaming variables when it cannot establish a safe rename because of
reassignments, callable parameters, module-qualified references, `!default`, or `!global`.

Regular expression results are never auto-fixed because a pattern does not identify one exact name.
