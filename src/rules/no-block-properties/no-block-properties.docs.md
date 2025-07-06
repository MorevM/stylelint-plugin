# @morev/bem/no-block-properties

The rule prohibits using external geometry properties on a block and its modifiers. \
According to BEM methodology,
[external geometry should be applied through the parent block](https://en.bem.info/methodology/css/#external-geometry-and-positioning) -
this is a fundamental principle that ensures style predictability across the system.

## Motivation

It's easy for newcomers - and even experienced developers who aren't being careful -
to accidentally break consistency and clutter the system.
This rule helps prevent such mistakes by making them harder to make :)

## Rule options

All options are optional.

```ts
type NoExternalGeometryOptions = Partial<{
  /**
   * Additional properties disabllowed
   * for blocks and their modifiers.
   *
   * @default []
   */
  extraProperties: string[];
}>;
```

---

### `extraProperties`

Additional properties disabllowed for blocks and their modifiers.

```ts
/**
 * @default []
 */
type ExtraPropertiesOption = string[];
```

This option exists to ensure users aren't dependent on the plugin author as CSS evolves -
for example, the plugin may have been written before logical properties were introduced
and hasn't yet been updated to include them.

The author isn't going anywhere, and the preferred approach is to submit a PR to add any new properties to the list. \
However, if that’s not possible for any reason, you can extend the list locally in your configuration using this option.

Currently, the rule prohibits the following properties from being used at the block level:

```ts
const EXTERNAL_GEOMETRY_PROPERTIES = [
  'inset',
  'inset-block', 'inset-block-start', 'inset-block-end',
  'inset-inline', 'inset-inline-start', 'inset-inline-end',
  'top', 'right', 'bottom', 'left',

  'margin',
  'margin-block', 'margin-block-start', 'margin-block-end',
  'margin-inline', 'margin-inline-start', 'margin-inline-end',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',

  'float',
];
```

These are properties that can be confidently classified as external geometry properties.

::: info
You may choose to add other existing properties like `display` or `position` to the list -
they're not part of the default blacklist because, in practice, disallowing them
at the block level often turns out to be unnecessarily strict. \
While it may be methodologically correct, it typically leads to a situation
where any component with non-standard behavior requires an extra wrapper element,
increasing DOM depth and node count — which can negatively impact performance.
:::


#### Examples

::: code-group

```scss [Default options]
// config: [true]

// ✅ No external geometry properties
.the-component {
  background-color: $--app--background-color;
}

// ❌ Block uses external geometry properties
.the-component {
  margin-top: 16px;
}
```

:::
