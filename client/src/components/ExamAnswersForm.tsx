import React from 'react';
import { Student } from '../types/Student';
import { decodePropositions } from '../types/ExamSubmission';

/** One question of the form: what is asked and the largest sum that can be answered. */
export interface ExamFormQuestion {
  label: string;
  maxSum: number;
  /** The statement from the exam bank, when the exam comes from there. */
  statement?: string;
}

/** The exam being answered. */
export interface ExamFormConfig {
  code?: string;
  title: string;
  questions: ExamFormQuestion[];
}

interface ExamAnswersFormProps {
  exam: ExamFormConfig;
  student: Student;
  tipoProva: string;
  answers: string[];
  isSubmitting: boolean;
  onTipoProvaChange: (value: string) => void;
  onAnswerChange: (index: number, value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}

/** How a typed sum is shown in the summary: its value and the alternatives it stands for. */
export function describeAnswer(rawValue: string, maxSum: number): string {
  const trimmed = rawValue.trim();
  if (trimmed === '') {
    return 'Não preenchida';
  }
  const sum = Number(trimmed);
  if (!Number.isInteger(sum) || sum < 0 || sum > maxSum) {
    return `Valor inválido (use inteiro de 0 a ${maxSum})`;
  }
  if (sum === 0) {
    return '0 (nenhuma proposição marcada)';
  }
  return `${sum} (proposições: ${decodePropositions(sum).join(', ')})`;
}

/**
 * The answer form, laid out like a Google Form: a single column with one
 * card per field (exam type first, then one card per question), so the
 * student fills them top to bottom. All the state lives in the parent.
 */
const ExamAnswersForm: React.FC<ExamAnswersFormProps> = ({
  exam,
  student,
  tipoProva,
  answers,
  isSubmitting,
  onTipoProvaChange,
  onAnswerChange,
  onSubmit,
  onBack
}) => {
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    // noValidate: the fields are checked by the application, which shows its own messages
    <form
      className="exam-answers-form"
      data-cy={`pagina-Formulário da ${exam.title}`}
      onSubmit={handleSubmit}
      noValidate
    >
      <header className="exam-answers-form-header">
        <h2>Formulário da {exam.title}</h2>
        <p className="exam-answers-form-student">
          Estudante: {student.name} ({student.cpf})
        </p>
        <p className="exam-answers-form-legend">
          <span className="exam-answers-required" aria-hidden="true">*</span> Obrigatório. Digite 0 se não marcar nenhuma proposição.
        </p>
      </header>

      <div className="exam-answers-card" data-cy="cartao-Tipo da Prova">
        <label htmlFor="exam-answers-tipo-prova">
          Tipo da Prova (Número da Prova) <span className="exam-answers-required" aria-hidden="true">*</span>
        </label>
        <input
          id="exam-answers-tipo-prova"
          data-cy="campo-Tipo da Prova"
          inputMode="numeric"
          autoComplete="off"
          aria-required="true"
          placeholder="Ex: 1, 2 ou 3"
          value={tipoProva}
          onChange={(event) => onTipoProvaChange(event.target.value)}
        />
      </div>

      {exam.questions.map((question, index) => {
        const inputId = `exam-answers-questao-${index + 1}`;
        const hintId = `${inputId}-dica`;
        return (
          <div className="exam-answers-card" key={question.label} data-cy={`cartao-${question.label}`}>
            <label htmlFor={inputId}>
              {question.label} <span className="exam-answers-required" aria-hidden="true">*</span>
            </label>
            {question.statement && <p className="exam-answers-statement">{question.statement}</p>}
            <input
              id={inputId}
              data-cy={`campo-${question.label}`}
              inputMode="numeric"
              autoComplete="off"
              aria-required="true"
              aria-describedby={hintId}
              placeholder="Sua resposta"
              value={answers[index] ?? ''}
              onChange={(event) => onAnswerChange(index, event.target.value)}
            />
            <p className="exam-answers-hint" id={hintId}>
              Soma das proposições corretas (0 a {question.maxSum})
            </p>
          </div>
        );
      })}

      <div className="exam-answers-summary" data-cy="resumo-selecionado">
        <h4>Resumo das questões preenchidas</h4>
        <ul>
          <li>
            <strong>Tipo da Prova:</strong> {tipoProva.trim() || 'Não informado'}
          </li>
          {exam.questions.map((question, index) => (
            <li key={question.label}>
              <strong>{question.label}:</strong> {describeAnswer(answers[index] ?? '', question.maxSum)}
            </li>
          ))}
        </ul>
      </div>

      <div className="form-buttons">
        <button type="submit" data-cy="opcao-Enviar" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando...' : 'Enviar'}
        </button>
        <button type="button" data-cy="opcao-Voltar" onClick={onBack}>
          Voltar
        </button>
      </div>
    </form>
  );
};

export default ExamAnswersForm;
