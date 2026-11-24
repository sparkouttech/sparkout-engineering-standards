// eslint.config.mjs — Angular (flat config, ESLint 9). Copy to the project root.
// `.mjs` because Angular projects do not set "type": "module", so `export default` in a `.js` config does not load.
// Plugins, pinned versions and the install command: lint-automation.md in this folder.
import tseslint from 'typescript-eslint';
import angular from '@angular-eslint/eslint-plugin';
import angularTemplate from '@angular-eslint/eslint-plugin-template';
import angularTemplateParser from '@angular-eslint/template-parser';
import sonarjs from 'eslint-plugin-sonarjs';
import rxjsX from 'eslint-plugin-rxjs-x';
import rxjsAngularX from 'eslint-plugin-rxjs-angular-x';

// The standard's TypeScript rules. Change them here, in the standards repository, not in a project copy.
const standard = [
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-magic-numbers': ['warn', { ignore: [0, 1, -1] }],
      'no-console': 'error',
      'max-lines-per-function': ['error', 75],
      'max-depth': ['error', 3],
      'max-lines': ['error', 400],
      'no-empty': 'error',
      'sonarjs/no-commented-code': 'error',
      'rxjs-x/no-nested-subscribe': 'error',
      'rxjs-angular/prefer-takeuntil': ['error', { alias: ['takeUntilDestroyed'] }],
      '@angular-eslint/prefer-standalone': 'error',
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      'no-restricted-properties': ['error',
        { object: 'localStorage',   property: 'setItem' },
        { object: 'sessionStorage', property: 'setItem' },
        { object: 'document',       property: 'querySelector' },
        { object: 'document',       property: 'getElementById' },
      ],
      'no-restricted-imports': ['error', {
        paths: [
          { name: '@angular/forms', importNames: ['UntypedFormGroup', 'UntypedFormControl', 'UntypedFormBuilder'],
            message: 'Use typed reactive forms. See standard 3.' },
        ],
      }],
      'no-restricted-syntax': ['error', {
        selector: "CallExpression[callee.property.name=/^bypassSecurityTrust/]",
        message: 'Requires an APPROVED BYPASS comment and a second reviewer. Standard 8.6.',
      }],
    },
  },
  {
    files: ['src/app/core/logging/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
];

// The standard's template rules (sections 10 and 13.9).
const standardTemplates = [
  {
    files: ['src/**/*.html'],
    rules: {
      // angular-eslint "recommended": prefer-control-flow is standard 10 (no *ngIf / *ngFor).
      ...angularTemplate.configs.recommended.rules,
      // angular-eslint "accessibility": standard 13.9.
      ...angularTemplate.configs.accessibility.rules,
      // Standard 10 asks for this rule "configured to permit signal reads". The rule has no such option
      // (only allowList / allowPrefix / allowSuffix, and it has no type information), so it would flag
      // every signal read. It stays a warning until the standard decides how to word it.
      '@angular-eslint/template/no-call-expression': 'warn',
    },
  },
];

export default [
  { ignores: ['dist/**', '.angular/**', 'node_modules/**', 'src/environments/env.secrets.ts'] },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      '@angular-eslint': angular,
      sonarjs,
      'rxjs-x': rxjsX,
      // eslint-plugin-rxjs-angular supports only ESLint 8. Its maintained fork, eslint-plugin-rxjs-angular-x,
      // is registered under the name the standard's rules use, so the rule names do not change.
      'rxjs-angular': rxjsAngularX,
    },
  },
  {
    files: ['src/**/*.html'],
    languageOptions: { parser: angularTemplateParser },
    plugins: { '@angular-eslint/template': angularTemplate },
  },
  ...standard,
  ...standardTemplates,
];
