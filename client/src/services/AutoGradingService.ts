import { AutoGradingRequest, AutoGradingResponse } from '../types/AutoGrading';
import { request } from './apiClient';
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

/** Automatic correction of exams from the answer key and the responses sheets (CSV). */
export const autoGradingService = {
  /** Grades and ranks, but saves nothing. */
  preview: (classId: string, input: AutoGradingRequest): Promise<AutoGradingResponse> =>
    send(classId, '/preview', input, 'Failed to preview the grading'),

  /** Grades, ranks and saves the grades as the evaluation of the chosen goal (replacing the ones it had). */
  grade: (classId: string, input: AutoGradingRequest): Promise<AutoGradingResponse> =>
    send(classId, '', input, 'Failed to grade the exams')
};