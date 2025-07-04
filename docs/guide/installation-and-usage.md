# Installation & usage

## Installation

Install the package alongside `stylelint`:

::: code-group

```sh [npm]
npm add -D @morev/stylelint-plugin stylelint
```

```sh [yarn]
yarn add -D @morev/stylelint-plugin stylelint
```

```sh [pnpm]
pnpm add -D @morev/stylelint-plugin stylelint
```

:::

## Usage

* Create the [`.stylelintrc` config file](https://stylelint.io/user-guide/configure/) *(or open the existing one)*;
* Add `@morev/stylelint-plugin` to the [`plugins`](https://stylelint.io/user-guide/configure/#plugins) array;

Next, you have two options:

### Traditional version

Just add the rules you need to the [`rules`](https://stylelint.io/user-guide/configure/#rules) object,
using this documentation as a reference.

All rules from `@morev/stylelint-plugin` need to be namespaced with `@morev/` prefix and the additional category prefix.

```js
export default {
  plugins: [
    '@morev/stylelint-plugin',
  ],
  rules: {
    '@morev/best-practices/at-rule-no-children': [true, {
      ignore: {
        media: ['print'],
        layer: '*',
      }
    }],
    '@morev/bem/match-filename': true,
    '@morev/bem/block-variable': true,
  },
}
```

Please refer to [Stylelint docs](https://stylelint.io/user-guide/configure) for the detailed info on using this plugin.
