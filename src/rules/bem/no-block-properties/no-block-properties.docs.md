<!-- markdownlint-disable md013 -->

# @morev/bem/no-block-properties

**Prevents layout-affecting CSS properties within BEM block selectors.**

::: info In other words

Disallows margins, positioning, and similar properties directly on BEM blocks (or their modifiers).

```html
<header class="the-header">
  <button
    class="ui-button the-header__button"
    type="button"
  ></button>
</header>
```

---

```scss
.ui-button {
  // ❌ Unexpected external geometry property at BEM block level
  margin-block-start: 16px;
}

.the-header__button {
  // ✅ External geometry property at BEM element level
  margin-block-start: 16px;
}
```

:::

## Motivation

BEM blocks should be reusable, independent, and predictable. \
When blocks define external geometry or context-dependent behavior - such as `margin`, `align-self`, or even `z-index` -
they break layout isolation, introduce hidden dependencies on parent containers, and cause unexpected side-effects when reused.

According to the BEM methodology,
[external geometry and positioning should be applied through the parent block](https://en.bem.info/methodology/css/#external-geometry-and-positioning),
not inside the block's own styles. This fundamental principle ensures style predictability and maintainability across the system.

This rule enforces that principle by restricting problematic CSS properties inside BEM block declarations.


## Rule options

All options are optional and have sensible default values.

::: code-group

```js [Enabling a rule with recommended defaults]
// 📄 .stylelintrc.js

export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-block-properties': true,
  }
}
```

```js [Enabling a rule with custom options]
// 📄 .stylelintrc.js

export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-block-properties': [true, {
      presets: ['EXTERNAL_GEOMETRY'],
      customPresets: {},
      allowProperties: [],
      disallowProperties: [],
      perEntity: {
        block: {
          presets: [],
          allowProperties: [],
          disallowProperties: [],
        },
        modifier: {
          presets: [],
          allowProperties: [],
          disallowProperties: [],
        },
      },
      ignoreBlocks: ['swiper-*', /.*legacy.*/],
      separators: {
        element: '__',
        modifier: '--',
        modifierValue: '--',
      }
      messages: {
        unexpected: (property, selector, context, presetName) =>
          `Custom message: "${property}" is forbidden in ${context} "${selector}"`,
      },
    }],
  },
}
```

:::

::: details Show full type of the options

```ts
export type NoBlockPropertiesOptions = {
  /**
   * List of presets to apply globally. \
   * Available built-in presets: `['EXTERNAL_GEOMETRY', 'CONTEXT', 'POSITIONING']`.
   *
   * @default ['EXTERNAL_GEOMETRY']
   */
  presets?: string[];

  /**
   * Custom property presets. \
   * The key is the preset name, the value is an array of property names. \
   *
   * The preset name is passed to the `messages.unexpected` function as an argument (if matched)
   * and can be used to generate more specific error messages.
   *
   * @default {}
   */
  customPresets?: Record<string, string[]>;

  /**
   * Properties that are globally allowed, regardless of presets or other restrictions.
   *
   * @default []
   */
  allowProperties?: string[];

  /**
   * Properties that are globally disallowed, regardless of presets.
   *
   * @default []
   */
  disallowProperties?: string[];

  /**
   * Fine-grained restrictions applied per BEM entity type.
   *
   * @default {}
   */
  perEntity?: {
    /**
     * Block-level restrictions.
     *
     * @default {}
     */
    block?: {
      /**
       * Additional presets to apply only for blocks.
       *
       * @default []
       */
      presets?: string[];

      /**
       * Properties explicitly allowed only for blocks.
       *
       * @default []
       */
      allowProperties?: string[];

      /**
       * Properties explicitly disallowed only for blocks.
       *
       * @default []
       */
      disallowProperties?: string[];
    };

    /**
     * Modifier-level restrictions.
     */
    modifier?: {
      /**
       * Additional presets to apply only for modifiers.
       *
       * @default []
       */
      presets?: string[];

      /**
       * Properties explicitly allowed only for modifiers.
       *
       * @default []
       */
      allowProperties?: string[];

      /**
       * Properties explicitly disallowed only for modifiers.
       *
       * @default []
       */
      disallowProperties?: string[];
    };
  };

  /**
   * List of block names to ignore entirely. \
   * Supports plain strings, regular expressions,
   * and wildcard-like patterns (e.g., 'swiper-*').
   *
   * @default []
   */
  ignoreBlocks?: Array<string | RegExp>;

  /**
   * Customizable error message templates.
   *
   * @default {}
   */
  messages?: {
    unexpected?: (
      property: string,
      selector: string,
      context: 'block' | 'modifier',
      preset: string | undefined,
    ) => string;
  };

  /**
   * Object that defines BEM separators used to distinguish blocks, elements, modifiers, and modifier values. \
   * This allows the rule to work correctly with non-standard BEM naming conventions.
   *
   * @default { element: '__', modifier: '--', modifierValue: '--' }
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
};
```

:::

---

### `presets`

```ts
/**
 * @default ['EXTERNAL_GEOMETRY']
 */
export type PresetsOption = string[];
```

The `presets` option allows you to quickly apply predefined groups of restricted CSS properties,
so you don't have to manually list them one by one.
This makes the rule configuration concise, consistent, and easy to maintain.

The plugin provides several built-in presets, covering common categories of properties that are considered problematic at the BEM block level.

::: tip
You can also extend or completely override these groups with your own custom presets using [`customPresets`](#custompresets) option if needed.
:::

#### Built-in presets

| Preset name         | Description                                                                 |
| ------------------- | --------------------------------------------------------------------------- |
| `EXTERNAL_GEOMETRY` | Properties that control external geometry *(enabled by default)*.         |
| `CONTEXT`           | Properties that influence layout behavior within a parent container.        |
| `POSITIONING`       | Properties related to absolute or relative positioning of the block itself. |

::: details Show properties list

```ts
const BUILTIN_PRESETS = {
  // Properties that control external geometry
  EXTERNAL_GEOMETRY: new Set([
    'margin',
    'margin-block', 'margin-block-start', 'margin-block-end',
    'margin-inline', 'margin-inline-start', 'margin-inline-end',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  ]),

  // Properties that influence layout behavior within a parent container
  CONTEXT: new Set([
    'float', 'clear',
    'flex', 'flex-grow', 'flex-shrink', 'flex-basis',
    'grid', 'grid-area',
    'grid-row', 'grid-row-start', 'grid-row-end',
    'grid-column', 'grid-column-start', 'grid-column-end',
    'place-self', 'align-self',
    'order',
    'counter-increment',
    'z-index',
  ]),

  //  Properties related to absolute or relative positioning of the block
  POSITIONING: new Set([
    'position',
    'inset',
    'inset-block', 'inset-block-start', 'inset-block-end',
    'inset-inline', 'inset-inline-start', 'inset-inline-end',
    'top', 'right', 'bottom', 'left',
  ]),
};
```

::: info Note
The exact property lists are defined by the plugin and may be expanded in future versions
following [Semantic Versioning](https://semver.org/) specification.
:::


#### Behavior

**By default, only the `EXTERNAL_GEOMETRY` preset is applied.**

This preset covers properties that directly affect external layout,
and is considered the most universally recommended restriction for BEM blocks.

::: warning
It is strongly encouraged to extend the rule configuration with additional presets like `CONTEXT` and `POSITIONING`,
or by manually specifying properties using [disallowProperties](#disallowproperties) option
to ensure more consistent and predictable BEM block isolation.
:::

The properties restricted by `presets` apply to:

| Selector type             | Example                    | Applies by default                |
| ------------------------- | -------------------------- | --------------------------------- |
| BEM block selectors       | `.the-component`           | ✅ Yes                            |
| BEM block modifiers       | `.the-component--modifier` | ✅ Yes                            |

```scss
.the-component {
  margin-block-start: 16px; // [!code error]

  &--modifier {
    margin-block-start: 16px; // [!code error]
  }

  &.is-active {
    margin-block-start: 16px; // [!code error]
  }
}
```

::: tip
Property restrictions for different contexts can be fine-tuned using the [`perEntity`](#perentity) option.
:::

---

### `customPresets`

```ts
/**
 * @default {}
 */
export type CustomPresetsOption = Record<string, string[]>;
```

The `customPresets` option allows you to define your own groups of restricted CSS properties
and reference them within the rule configuration, similar to the built-in [`presets`](#presets).

#### Use cases

* Define project-specific groups of restricted properties;
* Override built-in presets with your own property lists;
* Use custom preset names in [`messages`](#messages) for more meaningful, project-specific reporting.

#### Examples

---

##### Defining custom presets and using them in `messages`

In this example:

* A new preset `STACKING_CONTEXT` is introduced to group all properties related to stacking context;
* Preset is referenced in `presets` just like built-in ones;
* A more detailed message is provided for this specific preset.

```js {8,10,13}
// 📄 .stylelintrc.js

export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-block-properties': [true, {
      customPresets: {
        STACKING_CONTEXT: ['z-index', 'isolation']
      },
      presets: ['EXTERNAL_GEOMETRY', 'STACKING_CONTEXT'],
      messages: {
        unexpected: (property, selector, context, preset) => {
          if (preset === 'STACKING_CONTEXT') {
            return `
              The property "${property}" is restricted at block level.
              See project guidelines: <https://company.com/docs/>
            `;
          }
        },
      },
    }],
  },
}
```

#### Notes

* Custom preset names can be any valid string.
* Overriding built-in presets is allowed by design. \
  Use this feature with caution to avoid introducing inconsistent rule behavior.

---

### `disallowProperties`

```ts
/**
 * @default []
 */
export type DisallowPropertiesOption = string[];
```

The `disallowProperties` option lets you explicitly add individual properties to the restricted list,
in addition to those defined by [`presets`](#presets).
This is useful for introducing project-specific restrictions without modifying or creating new presets.

#### Example

```js
{
  '@morev/bem/no-block-properties': [true, {
    presets: ['EXTERNAL_GEOMETRY'],
    disallowProperties: ['color', 'background'],
  }],
}
```

In this example:

* All external geometry properties are restricted by default.
* Additionally, `color` and `background` are explicitly restricted for BEM blocks,
  even though they are not part of the preset.

::: info
You may choose to add other properties like `display` or `position` to the list -
they're not part of the default categories because, in practice, disallowing them
at the block level often turns out to be unnecessarily strict.

While it may be methodologically correct, it typically leads to a situation
where any component with non-standard behavior requires an extra wrapper element,
increasing DOM depth and node count - which can negatively impact performance.
:::

---

### `allowProperties`

```ts
/**
 * @default []
 */
export type AllowPropertiesOption = string[];
```

The `allowProperties` option lets you explicitly permit certain CSS properties,
even if they are part of the selected presets or listed in `disallowProperties`.
This gives you fine-grained control over exceptions to global restrictions.

**If a property is listed in `allowProperties`, it will not be restricted**, regardless of presets or other options.

#### Example

```js
{
  '@morev/bem/no-block-properties': [true, {
    presets: ['EXTERNAL_GEOMETRY', 'CONTEXT'],
    allowProperties: ['z-index'],
  }],
}
```

In this example:

* The rule restricts external geometry and context-related properties.
* `z-index` is explicitly allowed, even though it's part of the `'CONTEXT'` preset.

---

### `perEntity`

```ts
type _EntityRestrictions = {
  /**
   * Additional presets to apply only for this context.
   *
   * @default []
   */
  presets?: string[];

  /**
   * Properties explicitly allowed only for this context.
   *
   * @default []
   */
  allowProperties?: string[];

  /**
   * Properties explicitly disallowed only for this context.
   *
   * @default []
   */
  disallowProperties?: string[];
}

/**
 * @default {}
 */
export type PerEntityOption = {
  /**
   * Individual restrictions for `block` context
   *
   * @example `.the-component`
   */
  block?: _EntityRestrictions;

  /**
   * Individual restrictions for `modifier` context
   *
   * @example `.the-component--modifier`
   */
  modifier?: _EntityRestrictions;
};
```

The `perEntity` option allows you to define **separate restrictions for different types of BEM entities**, such as:

* BEM block selectors (`.the-component`)
* BEM block modifiers (`.the-component--modifier`)

::: tip Why
In practice, applying the same strict rules to both blocks and their modifiers can be too limiting.

For example:

* You may want to restrict external geometry and positioning for pure blocks.
* But allow limited use of `z-index` or `position` for modifiers to handle isolated layout exceptions.

The `perEntity` option lets you adjust restrictions for each entity type individually, while keeping global defaults in place -
or defining only *per-entity restrictions* without global presets if preferred.

This provides a more realistic and flexible configuration, acknowledging that strict, uniform restrictions
are often difficult to enforce consistently across all entity types in real-world projects.
:::

#### Examples

---

##### 1. Extend global configuration with entity-specific adjustments

```js
{
  '@morev/bem/no-block-properties': [true, {
    presets: ['EXTERNAL_GEOMETRY'],
    disallowProperties: ['z-index'],

    perEntity: {
      modifier: {
        allow: ['z-index']
      }
    }
  }]
}
```

In this example:

* Global restrictions apply `EXTERNAL_GEOMETRY` and `z-index` to all entities.
* For BEM block modifiers, `z-index` is allowed as an exception.

---

##### 2. Define restrictions only through `perEntity`

```js
{
  '@morev/bem/no-block-properties': [true, {
    perEntity: {
      block: {
        presets: ['EXTERNAL_GEOMETRY']
      },
      modifier: {
        presets: ['POSITIONING']
      }
    }
  }]
}
```

In this case:

* No global restrictions apply.
* BEM block selectors are restricted based on `EXTERNAL_GEOMETRY`.
* BEM block modifiers are restricted based on `POSITIONING`.

#### Notes

* If both global and `perEntity` options are defined, global restrictions apply first,
  then entity-specific overrides are merged on top.
* You can selectively configure only the entity types relevant to your project.
* Using `perEntity` is recommended for teams that want stricter discipline for blocks
  while keeping reasonable flexibility for modifiers and utilities.

---

### `ignoreBlocks`

The `ignoreBlocks` option allows you to exclude specific BEM blocks from rule validation entirely.
If a block's name matches any of the provided patterns,
the rule will skip all property checks for that block and its related selectors.

This is useful for:

* Excluding legacy blocks or third-party components.
* Gradually adopting the rule in large projects.
* Allowing temporary exceptions for experimental components.

#### Supported pattern types

* **Exact string match** - Matches block names literally;
* **String with wildcards (*)** - Supports simple pattern matching;
* **Regular expressions** - Allows complex, precise matching.

#### Examples

---

##### 1. Exclude specific blocks by name

```js
{
  ignoreBlocks: ['legacy-button']
}
```

```scss
// ✅ Block is ignored, so there is no error
.legacy-button {
  margin-block-start: 16px;
}
```

##### 2. Use wildcard patterns

```js
{
  ignoreBlocks: ['swiper-*']
}
```

```scss
// ✅ Block is ignored, so there is no error
.swiper-pagination {
  margin-block-start: 16px;
}

// ✅ Block is ignored as well
.swiper-navigation {
  margin-block-start: 16px;
}
```

#### Notes

* Only block names are checked - the option does not affect elements, modifiers, or utilities directly.
* Modifiers, elements, or utilities of ignored blocks are excluded along with their parent block.
* Wildcard patterns (*) are converted to regular expressions internally - escaping is not required for simple use cases.

---

### `separators`

<!-- @include: @/docs/_parts/separators.md#formatting -->

<!-- TODO: Pattern link related -->

---

### `messages`

<!-- @include: @/docs/_parts/custom-messages.md#header -->

#### Example of custom localized message with contextual details (in Russian)

```js
// 📄 .stylelintrc.js

export default {
  plugins: ['@morev/stylelint-plugin'],
  rules: {
    '@morev/bem/no-block-properties': [true, {
      messages: {
        unexpected: (property, selector, context, preset) => {
          const propertyType = (() => {
            if (preset === 'EXTERNAL_GEOMETRY') return 'свойство внешней геометрии';
            if (preset === 'CONTEXT') return 'контекстуально-зависимое свойство';
            if (preset === 'POSITIONING') return 'свойство позиционирования';
            return 'свойство';
          })();

          const contextType = (() => {
            if (context === 'modifier') return 'модификатора блока';
            return 'блока';
          })();

          return `
            Не используйте ${propertyType} "${property}" на уровне блока.
            Встретилось в селекторе "${selector}".
          `
        },
      },
    }],
  },
}
```

::: details Show function signature

```ts
export type MessagesOption = {
  /**
   * Custom message for an unexpected property at block/modifier level.
   *
   * @param   propertyName
   *
   * @returns                The error message to report.
   */
  unexpected?: (
    /**
     * The name of the restricted CSS property.
     *
     * @example 'margin-block-start'
     */
    propertyName: string,

    /**
     * The full selector that triggered the rule.
     *
     * @example '.the-component'
     */
    selector: string,

    /**
     * The BEM entity type of selector.
     *
     * @example 'block'
     */
    context: 'block' | 'modifier',

    /**
     * The name of the preset that the property belongs to, if available.
     *
     * @example EXTERNAL_GEOMETRY
     */
    presetName: string | undefined,
  ) => string;
}
```

:::

<!-- @include: @/docs/_parts/custom-messages.md#formatting -->
