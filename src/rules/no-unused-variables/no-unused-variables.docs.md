# @morev/bem/no-unused-variables

Reports SASS variables that are declared but not used within their valid scope.

::: info SASS-only
This rule applies only to SASS/SCSS files and has no effect on plain CSS files.
:::

```scss
.the-component {
  $b: #{&};
  $foo: #{$b}__foo; // ❌ Variable is unused

  &__element {
    #{$b}--active {
      color: red;
    }
  }
}
```

## Motivation

Defining variables that are never used leads to unnecessary noise, confusion, and potential maintenance issues during refactoring. \
This rule helps keep your component code clean and intentional by reporting variables that:

* Are declared with a valid SASS syntax;
* Are never referenced within their corresponding scope or nested scopes;
* Are not explicitly ignored via configuration.

## Rule options

All options are optional and have sensible default values.

```ts
type NoUnusedVariablesOptions = {
  /**
   * Whether variables declared at the root level should also be checked.
   * By default, root-level variables are ignored,
   * assuming they may be imported elsewhere.
   *
   * @default false
   */
  checkRoot?: boolean;

  /**
   * A list of variable names to ignore (without leading `$`).
   * Supports both exact string matches and wildcard patterns.
   *
   * @example ['my-var']
   *
   * @default []
   */
  ignore?: Array<string | RegExp>;
};
```

---

### `checkRoot`

Whether variables declared at the root level should be checked.

```ts
/**
 * @default false
 */
type CheckRootOption = boolean;
```

By default, the rule skips root-level variables,
assuming they might be imported or used across multiple files. \
Enable this option if you want to enforce that all root-level variables
are actually used within the same file.

#### Examples

```scss
// Config: [true, { checkRoot: true }]

// ❌ Root-level variable is unused
$foo: red;
.the-component {}
```

---

### `ignore`

A list of variables to exclude from the unused check.

```ts
/**
 * @default []
 */
type IgnoreOption = Array<string | RegExp>;
```

Supports:

* Exact matches by variable name (without `$` prefix in config)
* Wildcard patterns using `*`
* Regular expressions for advanced matching

::: tip
The `$` prefix is automatically handled by the rule - in the config, you only specify the name part.
:::

<!-- TODO: Link -->
::: info
If you want to use it together with the `block-variable` rule,
you need to set `ignore: ['b']` to ensure consistency across all style files.
:::

#### Examples

::: code-group

```scss [string]
// Config: [true, { ignore: ['b'] }]

// ✅ Variable $b is ignored
.the-component {
  $b: #{&};
}
```

```scss [string + wildcard]
// Config: [true, { ignore: ['-*'] }]

// ✅ Variables starting with `-` are ignored
.the-component {
  $-foo: #{&};
  $-bar: #{&};
}
```

```scss [RegExp]
// Config: [true, { ignore: [/.*foo.*/] }]

// ✅ Variables containing 'foo' are ignored
.the-component {
  $foo: #{&};
  $bar-foo: #{&};
}
```

:::

## Additional notes

* The rule correctly tracks scope: nested variables can shadow outer ones.
* Escaped variables inside strings (e.g., `"\\$var"`) or comments (e.g., `// $foo`) do not count as usage.
