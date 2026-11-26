import { Given, When, Then, Before, After, DataTable } from '@cucumber/cucumber';
import { ElementHandle } from 'puppeteer';
import expect from 'expect';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
// Opens and closes the browser of each @gui scenario
import { baseUrl, currentPage } from '../test-support/browser';
import { Sheet, answerKeysSheet, parseAnswers, responsesSheet, toCsv, withProblem } from '../test-support/autoGradeSheets';
import { classIdOf, cpfOf, enrollments, scenario } from '../test-support/autoGradeScenario';

/**
 * Steps of auto_grade_gui.feature: the professor uses the automatic
 * correction popup of the Evaluations tab. The spreadsheets are written to a
 * temporary folder and chosen in the popup's file inputs.
 */

type SpreadsheetName = 'answer keys' | 'responses';

let problems: Partial<Record<SpreadsheetName, string>> = {};
let sheetsFolder: string | undefined;

const UPLOADS: Record<string, SpreadsheetName[]> = {
  'both spreadsheets': ['answer keys', 'responses'],
  'only the answer keys': ['answer keys'],
  'only the responses': ['responses'],
  nothing: []
};

const INPUT_OF: Record<SpreadsheetName, string> = {
  'answer keys': 'answer-key-upload',
  responses: 'responses-upload'
};

Before({ tags: '@gui' }, function () {
  problems = {};
});

After({ tags: '@gui' }, function () {
  if (sheetsFolder) {
    fs.rmSync(sheetsFolder, { recursive: true, force: true });
    sheetsFolder = undefined;
  }
});

/** The spreadsheet as the scenario describes it, with its problem, if any. */
const buildSheet = (name: SpreadsheetName): Sheet => {
  const sheet =
    name === 'answer keys' ? answerKeysSheet(scenario.answerKeys, scenario.alternatives) : responsesSheet(scenario.responses);
  const problem = problems[name];
  return problem ? withProblem(sheet, problem) : sheet;
};

const writeSheet = (sheet: Sheet): string => {
  sheetsFolder = sheetsFolder ?? fs.mkdtempSync(path.join(os.tmpdir(), 'auto-grade-'));
  const filePath = path.join(sheetsFolder, sheet.fileName);
  fs.writeFileSync(filePath, toCsv(sheet), 'utf8');
  return filePath;
};

const textOf = async (selector: string): Promise<string> =>
  currentPage().$eval(selector, element => element.textContent ?? '');

const isShown = async (selector: string): Promise<boolean> => (await currentPage().$(selector)) !== null;

/** The texts shown under the file boxes: problems found before sending. */
const sheetProblems = async (): Promise<string[]> =>
  currentPage().$$eval('.sheet-problem', elements => elements.map(element => element.textContent ?? ''));

interface RankingRow {
  rank: string;
  student: string;
  grade: string;
  hasAlerts: boolean;
  invalidQuestions: number[];
}

const rankingRows = async (): Promise<RankingRow[]> =>
  currentPage().$$eval('[data-testid^="ranking-row-"]', rows =>
    rows.map(row => {
      const cell = (testId: string) => row.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim() ?? '';
      return {
        rank: cell('ranking-rank'),
        student: cell('ranking-name'),
        grade: cell('ranking-percentage'),
        hasAlerts: row.querySelector('[data-testid="student-warnings"]') !== null,
        invalidQuestions: Array.from(row.querySelectorAll('li.invalid-answer')).map(item =>
          Number(/^Question (\d+)/.exec(item.textContent ?? '')?.[1])
        )
      };
    })
  );

const rankingRowOf = async (name: string): Promise<RankingRow> => {
  const row = (await rankingRows()).find(candidate => candidate.student === name);
  if (!row) {
    throw new Error(`${name} is not in the ranking`);
  }
  return row;
};

Given('I am on the grades page of the class {string}', async function (className: string) {
  const page = currentPage();
  const classId = classIdOf(className);
  await page.goto(baseUrl);
  await page.waitForSelector('[data-testid="evaluations-tab"]', { timeout: 10000 });
  await page.click('[data-testid="evaluations-tab"]');
  await page.waitForSelector(`#classSelect option[value="${classId}"]`, { timeout: 10000 });
  await page.select('#classSelect', classId);
  await page.waitForSelector('[data-testid="open-auto-grading"]', { timeout: 10000 });
});

Given('the answer keys are:', function (table: DataTable) {
  scenario.answerKeys = table.hashes().map(row => ({ exam: row.exam, answers: parseAnswers(row.answers) }));
});

Given('the responses are:', function (table: DataTable) {
  scenario.responses = table.hashes().map(row => ({
    name: row.student,
    cpf: cpfOf(row.student),
    exam: row.exam,
    answers: parseAnswers(row.answers)
  }));
});

Given('the {string} spreadsheet has the problem {string}', function (spreadsheet: string, problem: string) {
  if (!(spreadsheet in INPUT_OF)) {
    throw new Error(`Unknown spreadsheet "${spreadsheet}"`);
  }
  problems[spreadsheet as SpreadsheetName] = problem;
});

When('I request the automatic correction after uploading {string}', async function (uploaded: string) {
  const sheets = UPLOADS[uploaded];
  if (!sheets) {
    throw new Error(`Unknown upload "${uploaded}"`);
  }
  const page = currentPage();
  await page.click('[data-testid="open-auto-grading"]');
  await page.waitForSelector('[data-testid="auto-grading"]', { timeout: 5000 });

  for (const name of sheets) {
    const testId = INPUT_OF[name];
    const input = (await page.$(`[data-testid="${testId}"]`)) as ElementHandle<HTMLInputElement>;
    await input.uploadFile(writeSheet(buildSheet(name)));
    await page.waitForSelector(`[data-testid="${testId}-name"]`, { timeout: 5000 });
  }

  await page.click('[data-testid="auto-grade-submit"]');
  // Done when the popup shows a result, an error or a problem under a file box, and is no longer busy
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="auto-grading-result"], [data-testid="auto-grading-error"], .sheet-problem') !== null &&
      !document.querySelector('[data-testid="auto-grade-submit"]')?.hasAttribute('disabled'),
    { timeout: 10000 }
  );
});

Then('I see the message {string}', async function (message: string) {
  const hasResult = await isShown('[data-testid="auto-grading-result"]');
  const notInClassAlert = await isShown('[data-testid="not-in-class"]');

  switch (message) {
    case 'grades saved': {
      expect(hasResult).toBe(true);
      const text = await textOf('[data-testid="auto-grading-message"]');
      expect(text).toContain('Grades saved');
      expect(text).not.toContain('invalid answers');
      expect(notInClassAlert).toBe(false);
      break;
    }
    case 'grades saved with invalid answer alerts': {
      expect(hasResult).toBe(true);
      const text = await textOf('[data-testid="auto-grading-message"]');
      expect(text).toContain('Grades saved');
      expect(text).toContain('invalid answers');
      break;
    }
    case 'grades saved with student not found alert':
      expect(hasResult).toBe(true);
      expect(await textOf('[data-testid="auto-grading-message"]')).toContain('Grades saved');
      expect(notInClassAlert).toBe(true);
      break;
    case 'invalid spreadsheet format': {
      // Either the server rejected the content, or the popup refused a file that is not a .csv
      expect(hasResult).toBe(false);
      const refusedFile = (await sheetProblems()).some(problem => problem.includes('is not a .csv file'));
      expect({ serverError: await isShown('[data-testid="auto-grading-error"]'), refusedFile }).not.toEqual({
        serverError: false,
        refusedFile: false
      });
      break;
    }
    case 'spreadsheets required': {
      expect(hasResult).toBe(false);
      expect(await isShown('[data-testid="auto-grading-error"]')).toBe(false);
      const shown = await sheetProblems();
      expect(shown.length).toBeGreaterThan(0);
      shown.forEach(problem => expect(problem).toMatch(/^Choose the .* spreadsheet$/));
      break;
    }
    default:
      throw new Error(`Unknown message "${message}"`);
  }
});

Then('I see the ranking:', async function (table: DataTable) {
  const shown = (await rankingRows()).map(({ rank, student, grade }) => ({ rank, student, grade }));
  expect(shown).toEqual(table.hashes().map(({ rank, student, grade }) => ({ rank, student, grade })));
});

Then('the details of {string} show invalid answers in questions {string}', async function (name: string, questions: string) {
  const expected = questions.split(',').map(question => Number(question.trim()));
  const row = await rankingRowOf(name);
  expect(row.hasAlerts).toBe(true);
  expect(row.invalidQuestions).toEqual(expected);
});

Then('{string} has no alerts', async function (name: string) {
  const row = await rankingRowOf(name);
  expect({ hasAlerts: row.hasAlerts, invalidQuestions: row.invalidQuestions }).toEqual({ hasAlerts: false, invalidQuestions: [] });
});

Then('no grade is saved for {string}', async function (name: string) {
  expect((await rankingRows()).map(row => row.student)).not.toContain(name);
  expect(await textOf('[data-testid="not-in-class"]')).toContain(name);
  expect((await enrollments()).map(enrollment => enrollment.student.cpf)).not.toContain(cpfOf(name));
});
