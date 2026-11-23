import { AutoGradingProblem, AutoGradingRequest, AutoGradingResponse, GradingErrorCode, Sheet } from '../types/AutoGrading';
import { ApiError, request } from './apiClient';
import { classPath } from './ClassService';

const toFormData = ({ answerKey, responses, goal }: AutoGradingRequest): FormData => {
  const form = new FormData();
  form.append('answerKey', answerKey);
  form.append('responses', responses);
  form.append('goal', goal);
  return form;
};

// No Content-Type header on purpose: the browser sets it, with the multipart boundary
const send = (classId: string, suffix: string, input: AutoGradingRequest, failureMessage: string) =>
  request<AutoGradingResponse>(`${classPath(classId)}/auto-grade${suffix}`, failureMessage, {
    method: 'POST',
    body: toFormData(input)
  });

// The spreadsheet each problem found by the server is in
const SHEET_OF_ERROR: Record<GradingErrorCode, Sheet> = {
  NO_ANSWER_KEYS: 'answerKey',
  DUPLICATE_EXAM_IN_ANSWER_KEY: 'answerKey',
  INVALID_ALTERNATIVES: 'answerKey',
  INVALID_ANSWER_KEY: 'answerKey',
  NO_RESPONSES: 'responses',
  EXAM_NOT_IN_ANSWER_KEY: 'responses',
  ANSWER_COUNT_MISMATCH: 'responses'
};

type GradingErrorsBody = { errors: { code: GradingErrorCode; message: string }[] };

const hasGradingErrors = (body: unknown): body is GradingErrorsBody =>
  Array.isArray((body as Partial<GradingErrorsBody> | undefined)?.errors);

/**
 * Turns a failed correction into the problems to show, one per error the
 * server found, each with the spreadsheet it is in when the server says so.
 */
export const problemsOf = (error: unknown): AutoGradingProblem[] => {
  if (error instanceof ApiError) {
    if (hasGradingErrors(error.body) && error.body.errors.length > 0) {
      return error.body.errors.map(({ code, message }) => ({ message, sheet: SHEET_OF_ERROR[code] }));
    }
    return [{ message: error.message }];
  }
  if (error instanceof TypeError) {
    // fetch rejects with a TypeError when the server cannot be reached
    return [{ message: 'Could not reach the server. Check your connection and try again.' }];
  }
  return [{ message: (error as Error)?.message || 'Unexpected error' }];
};

/** Automatic correction of exams from the answer key and the responses sheets (CSV). */
export const autoGradingService = {
  /** Grades and ranks, but saves nothing. */
  preview: (classId: string, input: AutoGradingRequest): Promise<AutoGradingResponse> =>
    send(classId, '/preview', input, 'Failed to preview the grading'),

  /** Grades, ranks and saves the grades as the evaluation of the chosen goal (replacing the ones it had). */
  grade: (classId: string, input: AutoGradingRequest): Promise<AutoGradingResponse> =>
    send(classId, '', input, 'Failed to grade the exams')
};