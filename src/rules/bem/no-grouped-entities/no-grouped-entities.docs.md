# @morev/bem/no-grouped-entities

Prevents BEM entities from having both grouped and separate declarations.

::: code-group

```scss [❌ Grouped and separate declarations]
.block {
  &__title, // [!code error]
  &__table-heading {
    font-weight: 700;
  }

  &__title { // [!code highlight]
    font-size: 16px;
  }
}
```

```scss [✅ Independent entity declarations]
.block {
  &__title {
    font-size: 16px;
    font-weight: 700;
  }

  &__table-heading {
    font-weight: 700;
  }
}
```

:::

:::: info Default behavior vs `strict`
By default, different BEM entities may share a selector list **while that group remains their only declaration owner.**
Enable [`strict`](#strict) to always disallow such groups.

::: code-group

```scss [✅ Default behavior]
.block {
  &__title,
  &__table-heading {
    font-weight: 700;
  }
}
```

```scss [❌ Strict behavior]
.block {
  &__title,
  &__table-heading { // [!code error]
    font-weight: 700;
  }
}
```

:::
::::

## Motivation

Grouping entities is convenient while their declarations are identical.
It becomes risky when one of them also receives declarations from another rule:
the entity now has both an individual owner and a shared owner which is easy to miss during changes or removal.

The default behavior reports that transition and points to the affected branch in the original group:

```scss
.block {
  // ❌ `title` is reported because it also has a separate owner below.
  &__title, // [!code error]
  &__table-heading {
    font-weight: 700;
  }

  // This separate declaration turns the valid group into a violation.
  &__title:hover { // [!code highlight]
    color: rebeccapurple;
  }
}
```

Nested declarations that apply to the entire group remain **valid**:

```scss
.block {
  &__title,
  &__table-heading {
    // ✅ Base declarations apply to the entire group.
    color: rebeccapurple;
    font-size: 16px;
    font-weight: 700;

    // ✅ The nested state also applies to the entire group.
    &:hover { // [!code highlight]
      color: crimson; // [!code highlight]
    }

    // ✅ Conditional declarations also apply to the entire group.
    @media (width > 768px) { // [!code highlight]
      font-size: 20px; // [!code highlight]
    }
  }
}
```

## Entity identity

Each BEM entity is identified by its block, element, modifier name, and modifier value.
Default and strict behavior use this identity differently.

**Default behavior** matches entities in a selector group with declarations outside that group's lexical subtree. \
**Exact selectors do not have to match:** `.block__title` and `.block__title:hover` both target the same declaration owner.

```scss
.block {
  // ❌ `title` also has a separate declaration below.
  &__title, // [!code error]
  &__label {
    color: rebeccapurple;
  }

  &__title:hover { // [!code highlight]
    color: crimson;
  }
}
```

**Strict behavior** compares identities within the selector list itself.
Different elements, modifiers, and modifier values are separate entities,
so they cannot share a rule in this mode:

```scss
.block {
  // ❌ The navigation buttons are distinct declaration owners.
  &__previous-button,
  &__next-button { // [!code error]
    block-size: 32px;
    inline-size: 32px;
  }
}
```

Different conditions and pseudo-elements of the same entity are not distinct BEM targets,
so these selector lists remain valid in both modes:

```scss
.block {
  // ✅ Different states of `title` target the same entity.
  &__title:hover,
  &__title:focus-visible {
    color: rebeccapurple;
  }

  // ✅ Pseudo-elements of `box` target the same entity.
  &__box::before,
  &__box::after {
    background-color: currentcolor;
  }

  // ✅ Different contexts still target the same `link` entity.
  &__link {
    &:hover,
    .toolbar:hover & {
      text-decoration: underline;
    }
  }
}
```

The rule resolves SCSS and native CSS nesting and uses the final, rightmost BEM target of each top-level selector-list branch.
Unresolved interpolation, ambiguous targets, and selector lists nested inside functional pseudo-classes are skipped conservatively.

## Rule options

All options are optional and come with recommended default values.

::: code-group

```js [Enabling a rule without options]
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-grouped-entities': true,
  },
}
```

```js [Enabling a rule with custom options]
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-grouped-entities': [true, {
      separators: {
        element: '__',
        modifier: '--',
        modifierValue: '--',
      },
      strict: true,
      messages: {
        redeclared: (entity, line) =>
          `Declare ${entity} separately; also declared at line ${line}.`,
        grouped: (entity, owner) =>
          `Declare ${entity} separately from ${owner}.`,
      },
    }],
  },
}
```

:::

::: details Show full type of the options

```ts
export type NoGroupedEntitiesOptions = {
  /**
   * Whether to reject every selector list that targets different BEM entities.
   * When disabled, grouping is allowed until a grouped entity is declared outside the group's lexical subtree.
   *
   * @default false
   */
  strict?: boolean;

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
  };

  /**
   * Custom message functions for rule violations.
   * If provided, overrides the default error messages.
   */
  messages?: {
    /**
     * Custom message for a grouped BEM entity that is declared outside its selector group.
     *
     * @param   entity   Redeclared grouped BEM entity.
     * @param   line     Line of the matching external declaration.
     *
     * @returns          The error message to report.
     */
    redeclared?: (entity: string, line: number) => string;

    /**
     * Custom message for a BEM entity grouped with another declaration owner.
     *
     * @param   entity   Grouped BEM entity.
     * @param   owner    First BEM entity in the selector list.
     *
     * @returns          The error message to report.
     */
    grouped?: (entity: string, owner: string) => string;
  };
}
```

:::

<!-- @include: @/docs/_parts/stylelint-wide-options.md -->

---

### `strict`

Controls whether every selector list targeting different BEM entities is reported.

#### `false`

Default.
Allows a selector group until one of its entities is targeted by another rule outside that group's lexical subtree.

```scss
.block {
  &__title,
  &__label {}
}
```

```scss
.block {
  // ❌ `label` also has a separate declaration owner below.
  &__title,
  &__label { // [!code error]
    color: rebeccapurple;
  }

  @media (width > 640px) {
    // This separate declaration turns the group into a violation.
    &__label { // [!code highlight]
      color: crimson;
    }
  }
}
```

#### `true`

Always reports a selector list when its branches target different BEM entities.
It does not require another declaration of either entity.

```scss
.block {
  // ❌ Distinct entities cannot share a declaration owner in strict mode.
  &__title, // [!code highlight]
  &__label { // [!code error]
    color: rebeccapurple;
  }
}
```

Use this option when each BEM entity must have an independent rule even if declarations have to be duplicated or extracted into a mixin.

---

### `separators`

<!-- @include: @/docs/_parts/separators.md#header -->

---

### `messages`

<!-- @include: @/docs/_parts/custom-messages.md#header -->

The rule exposes a separate message function for each `strict` value:

- `redeclared(entity, line)` is used when `strict` is disabled
  and receives the entity targeted by both a selector group and an external owner,
  along with the line of that external occurrence;
- `grouped(entity, owner)` is used when `strict` is enabled
  and receives the later distinct entity and the first entity in the selector list.

#### Example

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-grouped-entities': [true, {
      messages: {
        redeclared: (entity, line) =>
          `⛔ Declare "${entity}" separately; also declared at line ${line}.`,
        grouped: (entity, owner) =>
          `⛔ Declare "${entity}" separately from "${owner}".`,
      },
    }],
  },
}
```

::: details Show function signature

```ts
export type MessagesOption = {
  /**
   * Custom message for a grouped BEM entity that is declared outside its selector group.
   *
   * @param   entity   Redeclared grouped BEM entity.
   * @param   line     Line of the matching external declaration.
   *
   * @returns          The error message to report.
   */
  redeclared?: (entity: string, line: number) => string;

  /**
   * Custom message for a BEM entity grouped with another declaration owner.
   *
   * @param   entity   Grouped BEM entity.
   * @param   owner    First BEM entity in the selector list.
   *
   * @returns          The error message to report.
   */
  grouped?: (entity: string, owner: string) => string;
};
```

:::

<!-- @include: @/docs/_parts/custom-messages.md#formatting -->
