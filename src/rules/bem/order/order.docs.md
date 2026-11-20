# @morev/bem/order

Orders CSS and SCSS content while keeping BEM entities together.

---

Some styles for a component are here. The rest are further down the file.

::: code-group

```scss [❌ Scattered selectors]
// Rules for different blocks are scattered throughout the file.
// Elements, modifiers, states, and interactions appear in no consistent order.
.card {}

.button {}
.card__title:hover {}
.button:focus-visible {}
.card--compact .card__title {}
.card__title {}
.card--compact {}
```

```scss [✅ Grouped by BEM entity and ordered]
// Each block's rules stay together.
// Elements, modifiers, states, and interactions follow the order you configure.
.card {}
.card--compact {}
.card__title {}
.card__title:hover {}
.card--compact .card__title {}

.button {}
.button:focus-visible {}
```

:::

You open a component to tweak one property and end up reading the whole rule.

::: code-group

```scss [❌ Mixed properties and queries]
.card {
  // ❌ Variables are declared in no particular order.
  --card-price-font-size: 20px;
  --badge-icon-size: 20px;
  --_sale-badge-inset: 16px;
  // ❌ The properties are in a random order, too.
  color: #222;
  --card-image-zoom-duration: 300ms;
  border-radius: 8px;
  font-size: 14px;

  // ❌ States and queries turn up anywhere, in any order.
  @media (min-width: 1024px) {
    font-size: 18px;
    border-radius: 16px;
  }
  &:hover {
    color: #444444;
  }

  // ❌ Yes, this happens.
  padding: 12px;
  gap: 8px;

  background: white;
  grid-template-columns: 1fr;

  // ❌ In mobile-first styles, the narrowest breakpoint should come first.
  @media (min-width: 480px) {
    padding: 16px;
    gap: 12px;
  }
  display: grid;
}
```

```scss [✅ Grouped properties and queries]
.card {
  // ✅ You can choose the order that fits each context.
  --_sale-badge-inset: 16px;
  // ✅ Component variables can have their own group.
  --card-price-font-size: 20px;
  --card-image-zoom-duration: 300ms;
  // ✅ You can require or forbid blank lines between groups.
  --badge-icon-size: 20px;

  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  padding: 12px;
  // ✅ Property order can be strict or flexible.
  // ✅ Blank lines can depend on the block, category, or adjacent groups.
  border-radius: 8px;
  background: white;
  font-size: 14px;
  color: #222;

  // ✅ States have a set order, so :hover always goes here.
  &:hover {
    color: #444444;
  }

  // ✅ You can group related rules, like these media queries.
  @media (min-width: 480px) {
    gap: 12px;
    padding: 16px;
  }
  // ✅ You can even sort them from narrowest to widest.
  @media (min-width: 1024px) {
    border-radius: 16px;
    font-size: 18px;
  }
}
```

:::

It also works with SCSS nesting, including smart resolving of SASS variables:

::: code-group

```scss [❌ A different order at each level]
.card {
  $b: #{&};

  .badge {} // The first side-effect.

  &:focus-visible {}

  &--active {
    &:hover {}
    &:focus-visible {}

    // ❌ Why is the side-effect last here when it's first on the card?
    .badge {}
  }

  &__title {
    .sidebar & {}
    // ❌ Why is :hover between the sidebar and small-card overrides?
    &:hover {}
    #{$b}--size--small & {}
  }

  // ❌ Why is one size above the title and the other below it?
  &--size--large {}

  // ❌ Why is :hover last here and first in the size modifier?
  &:hover {}
}
```

```scss [✅ The same order at every level]
.card {
  $b: #{&};

  // ✅ Hover and focus appear in the same order on the card and its modifier.
  &:hover {}
  &:focus-visible {}

  // ✅ Both sizes sit together, before the elements.
  &--size--small {
    &:hover {}
    &:focus-visible {}

    .badge {}
  }

  &--size--large {}

  &__title {
    &:hover {}
    // ✅ After hover, look for overrides from the card and then the sidebar.
    #{$b}--size--small & {}

    .sidebar & {}
  }

  // ✅ Overrides for the badge come last at both levels.
  .badge {}
}
```

:::

And yes, you can customize all of ordering rules.

::: info A note from the author
Like the other rules, it comes with defaults I'd recommend as a starting point based on my own experience.
However, it's **expected** that you'll adapt the rule to your own conventions.

If you've used [`order/order`][stylelint-order], the setup will feel familiar. You list what should come first.
You can set the order you want, down to the details.
For example, give `:hover` and `:focus-visible` the same priority
or put a specific `@include` between two groups of properties.
:::

::: warning Autofix changes source order
Although I've built safeguards into autofix, static analysis can't guarantee that every fix is safe.
Autofix keeps code in its original scope and preserves the order of
known overlapping properties, fallbacks, and vendor-prefixed variants. It also avoids moving code across
Sass control flow or content insertion points.

If two selectors match the same element, moving one can change which style wins. \
**Review the diff before accepting fixes in an existing stylesheet.**
:::

## Rule options

Set `'@morev/bem/order': true` to use the defaults. To change the order, pass an options object after `true`.
Use `order` inside selectors and BEM families, and `root.order` for the stylesheet itself.
For example, this puts hover and focus states before nested media queries and keeps top-level media queries after the blocks:

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/order': [true, {
      order: ['declarations', 'pseudo-classes', 'at-rules', '*'],
      root: { order: ['rules', 'at-rules', '*'] },
    }],
  },
};
```

::: details Full configuration example

This example combines custom matchers, named groups, and equal ranks.

```js
export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/order': [true, {
      root: {
        order: ['group:sass', 'custom-properties', 'rules', 'at-rules', '*'],
        unspecified: 'bottom',
      },

      order: [
        'sass:variables',
        'custom-properties',
        { type: 'at-rule', name: 'include', hasBlock: false },
        'declarations',
        'base',
        'group:side-effects',
        'group:structural',
        { type: 'at-rule', name: 'media', parameter: '(--less-tablet-small)' },
        { type: 'at-rule', name: 'media', parameter: /\(--less-tablet-small\)/ },
        { type: 'at-rule', name: 'media' },
        'pseudo-classes',
        'modifiers',
        'qualifiers:class',
        'qualifiers:attribute',
        'group:functional',
        'context:internal',
        'context:external',
        'pseudo-elements',
        'elements',
        { type: 'at-rule', name: 'include', hasBlock: true },
        'at-rules',
        'rules',
        '*',
      ],

      unspecified: 'bottom',
      selectorList: { order: 'inherit' },

      within: {
        'sass:variables': (defaults) => [/^\$_/, ...defaults],
        declarations: [
          'display',
          ['width', 'height'],
          '*',
        ],
        'pseudo-classes': [
          ':link',
          ':visited',
          ':hover',
          [':focus', ':focus-visible'],
          ':active',
          '*',
        ],
        'pseudo-elements': ['::before', '::after', '*'],
        'at-rules': [
          { type: 'at-rule', name: 'media', parameter: '(--less-tablet-small)' },
          { type: 'at-rule', name: 'supports' },
          '*',
        ],
      },

      groups: {
        sass: [[
          'sass:variables',
          { type: 'at-rule', name: 'function' },
          { type: 'at-rule', name: 'mixin' },
          { type: 'rule', selector: /^%/ },
          { type: 'at-rule', name: 'include' },
          { type: 'at-rule', name: 'extend' },
          { type: 'at-rule', name: 'debug' },
          { type: 'at-rule', name: 'warn' },
          { type: 'at-rule', name: 'error' },
        ]],
        'side-effects': [{ type: 'rule', selector: /^>\s*\*$/, name: 'Authored direct children' }],
        structural: [
          { type: 'rule', relativeSelector: '&:empty' },
          { type: 'rule', relativeSelector: '&:only-child' },
        ],
        functional: [
          { type: 'rule', relativeSelector: /^&:(?:is|has|not)\(/ },
        ],
      },

      separators: {
        element: '__',
        modifier: '--',
        modifierValue: '--',
      },
    }],
  },
};
```

:::

### `order`

List categories, matchers, and [named groups][groups-option] in the order you want them inside a selector or BEM family.
The same order applies to blocks, elements, and modifiers. Each level uses the entries that match its contents.
Use [`within`][within-option] to order members of a category and [`unspecified`][unspecified-option] to place unmatched items.

#### Defaults

This sequence applies inside selectors and BEM families. See [`root`][root-option] for the stylesheet order
and [`within`][within-option] for the default order of states and pseudo-elements.

```js
[
  'sass:variables',
  'custom-properties',
  { type: 'at-rule', name: 'include', hasBlock: false },
  'declarations',
  'base',
  'at-rules',
  'pseudo-classes',
  'modifiers',
  'qualifiers:class',
  'qualifiers:attribute',
  'context:internal',
  'context:external',
  'pseudo-elements',
  'elements',
  'rules',
  '*',
]
```

#### Selector families

Ordering is applied recursively to selector families.
A block, its modifiers, its pseudo-elements, and its elements each form a family with base styles and variants:

```text
root
└─ family: .card
   ├─ base: .card
   ├─ pseudo-classes: .card:hover
   ├─ modifiers
   │  └─ family: .card--compact
   │     ├─ base: .card--compact
   │     └─ pseudo-classes: .card--compact:hover
   ├─ pseudo-elements
   │  └─ family: .card::before
   │     ├─ base: .card::before
   │     └─ pseudo-classes: .card:hover::before
   └─ elements
      └─ family: .card__title
         ├─ base: .card__title
         └─ pseudo-classes: .card__title:hover
```

- `root` is the region containing the selector families.
- A family is the logical container where the shared ordering sequence applies again.
- `base` is one position inside that family: its own styles without additional states or context.

The tree represents logical grouping in flat CSS as well as nested SCSS.
A family can exist without a base rule: declaring only `.card--compact:hover` still creates the modifier family.

#### Built-in categories

Each category can also be used as a key in `within`.

**Variables and declarations**

- `sass:variables` — `$gap: 1rem;`
- `custom-properties` — `--gap: 1rem;`
- `declarations` — `gap: 1rem;`

**Fallbacks for at-rules and selector rules**

- `at-rules` — `@media print {}`
- `rules` — `h2 {}`

**BEM families and their base styles**

- `base` — `.card {}` (the current family's own styles)
- `modifiers` — `.card--compact {}`
- `pseudo-elements` — `.card::before {}`
- `elements` — `.card__title {}`

**Conditions on the target itself**

- `pseudo-classes` — `.card:hover {}`
- `qualifiers:class` — `.card__title.is-active {}`
- `qualifiers:attribute` — `.card[hidden] {}`

**Ancestor conditions** (both examples target `.card__title`)

- `context:internal` — `.card:hover .card__title {}`
- `context:external` — `.theme .card__title {}`

Each ancestor compound must contain an entity from the target's block to remain internal.
Additional classes on such an ancestor act as qualifiers:
both `.card--compact.is-active .card__title` and `.theme.card--compact .card__title` are internal.
A separate ancestor without an entity from that block makes the relation external,
as in `.theme .card--compact .card__title`.
These scopes describe the source condition's relationship to the target's block, rather than effect direction.

#### Base rules and declarations

`base` positions the current family's own rule without additional conditions.
`declarations` positions individual CSS property nodes inside any rule.

```scss
.card {
  color: black;
}

.card:hover {
  color: red;
}
```

Within the `.card` family, the first rule is `base` and the second is `pseudo-classes`.
Both `color` nodes are `declarations`.
Thus `base` before `pseudo-classes` positions the two rules,
while `within.declarations` orders properties inside both of them.

The position of `base` is configurable.
With `order: ['context:external', 'base', 'pseudo-classes']`,
external-context rules precede the family's own base rule:

```scss
.theme .card {
  color: white;
}

.card {
  color: black;
}

.card:hover {
  color: red;
}
```

Each family has its own optional base: `.card--compact` is the base of its modifier family,
and `.card::before` is the base of its pseudo-element family.
In authored nested SCSS, direct properties are `declarations`; there is no extra authored base rule to move.
Their position relative to child rules such as `&:hover` is determined by `declarations` in `order`.

#### Matchers and equal ranks

In the outer `order`, string entries are reserved for built-in categories,
`group:name` references, and the `*` remainder.
In group definitions, string entries can only name built-in categories.
Custom conditions use explicit objects in both scopes.
Standalone `@media` strings, selector strings, and `RegExp` values are not accepted there,
including inside equal-rank arrays and named groups.

The only accepted `type` values are `at-rule` and `rule`.
Built-in categories remain string entries rather than object `type` values:

- `{ type: 'at-rule' }` matches at-rules.
  Optional `name` is an exact name without `@`.
  Optional `parameter` matches normalized parameters, excluding the name.
  Optional `hasBlock` distinguishes statements (`false`) from block-form at-rules (`true`).
- `{ type: 'rule' }` matches selector rules.
  Optional `selector` matches the authored selector text.
  Optional `relativeSelector` matches the parsed representation relative to the current family's base.
  `selector` and `relativeSelector` are mutually exclusive; omitting both allows any selector rule.
  Optional `name` supplies a descriptive diagnostic label.
  The label also identifies the rule when another node must cross it.
  It does not change matching or the highlighted source range; repeated labels include source coordinates.
- In `parameter`, `selector`, and `relativeSelector`, strings match the complete value exactly;
  `RegExp` objects specify patterns.
  For example, `selector: '.card'` matches only `.card`,
  while `selector: /\.card/` can also match `.card__title`.
  Other fields keep their documented literal meaning.

Outer assignment uses two passes after groups expand:

1. Find the first matching explicit object matcher in the expanded sequence.
1. If no object matches, use the first matching built-in category.

The selected entry's original expanded position determines its ordering rank.
This applies equally to rule, at-rule, and property-group objects; no specificity score is calculated.
For example, `group:functional` can claim `is`, `has`, and `not` variants even when `pseudo-classes` appears earlier.
A directly referenced group remains an ordered fragment with its sequence and equal-rank structure.
An outer equal-rank array explicitly assigns one rank to all its members, including expanded group entries.
Assignment and sorting operate within the current scope and never extract descendants from atomic families.

`*` is an optional terminal fallback for content left unmatched by objects and categories.
It retains first-appearance order and must be the final direct entry of its sequence.
It cannot appear inside an equal-rank array or a group definition.
The same terminal-only restriction applies to `within` and transformer results.
Without `*`, unmatched content follows the configured `unspecified` policy, which defaults to `bottom`.

A nested array assigns equal rank.
Inside `within['pseudo-classes']`, `[':hover', [':focus', ':focus-visible'], ':active']`
allows either focus variant first, between hover and active.
Outer sequences support the same equal-rank structure using their permitted matcher forms.
Only one level of equal-rank arrays is supported.
An object matcher and category in the same equal-rank array keep the same outer rank,
even though object assignment takes precedence over category fallback.

Use [property groups] to place specific declarations between other entries in `order`.

#### Authored and relative selectors

`selector` preserves the authored-text contract.
`relativeSelector` selects a separate parsed representation after Sass resolution and family ownership.
In that representation, `&` denotes the resolved BEM subject, including its element and modifier parts.
Context ancestors and pseudo-elements remain in their original structural positions.
Both fields accept `string | RegExp` and are mutually exclusive wherever a rule matcher is used:
in `order`, group definitions, and `within`.

```js
[
  { type: 'rule', selector: '&:empty' },
  { type: 'rule', relativeSelector: '&:empty' },
  { type: 'rule', relativeSelector: /^&:(?:is|has|not)\(/ },
]
```

The first matcher requires that authored selector text.
The other matchers use the family-relative representation.
For an ordinary `.card` family, the normalization is:

| Authored form                                    | Relative form |
| ------------------------------------------------ | ------------- |
| Flat `.card:empty`                               | `&:empty`     |
| Nested `&:empty` inside `.card`                  | `&:empty`     |
| Flat `#{$b}:empty` when `$b` resolves to `.card` | `&:empty`     |

A string matches the complete selected representation; a `RegExp` is an explicit pattern.
Exact `&:empty` does not automatically match `&.active:empty`.
There is no automatic mode detection from `{base}` or other text inside `selector`.
No `selectorMode`, `pseudoClass`, or `combinator` fields are introduced.

Relative matching requires an unambiguous target, but no authored base rule is required.
The selector parser normalizes optional whitespace and preserves selector escaping.
Only direct target class nodes are replaced; attributes and functional pseudo-class arguments remain intact.
Unmatched or incompatible selector lists and unresolved interpolation are ordering boundaries.

#### Pseudo-element variants

Determine the selector family before applying its category order.
`&:hover::before` belongs to the `::before` family, where `:hover` is a local condition.
It stays with `&::before` even when `pseudo-classes` precedes `pseudo-elements` in `order`.

For example:

```js
{
  order: ['sass:variables', 'declarations', 'base', 'pseudo-classes', 'pseudo-elements'],
  within: {
    'pseudo-classes': [':hover', ':active', '*'],
    'pseudo-elements': ['::before', '::after', '*'],
  },
}
```

The resulting organization is:

```scss
.card {
  $b: #{&};

  color: black;

  &:hover {
    color: red;
  }

  &::before {
    content: '';
    opacity: 0;
  }

  &:hover::before {
    opacity: 1;
  }

  &:active::before {
    opacity: 0.5;
  }

  &::after {
    content: '';
  }

  &:hover::after {
    transform: scale(1.1);
  }
}
```

`within['pseudo-elements']` orders whole pseudo-element families.
The shared `order` then applies inside each family, with `base` before its `pseudo-classes`.
Ordering applies at the current scope; it does not flatten those families.

For a `.card::before` family, `.card:hover::before` becomes `&:hover::before`.
The pseudo-element is retained so that conditions before and after it remain distinct.
For example, `&:hover::before` and `&::before:hover` are never treated as equivalent relative selectors.

### `root`

Use `root` to order whole selector families and at-rules at the stylesheet level.
It shares [`within`][within-option] and [`groups`][groups-option] with the rest of the stylesheet.

#### `root.order`

`root.order` applies at the document root and continues through stylesheet-level
`@media`, `@supports`, `@container`, `@layer`, `@scope`, `@starting-style`, and `@document` wrappers
(including `@-moz-document`).
It stops at a selector body or a different kind of at-rule container, such as `@font-face` or `@mixin`.
For example, `@layer components { @media (...) {} .card {} }` uses the document order,
while `.card { @media (...) {} &:hover {} }` uses the main `order`.
Within each flat BEM family, `order` still positions the base, states, modifiers, and elements.
Media wrappers are never attached to a BEM family; there is no `groupBy` option.

::: details Default stylesheet order

```js
[
  [
    'sass:variables',
    { type: 'at-rule', name: 'function' },
    { type: 'at-rule', name: 'mixin' },
    { type: 'rule', selector: /^%/ },
    { type: 'at-rule', name: 'include' },
    { type: 'at-rule', name: 'extend' },
    { type: 'at-rule', name: 'debug' },
    { type: 'at-rule', name: 'warn' },
    { type: 'at-rule', name: 'error' },
  ],
  'custom-properties',
  'rules',
  'at-rules',
  '*',
]
```

:::

The default places Sass variables, definitions, standalone placeholders, calls, and diagnostics before selector families.
These Sass constructs share an equal rank to preserve their authored order;
for example, a function stays before a variable that calls it.
Ordinary CSS at-rules, including media queries, follow selector families.
At-rules of the same rank retain their first-appearance order unless shared `within['at-rules']` changes it.
Omitting `root`, or supplying `root: {}`, uses these defaults even when `order` is customized.

For example, a shared `media` group can order breakpoints after all selector families:

```js
{
  root: {
    order: ['rules', 'group:media', 'at-rules'],
  },
  groups: {
    media: [
      { type: 'at-rule', name: 'media', parameter: '(--tablet)' },
      { type: 'at-rule', name: 'media' },
    ],
  },
}
```

#### `root.unspecified`

Sets the placement of unmatched items at the stylesheet level. It inherits [`unspecified`][unspecified-option]
unless you set it here. Both options accept the same values.

### `within`

`within` changes the inner order of a category, preserving its outer position and membership.
Its entries use ordinary first-match ordering, without the outer object-before-category assignment pass.
An optional `*` must be the final direct entry.

- An omitted entry uses the built-in category order.
- An array fully replaces that category's order.
- A transformer receives its readonly defaults and returns a replacement sequence.

An object can set `order`, `sort`, and `unspecified` for a single category.
For example, this puts Sass variables starting with `$_` first and keeps the default order for the rest:

```js
{
  within: {
    'sass:variables': (defaults) => [/^\$_/u, ...defaults],
  },
}
```

Nested equal-rank arrays remain intact when defaults are composed.
A transformer operates on configuration data, not CSS nodes; node-matching predicates are not part of this API.

Transformers run once per stylesheet and receive a readonly copy of the defaults.
Invalid transformer results produce a configuration warning.
Unknown group references, group composition, non-terminal remainder markers, and conflicting selector fields are rejected.

The default pseudo-class order is `:link`, `:visited`, `:hover`, equal-rank `:focus` / `:focus-visible`, `:active`, then `*`.
Pseudo-element families use `['::before', '::after', '*']`; other categories use `['*']`.
Property order is unchanged unless a property group or `within.declarations` supplies an ordering policy.
Property matching uses [canonical comparison names]. You can give a set of declarations its own order using [property groups].

Groups of blocks, elements, and modifiers keep their first-appearance order by default.
To put a specific element first, for example, set `within.elements` to `['.card__title', '*']`.

#### Category matchers

`within['at-rules']` accepts at-rule matcher objects and the terminal `'*'` remainder marker.
The same constraints apply to equal-rank arrays and sequences returned by transformers.
Use `name` for the at-rule name, `parameter` for exact normalized parameters or a pattern,
and `hasBlock` to distinguish statements from block-form calls:

```js
within: {
  'at-rules': [
    { type: 'at-rule', name: 'include', hasBlock: false },
    { type: 'at-rule', name: 'include', hasBlock: true },
    { type: 'at-rule', name: 'media', parameter: /^\(min-width:/ },
    '*',
  ],
},
```

Other categories also accept literal strings and standalone regular expressions:

- `:focus` matches that local pseudo-class, without also matching `:focus-visible`.
- `::before` matches the pseudo-element family, including its variants.
- Property or variable names, such as `display`, are literals within their category.
  Ordinary property names use the [canonical comparison names].
- A `RegExp` matches a property name or normalized selector header, excluding block content.
- Explicit matcher objects are also accepted and use the same fields as [outer matchers][outer-matchers].

In these categories, a bare string is literal or semantic shorthand; it is not implicitly a regular expression.
Strings in explicit objects follow the same principle: they are never compiled as regular expressions.

#### Selector sets

Inside `within`, `selectorSet` matches an unordered set of complete local selector branches.
It can be mixed with ordinary strings and equal-rank arrays:

```js
{
  within: {
    'pseudo-classes': [
      ':link',
      ':visited',
      ':hover',
      ':focus-visible',

      // Exactly these two branches, in either order.
      // .card:hover, .card:focus-visible {}
      // .card:focus-visible, .card:hover {}
      {
        selectorSet: {
          equals: [':hover', ':focus-visible'],
        },
      },

      // Hover and exactly one other distinct branch.
      // .card:hover, .card:active {}
      // .card:disabled, .card:hover {}
      {
        selectorSet: {
          includes: [':hover'],
          size: 2,
        },
      },

      // Any set containing a complete hover branch.
      // .card:hover, .card:active, .card:focus-visible {}
      // .card:disabled, .card:hover, .card:focus {}
      {
        selectorSet: {
          includes: [':hover'],
        },
      },

      ':active',
      '*',
    ],
  },
}
```

The same matchers apply to nested `&:hover, &:focus-visible` inside `.card`.
`equals` requires exactly the listed branches; `includes` requires every listed branch and allows extras.
`size` counts distinct normalized branches, including those required by `includes`.
Repeated authored branches do not increase that count.
`selectorSet` controls whole-rule placement; it does not rewrite the selector list itself.
Configuration branches must be distinct; use either `equals` or `includes`, with `size` available only for `includes`.

The first matching entry wins, so place exact sets before broader inclusive sets.
An inclusive set also matches a single selector such as `.card:hover`;
in this example the earlier `':hover'` string takes precedence for that single rule.
Simple strings do not claim an entire selector list just because one of its branches contains that state.
Arrays such as `[':focus', ':focus-visible']` still assign equal rank to independent rules.

Matching uses complete local branches: `:hover:focus-visible` is one compound, not a standalone `:hover` branch.
Condition order within a compound does not affect matching: `.foo:hover` and `:hover.foo` are equivalent.
Repeated conditions retain their specificity, and functional pseudo-class arguments are not reordered.
Pseudo-elements separate conditions on different subjects: `:hover::before` and `::before:hover` remain distinct.
The authored selector spelling is preserved when the whole rule moves.
Commas inside `:is(...)`, `:not(...)`, or quoted attribute values do not split the outer set.
All branches must have the same resolved BEM family path; different owners or family paths remain boundaries.
For example, `.card:hover, .button:focus-visible` cannot be assigned to either family.
Lists with a shared family participate as whole rules without requiring a `selectorSet` match.
Their category is selected independently of branch order:

1. Find categories shared by every branch and choose the first configured one in the outer `order`.
1. If no categories are shared, consider the union of the branches' categories in the outer `order`.
1. If no eligible specific category is configured, fall back to `rules`.

For example, `.card:hover.foo, .card:focus` shares `pseudo-classes` despite the additional class in one branch.
For `.card:hover, .card[data-active]`, the outer order chooses between `pseudo-classes` and `qualifiers:attribute`.
Reversing the branches does not change that choice, and explicit whole-rule matchers retain their priority.
Eligible specific categories are checked before the generic `rules` fallback, even if `rules` appears earlier.

The `selectorSet` matcher must belong to the selected category.
An unmatched list follows that category's `unspecified` policy: `bottom` by default, `top`, or `ignore`.
With `ignore`, the list keeps its slot while other rules can sort across it; it does not split the sorting region.
A terminal `*` explicitly selects unmatched lists into the last priority, including its configured sorter.
Lists whose branches all lack a BEM subject, such as `h1, h2`, are ordinary atomic rules.
They can be ordered by `rules` or authored selector matchers without a `selectorSet`.

#### Sorting presets

Presets use the same category and named-group scopes as custom sorting:

```js
{
  within: {
    elements: { sort: { by: 'name' } },
    'custom-properties': { sort: { by: 'name', direction: 'desc' } },
  },
  groups: {
    responsive: {
      order: [
        { type: 'at-rule', name: 'media' },
        { type: 'at-rule', name: 'container' },
        { type: 'at-rule', name: 'include' },
      ],
      sort: {
        by: 'dimension',
        units: ['rem', 'px'],
        direction: 'asc',
        unresolved: 'ignore',
      },
    },
  },
  root: { order: ['rules', 'group:responsive', '*'] },
}
```

For `by: 'name'`, `direction` defaults to `asc`; use `desc` for reverse name ordering.
Names use a fixed case-sensitive comparison, independent of the machine's locale.
For BEM elements, the compared name excludes the block prefix.
Equal names or numeric keys retain their original relative order.

For `by: 'dimension'`, omitting `units` or supplying `units: []` sorts values separately for each unit.
This preset compares numeric values with units, including lengths, durations, angles, and resolutions.
Each unit retains its existing slots; values in different units are never compared or converted.
Unit matching ignores case, so `rem` and `REM` share the same slots.

```text
Input: 40px, 2rem, 16px, 1rem
asc:   16px, 1rem, 40px, 2rem
desc:  40px, 2rem, 16px, 1rem
```

A non-empty `units` list supplies distinct unit names in priority order.
Units outside that list are unresolved.
`direction` defaults to `asc` and changes numeric order within each unit, never the explicit unit priorities:

```text
Input: 40px, 2rem, 16px, 1rem
asc:   1rem, 2rem, 16px, 40px
desc:  2rem, 1rem, 40px, 16px
```

Extraction uses at-rule parameters or declaration values and requires one unambiguous numeric dimension.
Additional nonnumeric conditions are allowed; the rule does not evaluate boolean expressions or infer breakpoint intent.
A direct Sass mixin call can supply a literal argument, such as `@include respond(40rem)`.
Nested function calls and calculations are not evaluated.

| Input                                         | Result                                 |
| --------------------------------------------- | -------------------------------------- |
| `(width >= 40rem) and (hover: hover)`         | Sort by `40rem`                        |
| `sidebar (width >= 40rem)`                    | Sort by `40rem`                        |
| `respond(40rem)` in `@include`                | Sort by `40rem`                        |
| `(20rem <= width < 60rem)`                    | Unresolved: two numeric bounds         |
| `(width >= 40rem) and (height >= 20rem)`      | Unresolved: two sizes                  |
| `(width >= 40rem), (hover: hover)`            | Unresolved: alternative queries        |
| `(width >= 40rem) or (hover: hover)`          | Unresolved: a disjunction              |
| `(width >= calc(20rem + 2px))`                | Unresolved: a calculation              |
| `(min-width: $tablet)` or `(--tablet)`        | Unresolved: a variable or custom query |
| `(hover: hover)`                              | Unresolved: no numeric size            |
| `(width >= 40em)` with `units: ['rem', 'px']` | Unresolved: an unlisted unit           |

Unitless numbers, additional numeric literals, and negated conditions also remain unresolved.
Declaration dependencies retain their source precedence.
Without unit priorities, a batch stays unchanged if preserving those dependencies would displace a unit's reserved slot.
For these cases, `unresolved` defaults to `ignore`: their sibling slots are preserved,
and they do not receive a diagnostic from the size comparison.
Recognized sizes sort through the remaining slots.
`top` and `bottom` place unresolved items before or after recognized items, retaining their relative order.
This policy applies only inside the current sorting batch; explicit outer and category-local ranks still apply.
Use a custom callback when the project has a defined way to resolve variables, choose a range bound, or convert units.

#### Custom sorting

`within.<category>.sort` receives a readonly sequence of equal-rank sibling descriptions.
It must return the same objects exactly once in the desired order.
Families remain atomic: sorting elements also moves their states and modifiers with them.

For example, group related element names by first appearance, then by the number of hyphen-separated parts:

```js
{
  within: {
    elements: {
      sort(items) {
        const groups = new Map();
        const rows = items.map((item) => {
          const parts = item.name.split('-');
          const group = parts[0];
          if (!groups.has(group)) groups.set(group, groups.size);
          return { item, group: groups.get(group), depth: parts.length };
        });
        return rows
          .toSorted((a, b) => a.group - b.group || a.depth - b.depth)
          .map(({ item }) => item);
      },
    },
  },
}
```

This turns `title, element, title-icon, element-icon` into `title, title-icon, element, element-icon`.
Each region and semantic level gets an independent batch in its original sibling order.

Descriptions contain `type`, `name`, `category`, and `sourceIndex`.
Families use `type: 'family'` and expose their local name (`title-icon`) and full identity in `key`.
Other types are `rule`, `at-rule`, and `declaration`.
Where applicable, `selector`, normalized `parameter`, declaration `value`, and `hasBlock` are also provided.
The input array and every description are frozen; no PostCSS nodes are exposed.

The second argument, `context`, is frozen and contains:

- `container`: the authored root, selector rule, or at-rule, with its selector or normalized parameters;
- `family`: the complete semantic owner path, separate from physical nesting;
- `category` and optional named `group`;
- `sort(items, preset)`: a typed helper applying any built-in preset to the original descriptions or a subset.

For example, supply project-specific ratio handling and delegate ordinary media dimensions:

```ts
import type { OrderSorter } from '@morev/stylelint-plugin';

const sortMedia: OrderSorter = (items, context) => {
  const ratios = items.filter((item) => item.parameter?.includes('aspect-ratio'));
  const dimensions = items.filter((item) => !ratios.includes(item));
  return [
    ...context.sort(dimensions, { by: 'dimension', units: ['rem', 'px'] }),
    ...ratios.toSorted(compareAspectRatios),
  ];
};
```

Here `compareAspectRatios` is the project's comparator.
The helper preserves item identities and known declaration dependencies within its input.
Its generic return type retains the input descriptor subtype.
It accepts only distinct original descriptions from the current callback batch and a valid built-in preset.
The final callback result still undergoes permutation and declaration-dependency validation.
`OrderSortItem`, `OrderSortContext`, `OrderSortPreset`, and `OrderSorter` are exported package types.

Callbacks must be synchronous, deterministic, and stable when run again on their own result.
Returning missing, duplicate, or replacement objects produces a configuration warning.
Thrown exceptions, including errors caused by mutating frozen input, produce the same warning.
All callbacks are validated before this rule emits ordering diagnostics or applies any fixes.
An invalid callback therefore leaves the entire stylesheet unchanged by this rule.

The same presets and callbacks can also [sort a named group][named-group-sorting].

### `groups`

Define a named sequence once and use `group:name` in `order` or `root.order`.

Definitions may contain built-in categories, explicit custom matcher objects, and equal-rank arrays.
The expanded definition `{ order: [...], sort: (items) => ... }` adds custom sorting to a named group.
Group references and the `*` remainder marker are forbidden inside definitions, including equal-rank arrays.
Group references are also forbidden in `within`, including sequences returned by transformers.
The reserved `group:` prefix in category-local strings is checked at runtime.
Group references require a non-empty name, checked by the schema at runtime.

A group can also be a [property group][property groups]. Use `blankLines` for [group spacing].

#### Named group sorting

Named groups accept a [custom sorting callback][custom-sorting] in an expanded definition:

```js
{
  root: { order: ['rules', 'group:responsive'] },
  groups: {
    responsive: {
      order: [
        { type: 'at-rule', name: 'media' },
        { type: 'at-rule', name: 'container' },
      ],
      sort: (items) => items.toSorted((a, b) => a.parameter.localeCompare(b.parameter)),
    },
  },
}
```

Here media and container rules are sorted in separate batches and retain their explicit relative priority.
Placing their matchers in one nested array intentionally gives them the same rank and permits mixing.
An outer sequence such as `root.order: [['group:responsive']]` also explicitly merges the group's ranks.
Callbacks never cross category slots or different outer or category-local ranks.
A group's callback takes precedence over the category callback for members assigned to that group.
Unmatched units are excluded from sorting.
See [`unspecified`][unspecified-option] for the effect of an explicit `*`.

#### Property groups

Use `{ properties: [...] }` directly in `order` or `root.order` to interleave selected properties with at-rules:

```js
{
  order: [
    { properties: ['display', 'position', ['width', 'height']], sort: { by: 'name' } },
    { type: 'at-rule', name: 'include', parameter: 'typography' },
    { properties: ['font-family', 'font-size', 'line-height', 'color'] },
    'declarations',
    'at-rules',
    '*',
  ],
}
```

The `properties` list selects ordinary CSS declarations and defines their internal priorities.
Strings match canonical property names; regular expressions match either authored or canonical names.
Nested arrays assign equal priority, so the example sorts `height` before `width` alphabetically.
A group's `sort` affects only equal-priority members; it cannot override the explicit sequence.
The group owns its local order and sorter, independently of `within.declarations`.
Remaining declarations still use that shared category configuration.
When property groups share an outer or category-local rank, each sorts only its own members' slots.
CSS custom properties and Sass variables are excluded from property groups.

The same object can define a named group or appear inside `within.declarations.order`:

```js
{
  order: ['group:layout', 'declarations', '*'],
  groups: {
    layout: { properties: ['display', 'position'] },
  },
  within: {
    declarations: {
      order: [
        { properties: ['font-family', 'font-size', 'line-height'], blankLines: { between: 'never' } },
        { properties: ['*'], sort: { by: 'name' }, blankLines: { before: 'always' } },
      ],
    },
  },
}
```

A terminal `*` inside `properties` selects remaining ordinary properties.
Property groups inside other `within` categories are rejected.
An outer group reference is still unavailable inside `within`; use the property object there directly.
Explicitly interleaving mixins is a structural policy: the rule does not inspect what a mixin emits.

#### Group spacing

Property groups and expanded named groups accept `blankLines` and an optional diagnostic label, `groupName`:

```js
{
  within: {
    declarations: {
      order: [
        {
          properties: ['display', 'position'],
          groupName: 'Layout',
          blankLines: { between: 'never', after: 'always' },
        },
        {
          properties: ['color', 'background'],
          blankLines: {
            before: {
              default: 'always',
              rules: [
                { when: 'inside-single-line-block', mode: 'ignore' },
                { when: 'first-nested', mode: 'never' },
              ],
            },
          },
        },
      ],
      unspecified: {
        position: 'bottom',
        blankLines: {
          before: {
            default: 'never',
            rules: [{ when: { minItems: 5, scope: 'container' }, mode: 'always' }],
          },
        },
      },
    },
  },
}
```

| Field     | Boundary                                                                    |
| --------- | --------------------------------------------------------------------------- |
| `before`  | Before the first member of a consecutive group.                             |
| `after`   | After the last member, including before a nested container's closing brace. |
| `between` | Between consecutive members of the same group.                              |

Each field accepts `'always'`, `'never'`, `'ignore'`, or a policy with conditional `rules` and an optional `default`.
`always` requires at least one empty line and preserves larger gaps.
`never` removes empty lines while retaining an existing ordinary line break.
An explicit `ignore` preserves the existing whitespace and takes precedence over the preceding group's `after`.
An omitted `before` lets the preceding group's `after` govern the boundary.

List conditional rules in priority order using `{ when, mode }`. The first matching rule chooses the mode.
If none match, the policy uses `default`, which is `'ignore'` when omitted.
The `rules` list and the lists in `any` and `all` each contain at least one entry.

| Condition                  | Matches when                                                                     |
| -------------------------- | -------------------------------------------------------------------------------- |
| `first-nested`             | The policy's member is first in the final nested container.                      |
| `last-nested`              | The policy's member is last in the final nested container.                       |
| `inside-single-line-block` | The containing rule or at-rule remains on one line after all planned formatting. |
| `separated-by-comment`     | A leading comment on the next member occupies its own line in the final order.   |
| `{ minItems: 5 }`          | The selected scope contains at least five items.                                 |
| `{ maxItems: 4 }`          | The selected scope contains at most four items.                                  |
| `{ any: [...] }`           | At least one nested condition matches.                                           |
| `{ all: [...] }`           | Every nested condition matches.                                                  |
| `{ not: condition }`       | The nested condition does not match.                                             |

Item thresholds are inclusive and take nonnegative integers. The optional `scope` defaults to `'group'`.
Each declaration, custom property, Sass variable, at-rule or nested rule counts as one item.
The count skips comments and the contents of nested rules and at-rules.

- `container` counts all direct items in the authored container, including those across sorting boundaries.
- `group` counts the direct items in the consecutive group that owns the policy.
- `previous-group` and `next-group` count the immediately adjacent groups relative to the owner.
  At a `before` boundary, the group across the gap is `previous-group`. At an `after` boundary it is `next-group`.
  An absent neighbor makes the count condition false, including for `maxItems`.

Group counts use the final order within the same sortable region and grouping level.
Consecutive members of a category or of the `unspecified` group count together, regardless of existing empty lines.
Omitting `unspecified`, using `'bottom'`, and using `{ position: 'bottom' }` give the same count.
An explicit property group in `within.declarations` defines a narrower group.
For example, if `width`, `height`, and `color` follow `display` in the `declarations` category,
the next group contains three properties. With `{ properties: ['width', 'height'] }` in `within.declarations`,
the next group contains two.

To separate a component's palette from the declaration that uses it, require a blank line before `color`
when the preceding group contains at least two custom properties. With a single custom property, existing spacing is preserved.

```js
{
  order: [
    'custom-properties',
    {
      properties: ['color'],
      blankLines: {
        before: { rules: [{ when: { minItems: 2, scope: 'previous-group' }, mode: 'always' }] },
      },
    },
  ],
}
```

```scss
.badge {
  --text: red;
  color: var(--text);
}

.card {
  --text: red;
  --surface: white;

  color: var(--text);
}
```

Use this policy as `before` to keep blocks of up to five items compact.
In longer blocks it separates groups when either side has at least three items.

```js
{
  default: 'never',
  rules: [{
    when: {
      all: [
        { not: 'first-nested' },
        { minItems: 6, scope: 'container' },
        {
          any: [
            { minItems: 3 },
            { minItems: 3, scope: 'previous-group' },
          ],
        },
      ],
    },
    mode: 'always',
  }],
}
```

If a gap expands a single-line block, all policies in that block evaluate against the multiline layout.
Expansion inside a descendant also makes its ancestors multiline for condition evaluation.
When the single-line plan requires a gap but the multiline plan supplies none, the rule reports an invalid option.
Adding a gap in that case would immediately invalidate its own condition.

For distinct groups, an explicit `before` on the next group takes precedence over `after` on the previous one,
including when that `before` resolves to `ignore`. Between members of the same group, only `between` applies.
At a boundary between BEM families, the parent grouping owns the gap; inner group policies apply inside their family.
These priorities are independent of the current whitespace, so repeated fixes remain stable.

Expanded `unspecified: { position: 'top' | 'bottom', blankLines: ... }` is also available
at the shared level and in `root`. It formats unmatched content without adding it to a matched sorting batch.
An explicit `*` selects matched remainder content, so `unspecified.blankLines` does not apply to it.
Selector-list placement and dimension-sort `unresolved` retain their simple string forms.

Spacing is checked even when no nodes need to move.
An inline comment stays with the preceding declaration. A comment directly above a declaration stays with that declaration.
The blank line between groups goes after the previous group's trailing comment and before the next group's leading comment.
This policy accepts either a blank line or a standalone comment for `before`, `after`, or `between`.

```js
{
  default: 'always',
  rules: [{ when: 'separated-by-comment', mode: 'ignore' }],
}
```

With `ignore`, an existing blank line before the comment can stay. Use `never` to remove it.
Block comments (including multiline comments) and Sass `//` comments can serve as separators.
An inline comment sharing a line with either declaration still requires the usual blank line under this policy.
If a leading comment shares the opening brace line, a single newline can put it on its own line and satisfy the policy.

Section comments, disabled regions, and other movement boundaries are not crossed by spacing fixes.
File-leading and file-trailing padding are preserved; nested opening and closing whitespace can be configured explicitly.
Existing indentation and newline style are retained.

#### Property names and cascade

Matching and name presets lowercase ordinary CSS property names and remove known vendor prefixes
(`-webkit-`, `-moz-`, `-ms-`, `-o-`, `-khtml-`, `-epub-`).
The following aliases share a comparison name:

| Authored alias    | Comparison name |
| ----------------- | --------------- |
| `grid-gap`        | `gap`           |
| `grid-row-gap`    | `row-gap`       |
| `grid-column-gap` | `column-gap`    |
| `word-wrap`       | `overflow-wrap` |
| `font-stretch`    | `font-width`    |

Source names and values are never rewritten. Custom properties and Sass variables remain case-sensitive.
Prefixed declarations are not forced before unprefixed ones: their authored precedence is preserved.
Legacy properties with value translations, such as `page-break-before`, remain separate comparison names.

Built-in presets retain the source order of dependent declarations while sorting independent ones.
Dependencies include repeated properties and fallbacks, aliases, vendor variants,
known shorthand/longhand pairs, reset-only effects such as `border` resetting `border-image`,
and possible logical/physical overlap under an unknown writing mode.
`all` also constrains ordinary declarations, except `direction` and `unicode-bidi`.

Shorthands are not automatically placed before longhands: their relative order follows the source.
Both sequences below retain their order, even when a sorting preset would prefer to reverse them:

```scss
.shorthand-first {
  margin: 40px;
  margin-top: 16px;
}

.longhand-first {
  margin-top: 40px;
  margin: 16px;
}
```

Independent declarations can still move around these dependencies.

If explicit ranks or a custom callback reverse a dependent pair, the rule reports the conflict
without applying the region's node or spacing fixes. Independent regions can still be fixed.
This protection concerns declarations in the same authored container;
it does not evaluate mixin output, variable expressions, or interactions between different selector rules.
The private relationship registry is based on Stylelint and MDN property data,
with explicit modern reset relationships; it has no runtime dependency on their internal modules.

::: warning Known limitation: cascade across nested rules
Declarations interleaved with nested rules targeting the same element are a known edge case:

```scss
.card {
  color: red;
  & { color: blue; }
  color: green;
}
```

Moving `color: green` before the nested `&` changes the winning color from green to blue.
The rule can still apply this move: its dependency checks compare sibling declarations,
without analyzing declarations inside the nested rule.
Repeated names, identical values, and `!important` are also outside this cross-container analysis.
More detailed diagnostic labels distinguish source nodes; they do not establish that a move preserves the cascade.

Handling these interactions would require a substantial extension of the dependency model,
including selector overlap, specificity, importance, and nesting context.
This analysis is currently deferred because these interleaved patterns are considered very uncommon edge cases.
Support can be revisited on request with a representative real-world example.
:::

### `unspecified`

`unspecified` controls units that do not match an entry in the relevant sequence:

- `bottom` preserves their relative order after matched units and is the default.
- `top` preserves their relative order before matched units.
- `ignore` preserves their sibling slots while ordering matched units through the remaining slots.

The document order inherits this policy unless `root.unspecified` overrides it.
At either level, use `{ position, blankLines }` to set spacing for unmatched items. See [group spacing].
Category-local policies use the expanded `within` form:

```js
{
  within: {
    declarations: {
      order: ['display', 'position'],
      unspecified: 'ignore',
    },
  },
}
```

Here `position; color; display` becomes `display; color; position`.
The ignored `color` is not a boundary and does not receive a property-order diagnostic.
The outer `declarations` rank still applies to all three properties.
The object form also accepts an order transformer; an omitted `order` uses the category defaults.
An explicit `*` matches remaining units before `unspecified` is consulted.

::: tip Sorting the remainder
`unspecified: 'top'` and `unspecified: 'bottom'` control placement while preserving relative order.
Unmatched units do not receive the category's `sort`, whether it is a preset or a callback.
Add a terminal `*` to make the remainder an explicitly matched priority that receives sorting too:

```js
{
  within: {
    'custom-properties': {
      order: [/^--size-/u, '--theme', '*'],
      sort: { by: 'name' },
    },
  },
}
```

This sorts `--size-*` first, keeps `--theme` next, and sorts all remaining names in a separate final batch.
For an authored remainder `--zeta; --free; --alpha`, the result is `--alpha; --free; --zeta`.
Without `*`, those names retain their authored order after `--theme`.
:::

Slots belong to sibling units: an entire semantic family occupies one slot at its parent level.
Ignoring that family does not disable its internal ordering or the grouping of its scattered members.
Likewise, ignoring a property within its category does not prevent its enclosing family from moving.

### `selectorList`

`selectorList` independently opts into ordering comma-separated authored branches.
It defaults to `false`; whole-rule placement follows the [selector set rules][selector-sets].

```js
{
  selectorList: { order: 'inherit' },
  within: {
    'pseudo-classes': [':hover', [':focus', ':focus-visible'], ':active', '*'],
  },
}
```

This can change `.button:focus, .button:hover` into `.button:hover, .button:focus`.
Inherited priorities require every branch to have the same unambiguous BEM family and category.
Branches expanded into several semantic owners by nesting remain unchanged in inherited mode.
`{}` is shorthand for `{ order: 'inherit' }`.

Explicit branch priorities and alphabetical tie breaking are also available:

```js
{
  selectorList: {
    order: [':hover', [':focus-visible', ':focus'], '*'],
    sort: { by: 'name' },
    unspecified: 'ignore',
  },
}
```

Strings match complete normalized authored branches or local semantic conditions.
Regular expressions and `{ type: 'rule', selector: ... }` / `relativeSelector` matchers are accepted.
`unspecified` supports `top`, `bottom`, and `ignore` (the default), preserving ignored branch slots.
`sort: { by: 'name' }` only breaks ties when priorities are supplied.
With no `order`, `{ sort: { by: 'name' } }` sorts the complete list, including ordinary non-BEM selectors.
Set `direction: 'desc'` inside `sort` to reverse name comparison while retaining explicit priority ranks.

Only complete top-level branches move. Their spelling, comments, duplicates, and slot whitespace are retained.
Simple selectors inside compounds and lists inside `:is()`, `:not()`, or other functions are never reordered.
Unresolved interpolation, disabled selectors, keyframes, and function bodies remain untouched.

### `separators`

Set the separators used to recognize BEM selector families. The defaults are `__` for elements,
`--` for modifiers, and `--` between a modifier and its value. You can override each one independently.

For example, with `separators: { modifier: '_', modifierValue: '_' }`,
`.card_size_small` belongs to the `.card` family and `.card__title` is still its element.

## Regions and autofix boundaries

Ownership follows the rightmost compound's most specific BEM entity.
If multiple candidates remain, exactly one must have an unambiguous declaration elsewhere in the stylesheet.
Otherwise the selector is a boundary; its position is preserved.
Classes inside functional pseudo-classes never become owners.

Each authored container is checked independently.
Conditional at-rules remain whole wrappers; their contents are sorted within their own region.

`@charset`, `@import`, `@namespace`, and statement-form `@layer` declarations are fixed boundaries,
regardless of configured ranks or at-rule name casing.
Their authored positions and relative order are preserved, and no nodes move across them.
This protects an existing valid preamble; misplaced directives are not automatically repaired.
See the [namespace placement requirements](https://www.w3.org/TR/css-namespaces-3/#syntax)
and [layer statement rules](https://www.w3.org/TR/css-cascade-5/#layer-statements).

Document-level `@function` and `@mixin` definitions can move as whole nodes.
Inside selectors or other non-document containers they remain boundaries.
Sass control-flow, imports, and `@at-root` are boundaries in their parent container.
Mixin and control-flow contents may still be checked.
The contents of Sass and CSS `@function` blocks, including their nested containers, are never sorted.
Keyframe contents are also left unchanged.
Sass `@content` and CSS `@contents` insertion points are silent boundaries.
An enclosing wrapper containing an insertion point is also a boundary in its parent region.
This protection stops at the nearest mixin or function definition, which can still move as a whole node.
Independent regions on either side of an insertion point are still checked.
Unmatched BEM lists, lists mixing BEM and ordinary subjects, incompatible BEM lists, unresolved interpolation, disabled ranges,
and nodes containing Stylelint directives are also boundaries.
No rule is moved across one of these boundaries or into a different authored container.

Same-line comments travel with the preceding node.
Comments immediately preceding a node travel with that node; a blank line after a comment makes it a section boundary.
The rule preserves existing whitespace unless group spacing is explicitly configured.
For the stable target order, the rule first minimizes the number of authored nodes that must move.
Among equally minimal plans, it minimizes the number of moved runs.
A run contains nodes that are consecutive in both the source and target sequences, in the same direction.
Without ignored units, each moved run produces one short diagnostic on its first node; retained nodes produce none.
The diagnostic references a retained node that the run must actually cross.
Repeated declaration names include their values; labels that still coincide include source coordinates.
Diagnostic labels preserve authored header spacing and comments; matcher normalization does not alter their display.
Long labels are shortened without changing the highlighted source range.
With `ignore`, diagnostics compare only units managed by the relevant ordering level.
They can therefore differ from the physical relocation plan that also restores ignored slots.
Family continuity and descendant ordering remain active checks.
Equally good plans prefer the sequence ending earlier in the source.
Autofix applies the shared region plan once, moves only the selected runs with their comments,
preserves equal ranks, and is stable on subsequent runs.

## Acknowledgments

References that informed this rule:

- [`order/order`][stylelint-order]
  for the object matcher shapes.
- [Stylelint](https://github.com/stylelint/stylelint) for the property relationship data used in cascade checks.

[canonical comparison names]: #property-names-and-cascade
[custom-sorting]: #custom-sorting
[group spacing]: #group-spacing
[groups-option]: #groups
[named-group-sorting]: #named-group-sorting
[outer-matchers]: #matchers-and-equal-ranks
[property groups]: #property-groups
[root-option]: #root
[selector-sets]: #selector-sets
[stylelint-order]: https://github.com/hudochenkov/stylelint-order/blob/master/rules/order/README.md
[unspecified-option]: #unspecified
[within-option]: #within
