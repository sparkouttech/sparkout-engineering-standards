# Angular lint setup — ESLint and Stylelint

The working configuration for enforcing the Angular standard, and what to know when you install it. The general
rollout procedure (baseline, CI, proving it fails) is in [docs/automation-rollout.md](../../docs/automation-rollout.md);
this file covers what is specific to Angular.

It was first rolled out in `aoc-token-distribution-admin` (Angular 21) in November 2026. Every rule, version and
workaround below was run there first.

## Files in this folder

| File | Goes where | What it is |
|---|---|---|
| `eslint.config.mjs` | project root | Flat config: the standard's TypeScript rules, the template rules for `*.html`, and the parser and plugin wiring |
| `.stylelintrc.js` | project root | The standard's Stylelint rules (tokens, `!important`, `::ng-deep`) |
| `package-lint.json` | merge into `package.json` | Pinned `devDependencies` and the `lint` / `lint:css` scripts |
| `angular.schematics.json` | merge into `angular.json` | `"style": "none"` for the component schematic (Tailwind projects) |
| `lint.yml` | `.github/workflows/lint.yml` | The PR gate: ESLint, then Stylelint |

## Install

```bash
npm install --save-dev --save-exact \
  eslint@9.39.5 typescript-eslint@8.72.1 \
  @angular-eslint/eslint-plugin@21.4.0 @angular-eslint/eslint-plugin-template@21.4.0 @angular-eslint/template-parser@21.4.0 \
  eslint-plugin-sonarjs@4.2.2 eslint-plugin-rxjs-x@0.9.6 eslint-plugin-rxjs-angular-x@0.1.2 \
  stylelint@17.16.0 stylelint-config-standard-scss@17.0.0 stylelint-declaration-strict-value@1.12.1
```

**Exact versions, on purpose.** The gate compares violation counts against a committed baseline. A minor plugin
release that adds or changes a check would move that count and fail unrelated PRs. Upgrade deliberately, in its own PR.

**`@angular-eslint/*` must match the project's Angular major.** The pins above are for Angular 21. Do not take
22.x on an Angular 21 project: its `prefer-on-push-component-change-detection` assumes Angular 22's OnPush default
and silently passes components that omit `changeDetection`, which on 21 still run eagerly.

## Why the config looks the way it does

| What | Why |
|---|---|
| `eslint.config.mjs`, not `.js` | Angular projects do not set `"type": "module"` in `package.json`, so a `.js` file with `export default` does not load. Adding `"type": "module"` breaks CommonJS build scripts. |
| Parser and `plugins` map | A flat config must import every plugin whose rules it names and set a parser for TypeScript and for templates. Without this wiring the config does not load. |
| `eslint-plugin-rxjs-angular-x` registered as `rxjs-angular` | The standard names `eslint-plugin-rxjs-angular`, which supports ESLint 8 only and is unmaintained. The fork provides the same `prefer-takeuntil` rule; registering it under the original name keeps the standard's rule names unchanged. |
| Template rules: angular-eslint `recommended` + `accessibility` | `recommended` includes `prefer-control-flow` (standard 10: no `*ngIf` / `*ngFor`), plus `eqeqeq`, `banana-in-box` and `no-negated-async`. `accessibility` covers standard 13.9. Template bindings are not checked by the TypeScript rules at all. |
| `no-call-expression` is `warn` | Standard 10 asks for it "configured to permit signal reads". The rule cannot do that: its only options are `allowList`, `allowPrefix` and `allowSuffix`, and it has no type information, so it flags every signal read as well as real function calls. It stays a warning until the standard's wording is settled. |
| `"style": "none"` in `angular.json` | In a Tailwind project most components need no stylesheet. `ng generate component` would otherwise emit an empty file that `no-empty-source` rejects. If a component does need styles, add the file and its `styleUrl` by hand. |

## The baseline

Follow Step 3 of the rollout doc: `npx eslint --suppress-all` writes `eslint-suppressions.json`. Commit it on its own.
Three things to know about how it behaves:

1. **It stores a count per file and rule, not line numbers.** ESLint compares the number of violations it finds
   with that count.
2. **One new violation reports all of that rule's violations in that file.** Once the count is exceeded, every
   violation of that rule in that file is printed, not just the new one. Find yours in the PR diff.
3. **Fixing an old violation does not shrink the count on its own.** Run `npx eslint . --prune-suppressions` and
   commit the smaller file.

Rules for working with it:

- **Never run `--suppress-all` again** after the first baseline. Regenerating it to clear a new finding is a policy
  violation; the file is committed so that doing it shows up in review.
- Fix suppressed violations when you touch the surrounding code. New and changed code follows the standard.
- If a rule is wrong for a codebase, open a PR here and argue it. Do not weaken it in the project.

**Stylelint has no bulk suppression.** Lint changed files only until the backlog is cleared, then lint all
stylesheets on every PR. Most of a Tailwind project's backlog is empty component stylesheets: delete them with
their `styleUrl` line and set the schematic above.

`no-magic-numbers` is a warning in the standard, so it never fails the build and is not part of the baseline.

## Approved bypasses

`no-restricted-syntax` blocks every `bypassSecurityTrust*` call. Standard 8.6 allows one only with an
`// APPROVED BYPASS` comment that names the input source, plus a second reviewer on the PR. Silence it **inline**,
directly under that comment:

```ts
// APPROVED BYPASS (standard 8.6): <input source>, sanitized by <function> above. <Why Angular's sanitizer cannot be used.>
// eslint-disable-next-line no-restricted-syntax
return this.sanitizer.bypassSecurityTrustHtml(cleaned);
```

**Never add a bypass to `eslint-suppressions.json`.** Inline, it is visible at the call site and in every review.
The same applies to the one place a project is allowed to write `localStorage` for non-secret state: a single
wrapper method, with the reason in the comment above the disable.

## CI

`lint.yml` runs on every `pull_request`. The job id is `lint`; make it a required status check, because a check
that reports without blocking changes nothing. The Stylelint step runs even when ESLint fails, so one run reports
both.

If the project's environment files import a generated, gitignored file, generate it in CI with placeholder values,
as the commented step in `lint.yml` shows. Type-aware linting needs the file to exist, and it never reads the
values, so never wire real secrets into the lint job.

## Proving it works

Open a throwaway PR that adds an `any`, a `console.log`, a raw hex colour in a stylesheet and an `*ngIf` in a
template. All four must fail the `lint` job. Link that red run in the rollout report.
