import React, { useEffect, useState } from 'react';
import { NUMERIC_GRADE_MIN, NUMERIC_GRADE_MAX, gradeBand } from '../types/Evaluation';

interface NumericGradeInputProps {
  value: string;
  onCommit: (value: string) => void;
  onError: (message: string) => void;
  label?: string; // accessible name, e.g. "Ana Lima, Tests"
}

/** "8,5" (Brazilian keyboard) -> "8.5" */
const normalize = (text: string): string => text.trim().replace(',', '.');

const NumericGradeInput: React.FC<NumericGradeInputProps> = ({ value, onCommit, onError, label }) => {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    const text = normalize(draft);
    if (text === value || (text !== '' && Number(text) === Number(value) && value !== '')) {
      setDraft(value);
      return;
    }

    if (text !== '') {
      const n = Number(text);
      if (Number.isNaN(n) || n < NUMERIC_GRADE_MIN || n > NUMERIC_GRADE_MAX) {
        onError(`Grade must be a number between ${NUMERIC_GRADE_MIN} and ${NUMERIC_GRADE_MAX}${label ? ` (${label})` : ''}`);
        setDraft(value);
        return;
      }
    }
    onCommit(text);
  };

  // Coloured while typing, like the concept selects; red outline while out of range
  const typed = normalize(draft);
  const typedNumber = Number(typed);
  const isValid = typed === '' || (!Number.isNaN(typedNumber) && typedNumber >= NUMERIC_GRADE_MIN && typedNumber <= NUMERIC_GRADE_MAX);
  const band = isValid && typed !== '' ? gradeBand(typedNumber) : '';

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={label}
      aria-invalid={!isValid || undefined}
      placeholder="-"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setDraft(value);
      }}
      className={`evaluation-select evaluation-input grade-numeric${band ? ` grade-${band}` : ''}${isValid ? '' : ' invalid'}`}
    />
  );
};

export default NumericGradeInput;
