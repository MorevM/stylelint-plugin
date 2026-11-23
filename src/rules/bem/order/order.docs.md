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

Any options you leave out keep their defaults. \
An `order` array replaces the default sequence for its scope.

::: details Full default configuration

```ts
{
  '@morev/bem/order': [true, {
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
      // List shared states like :hover and :focus...
      'pseudo-classes',
      // ...then show the variants named by BEM modifiers.
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

    // If you omit 'at-rules' from this order, a nested @supports goes last.
    unspecified: 'bottom',

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
    // Name sets of matchers to reuse as `group:name` in either order.
    groups: {},
    // Move each rule as a whole and keep comma-separated selectors as written.
    selectorList: false,
  }],
}
```

Every other category uses `['*']`,
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

Use `order` to choose what comes first inside a selector or a BEM family. \
The rule only sorts items at the same level, but the same order applies inside each family.

A **BEM family** is a group of selectors for the same block, element, or modifier.

```scss
.card {}               // The card family.
.card:hover {}         // This state belongs to the card.

.card__title {}        // The title has its own family within the card family.
.card__title:hover {}  // This state stays with the title.
```


<!-- TODO: Не забыть вставить ссылки, уточнить полный ли список -->

Inside `order`, you can reference built-in categories, your custom groups, or a plain rules via an object form.

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
        <code>.card:hover {}</code>
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
          If you list a more specific qualifier category, it takes priority.
          See <a href="#matchers-and-equal-ranks">Matcher priority</a> below.
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
Use [`blankLines`][group spacing] to control blank lines around a group and between its items.
:::

---

#### Custom categories

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

<!-- TODO: Nested перенести ниже -->

You can nest entries one level deep to give them equal priority.
For example, `['pseudo-classes', ['modifiers', 'elements']]` puts states first
and lets modifiers and elements keep their order of first appearance.
You can use the same pattern [within a category][categories-option].

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
Choose either `relativeSelector` or `selector` to narrow the match.
With neither field, `{ type: 'rule' }` matches any style rule.

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

##### Sorting items with equal priority

Use `sort` on a property group, rule matcher, or at-rule matcher to order
its matches when they share a priority.

```js
{
  order: [
    'sass:includes', // Other mixins keep their place before declarations.
    'declarations',
    {
      type: 'at-rule',
      name: 'include',
      parameter: /^layout\.from\(/u,
      // Put layout.from(40rem) before layout.from(60rem).
      sort: { by: 'dimension' },
    },
  ],
}
```

A matcher takes the same [presets][sorting-presets] and [callbacks][custom-sorting]
as a [named group][named-group-sorting] or [category][categories-option].
A rule or at-rule selected by an object in `order`, `root.order`, or a named
group uses the matcher's `sort`, or the enclosing group's `sort` if the matcher omits it.
With neither, matches at the same priority keep their source order.
The category's `order` and `sort` apply to items placed through that category.

##### Diagnostic labels

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
Stylelint uses the source text.

In [spacing messages][group spacing], a label on the group that requests the
blank line names that group. Selector-list and cascade warnings keep the
authored selectors and property names alongside their labels.

---

#### Matcher priority {#matchers-and-equal-ranks}

In the opening configuration, `@media print` matches both `css:media` and the
at-rule object. The rule checks objects first, so print comes after the other media queries.
If two objects match, the **first** in `order` wins. This also applies to objects
inside a [named group][groups-option], which expands where you list it.

#### Pseudo-element variants {#pseudo-element-variants}

If you're looking for the hover effect on a card's `::before`, you'll find it
next to the `::before` it changes. Here's how that looks with the defaults.

```scss
.card {
  &:hover {}
  &::before {}
  &:hover::before {}
  &::after {}
  &:hover::after {}
}
```

Set `categories['pseudo-elements']` to move a whole pseudo-element family.
Set `categories['pseudo-classes']` to order states inside it. The position of
the pseudo-element matters. `&:hover::before` and `&::before:hover` describe
different conditions.

### `root`

At the top of a stylesheet you might want all the block styles together,
followed by the media queries that override them. Inside a card you might want
media queries *before* its states. The two orders are independent.

#### `root.order` {#root-order}

::: code-group

```js [Configuration]
{
  root: { order: ['rules', 'css:media', 'at-rules'] },
  categories: { 'css:media': ['(--tablet)', '*'] },
}
```

```scss [Result]
.card {}
.card:hover {}
@media (--tablet) {}
@media print {}
@supports (display: grid) {}
```

:::

`root.order` puts the card family and the query wrappers in place.
`order` still puts `.card` before `.card:hover`. A wrapper stays whole,
even if the selectors inside it belong to different blocks.

Stylesheet-level `@media`, `@supports`, `@container`, `@layer`, `@scope`,
`@starting-style`, and `@document` (including `@-moz-document`) use `root.order`
for their contents too. Once you enter a selector, its children use `order`.
Bodies such as `@font-face` or `@mixin` also use the nested order.

Leaving `root` out keeps the default stylesheet order, even when you replace `order`.
By default, definitions, Sass calls, and diagnostics share the first position so
they can keep their source order. Custom properties follow, then selector families,
media queries, container queries, and the remaining at-rules.

#### `root.unspecified` {#root-unspecified}

If you only want to order some top-level items, set `root.unspecified: 'ignore'`.
For example, `root: { order: ['rules', 'css:media'], unspecified: 'ignore' }`
keeps an unlisted `@supports` in its slot while the selectors and media queries
are ordered around it. The root and nested [`unspecified`][unspecified-option]
settings each default to `'bottom'` and can be changed independently.

### `categories`

Say you like where the states appear, but you always look for `:focus-visible`
before `:hover`. You only need to change one category.

::: code-group

```js [Configuration]
{
  categories: {
    'pseudo-classes': [':focus-visible', ':hover', '*'],
  },
}
```

```scss [Result]
.card {
  &:focus-visible {}
  &:hover {}
  &:active {}
}
```

:::

An array replaces the order inside that category wherever it's used, including
at the root. The first matching entry wins. Here the final `'*'` matches any
other states. Use an equal-priority pair like `[':focus', ':focus-visible']`
when their relative order doesn't matter.

To **keep the defaults** and add one new priority, use a function. For example,
`'pseudo-classes': (defaults) => [':disabled', ...defaults]` puts disabled states
first and keeps the existing order for links, hover, focus, and active states.
The function receives the default list, including its nested arrays, once per
stylesheet. Return a new list with any `'*'` still at the end.

Use the object form when you also want to [sort ties][sorting-presets],
[place unmatched items][unspecified-option], or [add blank lines][group spacing].
For example, this adds one gap before a run of container queries, with no empty
lines between them. Setting only `blankLines` keeps the existing query order.

```js
{
  categories: {
    'css:container': { blankLines: { before: 'always', between: 'never' } },
  },
}
```

#### Category matchers {#category-matchers}

For breakpoints, you usually know the condition you care about. For a mixin,
you know the name you call. The matcher follows that distinction.

```js
{
  categories: {
    // The phone query first, then compound queries that also mention it.
    'css:media': ['(--phone)', /\(--phone\)/u, '*'],
    // Includes both size and style queries on the sidebar container.
    'css:container': [/^sidebar\s/u, '*'],
    // Calls from the layout module go before calls from other modules.
    'sass:include-blocks': [/^layout\./u, '*'],
  },
}
```

For `css:media` and `css:container`, a string matches the full normalized text
after the directive. A regular expression can match part of it. For containers
the text includes the container name, when present. Include each category in
`order` or `root.order` where you want to use it.

::: details Which name or selector should I use?

- For CSS and Sass definitions, use the declared name, such as `'--tone'` or
  `'respond-to'`. For `@include layout.respond-to(40rem)`, use `'layout.respond-to'`.
  For `@warn`, use `'warn'`.
- If you split includes into statements and blocks, you can give them different
  settings. A form with no settings of its own uses `sass:includes`, then
  `at-rules`. Specific CSS queries, definitions, and Sass diagnostics can also
  use the shared `at-rules` settings. A spacing-only override keeps that order.
- In `at-rules`, use an explicit [at-rule matcher][outer-matchers],
  such as `{ type: 'at-rule', name: 'supports' }`. Add a final `'*'` to match
  everything else. Put a pattern in `parameter` to match part of a condition.
- For a BEM family, use its key, such as `'.card__title'`. Use `':focus'` for
  a local state or `'::before'` for a pseudo-element family. A selector pattern
  sees the normalized selector without the contents of its block. You can also
  use a rule matcher to choose between authored and relative selectors.
- Within `qualifiers`, use the extra selector itself, such as `'.is-selected'`,
  `'[aria-busy]'`, `'button'`, or `'#featured'`. Specific qualifier categories
  inherit the shared order and spacing unless you give them their own.
- For a variable or property, use its name. Ordinary properties use
  [comparison names][canonical comparison names]. Custom properties and Sass
  variables keep their case and their leading dashes or dollar sign.

:::

#### Selector sets {#selector-sets}

A button might have one hover rule, one focus rule, and a third rule for styles
the two states share. Give that third rule its own position with `selectorSet`.

::: code-group

```js [Configuration]
{
  categories: {
    'pseudo-classes': [
      ':hover',
      ':focus-visible',
      { selectorSet: { equals: [':hover', ':focus-visible'] } },
      { selectorSet: { includes: [':hover'], size: 2 } },
      '*',
    ],
  },
}
```

```scss [Result]
.button {
  &:hover {}
  &:focus-visible {}
  &:focus-visible, &:hover {}
  &:hover, &:active {}
}
```

:::

`equals` matches exactly the listed branches in either order. `includes` allows
others. Here `size: 2` asks for hover and one other distinct branch. Leave out
`size` to accept any number, including a single hover branch. Put exact matches
first. A plain `':hover'` matches the standalone state without claiming every
list that mentions it.

This moves the **whole rule**. To change the order on either side of the comma,
use [`selectorList`][selector-list].

::: details Which selector lists can move together?

The branches must have the same BEM owner and family path. `.card:hover, .button:focus`
stays in place. A list with only ordinary selectors, like `h1, h2`, can move as
one rule in `rules`.

For compatible branches the rule first looks for a category they all share.
For example, `.card:hover.is-selected, .card:focus` shares `pseudo-classes`.
If the branches have different kinds of conditions, as in `.card:hover, .card[hidden]`,
the first eligible category in `order` wins. A specific category takes precedence
over `rules` in either branch order. Put the `selectorSet` in the winning category.
Compatible lists can still move without a matching set, according to that
category's `'*'` or `unspecified` setting.

A set compares complete branches. `:hover:focus` is a single branch. Commas
inside `:is(...)` or a quoted attribute stay inside it. Within a compound,
`.selected:hover` and `:hover.selected` match the same condition. Repetition,
pseudo-element positions, and the arguments to functions still matter.
List each branch once in the configuration. Duplicates in the stylesheet count
once toward `size` and keep their original spelling.

:::

#### Sorting presets {#sorting-presets}

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
@media (min-width: 60rem) {}
@media print {}
@media (min-width: 40rem) {}
```

```scss [After]
@media (min-width: 40rem) {}
@media print {}
@media (min-width: 60rem) {}
```

:::

The sorter compares values with the same unit. It never assumes a conversion
between `rem` and `px`. Without `units`, each unit keeps its slots, so
`40px, 2rem, 16px, 1rem` becomes `16px, 1rem, 40px, 2rem`.
To group all `rem` values before all `px` values, set `units: ['rem', 'px']`.
The same input then becomes `1rem, 2rem, 16px, 40px`. Descending order reverses
the numbers within each unit. Ties keep their source order.

::: details Which values can the dimension sorter read?

It looks for **one literal number with a unit** in an at-rule's parameters or a
declaration's value. That can be a width, duration, angle, or resolution.
`(width >= 40rem) and (hover: hover)`, `sidebar (width >= 40rem)`, and
`@include respond(40rem)` each have a single value it can use.

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

#### Custom sorters {#custom-sorting}

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

### `groups`

Suppose you use a `@include layout.from(...)` mixin alongside plain `@media`
queries. You want both in the same part of a file, and the same convention
inside each component. Give that set a name and list it in both orders.

```js
{
  root: { order: ['rules', 'group:breakpoints'] },
  order: ['declarations', 'pseudo-classes', 'group:breakpoints'],
  groups: {
    breakpoints: [
      { type: 'at-rule', name: 'include', parameter: /^layout\.from\(/u },
      { type: 'at-rule', name: 'media' },
    ],
  },
}
```

Here the breakpoint mixins come first, then the media queries. A group keeps
the order you wrote inside it. You can use categories, matcher objects, and
equal-priority arrays in its definition. Reference it from `order` or `root.order`.
Keep each definition self-contained. Group references and a standalone `'*'`
belong in the outer order.

#### Group sorting {#named-group-sorting}

What if `@include layout.from(60rem)` should come *after* `@media (width >= 40rem)`?
Put both matchers in the same nested array and give the group a dimension sorter.

::: code-group

```js [Configuration]
{
  order: ['declarations', 'group:breakpoints'],
  groups: {
    breakpoints: {
      order: [[
        { type: 'at-rule', name: 'include', parameter: /^layout\.from\(/u },
        { type: 'at-rule', name: 'media' },
      ]],
      sort: { by: 'dimension' },
    },
  },
}
```

```scss [Result]
.card {
  display: grid;
  @media (width >= 40rem) {}
  @include layout.from(60rem) {}
}
```

:::

With separate entries the sorter works **within** each priority, so all matching
includes still come before all media queries. You can also give a whole group
one priority where you use it, with `['group:breakpoints']` nested in the outer
order. A group's `sort` applies to its equal-priority members and accepts the
same [presets][sorting-presets] and [callbacks][custom-sorting]. An explicit
matcher can supply its own sorter. Listing a category such as `'css:media'`
in the group keeps that category's internal priorities.

#### Property groups {#property-groups}

A typography mixin often sets defaults you want to override. To keep layout
above the mixin and typography below it, put a property group on either side.

::: code-group

```js [Configuration]
{
  order: [
    { properties: ['display', ['width', 'height']] },
    { type: 'at-rule', name: 'include', parameter: 'typography' },
    { properties: ['font-size', 'line-height', 'color'] },
    'declarations',
  ],
}
```

```scss [Result]
.card {
  display: grid;
  height: 100%;
  width: 20rem;
  @include typography;
  font-size: 1rem;
  line-height: 1.5;
  color: navy;
}
```

:::

`display` goes first. `width` and `height` can appear in either order.
Give the group `sort: { by: 'name' }` if you also want to alphabetize ties.
The rule follows the order you chose around the mixin. It can't see which
properties the mixin will emit.

A property group matches ordinary CSS properties. Strings match
[comparison names][canonical comparison names]. A pattern such as `/^grid-/u`
matches the authored or comparison name. A final `'*'` inside `properties`
matches the remaining ordinary properties. Custom properties and Sass
variables have their own categories.

Use a property group directly in `order` or `root.order`, or name it in `groups`
and refer to it as `group:layout`. If all properties should stay together,
put the property group directly in `categories.declarations.order`.
Each group controls its own order and sorter. Other declarations still follow
the shared `declarations` settings.

#### Group spacing {#group-spacing}

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

You can set `blankLines` on a category, a property group, a named group with
an `order`, or [unmatched items][unspecified-option]. Set `label` on a named
or property group if you'd like the lint message to use a label such as `Layout`.

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
priorities. A more specific named group, property group, or `unspecified`
spacing policy can decide the gap. Between whole BEM families, the parent
decides. Each family's own settings control gaps inside it.

Group counts use consecutive members at that level, regardless of existing
blank lines. For example, `width`, `height`, and `color` can count as three
declarations. Giving just `width` and `height` a property group makes that
group count as two. A container count includes its direct items on both
sides of a sorting boundary.

If a gap expands a nested block, that block and its ancestors count as
multiline. A policy that requires a gap *only* while the block is on one line
can invalidate its own result. The rule reports that configuration.

:::

#### Property dependencies {#property-names-and-cascade}

The order of `margin` and `margin-top` can change what you see on screen.
An alphabetical sorter keeps their relative order in both of these rules.

```scss
.card {
  margin: 2rem;
  margin-top: 1rem;
}

.badge {
  margin-top: 1rem;
  margin: 2rem;
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

### `unspecified`

Suppose you only care that `display` comes before `position`. What should
happen to a `color` declaration between them? You have three choices.

- `'bottom'` (the default) collects unlisted items below the ones you named.
- `'top'` collects them above. In both cases they keep their relative order.
- `'ignore'` leaves each unlisted item in its slot. Listed items can still
  switch places around it.

::: code-group

```js [Configuration]
{
  categories: {
    declarations: {
      order: ['display', 'position'],
      unspecified: 'ignore',
    },
  },
}
```

```scss [Before]
.card {
  position: relative;
  color: navy;
  display: grid;
}
```

```scss [After]
.card {
  display: grid;
  color: navy;
  position: relative;
}
```

:::

Choose the level where you want this to happen. Top-level `unspecified` applies
inside selectors and BEM families, `root.unspecified` applies at the stylesheet
level, and `categories.declarations.unspecified` applies among declarations.
Each defaults independently to `'bottom'`. A family can move as one item even
when some of the properties inside it keep their slots. Ignoring a family at
its parent level still lets the rule gather and order its members.

**Should the rest be sorted too?** Add `'*'` as the **last** entry in the list.
That gives the remaining items an explicit priority, so they can use the category's
sorter. Without the star, `unspecified` places them and keeps their source order.

```js
{
  categories: {
    'custom-properties': {
      order: [/^--size-/u, '--theme', '*'],
      sort: { by: 'name' },
    },
  },
}
```

Here the size variables are alphabetical. After `--theme`, the remaining
variables are alphabetical too. To keep those in source order with a blank
line before them, drop the star and set
`unspecified: { position: 'bottom', blankLines: { before: 'always' } }`.
You can use this object form for `'top'` or `'bottom'` at any of the three levels.

### `selectorList`

By default the rule moves a comma-separated list as a whole and leaves the
selector text alone. If you'd also like the branches to follow your usual
state order, turn on `selectorList`.

::: code-group

```js [Configuration]
{
  selectorList: { order: 'inherit' },
  categories: { 'pseudo-classes': [':hover', ':focus-visible', '*'] },
}
```

```scss [Before]
.button:focus-visible, .button:hover {}
```

```scss [After]
.button:hover, .button:focus-visible {}
```

:::

`'inherit'` reuses category priorities when every branch resolves to the same
BEM family and category. If nesting gives a branch several owners, its list
stays as written. `selectorList: {}` is shorthand for inherited order.
The default for the option itself is `false`.

To alphabetize whole lists, including selectors like `h2, h1`, set just
`selectorList: { sort: { by: 'name' } }`. You can also give the list priorities of its own.

```js
{
  selectorList: {
    order: [':hover', [':focus', ':focus-visible'], '*'],
    sort: { by: 'name' },
    unspecified: 'ignore',
  },
}
```

Use `selectorList.sort` to break ties between branches. `direction: 'desc'` reverses
name comparison. Strings match a complete normalized branch or a local
condition. Regular expressions and rule matchers with `selector` or
`relativeSelector` work too. Here `'*'` also ranks the remaining branches.
Omit it to let `unspecified` keep their slots (`'ignore'`, the default), or
choose `'top'` or `'bottom'`.

Only complete branches move. Comments, duplicate selectors, and the spacing
of the list are preserved. The rule leaves compounds and commas inside
functions like `:is(...)` alone. [Selector sets][selector-sets] control where
the whole rule goes.

### `separators`

If your project writes `.card_size_small` for the small card, tell the rule
how to recognize it. The element separator can keep its default.

```js
{
  separators: { modifier: '_', modifierValue: '_' },
}
```

Now `.card_size_small` and `.card__title` both belong to `.card`.
The default separators are `__` for `element`, `--` for `modifier`, and `--`
for `modifierValue`. Set only the ones your project changes.

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
preserved unless you set [`blankLines`][group spacing].

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

A warning points to the first item in a consecutive run that needs to move.
For example, three adjacent states that belong above a modifier can move
together, so one message can cover all three. The rule aims to move as few
source items as possible, then as few runs as possible. Repeated labels can
include a value or source location to help you find the right item.
With `unspecified: 'ignore'`, messages describe the items you've asked to order.

## Acknowledgments

The matcher objects follow the conventions of [`order/order`][stylelint-order].
The checks for overlapping properties draw on [Stylelint][stylelint] property data.

[canonical comparison names]: #property-names-and-cascade
[categories-option]: #categories
[custom-sorting]: #custom-sorting
[group spacing]: #group-spacing
[groups-option]: #groups
[layer-statements]: https://www.w3.org/TR/css-cascade-5/#layer-statements
[named-group-sorting]: #named-group-sorting
[namespace-placement]: https://www.w3.org/TR/css-namespaces-3/#syntax
[order-option]: #order
[outer-matchers]: #matchers-and-equal-ranks
[root-option]: #root
[selector-list]: #selectorlist
[selector-sets]: #selector-sets
[sorting-presets]: #sorting-presets
[stylelint-order]: https://github.com/hudochenkov/stylelint-order/blob/master/rules/order/README.md
[stylelint]: https://github.com/stylelint/stylelint
[unspecified-option]: #unspecified
