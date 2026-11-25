import React, { useEffect, useState } from 'react';
import { Exam, ExamDetail } from '../types/Exam';
import { examService } from '../services/ExamService';
import { examPdfService } from '../services/ExamPdfService';
import { saveFile } from '../services/fileDownload';

export const MESSAGES = {
  noQuestions: 'Nenhuma questão selecionada',
  insufficientData: 'Dados insuficientes'
};

type Feedback = { kind: 'error' | 'warning' | 'success'; text: string } | null;

/**
 * The "Gerar PDFs" tab: the professor chooses one of the registered exams,
 * gives the evaluation data and the number of students and downloads a ZIP
 * with one individual exam (PDF) per student and a spreadsheet with the
 * answer keys. The questions come from the registered exam.
 */
const ExamPdfGeneration: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedCode, setSelectedCode] = useState('');
  const [detail, setDetail] = useState<ExamDetail | null>(null);
  const [detailError, setDetailError] = useState('');

  const [evaluationType, setEvaluationType] = useState('');
  const [evaluationDate, setEvaluationDate] = useState('');
  const [studentCount, setStudentCount] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let active = true;
    examService
      .getAllExams()
      .then(list => {
        if (active) {
          setExams(list);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoadError('Falha ao carregar as provas cadastradas');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setDetail(null);
    setDetailError('');
    if (!selectedCode) return;
    let active = true;
    examService
      .getExamByCode(selectedCode)
      .then(result => {
        if (active) setDetail(result);
      })
      .catch(() => {
        if (active) setDetailError('Falha ao carregar as questões da prova');
      });
    return () => {
      active = false;
    };
  }, [selectedCode]);

  const generate = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    if (!selectedCode) {
      setFeedback({ kind: 'error', text: MESSAGES.noQuestions });
      return;
    }
    const count = Number(studentCount);
    if (!evaluationType.trim() || !evaluationDate.trim() || studentCount.trim() === '' || !Number.isFinite(count)) {
      setFeedback({ kind: 'error', text: MESSAGES.insufficientData });
      return;
    }
    setGenerating(true);
    try {
      const result = await examPdfService.generatePdfs(selectedCode, {
        evaluationType: evaluationType.trim(),
        evaluationDate: evaluationDate.trim(),
        studentCount: count
      });
      saveFile(result.blob, result.fileName);
      const done = `Arquivo gerado com ${count} ${count === 1 ? 'prova' : 'provas'} e 1 planilha de gabaritos.`;
      setFeedback(result.warning ? { kind: 'warning', text: `${result.warning}. ${done}` } : { kind: 'success', text: done });
    } catch (error) {
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'Falha ao gerar as provas' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="exam-creation" data-testid="exam-pdf-generation">
      <h2>Gerar PDFs</h2>

      <section className="exam-section" aria-labelledby="exam-choice-title">
        <h3 id="exam-choice-title">Prova</h3>
        {loading && <p className="exam-hint">Carregando provas...</p>}
        {loadError && <p className="exam-field-error" role="alert">{loadError}</p>}
        {!loading && !loadError && exams.length === 0 && (
          <p className="exam-hint" data-testid="no-exams">Nenhuma prova cadastrada. Crie uma prova para gerar os PDFs.</p>
        )}
        {exams.length > 0 && (
          <div className="form-group">
            <label htmlFor="exam-select">Prova:</label>
            <select id="exam-select" value={selectedCode} onChange={e => setSelectedCode(e.target.value)}>
              <option value="">Selecione uma prova</option>
              {exams.map(exam => (
                <option key={exam.code} value={exam.code}>{exam.name}</option>
              ))}
            </select>
          </div>
        )}
        {detailError && <p className="exam-field-error" role="alert">{detailError}</p>}
        {detail && (
          <div data-testid="selected-questions">
            <h4>Questões Selecionadas ({detail.questions.length})</h4>
            <p className="exam-hint">Assuntos: {detail.subjects.join(', ')}</p>
            <ol className="exam-question-list">
              {detail.questions.map(question => (
                <li key={question.code} data-testid={`selected-question-${question.code}`}>
                  <span>{question.statement} ({question.alternatives.length} {question.alternatives.length === 1 ? 'alternativa' : 'alternativas'})</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      <form className="exam-section" onSubmit={generate} noValidate>
        <h3>Dados da Avaliação</h3>
        <div className="form-group">
          <label htmlFor="evaluation-type">Tipo de Avaliação:</label>
          <input
            id="evaluation-type"
            type="text"
            list="evaluation-types"
            placeholder="Ex.: Bimestral"
            value={evaluationType}
            onChange={e => setEvaluationType(e.target.value)}
          />
          <datalist id="evaluation-types">
            <option value="Bimestral" />
            <option value="Trimestral" />
            <option value="Semestral" />
          </datalist>
        </div>
        <div className="form-group">
          <label htmlFor="evaluation-date">Data de Avaliação:</label>
          <input
            id="evaluation-date"
            type="text"
            placeholder="dd/mm/aaaa"
            value={evaluationDate}
            onChange={e => setEvaluationDate(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="student-count">Quantidade de Alunos:</label>
          <input id="student-count" type="number" min={1} value={studentCount} onChange={e => setStudentCount(e.target.value)} />
        </div>

        <button type="submit" className="submit-btn" disabled={generating}>
          {generating ? 'Gerando...' : 'Gerar PDF'}
        </button>

        {feedback && (
          <div
            className={`exam-feedback exam-feedback-${feedback.kind}`}
            role={feedback.kind === 'error' ? 'alert' : 'status'}
            data-testid={`exam-${feedback.kind}`}
          >
            {feedback.text}
          </div>
        )}
      </form>
    </div>
  );
};

export default ExamPdfGeneration;
