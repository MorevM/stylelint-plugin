---
outline: [2, 5]
pageClass: bem-order-page
---

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

And yes, you can customize **all** of these ordering rules.

## Rule options

::: info A note from the author
Like the other rules, this one comes with defaults I recommend based on my own experience.
Just set the primary option to `true` and the rule will organize your BEM styles using those defaults.
However, it's **expected and recommended** that you'll adapt the rule to your own conventions.

If you've used [`order/order`][stylelint-order], the setup will feel familiar.
You can list items in a fixed order or use conditions for finer control.
For example, you can place a specific breakpoint before all other media queries.
:::

To customize the rule, pass an options object after `true`.

```ts
{
  '@morev/bem/order': [true, {
    order: [
      // List categories and matchers in the order you want.
    ],
  }],
}
```

With no options, the rule uses the default sequences shown below.

::: details Full default configuration

```ts
{
  '@morev/bem/order': [true, {
    order: [
      // Define local Sass values before anything reads them...
      'sass:variables',
      // ...then set the custom properties that other CSS can override.
      'custom-properties',
      // Apply shared styles before writing local overrides...
      'sass:include-statements',
      // ...and keep the selector's own properties together.
      'declarations',
      // In each BEM family, put the plain selector before its variants.
      'base',
      // Keep mixins with a content block near the styles they change.
      'sass:include-blocks',
      // Read conditions on the viewing environment first...
      'css:media',
      // ...then conditions on the container.
      'css:container',
      // Keep the remaining at-rules together before selector states.
      'at-rules',
      // Keep styles for a specific tag together, including its states.
      'qualifiers:type',
      // List states on the originating element first.
      'pseudo-classes',
      // Then list states on the pseudo-element itself.
      'pseudo-classes:pseudo-element',
      // Follow states with the variants named by BEM modifiers.
      'modifiers',
      // Look for extra classes on the same node first...
      'qualifiers:class',
      // ...then attributes like [aria-busy].
      'qualifiers:attribute',
      // Put remaining qualifiers, such as an ID, after classes and attributes.
      'qualifiers',
      // Read overrides from ancestors in the same block first...
      'context:internal',
      // ...then those that depend on an ancestor outside the block.
      'context:external',
      // Keep ::before and ::after with the selector they belong to.
      'pseudo-elements',
      // Each element starts its own family and follows this order again.
      'elements',
      // Give placeholders and other nested selectors the same priority.
      ['sass:placeholders', 'rules'],
    ],

    // Name sets of matchers to reuse as `group:name` in either order.
    groups: {},

    // Set the order inside a category wherever that category is used.
    categories: {
      // A pressed link can also be hovered, so put :active after :hover.
      // Give both focus states the same priority to keep their source order.
      'pseudo-classes': [
        ':link', ':visited', ':hover',
        [':focus', ':focus-visible'],
        ':active',
        '*',
      ],
      // A list item's ::marker comes before its ::before in the element tree.
      'pseudo-elements': ['::marker', '::before', '::after', '*'],
    },

    // If you omit 'at-rules' from `order`, a nested @supports goes last.
    unspecified: 'bottom',

    root: {
      order: [
        // These entries have equal priority, so they keep their source order.
        // This keeps Sass definitions available where they're used.
        // By convention, this group goes at the top, before selector rules.
        [
          'sass:variables',
          'sass:functions',
          'sass:mixins',
          'css:functions',
          'css:mixins',
          'sass:placeholders',
          'sass:includes',
          'sass:diagnostics',
        ],
        // Put shared values before selectors...
        'custom-properties',
        // ...plain selectors next...
        'rules',
        // ...then media queries, container queries, and the remaining at-rules.
        'css:media',
        'css:container',
        'at-rules',
      ],
      // If you lint `display: grid; --gap: 16px;` as a CSS fragment,
      // `--gap` matches `custom-properties`. The unmatched `display` goes last.
      unspecified: 'bottom',
    },

    // Move each rule as a whole and keep comma-separated selectors as written.
    selectorList: false,

    separators: {
      // Separate a block from its element, as in `.card__title`.
      element: '__',
      // Separate a block or element from its modifier, as in `.card__title--size`.
      modifier: '--',
      // Separate the modifier from its value, as in `.card__title--size--small`.
      modifierValue: '--',
    },
  }],
}
```

`pseudo-classes:pseudo-element` inherits the `pseudo-classes` order.
Every other category without a listed order uses `['*']`,
so items with the same priority keep their original order.

:::

::: details SCSS component using the default order

Hover over a line or tap it to see how it fits into the order.
The three guides show the root entry, the current family, and the category
inside it. Try `display: grid` to see all three. {#default-order-example}

```scss annotated
// [Sass preamble] Load the shared mixins first. The rule keeps @use in place.
@use '../mixins' as ui;

// [sass:variables] Define the default gap before using it in the card.
$card-gap: 16px;

// [rules | .product-card] The plain card selector is the base of its family.
.product-card {
  // [sass:variables] Save the block selector for the compact card's title.
  $b: #{&};
  // [custom-properties] Expose the gap so other styles can override it.
  --card-gap: #{$card-gap};

  // [sass:include-statements] Apply the shared surface before local styles.
  @include ui.surface;
  // [declarations] Keep the card's own layout properties together.
  display: grid;
  gap: var(--card-gap);

  // [sass:include-blocks] Keep the breakpoint mixin near the styles it changes.
  @include ui.from-tablet {}
  // [css:media] Group media queries before container queries.
  @media print {}
  // [css:container] Adapt the card to the space its container gives it.
  @container (width > 480px) {}

  // [qualifiers:type] Keep link cards and their hover styles together.
  @at-root a#{$b} {}

  // [pseudo-classes] These states apply to cards of any HTML element type.
  &:hover {}
  &:focus-visible {}

  // [modifiers | .product-card--compact] The compact card is a new family.
  &--compact {}

  // [qualifiers:class] This class changes the card on the same HTML element.
  &.is-selected {}
  // [qualifiers:attribute] This attribute is also on the card itself.
  &[aria-busy='true'] {}

  // [pseudo-elements] Keep the card's ::before and ::after together.
  &::before {}
  &::after {}

  // [elements | .product-card__title] The same order starts again in the title.
  &__title {
    // [pseudo-classes] The title's own state comes before its modifier.
    &:hover {}

    // [modifiers | .product-card__title--linked] The title owns this variant.
    &--linked {
      // [pseudo-classes] States come first inside the modifier too.
      &:hover {}
      &:focus-visible {}
      // [pseudo-elements | .product-card__title--linked::after] For links only.
      &::after {}
    }

    // [context:internal] The compact card changes its own title.
    #{$b}--compact & {}
    // [context:external] The sidebar changes the title from outside the card.
    .sidebar & {}
    // [pseudo-elements | .product-card__title::after] The title owns this one.
    &::after {}
  }

  // [rules] Other nested selectors share the last named priority.
  > img {}
  // [sass:placeholders] The placeholder keeps its source order with the image.
  %product-card-artwork {}
}
```

:::

---

### `order`

Use `order` to choose what comes first at each level of the stylesheet,
including inside selectors and BEM families.
Set [`root.order`][root-option] only if you want a different order at the stylesheet level.

A **BEM family** is a group of selectors for the same block, element, or modifier.

```scss
.card {}               // The card family.
.card:hover {}         // This state belongs to the card.

.card__title {}        // The title has its own family within the card family.
.card__title:hover {}  // This state stays with the title.
```

In `order`, you can reference [built-in categories] and [named groups] or write [object matchers] directly.

---

#### How ordering works

**Configuration**

```js
{
  order: [
    'declarations',
    'base',
    'pseudo-classes',
    'modifiers',
    'elements',
  ],
}
```

**Result**

```scss
// At the document level, this example has no `declarations` or `modifiers`.
// So, `.card` falls into the `base` category.
.card {
  // Nesting creates a new context where the same order applies.
  // Here we see `declarations`.
  display: grid;

  // According to the configuration, `base` comes after `declarations`.
  // A second `base` for this family would have to refer to the same entity.
  // Technically, we could write `& { color: red; }` as another `base`,
  // but there's no point in doing that here.

  // Next come the `pseudo-classes`.
  &:hover {}

  // Then come the `modifiers`.
  &--compact {}

  // The configuration places `elements` next.
  &__title {
    // The hierarchy repeats inside each new entity (a "BEM family").
    // Categories that are missing or don't apply to the entity are skipped.
    // For example, the `modifiers` category is skipped inside `&--compact`.
    &:hover {}

    &--muted {}
  }
}
```

You can write the same card in flat CSS. \
The rule still treats `.card` and its variants as one family. When you move the title, its hover state goes with it.

```scss
.card {}
.card:hover {}

// This modifier belongs to the `modifiers` category in the `.card` family.
// It also forms its own family, where `.card--compact` is the `base` rule.
.card--compact {}
// The configuration puts `base` before `pseudo-classes` within each family.
// That's why `:hover` comes right after the modifier's base rule here.
// Reversing those two entries would put `:hover` before `.card--compact`.
.card--compact:hover {}

// The same applies to elements. A family can exist without a `base` rule.
// Here the rule recognizes the `.card__title` family from its hover selector.
.card__title:hover {}
```

---

#### Built-in categories {#built-in-categories}

Built-in categories are the simplest way to refer to parts of a stylesheet by name.

<!-- eslint-disable markdown/no-html -- Keep examples and notes on separate lines in each cell. -->

<table class="bem-order-categories">
  <thead>
    <tr>
      <th>Value</th>
      <th>Example</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>sass:variables</code></td>
      <td>
        <code>$gap: 16px;</code>
      </td>
    </tr>
    <tr>
      <td><code>sass:functions</code></td>
      <td>
        <code>@function tone() {}</code>
      </td>
    </tr>
    <tr>
      <td><code>sass:mixins</code></td>
      <td>
        <code>@mixin surface {}</code>
      </td>
    </tr>
    <tr>
      <td><code>sass:include-statements</code></td>
      <td>
        <code>@include surface;</code>
      </td>
    </tr>
    <tr>
      <td><code>sass:include-blocks</code></td>
      <td>
        <code>@include tablet {}</code>
      </td>
    </tr>
    <tr>
      <td><code>sass:includes</code></td>
      <td>
        Both <code>@include surface;</code> and <code>@include tablet {}</code> <br />
        <small>
          If you list a separate category for statements or blocks, it takes priority for that form.
          See <a href="#matchers-and-equal-ranks">Matcher priority</a> below.
        </small>
      </td>
    </tr>
    <tr>
      <td><code>sass:diagnostics</code></td>
      <td>
        <code>@debug $gap;</code><br />
        <code>@warn 'Missing size';</code><br />
        <code>@error 'Invalid size';</code>
      </td>
    </tr>
    <tr>
      <td><code>sass:placeholders</code></td>
      <td>
        <code>%surface {}</code>
      </td>
    </tr>
    <tr>
      <td><code>custom-properties</code></td>
      <td>
        <code>--gap: 16px;</code>
      </td>
    </tr>
    <tr>
      <td><code>declarations</code></td>
      <td>
        <code>gap: 16px;</code>
      </td>
    </tr>
    <tr>
      <td><code>css:media</code></td>
      <td>
        <code>@media (hover: hover) {}</code>
      </td>
    </tr>
    <tr>
      <td><code>css:container</code></td>
      <td>
        <code>@container (width &gt; 480px) {}</code>
      </td>
    </tr>
    <tr>
      <td><code>at-rules</code></td>
      <td>
        <code>@supports (display: grid) {}</code> <br />
        <small>
          If you list a more specific category, such as <code>css:media</code> for <code>@media</code>,
          it takes priority for those at-rules.
          See <a href="#matchers-and-equal-ranks">Matcher priority</a> below.
        </small>
      </td>
    </tr>
    <tr>
      <td><code>rules</code></td>
      <td>
        <code>img {}</code><br />
        <code>&gt; img {}</code><br />
        <code>.another-block {}</code><br />
        <small>Here all three selectors are nested inside <code>.card</code>.</small>
      </td>
    </tr>
    <tr>
      <td><code>base</code></td>
      <td>
        <code>.card {}</code>
      </td>
    </tr>
    <tr>
      <td><code>pseudo-classes</code></td>
      <td>
        <code>.card:hover {}</code>, <code>.card:hover::before {}</code>
      </td>
    </tr>
    <tr>
      <td><code>pseudo-classes:pseudo-element</code></td>
      <td>
        <code>.card::before:hover {}</code>, <code>.card:hover::before:active {}</code><br />
        <small>
          Use this category to give states on the pseudo-element their own position.
          See <a href="#pseudo-element-variants">Pseudo-element variants</a>.
        </small>
      </td>
    </tr>
    <tr>
      <td><code>modifiers</code></td>
      <td>
        <code>.card--compact {}</code>
      </td>
    </tr>
    <tr>
      <td><code>qualifiers</code></td>
      <td>
        <code>.card.is-selected {}</code>, <code>.card[aria-busy] {}</code>,
        <code>article.card {}</code>, <code>.card#featured {}</code><br />
        <small>
          An extra class, attribute, type or ID on the same element.
          If you list a more specific qualifier category, it takes priority.<br />
          If a selector matches two specific qualifier categories, the first one in <code>order</code> wins.
          For example, <code>.card.is-selected[aria-busy]</code> matches both
          <code>qualifiers:class</code> and <code>qualifiers:attribute</code>.
        </small>
      </td>
    </tr>
    <tr>
      <td><code>qualifiers:class</code></td>
      <td>
        <code>.card.is-selected {}</code>
      </td>
    </tr>
    <tr>
      <td><code>qualifiers:attribute</code></td>
      <td>
        <code>.card[aria-busy] {}</code>
      </td>
    </tr>
    <tr>
      <td><code>qualifiers:type</code></td>
      <td>
        <code>a.button {}</code>, <code>button.button {}</code>
      </td>
    </tr>
    <tr>
      <td><code>context:internal</code></td>
      <td>
        <code>.card--compact .card__title {}</code><br />
        <small>
          The styles of a BEM entity can depend on another entity in the same block. <br />
          Here, the title looks different when the card is compact.
        </small>
      </td>
    </tr>
    <tr>
      <td><code>context:external</code></td>
      <td>
        <code>.sidebar .card__title {}</code><br />
        <small>
          The styles of a BEM entity can depend on an element outside its block. <br />
          Here, the title looks different when the card is in a sidebar.
        </small>
      </td>
    </tr>
    <tr>
      <td><code>pseudo-elements</code></td>
      <td>
        <code>.card::before {}</code>
      </td>
    </tr>
    <tr>
      <td><code>elements</code></td>
      <td>
        <code>.card__title {}</code>
      </td>
    </tr>
    <tr>
      <td><code>css:functions</code></td>
      <td>
        <code>@function --tone() { result: red; }</code>
      </td>
    </tr>
    <tr>
      <td><code>css:mixins</code></td>
      <td>
        <code>@mixin --surface {}</code>
      </td>
    </tr>

</tbody>
</table>

<!-- eslint-enable markdown/no-html -->

::: info Attention
The categories in `order` define the overall structure of your styles.
Move `pseudo-classes` in `order` to place the whole category before modifiers or after queries.
To put `:focus-visible` before `:hover` within that category, use [`categories`][categories-option].
Items left out of `order` follow [`unspecified`][unspecified-option].
:::

---

#### Named groups

You can define a named group when you want related rules to have their own place in `order`.
For example, you might keep native and class-based validation states together,
or group breakpoint mixins with media queries.

::: code-group

```js [Validation states]
{
  // Explicit matchers take priority even when
  // a built-in category comes first in `order`.
  order: ['pseudo-classes', 'qualifiers:class', 'group:validation'],
  groups: {
    validation: [
      // `&:invalid` goes here. `&:hover` stays in `pseudo-classes`.
      { type: 'rule', relativeSelector: '&:invalid' },
      // `&.is-invalid` goes here. `&.is-active` stays in `qualifiers:class`.
      { type: 'rule', relativeSelector: '&.is-invalid' },
    ],
  },
}
```

```js [Breakpoints]
{
  // Block includes like `@include theme.dark {}` stay in `sass:include-blocks`.
  // Calls to `layout.from(...)` are the exception.
  order: ['sass:include-blocks', 'declarations', 'group:breakpoints'],
  groups: {
    breakpoints: [
      // `@include layout.from(768px) {}` goes here, after `declarations`.
      { type: 'at-rule', name: 'include', parameter: /^layout\.from\(/u },
      // All `@media` queries follow those calls in `group:breakpoints`.
      'css:media',
    ],
  },
}
```

:::

See [`groups`][groups-option] for more ways to define and reuse a group.

---

#### Object matchers

If you need an exception in just one place, put the matcher directly in `order`
or `root.order`. You can give a selector, an at-rule, or a few CSS properties
their own position in the list.

```js
{
  order: [
    // Put `display` and `gap` before the other declarations.
    // The object matcher takes precedence,
    // so `declarations` excludes these properties.
    { properties: ['display', 'gap'] },
    'declarations',

    // Match this selector exactly as written.
    { type: 'rule', selector: '&:hover' },
    // Match this state on any BEM entity, including nested `&:focus-visible`.
    { type: 'rule', relativeSelector: '&:focus-visible' },
    'pseudo-classes',

    // Put `@media print` after the other media queries.
    'css:media',
    { type: 'at-rule', name: 'media', parameter: 'print' },
  ],
}
```

---

##### Properties {#property-groups}

Use `properties` matcher when a few declarations should appear together.

- The position of the object in `order` sets where the group goes.
- Within the group, properties follow the order you list them in.

::: code-group

```js [Plain property names]
{
  order: [
    {
      properties: [
        'display',           // First.
        'gap',               // Second.
        ['width', 'height'], // Both follow gap, in any order.
      ],
    },
    'declarations', // All other ordinary properties come last.
  ],
}
```

```js [Regular expression with sorting]
{
  order: [
    {
      // Keep all grid-* properties between display and gap.
      properties: ['display', /^grid-/u, 'gap'],
      // Alphabetize the matches, e.g. grid-auto-flow before grid-template-rows.
      sort: { by: 'name' },
    },
    'declarations',
  ],
}
```

:::

The second tab shows how to sort properties by name. \
For more ways to sort, see
[Sorting presets][sorting-presets] and [Custom sorters][custom-sorting] below.

---

##### At-rules

Use `type: 'at-rule'` when a directive needs its own place in `order`.

::: code-group

```js line-hints [Reduced motion after breakpoints]
{
  order: [
    // This entry gives matching `@media` rules their own position in `order`.
    // An object matcher takes precedence over categories explained above.
    // You can think of it as excluding matching at-rules
    // from generic categories like `at-rules` or `css:media`.
    {
      type: 'at-rule',
      // [!hint] Write the name without `@`. \
      // String `'media'` for a `@media` at-rule.
      name: 'media',
      // [!hint] A single regular expression matches **all** media queries starting with `(min-width:`.
      parameter: /^\(min-width:/u,
      // [!hint] Put `768px` before `1024px`.
      sort: { by: 'dimension' },
    },
    // Other media queries go here.
    'css:media',
    // If present, the reduced-motion query comes last.
    {
      type: 'at-rule',
      name: 'media',
      // [!hint] A string matches the entire media query. Both rules below match
      // because spacing inside the parentheses and around the colon is optional.
      //
      // ```css
      // @media ( prefers-reduced-motion: reduce ) {}
      // @media (prefers-reduced-motion:reduce) {}
      // ```
      parameter: '(prefers-reduced-motion: reduce)',
    },
  ],
}
```

```js line-hints [Theme overrides after declarations]
{
  order: [
    // [!hint] Calls such as `@include theme.surface;` go here.
    'sass:includes',
    'declarations',
    {
      type: 'at-rule',
      name: 'include',
      // [!hint] Any mixin from the `theme` module.
      parameter: /^theme\./u,
      // [!hint] Use `hasBlock` to select one form of the mixin call.
      //
      // - `true` matches a **content block**, e.g. `@include theme.surface { ... }`.
      // - `false` matches a **statement**, e.g. `@include theme.surface;`.
      //
      // Omit `hasBlock` to match both forms.
      hasBlock: true,
    },
  ],
}
```

:::

The first tab sorts matching `@media` queries by breakpoint width. \
For other ways to order matches, see
[Sorting presets][sorting-presets] and [Custom sorters][custom-sorting].

---

##### Rules

Use `type: 'rule'` to give style rules their own place in `order`.

###### Relative selectors {#authored-and-relative-selectors}

Use `relativeSelector` to give a state the same position across blocks, elements,
and modifiers. The rule **resolves nesting, then replaces the BEM entity's class
with `&`.**

```js
{
  order: [
    // This matcher puts `:focus` before other pseudo-classes,
    // regardless of nesting or spelling.
    { type: 'rule', relativeSelector: '&:focus' },

    // Match relative selectors starting with `&:is(`, `&:has(`, or `&:not(`.
    // For example, `.card:has(img)` becomes `&:has(img)`.
    { type: 'rule', relativeSelector: /^&:(?:is|has|not)\(/u },
    'pseudo-classes',
  ],
}
```

```scss{14,17,21}
// In the matcher, `&` stands for the modifier class `.card--compact`.
// The full selector `.card--compact:focus` therefore matches `&:focus`.
.card--compact:focus {}

// All the focus rules below match `&:focus`.
// For each match, `&` in the config represents
// the BEM class that owns the focus state.
.card:focus {}
.card__title:focus {}

.card {
  $b: #{&};

  &:focus {}

  &__title {
    &:focus {}
  }

  @at-root {
    #{$b}:focus {} // Resolves to .card:focus.
  }
}
```

---

###### Authored selectors

Use `selector` when the spelling in the file matters. \
The rule **matches the
selector exactly as written**, before resolving nesting.

```js
{
  order: [
    // Put states written exactly as `&:focus` first in any component.
    { type: 'rule', selector: '&:focus' },

    // Then match the remaining selectors that start with a literal `&:`.
    { type: 'rule', selector: /^&:/u },
    'pseudo-classes',
  ],
}
```

```scss{7,8}
// Neither matcher applies here. `selector` reads the text as written.
// Both flat rules stay in `pseudo-classes`.
.card:hover {} // [!code error]
.card:focus {} // [!code error]

.card {
  &:focus {} // The exact `&:focus` matcher puts this state first.
  &:hover {} // The `/^&:/u` matcher puts this state second.
}
```

---

###### `selector` or `relativeSelector`

Green lines show which rules each `type: 'rule'` matcher selects.

<div class="bem-order-selector-comparison">
<div>

**`relativeSelector: '&:focus'`**

```css
.card__link:focus {} /* [!code ++] */
.menu__item:focus {} /* [!code ++] */
.menu__item:hover {}
button:focus {} /* No BEM class. */
```

```scss
.card:focus { // [!code ++:2]
  & {} // Inherits :focus.
}

.card {
  &:focus {} // [!code ++]
}

.sidebar .card {
  &:focus {} // .sidebar &:focus
}
```

</div>
<div>

**`selector: '&:focus'`**

```css
.card__link:focus {}
.menu__item:focus {}
.menu__item:hover {}
button:focus {}
```

```scss
.card:focus {
  & {}
}

.card {
  &:focus {} // [!code ++]
}

.sidebar .card { // Parent ignored.
  &:focus {} // [!code ++]
}
```

</div>
</div>

---

###### Selector sets {#selector-sets}

A button might have one hover rule, one focus rule, and a third rule for styles
the two states share. Give that third rule its own position with `selectorSet`.

The rule must satisfy every constraint in the matcher.

::: code-group

```js{5-9} line-hints [Configuration]
{
  order: [
    'base',
    'pseudo-classes',
    {
      type: 'rule',
      selector: /^\.button:/u, // optional
      // [!hint] Use it by itself or alongside `selector` or `relativeSelector`.
      selectorSet: { equals: [':hover', ':focus-visible'] },
    },
  ],
}
```

```scss [Valid CSS example]

.button {}
.button:hover {}
.button:hover, .button:focus-visible {}
```

:::

`selectorSet` matches a selector list by which branches it contains, how many distinct branches it has, or both.

- `equals` matches exactly the listed local branches in any order. Use it on its own.

  ```js
  selectorSet: { equals: [':hover', ':focus'] }, // &:focus, &:hover
  ```

- `includes` requires every listed local branch and allows others. \
  Use `size` or range bounds to limit the total.

  ```js
  selectorSet: { includes: [':hover'] }, // &:hover, &:active
  ```

- `size` matches an exact number of **distinct** branches.

  ```js
  selectorSet: { size: 1 }, // h1, h1
  selectorSet: { size: 3 }, // h1, h2, h3
  ```

- `minSize` and `maxSize` set inclusive lower and upper bounds on the number of **distinct** branches.
  Use either bound or both.

  ```js
  selectorSet: { minSize: 3, maxSize: 4 }, // h1, h2, h3
  selectorSet: { minSize: 3, maxSize: 4 }, // h1, h2, h3, h4
  ```

Write local branches without `&`.

::: info Info
This moves the **whole rule**. To change the order on either side of the comma,
use [`selectorList`][selector-list].
:::

---

###### Sorting matched rules

Use `sort` on a rule matcher to order matching siblings. \
Here the matcher
sorts the heading rules by name, from `h1` to `h6`.

```js{6}
{
  order: [
    {
      type: 'rule',
      selector: /^h[1-6]$/u,
      sort: { by: 'name' },
    },
  ],
}
```

<div class="bem-order-selector-comparison">
<div>

**Before autofix**

```scss
.wysiwyg-content {
  h3 {}
  h1 {}
  h5 {}
  h2 {}
  h6 {}
  h4 {}
}
```

</div>
<div>

**After autofix**

```scss
.wysiwyg-content {
  h1 {}
  h2 {}
  h3 {}
  h4 {}
  h5 {}
  h6 {}
}
```

</div>
</div>

See [Sorting][sorting] for presets and custom sorters.

---

##### Wildcard placement

Unlisted items come last by default (you can change it with [`unspecified` setting][unspecified-option]). \
To give them a different position, place `'*'` where you want them. Explicit matchers on either side take precedence.

```js{8,14}
{
  order: [
    // Put `display` first and `z-index` last among ordinary CSS properties.
    // Here '*' matches ONLY ordinary properties, such as `color` and `opacity`.
    {
      properties: [
        'display',
        '*',
        'z-index',
      ]
    },
    // In the outer scope, '*' matches anything the other entries leave out.
    // Here that includes custom properties, Sass variables, mixin calls, etc.
    '*',
    // Media queries come after everything else.
    // Use this order to keep responsive overrides at the end of the block.
    'css:media',
  ],
}
```

**Key points**

- Inside a category, `'*'` matches the remaining members of that category.
- Without `'*'`, the list's [`unspecified` setting][unspecified-option] places unlisted items
  first (`'top'`), last (`'bottom'`), or in their original slots (`'ignore'`).
  All three preserve the relative order of those items.
- With `'*'`, you can place the remaining items between two entries and apply the category's
  sorter to them. To see which items that includes, check the explicit entries on both sides.

---

#### Matcher priority {#matchers-and-equal-ranks}

Read each example from top to bottom. In `order` and `root.order`,
**a more specific object matcher wins wherever you list it**.
The winning matcher's position determines where the item goes.
A matcher from a [named group][groups-option] competes the same way.

If no object matches, the rule checks the configured categories, then `'*'`.
If none matches, the item follows [`unspecified`][unspecified-option].

**A CSS property** (`display: grid;`)

```text
{ properties: ['display'] }
↓
{ properties: [/^dis/u] }
↓
{ properties: ['*'] }
↓
'declarations'
↓
'*'
```

**A print media query** (`@media print {}`)

```text
{ type: 'at-rule', name: 'media', parameter: 'print' }
↓
{ type: 'at-rule', name: 'media', parameter: /^print/u }
↓
{ type: 'at-rule', name: 'media' }
↓
{ type: 'at-rule' }
↓
'css:media'
↓
'at-rules'
↓
'*'
```

**A Sass mixin call with a content block** (`@include theme.dark {}`)

```text
{ type: 'at-rule', name: 'include', parameter: 'theme.dark', hasBlock: true }
↓
{ type: 'at-rule', name: 'include', hasBlock: true }
↓
{ type: 'at-rule', name: 'include' }
↓
{ type: 'at-rule' }
↓
'sass:include-blocks'
↓
'sass:includes'
↓
'at-rules'
↓
'*'
```

---

#### Equal priority

Nest entries one level deep in `order` to give them the same priority. \
For a toolbar in a narrow sidebar on a wide screen, both queries below match.

```js
{
  '@morev/bem/order': [true, {
    order: [
      // Base declarations come before either query.
      'declarations',
      // Media and container queries keep their source order.
      ['css:media', 'css:container'],
    ],
  }],
}
```

```scss line-hints
.sidebar { container-type: inline-size; }

.toolbar {
  display: flex;
  gap: 8px; // The base gap comes before both overrides.

  // [!hint] On a wide screen, this sets the gap to `16px`. \
  // A later container query can override it.
  @media (min-width: 1000px) { gap: 16px; }
  // [!hint] When both queries match, this block comes last and the gap is `4px`.
  // You can swap the two blocks to get `16px` instead. The rule preserves either order.
  @container (max-width: 320px) { gap: 4px; }
}
```

---

#### Pseudo-element variants {#pseudo-element-variants}

Each pseudo-element forms a family within its BEM entity. \
Both `&:hover::before` and `&::before:hover` belong to the `::before` family.

```scss
// This is the default order. You can customize it.

.card {
  // The card's own state comes before its pseudo-element families.
  &:hover {}
  // The `::before` base comes first, followed by its variants.
  &::before {}
  &:hover::before {}
  &:active::before {}
  // States on ::before itself come next.
  &::before:hover {}
  &::before:active {}
  // The `::after` family follows the entire `::before` family.
  &::after {}
  &:hover::after {}
}
```

---

### `groups`

`groups` defines named sequences of built-in categories and matchers.

[Built-in categories] describe the structure of a document in terms of entity types. \
We may also want to order items by **the semantic role** they play in our project.

For example, we might use [custom media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@custom-media)
and want them to appear in a specific order. Or our convention might be to use a custom mixin for media queries
while still allowing plain media queries. In that case, we want to control which set comes first and how queries are sorted within each set.

We can list all these entries directly in `order`, but the configuration can get quite verbose.
When we change it or explain our conventions to someone else, it can be hard to see why we chose this order.

::: details Media query order without groups

```ts{5-8,13,15}
{
  order: [
    'declarations',
    // Custom media queries
    { type: 'at-rule', name: 'media', parameter: '(--phone-small)' },
    { type: 'at-rule', name: 'media', parameter: '(--phone-medium)' },
    { type: 'at-rule', name: 'media', parameter: '(--phone-large)' },
    { type: 'at-rule', name: 'media', parameter: '(--tablet-small)' },
    // ...
    // ...and many, many more items

    // @include layout.from('tablet-small')
    { type: 'at-rule', name: 'include', parameter: /^layout\.from\(/u },
    // Other media queries
    'css:media',
  ],
}
```

:::

To address this, we can define groups with their own internal order and configure
[sorting] within each group and [blank lines][blank-lines] around it. \
Use the `group:` prefix to reference a group in `order` or `root.order`.

```ts{5,6,9,13,21}
{
  // This makes it easy to see the reasoning behind the overall order.
  order: [
    'declarations',
    'group:custom-media-queries',
    'group:other-media-queries',
  ],

  groups: {
    // A group can be an array, just like `order`.
    // It can contain built-in categories, matcher objects,
    // and equal-priority arrays.
    'custom-media-queries': [
      { type: 'at-rule', name: 'media', parameter: '(--phone-small)' },
      { type: 'at-rule', name: 'media', parameter: '(--phone-medium)' },
      { type: 'at-rule', name: 'media', parameter: '(--phone-large)' },
      { type: 'at-rule', name: 'media', parameter: '(--tablet-small)' },
    ],
    // Or it can be an object if we need
    // to set rules for sorting or blank lines.
    'other-media-queries': {
      order: [
        { type: 'at-rule', name: 'include', parameter: /^layout\.from\(/u },
        'css:media',
      ],
      sort: { by: 'dimension', direction: 'asc' },
      blankLines: { before: 'always' },
    },
  },
}
```

---

### `categories`

Use `categories` to customize the order of items in a [built-in category][built-in categories]. \
You can also choose where [unmatched items][unspecified-option] go
and whether to leave [blank lines][blank-lines] before, after, or between items.

```ts{4,9,18,27} line-hints [Configuration]
{
  categories: {
    // Private Sass variables go at the top.
    // [!hint]
    // **Valid SCSS example**
    // ```scss
    // .card {
    //   $_gap: 16px;
    //   $-list-length: 3;
    //   $size: 240px;
    // }
    // ```
    'sass:variables': [
      /^\$[_-]/u,
      '*',
    ],
    // Pseudo-classes appear in the order shown here.
    // [!hint]
    // **Valid SCSS example**
    // ```scss
    // .link:focus, .link:focus-visible {}
    // .link:focus {}
    // .link:focus-visible {}
    // .link:active {}
    // .link:visited {}
    // ```
    'pseudo-classes': [
      { selectorSet: { minSize: 2 } },
      ':focus',
      ':focus-visible',
      ':active',
      '*',
    ],
    // BEM elements are sorted by name,
    // with one blank line between families.
    // [!hint]
    // **Valid SCSS example**
    // ```scss
    // .card__a {}
    // .card__a:hover {}
    //
    // .card__b {}
    //
    // .card__c {}
    // ```
    'elements': {
      sort: { by: 'name' },
      blankLines: { between: 'always' },
    },
    // Custom media queries come first.
    // The remaining breakpoints are grouped by unit (px first, then em)
    // and sorted from smallest to largest within each unit.
    // Leave one blank line before the first query and between queries,
    // with none after the last.
    // [!hint]
    // **Valid SCSS example**
    // ```scss
    // .card {
    //   color: red;
    //
    //   @media (--tablet-small) {}
    //
    //   @media (width >= 1024px) {}
    //
    //   @media (width >= 1280px) {}
    // }
    // ```
    'css:media': {
      order: [/^\(--/u, '*'],
      sort: { by: 'dimension', units: ['px', 'em'] },
      blankLines: {
        before: 'always',
        between: 'always',
        after: 'never',
      },
    },
  },
}
```

You can combine these options however you like. Use just the ones you need.
See the sections on [sorting], [placement of unmatched items][unspecified-option],
and [blank lines][blank-lines] for details.

#### Matching items within a category

- For ordinary properties, use their [comparison names][canonical comparison names]. \
  Keep the case and prefix of custom properties and Sass variables.

  ```js
  'declarations': ['appearance', '*'],    // -webkit-appearance: none;
  'custom-properties': ['--Accent', '*'], // --Accent: blue;
  'sass:variables': ['$gap', '*'],        // $gap: 8px;
  ```

- For functions and mixins, use the declared name.

  ```js
  'sass:mixins': ['stack', '*'],          // @mixin stack($gap) {}
  'sass:includes': ['layout.stack', '*'], // @include layout.stack(8px);
  'sass:diagnostics': ['warn', '*'],      // @warn 'Missing size';
  ```

- In `css:media` and `css:container`, a string matches the full normalized query, including any container name.
  Use a regular expression to match just part of it.

  ```js
  'css:media': ['(--phone)', '*'],       // @media ( --phone ) {}
  'css:container': [/^sidebar\s/u, '*'], // @container sidebar (width > 40em) {}
  ```

- In `qualifiers`, use the extra class, attribute, type, or ID.

  ```js
  qualifiers: [
    '[aria-busy]', // &[aria-busy]
    /\[data-/u,    // &[data-size] or &[data-theme]
    '*',
  ],
  ```

- To give a comma-separated rule its own place, use a [selector set][selector-sets].

  ```js
  'pseudo-classes': [
    ':hover',                                  // &:hover
    { selectorSet: { includes: [':hover'] } }, // &:hover, &:focus
    '*',
  ],
  ```

---

### `unspecified`

Controls where items go when they match no entry in the configured order.

Suppose we want `display` to come before `z-index`.

```js [Configuration]
{
  categories: {
    declarations: {
      // Only these two properties have an explicit priority.
      order: ['display', 'z-index'],
      // Without '*', `unspecified` handles the remaining declarations.
      unspecified: 'ignore',
    },
  },
}
```

Now consider this CSS.

```scss
.card {
  z-index: 100;
  color: red;
  border-width: 1px;
  display: flex;
  transition: opacity .2s;
}
```

What should autofix do with `color`, `border-width`, and `transition`?

You can choose one of three values for `unspecified`.

- `'bottom'` (the default) collects unlisted items below the ones you named.
- `'top'` collects them above. In both cases they keep their relative order.
- `'ignore'` leaves each unlisted item in its slot. Listed items switch places **around** it.

::: code-group

```scss{6,9} [Original CSS]
// The original CSS before applying the rule.

// Here the declarations appear in no particular order.
// We want `display` to come before `z-index`.
.card {
  z-index: 100;
  color: red;
  border-width: 1px;
  display: flex;
  transition: opacity .2s;
}
```

```scss{6,7} [bottom]
// { order: ['display', 'z-index'], unspecified: 'bottom' }

// Unlisted declarations move to the bottom of the block.
// They keep their original order.
.card {
  display: flex;
  z-index: 100;
  color: red;
  border-width: 1px;
  transition: opacity .2s;
}
```

```scss{9,10} [top]
// { order: ['display', 'z-index'], unspecified: 'top' }

// Unlisted declarations move to the top of the block.
// They keep their original order.
.card {
  color: red;
  border-width: 1px;
  transition: opacity .2s;
  display: flex;
  z-index: 100;
}
```

```scss{6,9} [ignore]
// { order: ['display', 'z-index'], unspecified: 'ignore' }

// `display` and `z-index` swap places to follow the configured order.
// The other three declarations stay on the same lines as in the original CSS.
.card {
  display: flex;
  color: red;
  border-width: 1px;
  z-index: 100;
  transition: opacity .2s;
}
```

:::

In all three examples, `color` still comes before `border-width`. \
Even with `sort: { by: 'name' }`, declarations placed by `unspecified` keep their relative order.

Suppose we want the remaining declarations to follow `z-index` in alphabetical order.
Adding the [wildcard] `'*'` after `'z-index'` gives them all the same priority, so the category's [sorter][sorting]
can order them by name.

::: code-group

```js{7,10} [Configuration]
{
  categories: {
    declarations: {
      order: [
        'display',
        'z-index',
        '*', // All remaining declarations share this priority.
      ],
      sort: {
        by: 'name', // Alphabetize border-width, color, and transition.
      },
    },
  },
}
```

```css{4-6} [CSS after autofix]
.card {
  display: flex;
  z-index: 100;
  border-width: 1px;
  color: red;
  transition: opacity .2s;
}
```

:::

---

### `root`

`root` lets you give the stylesheet its own order for whole selector families and at-rules.

If each SCSS file contains a single component and you nest everything inside its selector,
[`order`][order-option] is usually all you need. It controls where declarations, media queries,
states, and elements go inside `.card`. At the top level, `.card` is the only item to place.

In flat CSS, `.card` and `.card:hover` move together as a family. In the diagram below,
`root.order` places the whole family before `@media print`, and `order` puts `.card` before `.card:hover`.

![root.order places families before @media. Within the .card family, order sorts the base, hover state, and title.][order-scopes-image]

In nested SCSS, `root.order` puts the top-level `@media print` after `.card`.
Inside `.card`, `order` puts `@media screen` before `&:hover` and `&__title`.

![root.order places .card before the print query. Inside .card, order places the screen query before its state and element.][scss-scopes]

`root.order` accepts the same entries as [`order`][order-option]. If you omit both,
each level uses its own built-in order. The two levels share [named groups][groups-option]
and [category settings][categories-option].
`root.unspecified` accepts the same values as [`unspecified`][unspecified-option]
and defaults independently to `'bottom'`.
Stylesheet-level grouping rules such as `@layer`, `@supports`, and `@media` also use the
stylesheet order for their contents. Once you enter a selector, its children follow `order`.

#### A few practical examples

:::: details Keep keyframes above component rules and media queries below them

::: code-group

```js [Configuration]
{
  root: {
    order: [
      { type: 'at-rule', name: 'keyframes' },
      'rules',
      'css:media',
    ],
  },
}
```

```css [CSS]
@keyframes fade-in { from { opacity: 0; } }
@keyframes slide-in { from { transform: translateY(8px); } }

.toast { animation: fade-in 150ms, slide-in 150ms; }

@media (prefers-reduced-motion: reduce) {
  .toast { animation: none; }
}
```

:::

::::

:::: details Arrange top-level layer blocks in their declared order

The opening `@layer` statement sets the cascade order. The rule moves the three layer blocks
so you can read them in that same order.

::: code-group

```js [Configuration]
{
  root: {
    order: [
      { type: 'at-rule', name: 'layer', parameter: 'reset' },
      { type: 'at-rule', name: 'layer', parameter: 'components' },
      { type: 'at-rule', name: 'layer', parameter: 'utilities' },
    ],
  },
}
```

```css [CSS]
@layer reset, components, utilities;

@layer reset { * { box-sizing: border-box; } }
@layer components { .button { display: inline-flex; } }
@layer utilities { .hidden { display: none; } }
```

:::

::::

:::: details Put print overrides after other top-level media queries

A printed page can also match the width query. Putting `@media print` last gives the invoice its print layout.

::: code-group

```js [Configuration]
{
  root: {
    order: [
      'css:media',
      { type: 'at-rule', name: 'media', parameter: 'print' },
    ],
    unspecified: 'ignore',
  },
}
```

```scss [SCSS]
@media (min-width: 640px) {
  .invoice { display: grid; }
}

.invoice { // root.unspecified: 'ignore' keeps this block between the queries.
  &__total { font-weight: bold; }
}

@media print {
  .invoice { display: block; }
}
```

:::

::::

---

### `selectorList`

Controls the order of comma-separated selectors within a single rule.

By default the rule moves a comma-separated list as a whole.
If you'd also like the branches to follow your usual
state order, turn on `selectorList`. \
The default for the option itself is `false`.

::: code-group

```ts{2} [Configuration]
{
  selectorList: { order: 'inherit' },
  categories: {
    'pseudo-classes': [':hover', ':focus-visible', '*']
  },
}
```

```scss [Before]
// You can write the selectors in either order.
.button:focus-visible,
.button:hover {
  color: navy;
  text-decoration: underline;
}
```

```scss [After]
// Autofix puts :hover before :focus-visible.
.button:hover,
.button:focus-visible {
  color: navy;
  text-decoration: underline;
}
```

:::

`'inherit'` reuses category priorities when every branch resolves to the same
BEM family and category.

To sort selectors by name, set `selectorList.sort` on its own. For example, when headings
share a style, this puts `h1` before `h2` in the selector list.

::: code-group

```ts{2} [Configuration]
{
  selectorList: { sort: { by: 'name' } },
}
```

```scss [Before]
h2, h1 {
  text-wrap: balance;
}
```

```scss [After]
h1, h2 {
  text-wrap: balance;
}
```

:::

You can also give the list priorities of its own.

::: code-group

```ts{3,4} [Configuration]
{
  selectorList: {
    order: [':hover', [':focus', ':focus-visible'], '*'],
    sort: { by: 'name', direction: 'asc' },
    unspecified: 'ignore',
  },
}
```

```scss [Before]
// :active matches '*'. The two focus states have equal priority.
.button:active,
.button:focus-visible,
.button:hover,
.button:focus {
  color: navy;
}
```

```scss [After]
// :hover comes first, then the focus states in name order, then :active.
.button:hover,
.button:focus,
.button:focus-visible,
.button:active {
  color: navy;
}
```

:::

The [name preset][sorting-presets] is the only sorter available for `selectorList.sort`.

Only complete branches move. Comments, duplicate selectors, and the spacing
of the list are preserved. The rule leaves compounds and commas inside
functions like `:is(...)` alone. \
[Selector sets][selector-sets] control where the whole rule goes.

---

### `separators`

<!-- @include: @/docs/_parts/separators.md -->

## Sorting

`order` assigns priorities to sibling items. `sort` orders items that share a
priority. For example, a dimension sorter can put smaller breakpoints first
while keeping all media queries in the position assigned by `order`.

Categories, named groups, property groups, and matchers for rules and at-rules
accept a built-in preset or a custom sorter. Items placed by
[`unspecified`][unspecified-option] keep their source order. To include the
remaining members in a category's sort, give them a priority with `'*'`.

::: details Sort breakpoint mixins and media queries together

Give the two matchers equal priority in a [named group][groups-option] to sort
all their matches by width.

```js
{
  order: ['declarations', 'group:media-queries'],
  groups: {
    'media-queries': {
      order: [[
        { type: 'at-rule', name: 'include', parameter: /^layout\.from\(/u },
        { type: 'at-rule', name: 'media' },
      ]],
      sort: { by: 'dimension' },
    },
  },
}
```

Here `@media (width >= 640px)` comes before `@include layout.from(960px)`
even when the mixin is written first. With separate priorities, all matching
mixins would come first and each set would be sorted by width independently.

To give every entry in a group the same outer priority, wrap its reference
where you use it, as in `order: ['declarations', ['group:media-queries']]`.
A matcher with its own `sort` uses that sorter in place of the group's.

:::

### Sorting presets {#sorting-presets}

Alphabetize element names with `elements: { sort: { by: 'name' } }`.
For `.card__title-icon`, the name being compared is `title-icon`.
Set `direction: 'desc'` for reverse order. Name comparison is case-sensitive
and gives the same result regardless of the machine's language settings.

For mobile-first styles, sort media queries by their numeric breakpoint.
This example leaves `print` in place while sorting the widths around it.

::: code-group

```js [Configuration]
{
  categories: {
    'css:media': { sort: { by: 'dimension' } },
  },
}
```

```scss [Before]
@media (min-width: 960px) {}
@media print {}
@media (min-width: 640px) {}
```

```scss [After]
@media (min-width: 640px) {}
@media print {}
@media (min-width: 960px) {}
```

:::

The sorter compares values with the same unit. It never assumes a conversion
between `vw` and `px`. Without `units`, each unit keeps its slots, so
`40px, 2vw, 16px, 1vw` becomes `16px, 1vw, 40px, 2vw`.
To group all `vw` values before all `px` values, set `units: ['vw', 'px']`.
The same input then becomes `1vw, 2vw, 16px, 40px`. Descending order reverses
the numbers within each unit. Ties keep their source order.

::: details Which values can the dimension sorter read?

It looks for **one literal number with a unit** in an at-rule's parameters or a
declaration's value. That can be a width, duration, angle, or resolution.
`(width >= 640px) and (hover: hover)`, `sidebar (width >= 640px)`, and
`@include respond(640px)` each have a single value it can use.

A range with two bounds, alternative or negated queries, an extra numeric
literal, a unitless number, or a value inside `calc()` gives no single size
to sort by. The rule also leaves Sass variables and custom media names
unresolved. With an explicit `units` list, unlisted units are unresolved too.
Unit names are case-insensitive. An empty `units` list works like omitting it.

`unresolved` defaults to `'ignore'`, which keeps those items in their slots.
Choose `'top'` or `'bottom'` to collect them at either end of the **current
priority**. To put `print` in a specific place, give it an entry in `order`.
For declarations, [cascade dependencies][canonical comparison names] still apply.
If keeping a dependency would displace a unit from its slots, the rule can
leave the whole batch in source order.

:::

### Custom sorters {#custom-sorting}

Suppose short element names should come first, then names of the same length
should appear alphabetically. Use the built-in name comparison for the tie
and add just the comparison that's specific to your project.

```js
{
  categories: {
    elements: {
      sort(items, context) {
        const byName = context.sort(items, { by: 'name' });
        return byName.toSorted((a, b) => a.name.length - b.name.length);
      },
    },
  },
}
```

For `.card__title`, `.card__icon`, and `.card__body`, this gives `body`, `icon`,
then `title`. Each element moves with its own states and modifiers.
The callback runs on siblings with equal priority. It can't move a title out
of its card or reorder entries that you gave different priorities.

::: details What does the callback receive?

- `items` contains read-only descriptions in source order. Each has `type`,
  `name`, `category`, and `sourceIndex`. A family also has its full `key`.
  Depending on the type, you can read `selector`, `parameter`, `hasBlock`,
  or a declaration's `value`. In the generic `at-rules` category the name is
  the directive, such as `include`. In `sass:includes` it's the called mixin.
- `context.container` describes the actual root, selector, or at-rule.
  `context.family` gives the BEM owner path, even in flat CSS. `context.category`
  and, for a named group, `context.group` tell you what's being sorted.
- `context.sort(items, preset)` applies a built-in sorter. You can pass a
  subset if your project needs a separate comparison for some items.

Return each original item exactly once. Keep the callback synchronous and
make sure a second sort produces the same order. The inputs are frozen.
If a callback throws or returns an invalid result, the rule reports a
configuration warning before applying any fixes to the stylesheet.

For a TypeScript config, the package exports `OrderSorter`, `OrderSortContext`,
`OrderSortItem`, and `OrderSortPreset`.

:::

## Blank lines {#group-spacing}

Use `blankLines` to control the gaps around a run of matching items and between its members.
Set it on a rule, at-rule, or property matcher, on a category or named group,
or on [unmatched items][unspecified-option] with `position` set to `'top'` or `'bottom'`.

For example, to separate print styles from the other media queries inside a component,
put the print matcher last and give it a blank line before its first match.

```js
{
  order: [
    'css:media',
    { type: 'at-rule', name: 'media', parameter: 'print', blankLines: { before: 'always' } },
  ],
}
```

A few related custom properties read well together. When a palette grows,
a gap can make the first property that *uses* it easier to spot. This example
adds the gap only when there are at least two custom properties above `color`.

::: code-group

```js [Configuration]
{
  order: [
    'custom-properties',
    {
      properties: ['color'],
      blankLines: {
        before: {
          rules: [{
            when: { minItems: 2, scope: 'previous-group' },
            mode: 'always',
          }],
        },
      },
    },
  ],
}
```

```scss [Result]
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

:::

For an unconditional gap, just use `blankLines: { before: 'always' }`.
Use `after` for the end of a consecutive group and `between` for its members.
`'always'` requires at least one empty line, `'never'` removes empty lines,
and `'ignore'` keeps the existing gap. These policies also apply when everything
is already in order.

Set [`label`][diagnostic-labels] on the matcher or group to give it a name such as
`Print styles` in spacing diagnostics.

::: details Keep small blocks compact or let a comment separate groups

Use `{ rules, default }` for any of the three gaps. The first matching rule wins.
When none matches, the default is `'ignore'` unless you set it explicitly.
For example, this policy leaves a small block alone, accepts a standalone
comment as a separator, and otherwise requires a blank line.

```js
{
  before: {
    default: 'always',
    rules: [
      { when: 'first-nested', mode: 'never' },
      { when: { maxItems: 4, scope: 'container' }, mode: 'ignore' },
      { when: 'separated-by-comment', mode: 'ignore' },
    ],
  },
}
```

- `first-nested` and `last-nested` test the item's position inside the
  final block. `inside-single-line-block` checks whether the whole block
  still fits on one line after the rule applies its changes.
- `separated-by-comment` matches a leading comment on its own line.
  A comment at the end of a declaration stays with that declaration.
  A comment directly above the next one follows it. Any required gap goes
  between those two, so it doesn't detach either comment.
- `minItems` and `maxItems` include the stated count. The default `scope` is
  `'group'`. Use `'container'` for all direct items, or `'previous-group'` and
  `'next-group'` for the neighboring runs in the final order. Counts skip
  comments and the contents of nested blocks. An absent neighbor never matches,
  even for `maxItems`.
- Combine conditions with `{ any: [...] }`, `{ all: [...] }`, or
  `{ not: condition }`. Counts take nonnegative integers. Give each `rules`,
  `any`, or `all` list at least one entry.

:::

::: details When two settings describe the same gap

Between two groups, `before` on the following group wins over `after` on the
preceding one. This also applies when `before` resolves to `'ignore'`.
Leave `before` out to let the preceding group decide. Inside one group, use
`between`. At the start or end of a nested block, `before` and `after` can
control the gap next to the brace. File-leading and file-trailing whitespace
stays as written.

A category's settings cover a run of its members even if they have different
priorities. A matcher, named group, or `unspecified` policy can override the category
at a particular gap. For example, a group can keep its members together with
`between: 'never'` while a rule matcher inside it sets `before: 'always'` for focus states.
Between whole BEM families, the parent decides. Each family's own settings control gaps inside it.

Group counts use consecutive members at that level, regardless of existing
blank lines. For example, `width`, `height`, and `color` can count as three
declarations. Giving just `width` and `height` a property group makes that
group count as two. A container count includes its direct items on both
sides of a sorting boundary.

If a gap expands a nested block, that block and its ancestors count as
multiline. A policy that requires a gap *only* while the block is on one line
can invalidate its own result. The rule reports that configuration.

:::

## Diagnostics

An ordering warning points to the first item in a consecutive run that needs to
move. For example, three adjacent states that belong above a modifier can move
together, so one message can cover all three. With `unspecified: 'ignore'`,
warnings describe the items you've asked to order.

### Diagnostic labels

Use `label` to give a matcher a readable name in Stylelint messages.
In this example, `name: 'media'` selects the directive and `parameter: 'print'`
selects the query. The warning calls it “Print styles”.

```js
{
  order: [
    { properties: ['display', 'gap'], label: 'Layout' },
    { type: 'at-rule', name: 'media', parameter: 'print', label: 'Print styles' },
  ],
}
```

```css
.card {
  @media print {}
  display: grid;
}
```

Stylelint highlights `display` and uses the configured labels on both sides.

```text
Expected "Layout" to come before "Print styles". (@morev/bem/order)
```

Rule and at-rule matchers, property groups, and selector sets all accept
`label`. Use it on a matcher in [`order`][order-option] or in the
[`root` configuration][root-option], or set a shared label on the object form
of a named group, category, or `unspecified` policy. A matcher's own label
takes precedence over its group's or category's label. Without a label,
Stylelint uses the source text. When labels repeat, the warning can include a
value or source location to help you find the right item.

In [spacing messages][blank-lines], a label on the group that requests the
blank line names that group. Selector-list and cascade warnings keep the
authored selectors and property names alongside their labels.

## Autofix boundaries {#regions-and-autofix-boundaries}

::: warning Autofix changes source order
Although I've built safeguards into autofix, static analysis can't guarantee that every fix is safe.
Autofix keeps code in its original scope and preserves the order of
known overlapping properties, fallbacks, and vendor-prefixed variants. It also avoids moving code across
Sass control flow or content insertion points.

If two selectors match the same element, moving one can change which style wins. \
**Review the diff before accepting fixes in an existing stylesheet.**
:::


Autofix keeps each rule inside the braces where you wrote it. A media query can
move as a whole. Its contents can also change order, but a selector inside it
stays inside it. A standalone section comment works like a divider, too.

```scss
.card {
  &:hover {}
  &:focus-visible {}

  // Print styles

  @media print {}
}
```

The blank line **after** the comment makes it a section divider. Remove that
line and the comment belongs to the media query and travels with it. A comment
at the end of a line follows the preceding item. Existing gaps are otherwise
preserved unless you set [`blankLines`][blank-lines].

::: details Why did this rule stay in place?

- **Stylesheet directives.** `@charset`, `@import`, `@namespace`, and
  statement-form `@layer` declarations stay where they were written, even if
  `order` would put them elsewhere. Keep the [namespace][namespace-placement]
  and [layer][layer-statements] declarations in the order the stylesheet needs.
- **Sass execution.** Module directives such as `@use` and `@forward` divide
  the enclosing block, as do control-flow directives such as `@if`. The rule
  can still sort content on either side and inside mixins and control-flow blocks.
- **Sass `@at-root`.** Inline qualifiers follow the same order as sibling
  selectors. For example, if `$b` is `.button`, `@at-root a#{$b} {}` matches
  `qualifiers:type` and `@at-root #{$b}.is-loading {}` matches `qualifiers:class`.
  Sass variable assignments keep their position relative to these directives.
  Other forms, including `@at-root { ... }` and `@at-root (without: media)`,
  divide the enclosing block. Their contents can still be sorted.
- **Definitions and insertion points.** A stylesheet-level `@function` or
  `@mixin` can move as a whole. A nested definition is a boundary.
  The rule leaves function bodies and keyframe contents alone.
  `@content` and `@contents` stay in place, as do wrappers around them up to
  the nearest definition. The definition itself can still move at stylesheet level.
- **Ambiguous selectors.** The most specific BEM entity in the rightmost
  compound identifies the owner. If several are possible, the rule looks for
  a single one with an unambiguous declaration elsewhere in the stylesheet.
  Classes inside function arguments never supply the owner. If the owner
  remains unclear, interpolation can't be resolved, or list branches mix
  incompatible BEM families or BEM and ordinary selectors, the rule stays put.
- **Stylelint directives.** Disabled ranges and nodes containing a Stylelint
  directive divide the file into regions. Neither ordering nor spacing fixes
  cross these boundaries.

:::

Autofix aims to move as few source items as possible, then as few consecutive
runs as possible.

### Property dependencies {#property-names-and-cascade}

The order of `margin` and `margin-top` can change what you see on screen.
An alphabetical sorter keeps their relative order in both of these rules.

```scss
.card {
  margin: 32px;
  margin-top: 16px;
}

.badge {
  margin-top: 16px;
  margin: 32px;
}
```

Other independent properties can still move around the pair. If explicit
priorities or a callback require the pair to switch places, the rule reports
the conflict and skips the ordering and spacing fixes in that region.
Other regions can still be fixed.

::: details Which property names and relationships does the rule recognize?

Ordinary property names are compared in lowercase, without known vendor
prefixes (`-webkit-`, `-moz-`, `-ms-`, `-o-`, `-khtml-`, and `-epub-`).
A group for `gap` also matches `grid-gap`. The other recognized aliases are
`grid-row-gap` for `row-gap`, `grid-column-gap` for `column-gap`,
`word-wrap` for `overflow-wrap`, and `font-stretch` for `font-width`.
Legacy properties that need a value translation, such as `page-break-before`,
keep their own names. The rule preserves the authored names and values.

Known dependencies include repeated properties, fallbacks, prefixed variants,
shorthands and their longhands, and resets such as `border` resetting
`border-image`. Logical and physical properties can overlap depending on the
writing mode. `all` also constrains ordinary properties except `direction`
and `unicode-bidi`. The rule preserves the source order of dependent pairs,
including a prefixed and an unprefixed version of the same property.

:::

::: warning Review changes across nested selectors
These checks compare declarations inside the same container. A nested `&` can
target the same card from a second container.

```scss
.card {
  color: red;
  & { color: blue; }
  color: green;
}
```

The card is green as written. Moving the last declaration above `&` makes it
blue. Autofix can make that move. Review the diff when nested selectors style
the same element, or when a mixin supplies styles that a later rule overrides.
:::

## Acknowledgments

The matcher objects follow the conventions of [`order/order`][stylelint-order].
The checks for overlapping properties draw on [Stylelint][stylelint] property data.

[blank-lines]: #group-spacing
[built-in categories]: #built-in-categories
[canonical comparison names]: #property-names-and-cascade
[categories-option]: #categories
[custom-sorting]: #custom-sorting
[diagnostic-labels]: #diagnostic-labels
[groups-option]: #groups
[layer-statements]: https://www.w3.org/TR/css-cascade-5/#layer-statements
[named groups]: #named-groups
[namespace-placement]: https://www.w3.org/TR/css-namespaces-3/#syntax
[object matchers]: #object-matchers
[order-option]: #order
[order-scopes-image]: /images/bem-order-scopes.svg
[root-option]: #root
[scss-scopes]: /images/bem-order-scopes-scss.svg
[selector-list]: #selectorlist
[selector-sets]: #selector-sets
[sorting-presets]: #sorting-presets
[sorting]: #sorting
[stylelint-order]: https://github.com/hudochenkov/stylelint-order/blob/master/rules/order/README.md
[stylelint]: https://github.com/stylelint/stylelint
[unspecified-option]: #unspecified
[wildcard]: #wildcard-placement
