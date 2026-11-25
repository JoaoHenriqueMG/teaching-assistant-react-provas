import React, { useEffect, useMemo, useState } from 'react';
import { Student } from '../types/Student';
import {
  AvailableExamDetail,
  AvailableExamSummary,
  DEFAULT_MAX_SUM,
  ExamSubmission,
  maxSumForAlternatives
} from '../types/ExamSubmission';
import { examSubmissionService } from '../services/ExamSubmissionService';
import { studentService } from '../services/StudentService';
import ExamAnswersForm, { ExamFormConfig } from './ExamAnswersForm';
import ExamSubmissionsPanel from './ExamSubmissionsPanel';
import './ExamAnswersSection.css';

type Page = 'list' | 'form';

/**
 * The exam used while the exam bank (GET /api/exams) is empty or
 * unavailable, so the feature can be used and tested on its own.
 */
export const FALLBACK_EXAM: ExamFormConfig = {
  title: '1ª EE',
  questions: [1, 2, 3].map((n) => ({ label: `Questão ${n}`, maxSum: DEFAULT_MAX_SUM }))
};

const normalizeCpf = (cpf: string): string => cpf.replace(/\D/g, '');
const submissionKey = (cpf: string, examTitle: string): string => `${normalizeCpf(cpf)}::${examTitle.trim()}`;

/** The exam as listed by the exam bank: its questions are known, but not their alternatives yet. */
function examFromSummary(summary: AvailableExamSummary): ExamFormConfig {
  const count = Math.max(1, summary.questionCodes?.length ?? 1);
  return {
    code: summary.code,
    title: summary.name,
    questions: Array.from({ length: count }, (_, index) => ({
      label: `Questão ${index + 1}`,
      maxSum: DEFAULT_MAX_SUM
    }))
  };
}

/** The exam with its statements; each question allows the sums of its own number of alternatives. */
function examFromDetail(detail: AvailableExamDetail): ExamFormConfig | undefined {
  if (!Array.isArray(detail.questions) || detail.questions.length === 0) {
    return undefined;
  }
  return {
    code: detail.code,
    title: detail.name,
    questions: detail.questions.map((question, index) => ({
      label: `Questão ${index + 1}`,
      statement: question.statement,
      maxSum: question.alternatives?.length
        ? maxSumForAlternatives(question.alternatives.length)
        : DEFAULT_MAX_SUM
    }))
  };
}

/** Downloads text as a file, without leaving the page. */
function downloadText(text: string, fileName: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Registration of a student's exam answers: the student picks an exam,
 * fills the exam type and the sum of the correct alternatives of each
 * question, and gets a confirmation. An exam can only be answered once per
 * student. Like the other tabs, it loads its own data (students, exams and
 * submissions) from the server.
 */
const ExamAnswersSection: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCpf, setSelectedCpf] = useState('');
  const [availableExams, setAvailableExams] = useState<ExamFormConfig[]>([FALLBACK_EXAM]);
  const [activeExam, setActiveExam] = useState<ExamFormConfig>(FALLBACK_EXAM);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [page, setPage] = useState<Page>('list');
  const [tipoProva, setTipoProva] = useState('');
  const [answers, setAnswers] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exportExamTitle, setExportExamTitle] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [studentsResult, submissionsResult, examsResult] = await Promise.allSettled([
        studentService.getAllStudents(),
        examSubmissionService.getAllSubmissions(),
        examSubmissionService.getAvailableExams()
      ]);
      if (!active) return;

      if (studentsResult.status === 'fulfilled') {
        setStudents(studentsResult.value);
      } else {
        setErrorMsg('Failed to load students. Please try again.');
      }
      if (submissionsResult.status === 'fulfilled' && Array.isArray(submissionsResult.value)) {
        setSubmissions(submissionsResult.value);
      }
      // Without the exam bank (or with no exam in it), the fallback exam stays
      if (examsResult.status === 'fulfilled' && Array.isArray(examsResult.value) && examsResult.value.length > 0) {
        const exams = examsResult.value.map(examFromSummary);
        setAvailableExams(exams);
        setActiveExam(exams[0]);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const selectedStudent = students.find((student) => student.cpf === selectedCpf) ?? null;

  const submissionsByKey = useMemo(() => {
    const byKey: Record<string, ExamSubmission> = {};
    submissions.forEach((submission) => {
      byKey[submissionKey(submission.studentCpf, submission.examTitle)] = submission;
    });
    return byKey;
  }, [submissions]);

  const statusOf = (examTitle: string): 'Disponível' | 'Respondida' =>
    selectedStudent && submissionsByKey[submissionKey(selectedStudent.cpf, examTitle)]
      ? 'Respondida'
      : 'Disponível';

  /** The confirmation card: the active exam's submission, or else the student's latest one. */
  const confirmation = useMemo(() => {
    if (!selectedStudent) return undefined;
    const own = submissions.filter(
      (submission) => normalizeCpf(submission.studentCpf) === normalizeCpf(selectedStudent.cpf)
    );
    return submissionsByKey[submissionKey(selectedStudent.cpf, activeExam.title)] ?? own[own.length - 1];
  }, [selectedStudent, submissions, submissionsByKey, activeExam.title]);

  const exportedSubmissions = useMemo(
    () => (exportExamTitle ? submissions.filter((s) => s.examTitle === exportExamTitle) : submissions),
    [submissions, exportExamTitle]
  );

  const clearMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleStudentChange = (cpf: string) => {
    setSelectedCpf(cpf);
    setPage('list');
    setTipoProva('');
    setAnswers(activeExam.questions.map(() => ''));
    clearMessages();
  };

  const handleSelectExam = async (exam: ExamFormConfig) => {
    if (!selectedStudent) return;
    clearMessages();

    if (statusOf(exam.title) === 'Respondida') {
      setErrorMsg('Você já enviou as respostas desta avaliação');
      return;
    }

    let resolved = exam;
    if (exam.code) {
      try {
        resolved = examFromDetail(await examSubmissionService.getExamDetail(exam.code)) ?? exam;
      } catch {
        // Without the details the form still works, with the default limits
      }
    }

    setActiveExam(resolved);
    setTipoProva('');
    setAnswers(resolved.questions.map(() => ''));
    setPage('form');
  };

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers((previous) => previous.map((answer, i) => (i === index ? value : answer)));
  };

  const handleSubmit = async () => {
    if (!selectedStudent || isSubmitting) return;
    clearMessages();

    if (!tipoProva.trim()) {
      setErrorMsg('O tipo da prova é obrigatório');
      return;
    }
    if (activeExam.questions.some((_, index) => (answers[index] ?? '').trim() === '')) {
      setErrorMsg('Todas as questões são obrigatórias. Digite 0 caso não marque nenhuma proposição');
      return;
    }

    const questions = activeExam.questions.map((question, index) => ({
      label: question.label,
      sum: Number(answers[index]),
      maxSum: question.maxSum
    }));
    const outOfRange = questions.find((q) => !Number.isInteger(q.sum) || q.sum < 0 || q.sum > q.maxSum);
    if (outOfRange) {
      setErrorMsg(`A soma de cada questão deve ser um valor entre 0 e ${outOfRange.maxSum}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const saved = await examSubmissionService.createSubmission({
        studentCpf: selectedStudent.cpf,
        examTitle: activeExam.title,
        tipoProva: tipoProva.trim(),
        questions: questions.map(({ label, sum }) => ({ label, sum })),
        maxSum: Math.max(...questions.map((q) => q.maxSum))
      });
      setSubmissions((previous) => [
        ...previous.filter(
          (item) => submissionKey(item.studentCpf, item.examTitle) !== submissionKey(saved.studentCpf, saved.examTitle)
        ),
        saved
      ]);
      setPage('list');
      setSuccessMsg('Respostas enviadas com sucesso');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Erro ao salvar as respostas da avaliação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCsv = async () => {
    setErrorMsg('');
    try {
      const csv = await examSubmissionService.exportSubmissionsCsv(exportExamTitle || undefined);
      const fileName = `respostas-${(exportExamTitle || 'todas').replace(/[^a-zA-Z0-9_-]+/g, '_')}.csv`;
      downloadText(csv, fileName, 'text/csv;charset=utf-8;');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Erro ao exportar planilha CSV');
    }
  };

  return (
    <section className="exam-answers-section" data-cy="secao-respostas-prova">
      <h2>Respostas da prova</h2>

      <div className="class-selection-container">
        <label htmlFor="exam-student-select">Selecionar Estudante:</label>
        <select
          id="exam-student-select"
          data-cy="seletor-estudante"
          className="class-select"
          value={selectedCpf}
          onChange={(event) => handleStudentChange(event.target.value)}
        >
          <option value="">-- Selecione um estudante --</option>
          {students.map((student) => (
            <option key={student.cpf} value={student.cpf}>
              {student.name} ({student.cpf})
            </option>
          ))}
        </select>
      </div>

      {students.length === 0 && (
        <div className="evaluation-placeholder">
          <h4>Nenhum estudante cadastrado</h4>
          <p>Cadastre os estudantes na aba Students antes de registrar as respostas das provas.</p>
        </div>
      )}

      {students.length > 0 && !selectedStudent && (
        <div className="evaluation-placeholder">
          <h4>Nenhum estudante selecionado</h4>
          <p>Selecione um estudante acima para preencher o número da prova e as somas de cada questão.</p>
        </div>
      )}

      {errorMsg && (
        <div role="alert" data-cy="mensagem-erro" className="error-message">
          {errorMsg}
        </div>
      )}

      {selectedStudent && (
        <>
          {successMsg && (
            <div role="status" data-cy="mensagem-sucesso" className="auto-enrollment-notice">
              <strong>{successMsg}</strong>
            </div>
          )}

          {page === 'list' && (
            <div className="students-list" data-cy="pagina-Provas Disponíveis">
              <h2>Provas Disponíveis — {selectedStudent.name}</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Avaliação</th>
                      <th>Estudante</th>
                      <th>Questões</th>
                      <th>Status</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableExams.map((exam) => {
                      const status = statusOf(exam.title);
                      return (
                        <tr key={exam.code ?? exam.title} data-cy={`item-${exam.title}`}>
                          <td><strong>{exam.title}</strong></td>
                          <td>{selectedStudent.name} ({selectedStudent.cpf})</td>
                          <td>{exam.questions.length}</td>
                          <td>
                            <span
                              data-cy={`status-${exam.title}`}
                              className={`exam-status-badge ${status === 'Respondida' ? 'status-answered' : 'status-available'}`}
                            >
                              {status}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="edit-btn"
                              data-cy={`selecionar-${exam.title}`}
                              onClick={() => handleSelectExam(exam)}
                            >
                              {exam.title}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {confirmation && (
                <div className="exam-confirmation-card" data-cy="confirmacao-respostas">
                  <h3>Confirmação das questões enviadas ({confirmation.examTitle})</h3>
                  <p className="exam-confirmation-meta">
                    <strong>Estudante:</strong> {confirmation.studentName} ({confirmation.studentCpf}) &nbsp;|&nbsp;{' '}
                    <strong>Número / Tipo da Prova:</strong>{' '}
                    <span data-cy="confirmacao-tipo-prova">{confirmation.tipoProva}</span>
                  </p>
                  <ul className="exam-confirmation-list">
                    {confirmation.questions.map((item) => (
                      <li key={item.label} data-cy={`confirmacao-${item.label}`}>
                        <strong>{item.label}:</strong> Soma {item.sum}{' '}
                        <span className="exam-propositions-detail">
                          {item.sum === 0
                            ? '(nenhuma proposição marcada)'
                            : `(proposições: ${item.propositions.join(', ')})`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {page === 'form' && (
            <ExamAnswersForm
              exam={activeExam}
              student={selectedStudent}
              tipoProva={tipoProva}
              answers={answers}
              isSubmitting={isSubmitting}
              onTipoProvaChange={setTipoProva}
              onAnswerChange={handleAnswerChange}
              onSubmit={handleSubmit}
              onBack={() => {
                setErrorMsg('');
                setPage('list');
              }}
            />
          )}
        </>
      )}

      <ExamSubmissionsPanel
        examTitles={availableExams.map((exam) => exam.title)}
        examFilter={exportExamTitle}
        submissions={exportedSubmissions}
        onExamFilterChange={setExportExamTitle}
        onExport={handleExportCsv}
      />
    </section>
  );
};

export default ExamAnswersSection;
