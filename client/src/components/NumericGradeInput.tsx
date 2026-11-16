import React, { useEffect, useState } from 'react';
import { NUMERIC_GRADE_MIN, NUMERIC_GRADE_MAX } from '../types/Evaluation';

interface NumericGradeInputProps {
  value: string;
  onCommit: (value: string) => void;
  onError: (message: string) => void;
}

const NumericGradeInput: React.FC<NumericGradeInputProps> = ({ value, onCommit, onError }) => {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === value) return;

    if (trimmed !== '') {
      const n = Number(trimmed);
      if (Number.isNaN(n) || n < NUMERIC_GRADE_MIN || n > NUMERIC_GRADE_MAX) {
        onError(`Grade must be a number between ${NUMERIC_GRADE_MIN} and ${NUMERIC_GRADE_MAX}`);
        setDraft(value);
        return;
      }
    }
    onCommit(trimmed);
  };

  return (
    <input
      type="number"
      min={NUMERIC_GRADE_MIN}
      max={NUMERIC_GRADE_MAX}
      step="0.1"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className="evaluation-input grade-numeric"
    />
  );
};

export default NumericGradeInput;