import React, { useState } from 'react';
import { Class } from '../types/Class';
import {
  AutoGradingResponse,
  DEFAULT_ALTERNATIVES,
  MAX_ALTERNATIVES,
  MIN_ALTERNATIVES,
  RankedStudent
} from '../types/AutoGrading';
import { autoGradingService } from '../services/AutoGradingService';

interface AutoGradingProps {
  classObj: Class;
  onGraded: (ranking: RankedStudent[]) => void; // called after the grades were saved
  onError: (errorMessage: string) => void;
}

const formatGrade = (grade: string | number): string => (typeof grade === 'number' ? grade.toFixed(1) : grade);

const describeQuestion = (student: RankedStudent, index: number): string => {
  const question = student.questionResults[index];
  const label = `Question ${question.questionIndex + 1}`;
  if (question.answer.kind === 'invalid') {
    return `${label}: invalid answer (${question.answer.raw === '' ? 'empty' : question.answer.raw})`;
  }
  return `${label}: answered ${question.answer.value}, key ${question.answerKey} — ${question.percentage}%`;
};

/**
 * Corrects the exams of a class automatically: the professor sends the answer
 * key and the students' responses (CSV), picks the goal that receives the
 * grades and gets the students ranked. "Preview" shows the result without
 * saving anything.
 */
const AutoGrading: React.FC<AutoGradingProps> = ({ classObj, onGraded, onError }) => {
  const [answerKey, setAnswerKey] = useState<File | null>(null);
  const [responses, setResponses] = useState<File | null>(null);
  const [goal, setGoal] = useState('');
  const [alternatives, setAlternatives] = useState(String(DEFAULT_ALTERNATIVES));
  const [result, setResult] = useState<AutoGradingResponse | null>(null);
  const [busy, setBusy] = useState<'preview' | 'grade' | null>(null);

  // The goal chosen earlier may not exist in another class
  const selectedGoal = classObj.goals.includes(goal) ? goal : classObj.goals[0] ?? '';

  const hasGradesForGoal = classObj.enrollments.some(enrollment =>
    enrollment.evaluations.some(evaluation => evaluation.goal === selectedGoal)
  );

  // A result shown for other files or settings would be misleading
  const changed = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setResult(null);
  };

  const run = async (commit: boolean) => {
    if (!answerKey || !responses) {
      onError('Upload both the answer key and the student responses spreadsheets');
      return;
    }
    const count = Number(alternatives);
    if (!Number.isInteger(count) || count < MIN_ALTERNATIVES || count > MAX_ALTERNATIVES) {
      onError(`The number of alternatives must be a whole number from ${MIN_ALTERNATIVES} to ${MAX_ALTERNATIVES}`);
      return;
    }

    setBusy(commit ? 'grade' : 'preview');
    setResult(null);
    try {
      const input = { answerKey, responses, goal: selectedGoal, alternatives: count };
      const response = commit
        ? await autoGradingService.grade(classObj.id, input)
        : await autoGradingService.preview(classObj.id, input);
      setResult(response);
      if (commit) {
        onGraded(response.ranking);
      }
    } catch (error) {
      onError((error as Error).message);
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
    <section className="auto-grading" data-testid="auto-grading">
      <h4>Automatic correction</h4>

      <div className="auto-grading-form">
        <div className="form-group">
          <label htmlFor="answerKeyFile">Answer key (CSV):</label>
          <input
            type="file"
            id="answerKeyFile"
            data-testid="answer-key-upload"
            accept=".csv"
            onChange={e => changed(setAnswerKey)(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="responsesFile">Student responses (CSV):</label>
          <input
            type="file"
            id="responsesFile"
            data-testid="responses-upload"
            accept=".csv"
            onChange={e => changed(setResponses)(e.target.files?.[0] ?? null)}
          />
        </div>

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
        </div>

        <div className="form-group">
          <label htmlFor="alternatives">Alternatives per question:</label>
          <input
            type="number"
            id="alternatives"
            data-testid="alternatives-input"
            className="alternatives-input"
            min={MIN_ALTERNATIVES}
            max={MAX_ALTERNATIVES}
            value={alternatives}
            onChange={e => changed(setAlternatives)(e.target.value)}
          />
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
                      <summary>Questions</summary>
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
      )}
    </section>
  );
};

export default AutoGrading;