# @morev/best-practices/no-selectors-in-at-rules
<!-- TODO: Нейминг правил подумой -->

Disallows block declarations inside at-rules.

::: code-group

```scss{3} [✅ Good]
// ✅ Good (S)CSS - each selector declared only once per file

.the-component {
  color: red;

  @media (width >= 412px) {
    color: blue;
  }

  @media (width >= 768px) {
    color: rebeccapurple;
  }
}
```

```scss{3,8,14} [❌ Bad]
// ❌ Bad (S)CSS - multiple scattered declarations for the same selector

.the-component {
  color: red;
}

@media (width >= 412px) {
  .the-component {
    color: blue;
  }
}

@media (width >= 768px) {
  .the-component {
    color: rebeccapurple;
  }
}
```

:::

## Motivation

The explanation is centered around media queries as the most common at-rule,
but the section is valid for all [block at-rules](https://developer.mozilla.org/en-US/docs/Web/CSS/At-rule#block_at-rules).

::: tip
In some projects, `@layer`, `@scope` or `@supports` may be reasonable exceptions -
you can configure them explicitly using the [`ignore`](#ignore) option.
:::


Before [native CSS nesting](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nesting), applying media queries usually meant
duplicating selectors inside at-rules, spreading related styles across the file. \
This made searching, reading, and editing styles more tedious.

```scss
.the-component {
  color: red;
}

@media (max-width: 412px) {
  .the-component {
    color: blue;
  }
}

@media (max-width: 768px) {
  .the-component {
    color: rebeccapurple;
  }
}
```

This led to multiple declarations for the same selector scattered across the file - sometimes even at opposite ends -
making it difficult to find and reason about styles. \
You couldn't just hit `Ctrl+F` and trust the first result; you had to carefully check each occurrence
to ensure it was in the correct media context.

Moreover, making changes became cumbersome: you had to jump around the file to track all related declarations,
constantly keeping the media context in mind - it was simply inconvenient.

With the introduction of [SASS](https://sass-lang.com/),
and now [native CSS nesting](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nesting/Nesting_at-rules),
it's possible *(and encouraged)* to place at-rules **inside** selector blocks instead. \
This provides a much cleaner and more manageable structure.

By disallowing block declarations inside at-rules, we enforce a convention where each selector is declared only once per file,
and all conditions (like media queries) are included inside that selector.

This guarantees that when a developer searches for a selector, the first match is the only place they need to look -
leading to simpler navigation and a more predictable editing experience.

## Rule details

By default, this rule disallows placing selectors inside any block-level at-rule
(except for SASS control structures - for example, content inside `@if` or `@else` blocks is not checked, as well as `@mixin`, `@function`, etc.).

The rule does not differentiate between CSS at-rules and SASS mixins - both are treated as equally invalid:

```scss
@media (max-width: 480px) {
  .the-component {}
}

@include media('lg') {
  .the-component {}
}
```

If you have custom SASS mixins intended to be used inside selectors,
or you want to allow nesting selectors within specific at-rules,
you can use the [`ignore`](#ignore) option described below.

While this is generally considered bad practice, there are cases where it may be acceptable -
such as during codebase migrations, in specific scenarios like `@media print`,
or when working with at-rules like `@layer` or `@scope`.

## Rule options

The rule has a second argument in the form of object with (so far) a single "ignore" key.

### ignore

::: tip Info
The description might seem a bit complex at first, but the following examples will make it clearer.
:::

The `ignore` option is an object where keys are at-rule names
and values define which usages of those at-rules should be ignored.

Values can be:

* a plain string;
* a stringified regular expression *(make sure that key characters are escaped)*;
* a regular expression *(if your config format supports it)*;
* or an array containing any combination of the above.

::: info Info
This flexibility is necessary to support various user needs and to accommodate configuration formats
(like `yaml` or `json`) that don't support regular expression syntax.
:::


#### examples

---

##### Ignore any `@layer` at-rules

All variations produce the same result - this example demonstrates the flexibility of the configuration.

```json
{
  "@morev/plugin/at-rule-no-children": [true, {
    "ignore": {
      "layer": "*" // String wildcard
    }
  }]
}

{
  "@morev/plugin/at-rule-no-children": [true, {
    "ignore": {
      "layer": "/.*/" // String representing RegExp
    }
  }]
}

{
  "@morev/plugin/at-rule-no-children": [true, {
    "ignore": {
      "layer": /.*/ // RegExp itself (only for `js` configuration)
    }
  }]
}
```

##### Ignore only certain `@media` at-rules

```json
{
  "@morev/plugin/at-rule-no-children": [true, {
    "ignore": {
      "media": ["print"]
    }
  }]
}
```

## Acknowledgements

This rule is a modern port of
[aditayvm/stylelint-at-rule-no-children](https://github.com/adityavm/stylelint-at-rule-no-children) plugin that looks abandoned.

The implementation mostly the same (and thanks for the inspiration and tests!), but compared to the original here:

* Support and tests for more at-rules *(CSS has advanced a lot in the meantime, heh)*;
* Capability to fine-tune exceptions *(which makes sense when using new directives such as `layer`)*;
* SASS support out of the box *(no more explicit exceptions for `@if`, `@else` and other SASS constructions)*;
* Better (less verbose) error highlighting *(only the selector is highlighted, not the entire at-rule content)*
