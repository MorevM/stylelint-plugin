# @morev/bem/no-detached-entities

Requires BEM entities and their local extensions to be declared within their lexical owners.

In SCSS, elements belong inside their block, and element modifiers belong inside their element by default.
Modifier values require a modifier-name group when it exists or is shared by distinct values.
The `nesting` map controls which structural parents are allowed or conditionally required.
Local extensions (states, pseudo-elements, attributes, and qualifying classes) belong inside the entity they extend.

::: code-group

```scss [❌ Detached entities]
.block {}

.block__title { color: black; } // [!code error]
.block__title:hover { color: red; } // [!code error]
.block__title--large { font-size: 2rem; } // [!code error]
```

```scss [✅ Entity-owned styles]
.block {
  &__title {
    color: black;

    &:hover { color: red; }
    &--large { font-size: 2rem; }
  }
}
```

:::

## Motivation

Finding a BEM block should be enough to find its elements, and finding an entity should expose its local styles.
Keeping these declarations together makes their ownership visible when reading, changing, or removing a component.
A separate declaration of the expected owner elsewhere in the file does not establish nesting.
When an owner is explicitly declared in the same file, the diagnostic includes its line:
`Expected ".block__title:hover" to be declared within ".block__title" (declared at line 8).`
The first declaration is used, including declarations after the violation and ignored declarations.
Locations refer to the authored selector branch, including nested selectors and `@at-root`.
Only entity targets without local extensions supply locations; context classes and states do not.

## Ownership in SCSS

| Map key                | Example target               | Default parent                                               |
| ---------------------- | ---------------------------- | ------------------------------------------------------------ |
| `element`              | `.block__title`              | `block`                                                      |
| `blockModifier`        | `.block--compact`            | `block`                                                      |
| `blockModifierValue`   | `.block--theme--dark`        | `blockModifier` if existing or shared; otherwise `block`     |
| `elementModifier`      | `.block__title--large`       | `element`                                                    |
| `elementModifierValue` | `.block__title--theme--dark` | `elementModifier` if existing or shared; otherwise `element` |

Blocks have no structural owner requirement.
Local extensions always require their complete entity: `.block__title--large:hover` belongs inside `.block__title--large`.
There is no option to disable local extension checks; `ignore` remains available for individual target exceptions.

The nearest lexical selector determines ownership.
Owners are compared by BEM identity; local states of an owner do not create another entity.
Conditional wrappers such as `@media`, `@supports`, `@container`, and `@layer` preserve it.
All blocks in a file are checked independently; repeated declarations are allowed.
When a structural policy requires a parent, it must be the matching ancestor of this same BEM entity.
A foreign block or sibling element cannot satisfy it, even when a matching block exists further up the tree.

A lone modifier value may stay directly inside its base entity.
When a matching modifier-name group exists anywhere in the file or is shared by distinct values,
all its values must be nested inside it:

```scss
.block {
  &--compact {}
  &--theme--dark {}

  &__title {
    &:hover {}
    &::before {}
    &[aria-current='true'] {}
    &.is-active {}

    &--large {
      &:hover {}
    }

    &--size--large {}
    &--theme {
      &--dark {}
      &--light {}
    }
  }
}
```

To require the flat modifier-value form for checked selectors, override the grouping policies:

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-detached-entities': [true, {
      nesting: {
        blockModifierValue: ['block'],
        elementModifierValue: ['element'],
      },
    }],
  },
};
```

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

Syntax is inferred from the parser and filename.
Without a filename, `postcss-scss` enables SCSS checks; the default parser uses CSS behavior.
A `.css` filename uses CSS behavior even with `postcss-scss`.

## `@at-root` and selector spelling

`@at-root` changes the emitted CSS context while retaining the lexical owner.
Both selector and block forms are supported, including static `with`/`without` queries:

```scss
.block {
  $b: #{&};

  @at-root #{$b}__title {}
  @at-root { #{&}__label {} }
  @at-root (without: rule) { #{$b}__icon {} }

  @at-root #{$b}__title:hover {} // [!code error]
}
```

Correct interpolation does not have to be replaced with `&`.
In the last declaration, the state belongs inside `.block__title`.
A full selector nested without `@at-root` produces a descendant relation;
[`no-misplaced-relational-styles`](./no-misplaced-relational-styles.md) checks its placement.
[`block-variable`](./block-variable.md) controls repeated literal block names.

## Rule options

Enable with `true`; disable with `null`.

```js
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

::: details Show full type of the options

```ts
type PrimaryOption = true;

/** Conditions are evaluated against declarations in the same file. */
type Condition = 'exists' | 'shared';

/** Conditional entries precede all unconditional alternatives; an empty array sets no requirements. */
type Policy<Parent extends string> = Array<Parent | 'root' | {
  /** Own canonical ancestor required when the condition matches. */
  parent: Parent;

  /** Arrays match if either condition holds. */
  when: Condition | Condition[];
}>;

/** Canonical owner or nesting-path entry with its first declaration location. */
type Owner = {
  /** Canonical BEM selector, or `root` for a required standalone declaration. */
  readonly selector: string;

  /** First explicit declaration line; absent for undeclared entities and the selector root. */
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

Each category accepts an array of nesting requirements. An empty array (`[]`) sets no structural requirements.
Missing categories retain their defaults.
Each category accepts its structural ancestor categories shown in the option types above,
plus `root` as an unconditional alternative. Names refer to the target's own ancestors:
for `.block__title--theme--dark`, `elementModifier` means `.block__title--theme`.

An array consists of conditional entries followed by unconditional owner strings:

```js
nesting: {
  elementModifier: [
    { parent: 'element', when: ['exists', 'shared'] },
    'block',
    'root',
  ],
},
```

1. Evaluate conditional entries in order. The **first matching entry requires that parent**.
   Later entries and unconditional alternatives cannot excuse a misplaced declaration.
1. If no condition matches, any trailing owner string is allowed. Their order does not change validity.
1. If no condition matches and there are no trailing strings, this category has **no structural requirement**.
   It may occur at the selector root or under any lexical selector. An empty array (`[]`) always has this effect.

`root` specifically requires **no lexical selector owner**. It allows enclosing `@media`, `@supports`,
and other conditional wrappers, but does not allow `.other { @at-root .block__title {} }`.
It is optional and can only appear as an unconditional string, never as a conditional `parent`.
Unknown keys, empty `when` arrays, and conditions after unconditional strings are rejected.
TypeScript checks category-specific parents; array ordering and nonempty `when` constraints are validated at runtime.

#### Conditions

`exists` matches an explicit declaration of the candidate parent anywhere in the same file.
Declaration order and `ignore` do not affect this evidence. Only unextended entity targets count:
`.layout .block {}` declares `.block`, while `.block .other {}` and `.block:hover {}` do not.

`shared` matches when a candidate parent has at least two distinct structural branches:

| Declarations                                                | Shared parent          |
| ----------------------------------------------------------- | ---------------------- |
| `.block__title`, `.block__label`                            | `.block`               |
| `.block__title--large`, `.block__title--small`              | `.block__title`        |
| `.block__title--theme--dark`, `.block__title--theme--light` | `.block__title--theme` |
| Two declarations of `.block__title`                         | None                   |
| `.block__title` and `.block__title:hover`                   | None                   |

An element represents one branch under its block, including when it is only implied by modifiers.
An explicitly declared modifier group represents one branch under its base entity, regardless of how many values it contains.
Without that group, its values are separate branches. Grouping them can therefore remove the need for a further wrapper.
With the fluid recipe below, this does not require an otherwise unnecessary `.block__title` or `.block`:

```scss
.block__title--theme {
  &--dark {}
  &--light {}
}
```

Repeated selectors and local extensions do not add branches.
Relational selectors do not contribute structural branches, although their explicit final target can satisfy `exists`.
Ignored structural declarations still contribute evidence. Imports and other files are not inspected.
`when: ['exists', 'shared']` matches either condition.

#### Configuration examples

These are configuration recipes, not named modes or exported presets.
The defaults enforce base-entity ownership and require modifier-name groups when existing or shared.

To always allow modifier values either directly under their base entity or inside a modifier-name group:

```js
nesting: {
  blockModifierValue: ['block', 'blockModifier'],
  elementModifierValue: ['element', 'elementModifier'],
},
```

To require a modifier-name group for every modifier value, use
`blockModifierValue: ['blockModifier']` and `elementModifierValue: ['elementModifier']`.
For example, `&__title { &--theme { &--dark {} } }` satisfies that policy;
`&__title { &--theme--dark {} }` does not.

For fluid grouping that requires an existing or shared parent, starting with the closest ancestor:

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

A lone `.block__title--theme--dark {}` has no structural requirement with this recipe.
Adding `.block__title--theme--light {}` requires a shared `.block__title--theme` group.
Adding an explicit `.block__title {}` requires that element as owner of the group.
Append `'root'` to each array if unmatched entities must remain at the selector root.

For CSS-like structural freedom in SCSS, set all five categories to `[]`:

```js
nesting: {
  element: [],
  blockModifier: [],
  blockModifierValue: [],
  elementModifier: [],
  elementModifierValue: [],
},
```

**Every recipe still requires local extensions to be nested inside their complete entity.**
The map does not change native CSS behavior.

#### Missing-owner diagnostics

When no immediate owner is declared, diagnostics can show a complete creation path.
For the default map and `.block {}` followed by `.block__title--theme--dark {}`:

```text
Expected nesting for ".block__title--theme--dark": ".block" (declared at line 1) > ".block__title" > ".block__title--theme--dark".
```

The path minimizes new declarations and accounts for how those declarations change `exists` and `shared`.
Ties follow the configured parent order. Existing or ignored owners stop the path;
an absent ignored owner still needs to be declared to own the target.
If an immediate owner already exists, the diagnostic points to its declaration instead.

### `separators`

<!-- @include: @/docs/_parts/separators.md#header -->

### `ignore`

Each pattern matches the canonical target selector, including its leading dot and any modifier,
but excluding local extensions and relational context.
For example, `.block__title--large:hover` is matched as `.block__title--large`.
Plain strings match the complete selector and support `*`.
Regular expressions, including strings such as `'/legacy/i'`, use their own matching rules.
Each target is checked independently, including with global (`g`) and sticky (`y`) flags.

An entry `.block__legacy` excludes that element and its states, but not `.block__legacy--active`.
Use `.block__legacy*` to include modifiers as well.
Ignored declarations remain possible owners; their descendants are still checked independently.
These exclusions do not affect other rules.

### `messages`

<!-- @include: @/docs/_parts/custom-messages.md#header -->

The callback receives `detached(selector, owners, path)`. `selector` is the complete resolved local selector.
Both arrays contain readonly `{ selector: string; line?: number }` entries and are themselves readonly.
Each entry contains a canonical BEM selector and its first explicit declaration line when available.
The selector `root` denotes the absence of a lexical selector owner and has no declaration line.

`owners` contains the allowed immediate parents. A matching condition supplies one owner;
otherwise the owners follow configured fallback order. Local extensions always supply their complete canonical entity.
`path` is empty when one placement step suffices or an immediate owner already exists.
Otherwise, it describes the recommended nesting path from outermost to innermost,
excluding the offending selector.
With conditional policies, the proposed declarations can change the selected parent;
`owners` describes the current requirement, while `path` describes a valid completed hierarchy.

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-detached-entities': [true, {
      messages: {
        detached: (selector, owners) => {
          const ownerSelectors = owners.map((owner) => owner.selector);
          return `Move ${selector} into ${ownerSelectors.join(' or ')}.`;
        },
      },
    }],
  },
};
```

Each violation reports one missing ownership link, with a complete creation path when the configured hierarchy requires it.
A detached `.block__title--large:hover` still requires `.block__title--large` under every structural policy.
Each authored selector-list branch receives at most one warning;
when parent expansion produces several violations, the first failing expansion supplies the message.

## Scope and limitations

The rule checks resolved local selectors with one unambiguous direct BEM target.
Selectors with combinators, including inherited external context, remain outside its scope.
Functional pseudo-classes do not obscure a direct target: `.block:is(:hover, :focus)` and `.block:has(.icon, .badge)`
are local extensions of `.block` and must be nested inside it.
They do not count as standalone declarations of `.block` for the `exists` condition.

Unresolved interpolation and ambiguous compound targets are skipped.
Compounds without a direct class but with a top-level `:is()` or `:where()` have unknown ownership,
whether their arguments contain BEM classes, as in `:where(.block)`, or only tags, as in `:is(button, a)`;
the rule skips them as targets and skips ownership checks for declarations directly inside them.
By contrast, `:not(.block)` and `:has(.block)` have no BEM owner:
the classes in their arguments do not satisfy a nested entity's ownership requirement.
Dynamic `@at-root` queries containing variables or interpolation are not resolved.

The rule does not merge duplicate declarations or analyze a component across files.
It has no autofix: moving declarations can change cascade order and selector-list expansion.

## Migration from `no-detached-entity-extensions`

Replace `@morev/bem/no-detached-entity-extensions` with `@morev/bem/no-detached-entities` in configuration
and Stylelint disable comments. The old name is removed without an alias.

By default, the new rule requires SCSS elements inside blocks and element modifiers inside their elements.
Values belong inside their modifier-name group when it exists or is shared by distinct values;
otherwise they belong directly inside their block or element.
Every block in the file is checked. Use the `nesting` map to configure the required hierarchy.
For separate element files, `element: [{ parent: 'block', when: 'exists' }, 'root']` allows a standalone
element only when its block is absent. Other categories retain their defaults.
To retain only local extension enforcement, set all five structural categories to `[]`.
Existing `separators` settings remain valid.

Custom `messages.detached` callbacks must change their second parameter from a single `owner` string
to an array of readonly `{ selector: string; line?: number }` entries.
Read `owner.selector` for each alternative and `owner.line` for its declaration location when available.
The third argument, `path`, uses the same entry shape and describes the recommended configured nesting path.
