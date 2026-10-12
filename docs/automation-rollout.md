# Automation rollout

How to take a stack's tool configuration from `config/` and make it a real gate in a
project's CI.

This is the procedure for any project adopting the standards. The current rollout
deadline is **Tuesday 3 November 2026** — one repository per stack.

Budget roughly a day. Most of it is step 3.

---

## Step 1 — Pick the repository

One repository, not all of them. We prove the pattern works, then roll it out.

Choose a project that is **actively developed**, not one that is finished or nearly
finished. The point of the gate is to catch new code, so pick somewhere new code is
being written.

Tell the CTO which repository you picked.

---

## Step 2 — Copy the configuration

From `config/<your-stack>/` in this repository:

| Stack | Files | Goes where |
|---|---|---|
| Angular | `eslint.config.js`, `.stylelintrc.js` | project root |
| React / Next.js | `eslint.config.js`, `.stylelintrc.js` | project root |
| Node | `eslint.config.js` | project root |
| Python | `pyproject.ruff.toml` | merge into `pyproject.toml` |
| Spring Boot | `ArchitectureTest.java` | `src/test/java/.../ArchitectureTest.java` |
| Spring Boot | `jacoco-plugin.xml` | merge into `pom.xml` |
| Flutter | `analysis_options.yaml` | project root |

Install any plugins the configuration references. Each standard's appendix lists them.

---

## Step 3 — Run it, then baseline what is already there

Run the tool. On a codebase that has never had these rules, expect hundreds of
violations. **That is normal, and it is not a problem to solve this week.**

Do not try to fix them all. Do not weaken the rules to make the number smaller.
**Baseline them** — record what exists today, and gate on what is new.

> This is the same pattern our Slither setup uses, and the same one the QA maturity
> model describes: a check becomes blocking once it is stable, not on the day it is
> installed. A gate that fails the build on day one gets disabled or bypassed within
> a week, and then we have built something everyone routes around.

### Auto-fix what is safe

```bash
npx eslint . --fix          # Angular, React, Node
ruff check --fix            # Python
dart fix --apply            # Flutter
```

### Suppress the remainder

**ESLint 9.24 or later**

```bash
npx eslint --suppress-all
```

Writes `eslint-suppressions.json`. Commit it. New violations fail the build; existing
ones do not.

**ESLint before 9.24, and Stylelint**

No bulk suppression. Lint changed files only:

```bash
npx eslint $(git diff --name-only origin/main...HEAD -- '*.ts' '*.tsx')
```

Weaker — it misses violations in files nobody touches — but it works today. Upgrade
ESLint when you can and switch to `--suppress-all`.

**Ruff**

```bash
ruff check --add-noqa
```

Inserts `# noqa` on every existing violation. Commit it.

**Flutter**

`dart analyze` has no baseline mechanism. Set any rule that fails heavily to `warning`
in `analysis_options.yaml` with a `# TODO: raise to error` comment.

Keep the crash-related rules at `error` regardless of how many violations they produce:
`use_build_context_synchronously`, `cancel_subscriptions`, `close_sinks`.

**Spring Boot**

Add the ArchUnit rules one at a time. Any rule that fails on existing code gets
`@ArchIgnore` with a dated comment explaining what needs to change.

For JaCoCo, set the threshold to the project's **current** coverage and raise it
later. Do not start at 70% if the project is at 40% — the build will be red from
the first commit and stay red.

### Commit the baseline separately

The baseline commit will be large and mechanical. Put it in its own PR, separate from
the CI change. Mixing them makes both unreviewable.

---

## Step 4 — Wire it into CI

Add the lint or analysis step to the pipeline, and make it a **required** status check
in branch protection.

A check that reports without blocking changes nothing.

---

## Step 5 — Prove it fails

Open a throwaway PR that deliberately breaks one rule — add an `any`, a `console.log`,
a raw hex colour. Confirm the build goes red. Close the PR.

**Send the link to that red build.** That is the evidence the rollout is done — not
the presence of a config file.

---

## What to report

- Which repository
- Link to the failing build from step 5
- How many rules are now enforced, out of how many the configuration defines
- Which rules could not be enforced, and why
- How many violations are in the baseline — this becomes the remediation backlog

---

## What "done" means

Not every rule running.

For every rule the configuration marks as tool-enforceable, **either it runs, or you
can say why it does not yet and when it will.**

> "Twelve of eighteen running, four need a plugin we do not have, two were mistagged
> and belong in the review checklist" is a complete success.

Eighteen of eighteen is almost certainly not true. An accurate twelve is worth more
than an optimistic eighteen, and it tells us something we can act on.

---

## Two things not to do

**Do not delete or weaken a rule to make the build pass.** If a rule is genuinely wrong
for our codebase, open a PR against the standard and argue it. That is what this
repository is for.

**Do not regenerate the baseline to clear a new violation.** The baseline is committed
so that doing this shows up in review. Clearing a finding by resetting the baseline is
a policy violation, not an override.

---

## Afterwards

The suppressed violations are a backlog, not a permanent exemption. Work them down
when you touch the surrounding code — the same rule the standards use for everything
else: **new and changed code follows the standard; existing code is not retrofitted
as a project.**

When the baseline for a rule reaches zero, remove its suppressions and let it run
clean.
