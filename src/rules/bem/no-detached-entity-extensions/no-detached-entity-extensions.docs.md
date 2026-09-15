# @morev/bem/no-detached-entity-extensions

Requires extensions of a BEM entity selector to be declared within that entity.

An entity extension is selector material added to a complete BEM entity selector without introducing a relational target.

::: code-group

```scss [❌ Detached extensions]
.block {
  &__title {}

  &__title:hover {} // [!code error]
  &__title::placeholder {} // [!code error]
  &__title[aria-current='true'] {} // [!code error]
  &__title.is-active {} // [!code error]

  &__title--active {} // [!code error]
  &__title--theme--dark {} // [!code error]
}
```

```scss [✅ Entity-owned extensions]
.block {
  &__title {
    &:hover {}
    &::placeholder {}
    &[aria-current='true'] {}
    &.is-active {}

    &--active {}
    &--theme--dark {}
  }
}
```

:::

## Motivation

Finding a BEM entity should be enough to understand how it looks and behaves.
When its extensions are declared separately, its styles are scattered across sibling declarations.
Changing or removing the entity then requires searching for every selector that extends it.

Keeping extensions inside their entity gives its local styles one predictable location.
You can read its states together, update them alongside the base styles,
and remove them with the entity without leaving detached selectors behind.

## SCSS modifiers

SCSS can concatenate a modifier suffix with `&`.
The rule therefore requires modifiers to be nested within their base block or element:

```scss
.block {
  // Block modifiers belong inside the block.
  &--compact {}

  &__button {
    // Element modifiers belong inside the element.
    &--active {}

    // Modifier values can be declared directly inside the base entity.
    &--theme--dark {}

    // Nesting values inside the modifier is also allowed.
    &--theme {
      &--light {}
    }
  }
}
```

## Native CSS

Native CSS nesting cannot concatenate a modifier suffix with `&`.
Standalone modifier selectors are therefore allowed:

```css
.block__button--active {
  &:hover {}
}

.block__button--theme--dark {}
```

Extensions that native CSS can express with nesting still have to be nested:

::: code-group

```css [❌ Detached state]
.block__button--active:hover {} /* [!code error] */
```

```css [✅ Modifier-owned state]
.block__button--active {
  &:hover {}
}
```

:::

## Rule options

All options are optional and come with recommended default values.

::: code-group

```js [Enabling a rule without options]
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-detached-entity-extensions': true,
  },
};
```

```js [Enabling a rule with options]
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-detached-entity-extensions': [true, {
      separators: {
        element: '__',
        modifier: '--',
        modifierValue: '--',
      },
      messages: {
        detached: (extension, owner) =>
          `Move ${extension} into ${owner}.`,
      },
    }],
  },
};
```

:::

::: details Show full type of the options

```ts
type PrimaryOption = true;

type SecondaryOption = {
  /**
   * Custom message functions for rule violations.
   */
  messages?: {
    /**
     * Custom message for a BEM entity extension declared outside its required owner.
     *
     * @param   extension   Complete resolved extension selector.
     * @param   owner       BEM entity that must own the extension.
     *
     * @returns             The error message to report.
     */
    detached?: (extension: string, owner: string) => string;
  };

  /**
   * Object that defines BEM separators used to distinguish blocks, elements, modifiers, and modifier values.
   *
   * @default { element: '__', modifier: '--', modifierValue: '--' }
   */
  separators?: Partial<Separators>;
};
```

:::

<!-- @include: @/docs/_parts/stylelint-wide-options.md -->

---

### `separators`

<!-- @include: @/docs/_parts/separators.md#header -->

---

### `messages`

<!-- @include: @/docs/_parts/custom-messages.md#header -->

Overrides the default `detached(extension, owner)` message.

- `extension` is the complete resolved selector compound;
- `owner` is the BEM entity within which that extension must be declared.

#### Example

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-detached-entity-extensions': [true, {
      messages: {
        detached: (extension, owner) =>
          `⛔ Move "${extension}" into "${owner}".`,
      },
    }],
  },
};
```
