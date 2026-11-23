import React, { useEffect, useState } from 'react';
import { Class } from '../types/Class';
import { AutoGradingProblem, AutoGradingResponse, RankedStudent, Sheet } from '../types/AutoGrading';
import { autoGradingService, problemsOf } from '../services/AutoGradingService';
import SheetDropzone, { SheetExample } from './SheetDropzone';
import SheetIcon from './SheetIcon';
import AutoGradingError, { SHEET_LABELS } from './AutoGradingError';

interface AutoGradingProps {
  classObj: Class;
  onGraded: (ranking: RankedStudent[]) => void; // called after the grades were saved
  onClose: () => void;
}

// What the professor sees, faded, before choosing each file
const ANSWER_KEY_EXAMPLE: SheetExample = {
  header: ['número da prova', 'alternativas', 'questão 1', 'questão 2', 'questão 3'],
  rows: [
    ['01', '5', '3', '9', '15'],
    ['02', '5', '9', '15', '3']
  ]
};

const RESPONSES_EXAMPLE: SheetExample = {
  header: ['Carimbo de data/hora', 'nome', 'e-mail', 'CPF', 'número da prova', 'questão 1', 'questão 2', 'questão 3'],
  rows: [['2026/11/17 10:30:45', 'Pedro', 'pedro@email.com', '111.111.111-11', '01', '3', '3', '15']]
};

const formatGrade = (grade: string | number): string => (typeof grade === 'number' ? grade.toFixed(1) : grade);

const describeQuestion = (student: RankedStudent, index: number): string => {
  const question = student.questionResults[index];
  const label = `Question ${question.questionIndex + 1}`;
  if (question.answer.kind === 'invalid') {
    const { raw } = question.answer;
    if (raw === '') return `${label}: invalid answer (empty)`;
    const limit = /^\d+$/.test(raw)
      ? ` — the maximum with ${student.alternatives} alternatives is ${2 ** student.alternatives - 1}`
      : '';
    return `${label}: invalid answer (${raw})${limit}`;
  }
  return `${label}: answered ${question.answer.value}, key ${question.answerKey} — ${question.percentage}%`;
};

/**
 * Popup that corrects the exams of a class automatically: the professor
 * sends the answer key and the students' responses (CSV), picks the goal that
 * receives the grades and gets the students ranked. "Preview" shows the
 * result without saving anything. The number of alternatives of each exam is
 * a column of the answer key sheet.
 */
const AutoGrading: React.FC<AutoGradingProps> = ({ classObj, onGraded, onClose }) => {
  const [answerKey, setAnswerKey] = useState<File | null>(null);
  const [responses, setResponses] = useState<File | null>(null);
  const [goal, setGoal] = useState('');
  const [result, setResult] = useState<AutoGradingResponse | null>(null);
  const [busy, setBusy] = useState<'preview' | 'grade' | null>(null);
  const [problems, setProblems] = useState<AutoGradingProblem[]>([]); // why the last correction failed
  const [attempted, setAttempted] = useState(false); // a missing file is only pointed out after trying

  // Esc closes the popup
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  // The goal chosen earlier may not exist in another class
  const selectedGoal = classObj.goals.includes(goal) ? goal : classObj.goals[0] ?? '';

  const hasGradesForGoal = classObj.enrollments.some(enrollment =>
    enrollment.evaluations.some(evaluation => evaluation.goal === selectedGoal)
  );

  // A result or an error shown for other files or settings would be misleading
  const changed = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setResult(null);
    setProblems([]);
  };

  // Problems found before sending, shown under each field: nothing is sent while there is one
  const fileProblem = (file: File | null, sheet: Sheet): string | undefined => {
    if (!file) return attempted ? `Choose the ${SHEET_LABELS[sheet].toLowerCase()} spreadsheet` : undefined;
    if (!file.name.toLowerCase().endsWith('.csv')) return `"${file.name}" is not a .csv file`;
    return undefined;
  };
  const answerKeyProblem = fileProblem(answerKey, 'answerKey');
  const responsesProblem = fileProblem(responses, 'responses');
  const goalProblem =
    classObj.goals.length === 0 ? 'This class has no goals to receive the grades: add one by editing the class' : undefined;

  // The server found a problem in this sheet
  const hasProblemIn = (sheet: Sheet) => problems.some(problem => problem.sheet === sheet);

  const run = async (commit: boolean) => {
    setAttempted(true);
    setResult(null);
    setProblems([]);
    if (!answerKey || !responses || answerKeyProblem || responsesProblem || goalProblem) {
      return;
    }

    setBusy(commit ? 'grade' : 'preview');
    try {
      const input = { answerKey, responses, goal: selectedGoal };
      const response = commit
        ? await autoGradingService.grade(classObj.id, input)
        : await autoGradingService.preview(classObj.id, input);
      setResult(response);
      if (commit) {
        onGraded(response.ranking);
      }
    } catch (error) {
      setProblems(problemsOf(error));
    } finally {
      setBusy(null);
    }
  };

  const studentsWithWarnings = result ? result.ranking.filter(student => student.warnings.length > 0).length : 0;

  const message = (response: AutoGradingResponse): string => {
    const count = response.ranking.length;
    const students = `${count} student${count === 1 ? '' : 's'}`;
    const alerts = studentsWithWarnings > 0 ? ` — ${studentsWithWarnings} with invalid answers` : '';
    return response.saved
      ? `Grades saved for ${students}${alerts}.`
      : `Preview: nothing was saved. ${students} would be graded${alerts}.`;
  };

  return (
    <div className="auto-grading-overlay">
      <div
        className="auto-grading-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auto-grading-title"
        data-testid="auto-grading"
      >
        <div className="auto-grading-modal-header">
          <h3 id="auto-grading-title">
            <SheetIcon size={24} /> Automatic correction
          </h3>
          <button
            type="button"
            className="close-modal-btn auto-grading-close"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            data-testid="auto-grading-close"
          >
            ×
          </button>
        </div>
        <p className="auto-grading-subtitle">
          {classObj.topic} ({classObj.year}/{classObj.semester})
        </p>

        <div className="auto-grading-body">
          <SheetDropzone
            id="answerKeyFile"
            label={SHEET_LABELS.answerKey}
            file={answerKey}
            onFile={changed(setAnswerKey)}
            invalid={hasProblemIn('answerKey')}
            problem={answerKeyProblem}
            example={ANSWER_KEY_EXAMPLE}
            testId="answer-key-upload"
          />

          <SheetDropzone
            id="responsesFile"
            label={SHEET_LABELS.responses}
            file={responses}
            onFile={changed(setResponses)}
            invalid={hasProblemIn('responses')}
            problem={responsesProblem}
            example={RESPONSES_EXAMPLE}
            testId="responses-upload"
          />

          <p className="auto-grading-help">
            The “alternativas” column of the answer key is the number of alternatives of each exam. Each answer is
            the sum of the marked alternatives (1, 2, 4, 8, …) and the answers must be the last columns.
          </p>

          <div className="auto-grading-options">
            <div className="form-group">
              <label htmlFor="gradeGoal">Goal that receives the grades:</label>
              <select
                id="gradeGoal"
                data-testid="grade-goal"
                value={selectedGoal}
                onChange={e => changed(setGoal)(e.target.value)}
              >
                {classObj.goals.map(classGoal => (
                  <option key={classGoal} value={classGoal}>{classGoal}</option>
                ))}
              </select>
              {goalProblem && <span className="sheet-problem" role="alert" data-testid="grade-goal-problem">{goalProblem}</span>}
            </div>
          </div>

          {hasGradesForGoal && (
            <p className="auto-grading-notice" data-testid="overwrite-notice">
              Grades already saved for “{selectedGoal}” will be replaced.
            </p>
          )}

          <div className="form-buttons">
            <button
              type="button"
              className="submit-btn"
              data-testid="auto-grade-submit"
              disabled={busy !== null}
              onClick={() => run(true)}
            >
              {busy === 'grade' ? 'Grading...' : 'Correct automatically'}
            </button>
            <button
              type="button"
              className="cancel-btn"
              data-testid="auto-grade-preview"
              disabled={busy !== null}
              onClick={() => run(false)}
            >
              {busy === 'preview' ? 'Checking...' : 'Preview without saving'}
            </button>
          </div>

          {problems.length > 0 && <AutoGradingError problems={problems} />}

          {result && (
            <div className="auto-grading-result" data-testid="auto-grading-result">
              <div
                role="status"
                data-testid="auto-grading-message"
                className={`auto-grading-message ${studentsWithWarnings > 0 ? 'with-warnings' : 'ok'}`}
              >
                {message(result)}
              </div>

              {result.warnings.map(warning => (
                <div key={warning} className="auto-grading-alert" data-testid="auto-grading-warning">{warning}</div>
              ))}

              {result.notInClass.length > 0 && (
                <div className="auto-grading-alert" data-testid="not-in-class">
                  Not enrolled in this class, so no grade was saved:{' '}
                  {result.notInClass.map(student => `${student.studentName || 'Unnamed'} (${student.studentId})`).join(', ')}
                </div>
              )}

              <div className="ranking-scroll">
                <table className="ranking-table" data-testid="ranking-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Student</th>
                      <th>Exam</th>
                      <th>Score</th>
                      <th>Grade ({result.goal})</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.ranking.map(student => (
                      <tr key={student.studentId} data-testid={`ranking-row-${student.studentId}`}>
                        <td data-testid="ranking-rank">{student.rank}</td>
                        <td data-testid="ranking-name">{student.studentName}</td>
                        <td>{student.examNumber}</td>
                        <td data-testid="ranking-percentage">{student.percentage}%</td>
                        <td data-testid="ranking-grade">{formatGrade(student.grade)}</td>
                        <td>
                          {student.warnings.length > 0 && (
                            <span className="warning-badge" data-testid="student-warnings">
                              ⚠ {student.warnings.length} invalid
                            </span>
                          )}
                          <details data-testid="student-details">
                            <summary>Questions ({student.alternatives} alternatives each)</summary>
                            <ul>
                              {student.questionResults.map((question, index) => (
                                <li key={question.questionIndex} className={question.answer.kind === 'invalid' ? 'invalid-answer' : ''}>
                                  {describeQuestion(student, index)}
                                </li>
                              ))}
                            </ul>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AutoGrading;