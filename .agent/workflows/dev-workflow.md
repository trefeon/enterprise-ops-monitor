---
description: Standard development workflow for this project
---

# Development Workflow

1. Read `AGENTS.md`, then inspect only the docs and source files relevant to the task.
2. Identify the smallest scoped change that satisfies the request.
3. Preserve repo conventions instead of introducing new patterns.
4. Verify focused behavior first when useful, then run `pnpm check:all` before completion.
5. Review `git diff` for unintended instruction drift or unrelated edits before reporting.
