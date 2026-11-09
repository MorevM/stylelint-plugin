# @morev/bem/no-detached-entities

Requires BEM entities and their local extensions to be declared within their lexical owners.

::: info
The following examples use the default options, but nesting requirements
are **highly** configurable to match your preferred level of strictness.
:::

::: code-group

```scss [❌ State outside its entity]
.card {}

// ❌ The hover styles are separate from the card. Move them inside `.card`.
.card:hover {} /* [!code error] */
```

```scss [✅ State inside its entity]
.card {
  &:hover {}
}
```

:::

::: code-group

```scss [❌ Element outside its block]
.card {}

// ❌ The element is outside its block. Move it inside `.card`.
.card__title {} // [!code error]
```

```scss [✅ Element inside its block]
.card {
  &__title {}
}
```

:::

::: code-group

```scss [❌ Modifier outside its element]
.card {
  &__title {}

  // ❌ The modifier is next to its element. Move it inside `&__title`.
  &__title--large {} // [!code error]
}
```

```scss [✅ Modifier inside its element]
.card {
  &__title {
    &--large {}
  }
}
```

:::

## Motivation

Finding a BEM entity should be enough to understand how it looks and behaves.
When elements, modifiers, or local extensions are declared separately from the entity they belong to,
related styles are scattered across sibling declarations.
Changing or removing the entity then requires searching for every selector that belongs to or extends it.

Keeping these declarations together makes their ownership visible when reading, changing, or removing a component.
Each entity gives its related styles one predictable location.
You can read its modifiers and states alongside the base styles, find a block’s elements within that block,
and update or remove them together without leaving detached selectors behind.

## Native CSS

Native CSS nesting cannot concatenate `&__title` or `&--large`.
Standalone elements and modifiers are therefore allowed.
Their local extensions still require nesting:

```css
.block__title--large {
  &:hover { color: red; }
  &::before { content: ''; }
}

.block__title--large:hover {} /* [!code error] */
```

## Rule options

All options are optional and come with recommended default values.

::: code-group

```js [Enabling a rule without options]
// 📄 .stylelintrc.js

export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-detached-entities': true,
  },
};
```

```js [Enabling a rule with custom options]
// 📄 .stylelintrc.js

export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-detached-entities': [true, {
      nesting: {
        element: ['block'],
        blockModifier: ['block'],
        blockModifierValue: [
          { parent: 'blockModifier', when: ['exists', 'shared'] },
          'block',
        ],
        elementModifier: ['element'],
        elementModifierValue: [
          { parent: 'elementModifier', when: ['exists', 'shared'] },
          'element',
        ],
      },
      ignore: [],
    }],
  },
};
```

:::

::: details Show full type of the options

```ts
type PrimaryOption = true;

/** Conditions are evaluated against declarations in the same file. */
type Condition = 'exists' | 'shared';

/** Conditional entries precede all unconditional alternatives; an empty array sets no requirements. */
type Policy<Parent extends string> = Array<Parent | {
  /** Own canonical ancestor required when the condition matches. */
  parent: Parent;

  /** Arrays match if either condition holds. */
  when: Condition | Condition[];
}>;

/** Canonical owner or nesting-path entry with its first declaration location. */
type Owner = {
  /** Canonical BEM selector of an owner. */
  readonly selector: string;

  /** First explicit declaration line; absent for undeclared entities. */
  readonly line?: number;
};

type SecondaryOption = {
  /** Omitted categories inherit defaults; supplied arrays replace their defaults. */
  nesting?: {
    /** Base element ownership. */
    element?: Policy<'block'>;

    /** Block modifier ownership. */
    blockModifier?: Policy<'block'>;

    /** Block modifier-value ownership. */
    blockModifierValue?: Policy<'block' | 'blockModifier'>;

    /** Element modifier ownership. */
    elementModifier?: Policy<'block' | 'element'>;

    /** Element modifier-value ownership. */
    elementModifierValue?: Policy<'block' | 'element' | 'elementModifier'>;
  };

  /**
   * BEM separators, also configurable through createDefineRules globals.
   *
   * @default { element: '__', modifier: '--', modifierValue: '--' }
   */
  separators?: Partial<Separators>;

  /**
   * Canonical BEM target selectors to exclude; strings support wildcards and `/pattern/flags` expressions.
   *
   * @default []
   */
  ignore?: Array<string | RegExp>;

  /** Custom messages for ownership violations. */
  messages?: {
    /**
     * @param selector Complete resolved local selector, including extensions.
     * @param owners   Allowed canonical BEM owners and their first declaration locations.
     * @param path     Shortest configured nesting path when intermediate owners are missing; otherwise empty.
     * @returns        The diagnostic message.
     */
    detached?: (
      selector: string,
      owners: readonly Owner[],
      path: readonly Owner[],
    ) => string;
  };
};
```

:::

<!-- @include: @/docs/_parts/stylelint-wide-options.md -->

### `nesting`

Defines the nesting requirements for elements and modifiers in SCSS.
Each key controls one type of BEM entity, so you can adjust its allowed parents and conditions independently.

| Key                    | Entity example               |
| ---------------------- | ---------------------------- |
| `element`              | `.block__title`              |
| `blockModifier`        | `.block--compact`            |
| `blockModifierValue`   | `.block--theme--dark`        |
| `elementModifier`      | `.block__title--large`       |
| `elementModifierValue` | `.block__title--theme--dark` |

Local extensions (`:hover`, `::before` and so on) must always be nested inside the entity they extend,
regardless of the `nesting` configuration.

Configure where each type of entity belongs.
For example, `elementModifier: ['element']` requires element modifiers inside their own element. \
Use `[]` to allow any placement, or leave a key out to keep its defaults.

The simplest form lists the allowed parents:

```js
nesting: {
  elementModifier: ['block', 'element'],
},
```

This allows an element modifier either directly inside its block or inside its own element:

```scss
.card {
  // ✅ Directly inside its block.
  &__title--large {}

  &__title {
    // ✅ Inside its own element.
    &--small {}
  }
}

// ❌ Outside both allowed parents. Move it inside `.card` or `.card__title`.
.card__title--muted {}
```

Changing the list to `['element']` requires it to be inside the element, even if that element has no styles of its own:

```scss
.card {
  &__title {
    // ✅ Inside its own element.
    &--small {}
  }

  // ❌ Move this modifier inside `&__title`.
  &__title--large {}
}
```

When several parents are listed, any of them is allowed; their order does not matter.

#### Conditions

You may want to require a wrapper only when it already exists or groups several related entities:

```js
nesting: {
  element: [
    { parent: 'block', when: 'exists' },
  ],
  elementModifier: [
    { parent: 'element', when: 'shared' },
  ],
  elementModifierValue: [
    { parent: 'elementModifier', when: ['exists', 'shared'] },
  ],
},
```

Here:

- `exists`: elements must be inside their block if it is declared in the same file.
- `shared`: element modifiers need an element wrapper when it is needed to group several related modifiers.
- `['exists', 'shared']`: values must be inside their modifier-name group if it exists or groups several values.
  **Either** condition is sufficient.
- Conditions are evaluated in order, and the **first matching parent becomes mandatory**.
- If nothing matches, this configuration allows the entity anywhere.

Each tab below represents a separate file using this configuration:

::: code-group

```scss [One value]
// ✅ No wrapper is needed yet.
.card__title--theme--dark {}
```

```scss [Two values]
// ❌ Both values now need a shared `.card__title--theme` wrapper.
.card__title--theme--dark {} // [!code error]

.card__title--theme--light {} // [!code error]
```

```scss [Grouped values]
// ✅ One wrapper is enough; no extra element or block is required.
.card__title--theme {
  &--dark {}
  &--light {}
}
```

:::

If `.card__title--theme` is already declared, even a single value must be nested inside it.

You can also combine conditions with unconditional alternatives:

```js
nesting: {
  elementModifier: [
    { parent: 'element', when: 'exists' },
    'block',
  ],
},
```

If the element is declared, its modifiers **must** be inside it.
Otherwise, they belong directly inside the block, creating that block declaration if necessary.

::: code-group

```scss [Element not declared]
.card {
  // ✅ No element declaration exists, so the block is an allowed parent.
  &__title--large {}
}
```

```scss [Element declared]
.card {
  &__title {}

  // ❌ The element exists. Move this modifier inside `&__title`.
  &__title--large {} // [!code error]
}
```

:::

Put conditions first.
Parents listed after the conditions are alternatives only when none of the conditions match.
If you omit those alternatives, an entity can be placed anywhere when no condition matches, including outside a block.

#### Recipes

::: details Enforce the full BEM hierarchy

Require each entity inside its immediate BEM parent: block → element → modifier name → value.
Block modifiers belong directly inside their block.
Every required parent must be declared, even if it has no styles of its own.

```js
nesting: {
  element: ['block'],
  blockModifier: ['block'],
  blockModifierValue: ['blockModifier'],
  elementModifier: ['element'],
  elementModifierValue: ['elementModifier'],
},
```

```scss
.card {
  &--theme {
    // ✅ Even one value needs its modifier-name group.
    &--dark {}
  }

  // ❌ Move this value inside `&--theme`.
  &--theme--light {} // [!code error]

  &__title {
    &--size {
      // ✅ Element modifier values follow the full hierarchy too.
      &--large {}
    }

    // ❌ Move this value inside `&--size`.
    &--size--small {} // [!code error]
  }

  // ❌ Move this modifier inside `&__title`.
  &__title--muted {} // [!code error]
}

// ❌ Move this element inside `.card`.
.card__footer {} // [!code error]
```

:::

::: details Make modifier-name groups optional

Allow both forms, so authors can group values when it makes the styles easier to read.
An existing group does not require moving other values inside it.

```js
nesting: {
  blockModifierValue: ['block', 'blockModifier'],
  elementModifierValue: ['element', 'elementModifier'],
},
```

```scss
.card {
  // ✅ A value can stay directly inside the block even when its group exists.
  &--theme--dark {}

  &--theme {
    // ✅ Nesting inside the modifier-name group is also allowed.
    &--light {}
  }

  &__title {
    // ✅ The same choice applies to element modifier values.
    &--size--large {}

    &--size {
      &--small {}
    }
  }

  // ❌ Move this value inside `&__title` or its `&--size` group.
  &__title--size--medium {} // [!code error]
}
```

:::

::: details Nest modifiers inside an existing element, otherwise inside the block

Keep an element's modifiers with its base styles when the element is declared.
If it is absent, allow modifiers directly inside the block without requiring an empty element wrapper.
This recipe changes `elementModifier`; modifier values keep their default nesting requirements.

```js
nesting: {
  elementModifier: [
    { parent: 'element', when: 'exists' },
    'block',
  ],
},
```

Each example below is a separate file.
Without an element declaration, the block is the required parent:

```scss
.card {
  // ✅ No `.card__title` declaration exists.
  &__title--large {}
}

// ❌ The modifier still needs its block. Move it inside `.card`.
.card__title--small {} // [!code error]
```

Once the element is declared, it becomes the required parent for its modifiers:

```scss
.card {
  &__title {
    // ✅ The modifier is inside its declared element.
    &--large {}
  }

  // ❌ The element exists. Move this modifier inside `&__title`.
  &__title--small {} // [!code error]
}
```

:::

::: details Require wrappers only when they exist or group related entities

Allow a declaration to stand on its own until a parent is declared or several related entities need grouping.
The first matching parent in each list is required; if none matches, there is no structural nesting requirement.

```js
nesting: {
  element: [
    { parent: 'block', when: ['exists', 'shared'] },
  ],
  blockModifier: [
    { parent: 'block', when: ['exists', 'shared'] },
  ],
  blockModifierValue: [
    { parent: 'blockModifier', when: ['exists', 'shared'] },
    { parent: 'block', when: ['exists', 'shared'] },
  ],
  elementModifier: [
    { parent: 'element', when: ['exists', 'shared'] },
    { parent: 'block', when: ['exists', 'shared'] },
  ],
  elementModifierValue: [
    { parent: 'elementModifier', when: ['exists', 'shared'] },
    { parent: 'element', when: ['exists', 'shared'] },
    { parent: 'block', when: ['exists', 'shared'] },
  ],
},
```

Each example below is a separate file.
A single value needs no wrapper:

```scss
// ✅ No parent is declared or needed for grouping.
.card__title--theme--dark {}
```

Adding another value requires a shared modifier-name group:

```scss
// ❌ Move both values inside a shared `.card__title--theme` group.
.card__title--theme--dark {} // [!code error]

.card__title--theme--light {} // [!code error]
```

That group is enough while no element or block declaration exists:

```scss
// ✅ The values are grouped; no extra element or block wrapper is required.
.card__title--theme {
  &--dark {}
  &--light {}
}
```

An existing parent requires nesting even when there is only one child:

```scss
.card__title {}

// ❌ The element exists. Move this group inside `.card__title`.
.card__title--theme { // [!code error]
  &--dark {}
}
```

:::

::: details Allow standalone entities while keeping their states nested

This applies the rule's **native CSS behavior** to SCSS.
Setting all five categories to `[]` allows elements and modifiers anywhere.
States, pseudo-elements, attributes, and other local extensions still belong inside their complete entity.

```js
nesting: {
  element: [],
  blockModifier: [],
  blockModifierValue: [],
  elementModifier: [],
  elementModifierValue: [],
},
```

```scss
// ✅ Elements and modifiers can stand on their own.
.card__title {}

.card__title--large {}

.card--compact {}

.card--theme--dark {}

.card__title--size--large {
  // ✅ States stay inside the complete entity they extend.
  &:hover {}
}

// ❌ Move this state inside `.card__title--size--large`.
.card__title--size--large:focus {} // [!code error]
```

:::

**Every recipe still requires local extensions to be nested inside their complete entity.**
The map does not change native CSS behavior.


### `ignore`

Skip selected BEM entities when checking nesting.
Use their full class selectors, including the leading dot:

```js
ignore: ['.card__legacy'],
```

```scss
// ✅ This element is ignored, so no block wrapper is required.
.card__legacy {
  // ✅ This modifier is correctly nested inside its element.
  &--active {}
}

// ✅ States and other local extensions of the ignored element are skipped too.
.card__legacy:hover {}

// ❌ This modifier is not ignored. Move it inside `.card__legacy`.
.card__legacy--muted {} // [!code error]
```

Use `.card__legacy*` to ignore the element and all its modifiers.
You can also use regular expressions, such as `/^\.vendor-/` or the string `'/vendor/i'`.

Ignoring an entity does not disable checks for everything nested inside it.

### `separators`

<!-- @include: @/docs/_parts/separators.md#header -->

### `messages`

<!-- @include: @/docs/_parts/custom-messages.md#header -->

The `detached` function receives the selector, its allowed parents, and a suggested nesting path when several wrappers are needed.
Parent entries include their declaration line when available.

#### Example

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-detached-entities': [true, {
      messages: {
        detached: (selector, owners) => {
          const ownerSelectors = owners.map((owner) => owner.selector);
          return `⛔ Move "${selector}" into ${ownerSelectors.join(' or ')}.`;
        },
      },
    }],
  },
};
```

::: details Show function signature

```ts
/**
 * BEM parent used in a diagnostic or suggested nesting path.
 */
type Owner = {
  /**
   * Full BEM class selector without local extensions.
   */
  readonly selector: string;

  /**
   * First declaration line; omitted when the parent has not been declared.
   */
  readonly line?: number;
};

/**
 * Custom messages for nesting violations.
 */
export type MessagesOption = {
  /**
   * Custom message for a BEM entity or local extension declared outside its required parent.
   *
   * @param   selector   Complete resolved selector, including local extensions.
   * @param   owners     Allowed immediate parents and their declaration lines when available.
   * @param   path       Suggested parent chain, from outermost to innermost; empty when no chain is needed.
   *
   * @returns            The error message to report.
   */
  detached?: (selector: string, owners: readonly Owner[], path: readonly Owner[]) => string;
};
```

`path` excludes the offending selector and describes the suggested hierarchy after creating missing parents.
With conditional policies, it can differ from `owners`, which describes the current requirement.

:::

<!-- @include: @/docs/_parts/custom-messages.md#formatting -->

## Defaults

In both CSS and SCSS, local extensions (states, pseudo-elements, attributes, and qualifying classes)
belong inside the complete entity they extend.

```scss
.card {
  &__title {
    &--large {
      // ✅ The state is inside the complete entity it extends.
      &:hover {}
    }

    // ❌ Being inside the element is not enough. Move this state inside `&--large`.
    &--large:focus {} // [!code error]
  }
}
```

In SCSS, the default nesting requirements are:

- Elements and block modifiers belong directly inside their block.
- Element modifiers belong directly inside their element.
- Modifier values belong inside their modifier-name group when that group exists anywhere in the file,
  or when two or more distinct values need a shared group.
  Otherwise, a single value may be declared directly inside its block or element.

Each tab below represents a separate file using the default options:

::: code-group

```scss [One value]
.card {
  // ✅ A single value needs no modifier-name group.
  &--theme--dark {}
}
```

```scss [Two values]
.card {
  // ❌ Move both values inside a shared `&--theme` group.
  &--theme--dark {} // [!code error]
  &--theme--light {} // [!code error]
}
```

```scss [Grouped values]
.card {
  &--theme {
    // ✅ The values share their modifier-name group.
    &--dark {}
    &--light {}
  }
}
```

:::
