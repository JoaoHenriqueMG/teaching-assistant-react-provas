# Cucumber Testing Setup for Student Management System

This project uses Cucumber for behavior-driven development (BDD) testing with TypeScript and Puppeteer for browser automation.

## 📋 Prerequisites

1. **Backend Server**: The server must be running on `http://localhost:3005`
2. **Frontend Client**: The React app must be running on `http://localhost:3004`
3. **Node.js**: Version 16 or higher
4. **Chrome/Chromium**: For Puppeteer browser automation

## 🚀 Running Tests

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

## 🧪 Test Structure

### Feature Files
- Location: `src/features/*.feature`
- Written in Gherkin syntax
- Define test scenarios in natural language

### Step Definitions
- Location: `src/step-definitions/*.ts`
- TypeScript files that implement the test steps
- Handle browser automation and assertions

### Test Reports
- Location: `reports/`
- HTML report: `cucumber_report.html`
- JSON report: `cucumber_report.json`

## 📝 Current Test Scenarios

### Student Management Feature
- **File**: `src/features/student-management.feature`
- **Scenario**: Add a new student without class association
- **Test Steps**:
  1. Verify system is running
  2. Clean up any existing test data
  3. Navigate to Students tab
  4. Fill in student form (name, CPF, email)
  5. Submit the form
  6. Verify student appears in the list
  7. Verify student data is correct
  8. Clean up test data

## 🔧 Configuration

### Cucumber Configuration
- **File**: `cucumber.js`
- Defines feature file locations and step definition requirements
- Configures report formats and output locations

### TypeScript Configuration
- **File**: `tsconfig.test.json`
- Specific TypeScript configuration for test files
- Includes test directories and enables necessary features

## 🛠️ Test Data Management

The tests follow the **AAA pattern** (Arrange, Act, Assert) with proper cleanup:

1. **Setup**: Removes any existing test data before starting
2. **Execution**: Performs the test actions
3. **Verification**: Asserts expected results
4. **Cleanup**: Removes test data after completion

### Test Student Data
- **CPF**: `12345678901`
- **Name**: `Test Student`
- **Email**: `test.student@email.com`

### Automatic Correction (auto_grade) Data
- **Features**: `auto_grade_gui.feature` (`@gui`) and `auto_grade_service.feature` (`@service`, API only, no browser)
- **Steps**: `auto-grade-common-steps.ts` (Background and checks shared by both), `auto-grade-gui-steps.ts`, `auto-grade-service-steps.ts`
- **Helpers**: `src/test-support/autoGradeSheets.ts` builds the CSV spreadsheets from the scenario tables;
  `src/test-support/autoGradeScenario.ts` creates and removes the class and students through the API
- Each scenario creates the class "Engenharia de Software e Sistemas 2026.2" and its students, and deletes them at the end

These scenarios use CPFs that may also exist in the development data, so the server must use a separate
data file. Start the server for the tests with:

```bash
# From the server directory (or `npm run server:test` from the repository root)
npm run dev:test
```

It uses `data/test-data.json` (created on the first change, ignored by git). Another file can be chosen with
the `DATA_FILE` environment variable (relative to the `server` folder).

If the server is running with the development data, the scenarios stop before deleting any student that
is not test data.

## 🎯 Browser Automation

The tests use Puppeteer for browser automation:
- **Headless**: Set to `false` for development (visible browser)
- **Viewport**: 1280x720 for consistent testing
- **Slow Motion**: 50ms delays for visibility during development

## 🔍 Debugging Tests

### View Browser Actions
Set `headless: false` in the step definitions to see the browser in action.

### Check Server Logs
Monitor server console for API calls during tests.

### Inspect Test Reports
Open `reports/cucumber_report.html` in a browser for detailed test results.

## 📦 Dependencies

### Core Testing
- `@cucumber/cucumber`: BDD testing framework
- `puppeteer`: Browser automation
- `@testing-library/react`: React testing utilities
- `@testing-library/jest-dom`: Custom Jest matchers

### TypeScript Support
- `ts-node`: TypeScript execution
- `@types/puppeteer`: TypeScript definitions
- `@types/jest`: Jest type definitions

## 🚨 Troubleshooting

### Server Not Running
```
Error: Server is not available
```
**Solution**: Start the backend server: `npm run dev` (from server directory)

### Client Not Running
```
Error: Navigation timeout
```
**Solution**: Start the frontend: `npm start` (from client directory)

### TypeScript Compilation Issues
```
Error: TS2307: Cannot find module '@jest/globals'
```
**Solution**: The setup uses custom assertion functions instead of Jest. No additional Jest installation needed.

### Cucumber Configuration Issues
```
Error: You're calling functions on an instance of Cucumber that isn't running
```
**Solution**: Ensure setDefaultTimeout is called within step definition files, not in config.

### Port Conflicts
**Solution**: Ensure ports 3004 and 3005 are available

### Browser Issues
**Solution**: Install latest Chrome/Chromium or run headless mode
If Puppeteer cannot find its own Chrome, point it to the installed one:
`PUPPETEER_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"`

### Module Resolution Issues
**Solution**: Use direct imports instead of relative imports for better compatibility

## 📈 Adding New Tests

1. **Create Feature File**: Add `.feature` file in `src/features/`
2. **Write Scenarios**: Use Gherkin syntax (Given, When, Then)
3. **Implement Steps**: Add step definitions in `src/step-definitions/`
4. **Follow Patterns**: Use existing test structure for consistency
5. **Include Cleanup**: Always clean up test data

Example new scenario:
```gherkin
Scenario: Delete a student
  Given there is a student with CPF "98765432100" in the system
  When I delete the student from the list
  Then the student should not appear in the list
```