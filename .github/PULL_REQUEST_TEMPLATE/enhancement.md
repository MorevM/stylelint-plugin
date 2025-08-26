## 🔧 Rule Enhancement / Bugfix

### Target rule

Which rule is affected? (`@morev/<scope>/<rule-name>`)

### Current behavior

What does the rule currently do, and where is the issue?

### Proposed behavior

What should be changed or added?

### Examples

Provide minimal code showing current (❌) vs desired (✅) behavior.

```scss
// ❌ current (reports incorrectly)
.block { $unused: red; }

// ✅ desired (should pass)
.block { $used: red; color: $used; }
```

### Tests

* [ ] Added/updated implementation tests
* [ ] Added/updated configuration tests (if any)
* [ ] Covers valid and invalid cases
* [ ] Includes autofix snapshots (if applicable)

### Docs

* [ ] Updated rule docs (`.docs.md`) if needed
* [ ] Examples reflect new behavior

### Checklist

* [ ] Code style & lint pass locally
* [ ] Comments for non‑obvious logic
* [ ] No new warnings
* [ ] Types updated (meta/schema) if needed
* [ ] Considered autofix safety
