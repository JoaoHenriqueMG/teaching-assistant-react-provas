import React from 'react';
import { AutoGradingProblem, Sheet } from '../types/AutoGrading';

export const SHEET_LABELS: Record<Sheet, string> = {
  answerKey: 'Answer key',
  responses: 'Student responses'
};

interface AutoGradingErrorProps {
  problems: AutoGradingProblem[];
}

/**
 * Why the automatic correction failed, shown inside its popup: one item per
 * problem, naming the spreadsheet to fix when it is known. Nothing was saved.
 */
const AutoGradingError: React.FC<AutoGradingErrorProps> = ({ problems }) => (
  <div role="alert" className="auto-grading-error" data-testid="auto-grading-error">
    <strong>The correction failed and no grade was saved:</strong>
    <ul>
      {problems.map((problem, index) => (
        <li key={index} data-testid="auto-grading-problem">
          {problem.sheet && <strong>{SHEET_LABELS[problem.sheet]}: </strong>}
          {problem.message}
        </li>
      ))}
    </ul>
  </div>
);

export default AutoGradingError;
