# @morev/bem/no-misplaced-relational-styles

Requires relational styles for a BEM entity to be declared within that entity.

```scss
.block {
  $b: #{&};

  &__link {
    // ❌ Styles for `label` are owned by `link`.
    &:hover #{$b}__label {} // [!code error]
  }

  &__icon {
    // ✅ The target `icon` owns its reaction to `button`.
    #{$b}__button:hover & {}
  }
}
```

## Motivation

Contextual selectors often express that the state of one entity changes another entity.
It may feel natural to declare such a relation next to its source —
for example, to place label styles inside a link because `:hover` on the link triggers them.

```scss
.block__label {
  color: black;
}

.block__link {
  &:hover .block__label { // [!code error]
    color: red;
  }
}
```

However, this scatters styles targeting the label across declarations owned by other entities.

A BEM entity should be self-contained: once a developer finds its declaration,
they should be able to trust that all of its states and contextual reactions are located nearby, inside that entity.

```scss
.block__label {
  color: black;

  .block__link:hover & { // [!code focus]
    color: red;
  }
}
```

Reading, changing, or removing it then does not require searching through sibling entities
for additional selectors that happen to target it.

This follows the same locality principle as
[`@morev/base/no-selectors-in-at-rules`](../base/no-selectors-in-at-rules):
that rule keeps conditional declarations inside the selector they modify,
while this rule keeps cross-entity reactions inside the BEM entity they modify.
In both cases, finding the entity once gives you one predictable place to understand and edit its behavior.

```scss{6-9}
// All states and contextual reactions are colocated in one declaration.
// Find the entity once to see its complete behavior in every supported context.
.block__label {
  color: black;

  // Relational state: another BEM entity changes this entity.
  .block__link:hover & {
    color: red;
  }

  // Local state: the entity reacts to its own interaction.
  &:hover {
    color: blue;
  }

  // DOM state: application state exposed through an attribute.
  &[aria-current='true'] {
    font-weight: 700;
  }

  // Environmental context: the viewport changes the entity's presentation.
  @media (width >= 768px) {
    font-size: 1.25rem;
  }

  // Capability context: the browser supports an enhanced presentation.
  @supports (text-wrap: balance) {
    text-wrap: balance;
  }

  // Ancestor context: the surrounding theme affects the entity.
  [data-theme='dark'] & {
    color: white;
  }
}
```

Explicit ownership also makes refactoring safer:
removing an entity removes its contextual styles with it instead of leaving stale selectors elsewhere in the component.

The rule complements [`@morev/bem/no-side-effects`](./no-side-effects):

- `no-side-effects` prevents a component file from styling content outside its BEM block;
- `no-misplaced-relational-styles` verifies ownership of relations inside the block.

## Modifiers

Modifiers are independent owners:

```scss
.block {
  &__item {
    // Owns styles for `.block__item`.

    &--active {
      // Owns styles for `.block__item--active`.
    }
  }
}
```

In SCSS, a modifier can be nested under its base entity for declaration convenience,
but it still creates a separate ownership scope.
Contextual styles targeting the modifier therefore belong inside the modifier:

::: code-group

```scss [❌ Element owns modifier styles]
.block {
  &__item {
    .block:hover &--active {} // [!code error]
  }
}
```

```scss [✅ Modifier owns its styles]
.block {
  &__item {
    &--active {
      .block:hover & {}
    }
  }
}
```

:::

## CSS mechanics

With native CSS Nesting, the surrounding BEM entity owns the styles applied by a nested relation.
Native nesting does not concatenate identifiers.
An element or modifier therefore uses its full BEM selector as the outer owner:

```css
.block__item--active {
  .block:hover & {}
}
```

Flat relational selectors have no owner and are rejected:

```css
.block__link:hover .block__label {} /* ❌ */
```

## Rule options

All options are optional and come with recommended default values.

::: code-group

```js [Enabling a rule without options]
// 📄 .stylelintrc.js

export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-misplaced-relational-styles': true,
  }
}
```

```js [Enabling a rule with custom options]
// 📄 .stylelintrc.js

export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-misplaced-relational-styles': [true, {
      separators: {
        element: '__',
        modifier: '--',
        modifierValue: '--',
      },
      messages: {
        misplaced: (target, owner) =>
          `Move ${target} from ${owner ?? 'root'} into its own styles.`,
      },
    }],
  },
}
```

:::

::: details Show full type of the options

```ts
export type NoMisplacedSideEffectsOptions = {
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
     * Custom message for relational styles declared outside their target BEM entity.
     *
     * @param   target   Target BEM entity.
     * @param   owner    BEM entity that currently owns the styles, or `undefined` for a detached selector.
     *
     * @returns          The error message to report.
     */
    misplaced?: (target: string, owner: string | undefined) => string;
  };
}
```

:::

<!-- @include: @/docs/_parts/stylelint-wide-options.md -->

---

### `separators`

<!-- @include: @/docs/_parts/separators.md#header -->

---

### `messages`

<!-- @include: @/docs/_parts/custom-messages.md#header -->

The message function receives the target BEM entity and the entity that currently owns its styles. \
For detached top-level selectors, `owner` is `undefined`.

#### Example

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-misplaced-relational-styles': [true, {
      messages: {
        misplaced: (target, owner) => owner
          ? `⛔ Move "${target}" from "${owner}" into its own styles.`
          : `⛔ Move "${target}" into its own styles.`,
      },
    }],
  },
}
```

::: details Show function signature

```ts
export type MessagesOption = {
  /**
   * Custom message for relational styles declared outside their target BEM entity.
   *
   * @param   target   Target BEM entity.
   * @param   owner    BEM entity that currently owns the styles, or `undefined` for a detached selector.
   *
   * @returns          The error message to report.
   */
  misplaced?: (target: string, owner: string | undefined) => string;
};
```

:::

<!-- @include: @/docs/_parts/custom-messages.md#formatting -->
