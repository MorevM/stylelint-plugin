# @morev/block-variable

Ensures that the top-level block selector (assumed to be the component's root selector)
includes a variable that references the block name.

::: info SASS-only
This rule applies only to SASS/SCSS files and has no effect on plain CSS files.
:::

## Motivation

Component element states often depend on the block’s modifier. For example:

```scss{1,6}
.the-component {

  &__element {
    color: red;

    .the-component--active & {
      color: blue;
    }
  }
}
```

This increases the risk of typos, dead code during refactoring (e.g., when renaming a component), and unnecessary verbosity.

Defining a default variable in each component that references the block name is a good practice -
it establishes a consistent convention across all components and helps avoid these issues.

```scss{1,2,7} [With variable]
.the-component {
  $b: #{&}; // $b - first letter in the BEM abbreviation

  &__element {
    color: red;

    #{$b}--active & {
      color: blue;
    }
  }
}
```

## Rule options

All options are optional and have sensible default values.

```ts
type BlockVariableOptions = Partial<{
  /**
   * The name of the variable containing the block reference.
   *
   * @default 'b' // based on the first letter of the BEM abbreviation.
   */
  name: string;

  /**
   * Whether the reference must contain an interpolation.
   *
   * @default 'always'
   */
  interpolation: 'always' | 'never' | 'ignore';

  /**
   * Whether a block reference should be the first declaration of an element.
   *
   * @default true
   */
  firstChild: boolean;

  /**
   * Whether to automatically replace hardcoded occurrences of the block name
   * inside nested selectors with the corresponding block variable.
   *
   * @default true
   */
  replaceBlockName: boolean;
}>;
```

Almost all rule warnings are auto-fixable, except for multiple references to an element.

---

### `name`

The name of the variable containing the block reference.

```ts
/**
 * @default 'b' // based on the first letter of the BEM abbreviation
 */
type NameOption = string;
```

::: tip
You might prefer using the full name "block" if you avoid abbreviations (which is also a good practice),
but in practice, clearly distinguishing the variable from others matters more than strictly avoiding abbreviations.
:::

#### Examples

```scss
// Config: [true, { name: 'b' }]

// ✅ The variable exists, correctly references the block,
// ✅ and uses the expected name
.the-component {
  $b: #{&};
}

// ❌ The variable exists and correctly references the block,
// ❌ but its name does not match the expected one
.the-component {
  $block: #{&};
}

// ❌ The variable exists with the correct name,
// ❌ but it does not use a reference to block
.the-component {
  $b: .the-component;
}

// ❌ Multiple variables referencing the block are defined
.the-component {
  $b: #{&};
  $block: #{&};
}

// ❌ The variable referencing the block is missing.
.the-component {}
```

---

### `interpolation`

Whether the reference must contain an interpolation.

```ts
/**
 * @default 'always'
 */
type InterpolationOption = 'always' | 'never' | 'ignore';
```

#### Options:

* `always` - always use interpolation, `#{&}` is valid **(default value)**;
* `never` - never use interpolation, `&` is valid;
* `ignore` - consider both to be valid, `&` and `#{&}` are valid values.

::: details Why `always` is the default value?
The variable itself doesn't require interpolation to work, so different formats are allowed. \
However, if you create additional variables that build on it (like element references),
using interpolation is **mandatory** according to SASS:

```scss
.the-component {
  $b: #{&};                 // may work without interpolation
  $element: #{$b}__element; // won't work without interpolation
}
```

Therefore, to maximize consistency, `always` is the default value.
:::

#### Examples

::: code-group

```scss [always]
// config: [true, { interpolation: 'always' }]

// ✅ The variable uses interpolation
.the-component {
  $b: #{&};
}

// ❌ The variable do not use interpolation
.the-component {
  $b: &;
}
```

```scss [never]
// config: [true, { interpolation: 'never' }]

// ❌ The variable uses interpolation
.the-component {
  $b: #{&};
}

// ✅ The variable do not use interpolation
.the-component {
  $b: &;
}
```

```scss [ignore]
// config: [true, { interpolation: 'ignore' }]

// ✅ The variable use interpolation
.the-component {
  $b: #{&};
}

// ✅ The variable do not use interpolation
.the-component {
  $b: &;
}
```

:::

---

### `firstChild`

Whether the block reference should be the first declaration of an element.

```ts
/**
 * @default true
 */
type FirstChildOption = boolean;
```

This creates a consistent structure for every component and sets clear expectations for how a component should start.

#### Examples

::: code-group

```scss [true]
// Config: [true, { firstChild: true }]

// ✅ Variable is the first declaration of the element
.the-component {
  $b: #{&};
  color: red;
}

// ❌ Variable is not the first declaration of the element
.the-component {
  color: red;
  $b: #{&};
}
```

```scss [false]
// Config: [true, { firstChild: false }]

// ✅ Variable is the first declaration of the element
.the-component {
  $b: #{&};
  color: red;
}

// ✅ Variable is not the first declaration of the element, but still valid
.the-component {
  color: red;
  $b: #{&};
}
```

:::

### `replaceBlockName`

Whether to automatically replace hardcoded occurrences of the block name
inside nested selectors with the corresponding block variable.

```ts
/**
 * @default true
 */
type ReplaceBlockNameOption = boolean;
```

When enabled *(default behavior)*, the rule scans nested selectors within the component block
and replaces any hardcoded usages of the block name
(e.g., `.the-component--active`) with the correct block variable (e.g., `#{$b}--active`).

This prevents typos, improves maintainability, and ensures consistent use of variables.

#### Examples

::: code-group

```scss{5} [Before]
.the-component {
  $b: #{&};

  &__element {
    .the-component--active & {
      color: blue;
    }
  }
}
```

```scss{5} [After auto-fix]
.the-component {
  $b: #{&};

  &__element {
    #{$b}--active & {
      color: blue;
    }
  }
}
```

:::

::: info
This applies only to occurrences of the block name inside the current component's scope.
:::
