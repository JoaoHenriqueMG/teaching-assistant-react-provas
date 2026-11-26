# Cucumber Testing Setup

This project uses Cucumber for behavior-driven development (BDD) acceptance tests, written in TypeScript
(compiled on the fly by `ts-node`), with Puppeteer for browser automation and `expect` for assertions.

## 📋 Prerequisites

1. **Backend server** on `http://localhost:3005`, **started with the test data** (see below)
2. **Frontend client** on `http://localhost:3004` (only needed by the `@gui` scenarios)
3. **Node.js** 20, 22 or 24+ (required by Cucumber 12; on versions it has not tested yet, such as 26, it prints a warning but works)
4. **Chrome/Chromium** for Puppeteer

## 🚀 Running Tests

### 1. Start the server with the test data

```bash
# From the repository root
npm run server:test
# or, from the server directory
npm run dev:test
```

This uses `server/data/test-data.json` (ignored by git) instead of the development data
(`server/data/app-data.json`). Another file can be chosen with the `DATA_FILE` environment variable
(relative to the `server` folder).

> Do not use `npm run dev` / `npm run server` for the tests: with the development data the auto-grade
> scenarios stop with *"The server already has the student …"*.

### 2. Start the client

```bash
# From the repository root
npm run client
# or, from the client directory
npm start
```

### 3. Run Cucumber

```bash
# From the client directory
npm run test:cucumber

# or from the repository root
npm run test:cucumber
```

If Puppeteer cannot find its own Chrome, point it to the installed one before running:

```bash
# Git Bash
PUPPETEER_EXECUTABLE_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" npm run test:cucumber
```

```powershell
# PowerShell
$env:PUPPETEER_EXECUTABLE_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
npm run test:cucumber
```

## 🚀 Another Way 

### Method 1: Using the Test Runner Script (Recommended)

```bash
# From the client directory
./run-cucumber-tests.sh
```

This script will:
- Check if both server and client are running
- Run all Cucumber tests
- Generate HTML and JSON reports

### Method 2: Manual Execution

```bash
# From the client directory
npm run test:cucumber
```

### Method 3: Watch Mode (for development)

```bash
# From the client directory
npm run test:cucumber:watch
```

### Other ways to run

```bash
# Only the "Cadastro de respostas da prova" service scenarios (cucumber.js profile)
npx cucumber-js --config cucumber.js --profile respostas

# Only the scenarios with a tag
npx cucumber-js --config cucumber.js --tags @service

# One scenario, by line number
npx cucumber-js --config cucumber.js src/features/auto_grade_service.feature:77
```

Note: `cucumber.js` already lists `src/features/**/*.feature`, and file paths given on the command line are
**added** to it (not replacing it), so every feature file is still parsed. Use `--tags` or `--name` to
narrow a run, or a profile with its own `paths` (like `respostas`).

`run-cucumber-tests.sh` checks that ports 3005 and 3004 answer and then runs `npm run test:cucumber`; it does
not check that the server is using the test data.

> `npm run test:cucumber:watch` does not work: `cucumber-js` has no `--watch` option.

## 🧪 Test Structure

| Folder | Contents |
| --- | --- |
| `src/features/` | Feature files (Gherkin) |
| `src/step-definitions/` | Step implementations |
| `src/test-support/` | Shared helpers: `browser.ts` (Puppeteer launch/close), `fixtures.ts`, `autoGradeScenario.ts`, `autoGradeSheets.ts` |
| `reports/` | `cucumber_report.html` and `cucumber_report.json`, written on every run |

### Tags

- `@gui`: runs in the browser (needs server and client)
- `@service`: calls the server API only (needs the server)
- `@server`: calls the server API only (needs the server)

## 📝 Current Features

| Feature file | Tag | Steps | Status |
| --- | --- | --- | --- |
| `student-management.feature` | `@gui` | `student-steps.ts` | Implemented |
| `server-student-management.feature` | `@server` | `server-student-steps.ts` | Implemented |
| `server-cadastro-respostas.feature` | `@service` | `server-cadastro-respostas-steps.ts` | Implemented |
| `auto_grade_gui.feature` | `@gui` | `auto-grade-common-steps.ts`, `auto-grade-gui-steps.ts` | Implemented |
| `auto_grade_service.feature` | `@service` | `auto-grade-common-steps.ts`, `auto-grade-service-steps.ts` | Implemented |
| `criarProvas.feature` | — | — |Implemented |
| `criarQuestoes.feature` | — | — | Implemented |

> A single feature file that is not valid Gherkin makes `npm run test:cucumber` stop before running any
> scenario. Free text before the `Feature:` line must be commented with `#`, and scenarios must be written
> as `Scenario:` (not `Scenario 1:`).

## 🛠️ Test Data Management

Every scenario arranges its own data, runs, checks, and removes what it created (`Before`/`After` hooks).

### Student Management Data
- **CPF**: `12345678901`
- **Name**: `Test Student`
- **Email**: `test.student@email.com`

### Automatic Correction (auto_grade) Data
- **Helpers**: `src/test-support/autoGradeSheets.ts` builds the CSV spreadsheets from the scenario tables;
  `src/test-support/autoGradeScenario.ts` creates and removes the class and students through the API
- Each scenario creates the class "Engenharia de Software e Sistemas 2026.2" and its students, and deletes
  them at the end
- These scenarios use CPFs that also exist in the development data. If the server is running with the
  development data, the scenarios stop before deleting any student that is not test data.

## 🎯 Browser Automation

Configured in `src/test-support/browser.ts`:
- **Headless**: `false` (visible browser); set to `true` for CI
- **Viewport**: 1280x720
- **Slow Motion**: 50ms

## 🔧 Configuration

- **`cucumber.js`**: feature paths, step definitions, report formats, and the `respostas` profile.
  It sets `TS_NODE_PROJECT=tsconfig.test.json`.
- **`tsconfig.test.json`**: compiles the steps to CommonJS (the app's `tsconfig.json` emits ES modules,
  which cannot import the project's `.ts` modules from the steps).

## 🚨 Troubleshooting

| Error | Solution |
| --- | --- |
| `Parse error in "src\features\…feature"` | Fix the Gherkin of that file (see *Current Features*) |
| `Server is not available` / `fetch failed` | Start the server: `npm run server:test` (from the root) |
| `The server already has the student …` | The server is using the development data: restart it with `npm run server:test` |
| `Navigation timeout` | Start the client: `npm run client` (from the root) |
| `Could not find Chrome (ver. …)` | Set `PUPPETEER_EXECUTABLE_PATH` to the installed Chrome, or delete the broken folder in `~/.cache/puppeteer/chrome/` and run `npx puppeteer browsers install chrome` |
| `EADDRINUSE` / `Something is already running on port 3004` | Another server is still running on 3005/3004; stop it first |
| `You're calling functions on an instance of Cucumber that isn't running` | Call `setDefaultTimeout` inside step definition files, not in the config |

## 📈 Adding New Tests

1. **Feature file**: add a `.feature` file in `src/features/` with a tag (`@gui`, `@service` or `@server`)
2. **Scenarios**: Gherkin syntax (Given, When, Then); comment any free text with `#`
3. **Steps**: add step definitions in `src/step-definitions/`; shared helpers go in `src/test-support/`
4. **Cleanup**: always remove the data the scenario created
5. **Check**: `npx cucumber-js --config cucumber.js --dry-run` reports parse errors and undefined steps
   without needing the servers
``gherkin
Scenario: Delete a student
  Given there is a student with CPF "98765432100" in the system
  When I delete the student from the list
  Then the student should not appear in the list
```