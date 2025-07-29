<!-- #region header -->
The rule provides built-in error messages for all violations it detects. \
You can customize them using the `messages` option. This can be useful to:

* Adjust the tone of voice to match your team's style;
* Translate messages into another language;
* Provide additional project-specific context or documentation links.

::: info
You don't need to override all message functions — or any of them at all.
:::
<!-- #endregion header -->

<!-- #region formatting -->
::: info How message formatting works

If your custom message function returns anything other than a `string` (e.g., `undefined`),
the rule will automatically fall back to the default built-in message.

Additionally, all custom messages are automatically processed through `stripIndent` function,
so it's safe and recommended to use template literals (backticks, <code>`</code>)
for multiline messages without worrying about inconsistent indentation.
:::
<!-- #endregion formatting -->
