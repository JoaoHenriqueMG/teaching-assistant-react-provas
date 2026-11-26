import React from 'react';
import { ExamSubmission } from '../types/ExamSubmission';

interface ExamSubmissionsPanelProps {
  /** Titles of the exams the submissions can be filtered and exported by. */
  examTitles: string[];
  /** Selected exam title, or '' for all the exams. */
  examFilter: string;
  /** The submissions of the selected exam (all of them when none is selected). */
  submissions: ExamSubmission[];
  onExamFilterChange: (examTitle: string) => void;
  onExport: () => void;
}

/** The submissions kept by the server, with the CSV export for the auto-grading. */
const ExamSubmissionsPanel: React.FC<ExamSubmissionsPanelProps> = ({
  examTitles,
  examFilter,
  submissions,
  onExamFilterChange,
  onExport
}) => (
  <div className="students-list exam-answers-panel" data-cy="painel-submissoes-registradas">
    <div className="exam-answers-export-bar">
      <div>
        <h2>Respostas Registradas no Servidor ({submissions.length})</h2>
        <p className="exam-answers-export-hint">
          Exporte a planilha CSV no formato da Correção Automática (uma avaliação por vez).
        </p>
      </div>
      <div className="exam-answers-export-actions">
        <select
          aria-label="Filtrar avaliação para exportar"
          data-cy="filtro-exportar-prova"
          className="class-select"
          value={examFilter}
          onChange={(event) => onExamFilterChange(event.target.value)}
        >
          <option value="">Todas as avaliações</option>
          {examTitles.map((title) => (
            <option key={title} value={title}>
              {title}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="edit-btn"
          data-cy="botao-exportar-csv"
          disabled={submissions.length === 0}
          onClick={onExport}
        >
          Exportar CSV
        </button>
      </div>
    </div>

    {submissions.length > 0 && (
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Avaliação</th>
              <th>Estudante</th>
              <th>CPF</th>
              <th>Nº Prova</th>
              <th>Respostas</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission) => (
              <tr key={`${submission.studentCpf}::${submission.examTitle}`}>
                <td><strong>{submission.examTitle}</strong></td>
                <td>{submission.studentName}</td>
                <td>{submission.studentCpf}</td>
                <td>{submission.tipoProva}</td>
                <td>{submission.questions.map((q) => `${q.label}: ${q.sum}`).join(' | ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

export default ExamSubmissionsPanel;
