import React, { useState } from 'react';

export const MAX_GOALS = 20;
export const MAX_GOAL_NAME_LENGTH = 60;

interface GoalsEditorProps {
  goals: string[];
  onChange: (goals: string[]) => void;
  disabled?: boolean; // shows the goals without allowing changes
}

const sameGoal = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Chips with the goals of a class, to remove, and a field to add others. A class needs at least one. */
const GoalsEditor: React.FC<GoalsEditorProps> = ({ goals, onChange, disabled = false }) => {
  const [draft, setDraft] = useState('');

  const trimmed = draft.trim();
  const alreadyThere = goals.some(goal => sameGoal(goal, trimmed));
  const canAdd = !disabled && trimmed !== '' && !alreadyThere && goals.length < MAX_GOALS;

  const addGoal = () => {
    if (!canAdd) return;
    onChange([...goals, trimmed]);
    setDraft('');
  };

  const removeGoal = (goal: string) => onChange(goals.filter(g => g !== goal));

  return (
    <div className="goals-editor" data-testid="goals-editor">
      <label htmlFor="goal-input">Goals:</label>

      <div className="goal-chips">
        {goals.map(goal => (
          <span key={goal} className="goal-chip" data-testid="goal-chip">
            {goal}
            {!disabled && (
              <button
                type="button"
                className="goal-chip-remove"
                aria-label={`Remove goal ${goal}`}
                title="Remove goal"
                disabled={goals.length === 1}
                onClick={() => removeGoal(goal)}
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>

      {!disabled && (
        <div className="goal-add">
          <input
            type="text"
            id="goal-input"
            data-testid="goal-input"
            value={draft}
            maxLength={MAX_GOAL_NAME_LENGTH}
            placeholder="e.g., Exam 1"
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault(); // Enter must add the goal, not submit the class form
                addGoal();
              }
            }}
          />
          <button type="button" data-testid="goal-add" onClick={addGoal} disabled={!canAdd}>
            Add goal
          </button>
        </div>
      )}

      {disabled && <small className="goals-note">The goals cannot be changed after the class is created.</small>}
    </div>
  );
};

export default GoalsEditor;