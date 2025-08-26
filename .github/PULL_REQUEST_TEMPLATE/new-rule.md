## ✨ New Rule Proposal (Implementation)

### Summary

Describe the rule you are adding and the problem it solves. \
Please include links to related issues (if any).

### Behavior

* Default behavior (what should be reported/fixed)

* Autofix: safe / optional / none

### Examples

Provide minimal incorrect (❌) and correct (✅) snippets.

```scss
// ❌ incorrect
.aspect { aspect-ratio: 2; }

// ✅ correct
.aspect { aspect-ratio: 2 / 1; }
```

### Options

Describe configuration options (if any).

### Tests

* [ ] Added implementation tests
* [ ] Added configuration tests (if any)
* [ ] Covers valid and invalid cases
* [ ] Includes autofix snapshots (if applicable)

### Docs

* [ ] Added rule docs (`.docs.md`)
* [ ] Added examples and options

### Checklist

* [ ] Code style & lint pass locally
* [ ] Comments for non‑obvious logic
* [ ] Types updated (meta/schema) if needed
