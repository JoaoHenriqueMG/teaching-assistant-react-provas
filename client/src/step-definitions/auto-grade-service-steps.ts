import { Given, When, Then } from '@cucumber/cucumber';
import expect from 'expect';
import { AutoGradingResponse, GradingErrorCode, RankedStudent } from '../types/AutoGrading';
import { answerKeysSheet, parseAnswers, responsesSheet } from '../test-support/autoGradeSheets';
import {
  EXAM_GOAL,
  cpfOf,
  enrollmentOf,
  numericGradeOf,
  parsePercentage,
  requestCorrection,
  saveGrade,
  scenario
} from '../test-support/autoGradeScenario';

/**
 * Steps of auto_grade_service.feature: the spreadsheets are sent straight to
 * the server API (POST /api/classes/:classId/auto-grade), with no browser.
 * The grades of an exam are saved in the class goal EXAM_GOAL.
 */

interface CorrectionReply {
  status: number;
  body: AutoGradingResponse & { error?: string; errors?: { code: GradingErrorCode; message: string }[] };
}

let reply: CorrectionReply | undefined;

/** The names the feature gives the errors of the server. */
const ERROR_CODES: Record<string, GradingErrorCode> = {
  'exam not in answer key': 'EXAM_NOT_IN_ANSWER_KEY',
  'answer count mismatch': 'ANSWER_COUNT_MISMATCH',
  'invalid answer key': 'INVALID_ANSWER_KEY'
};

const requireReply = (): CorrectionReply => {
  if (!reply) {
    throw new Error('The automatic correction service was not called');
  }
  return reply;
};

/** The result of a student in a successful correction. */
const resultOf = (name: string): RankedStudent => {
  const { status, body } = requireReply();
  expect({ status, error: body.error }).toEqual({ status: 200, error: undefined });
  const result = body.ranking.find(student => student.studentId === cpfOf(name));
  if (!result) {
    throw new Error(`${name} is not in the ranking: ${JSON.stringify(body.ranking.map(s => s.studentName))}`);
  }
  return result;
};

Given('the answer key of exam {string} is {string}', function (exam: string, answers: string) {
  scenario.answerKeys = scenario.answerKeys.filter(key => key.exam !== exam);
  scenario.answerKeys.push({ exam, answers: parseAnswers(answers) });
});

Given('{string} answered exam {string} with {string}', function (name: string, exam: string, answers: string) {
  scenario.responses.push({ name, cpf: cpfOf(name), exam, answers: parseAnswers(answers) });
});

// The exam only names the grade: every grade of the correction goes to EXAM_GOAL
Given('{string} already has the grade {string} on exam {string}', async function (name: string, grade: string, _exam: string) {
  await saveGrade(name, numericGradeOf(parsePercentage(grade)));
});

When('I call the automatic correction service', async function () {
  reply = undefined;
  const response = await requestCorrection(
    answerKeysSheet(scenario.answerKeys, scenario.alternatives),
    responsesSheet(scenario.responses)
  );
  reply = { status: response.status, body: await response.json() };
});

Then('the grade of {string} is {string}', function (name: string, grade: string) {
  expect(`${resultOf(name).percentage}%`).toBe(grade);
});

Then('question {int} of {string} is marked as {string}', function (question: number, name: string, situation: string) {
  const result = resultOf(name);
  const questionResult = result.questionResults[question - 1];
  const warning = result.warnings.find(text => text.startsWith(`Question ${question}:`));
  expect(questionResult.percentage).toBe(0);

  if (situation === 'invalid answer') {
    expect(questionResult.answer.kind).toBe('invalid');
    expect(warning).toBeDefined();
  } else if (situation === 'blank answer') {
    // A blank answer scores zero but, unlike an invalid one, raises no alert
    expect(warning).toBeUndefined();
  } else {
    throw new Error(`Unknown situation "${situation}"`);
  }
});

Then('the service returns the error {string}', function (error: string) {
  const code = ERROR_CODES[error];
  if (!code) {
    throw new Error(`Unknown error "${error}"`);
  }
  const { status, body } = requireReply();
  expect(status).toBe(400);
  expect((body.errors ?? []).map(e => e.code)).toContain(code);
});

Then('{string} has exactly one grade for exam {string}', async function (name: string, _exam: string) {
  const { evaluations } = await enrollmentOf(name);
  expect(evaluations.filter(evaluation => evaluation.goal === EXAM_GOAL)).toEqual([
    { goal: EXAM_GOAL, grade: numericGradeOf(resultOf(name).percentage) }
  ]);
});
