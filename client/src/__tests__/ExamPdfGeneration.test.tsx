import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExamPdfGeneration from '../components/ExamPdfGeneration';
import { examService } from '../services/ExamService';
import { examPdfService } from '../services/ExamPdfService';
import { saveFile } from '../services/fileDownload';
import { Exam, ExamDetail } from '../types/Exam';
import { Question } from '../types/Question';

/** GUI scenarios of features/GerarPdf.feature, with the server replaced by mocks. */

jest.mock('../services/ExamService', () => ({ examService: { getAllExams: jest.fn(), getExamByCode: jest.fn() } }));
jest.mock('../services/ExamPdfService', () => ({ examPdfService: { generatePdfs: jest.fn() } }));
jest.mock('../services/fileDownload', () => ({ saveFile: jest.fn() }));

const getAllExams = examService.getAllExams as jest.Mock;
const getExamByCode = examService.getExamByCode as jest.Mock;
const generatePdfs = examPdfService.generatePdfs as jest.Mock;
const zip = new Blob(['zip'], { type: 'application/zip' });

const question = (code: string): Question => ({
  code,
  subject: 'Gerência de configuração',
  statement: `Enunciado ${code}`,
  alternatives: [{ text: 'merge', isTrue: true }, { text: 'log', isTrue: false }, { text: 'add', isTrue: false }]
});
const gitExam: Exam = { code: 'exam-git', name: 'Prova de Git', questionCodes: ['A', 'B', 'C'] };
const gitDetail: ExamDetail = {
  ...gitExam,
  questions: ['A', 'B', 'C'].map(question),
  subjects: ['Gerência de configuração']
};

type User = ReturnType<typeof userEvent.setup>;

const renderPage = async () => {
  render(<ExamPdfGeneration />);
  await act(async () => {});
};

const chooseExam = async (user: User) => {
  await user.selectOptions(screen.getByLabelText('Prova:'), 'exam-git');
  await screen.findByTestId('selected-questions');
};

const fillEvaluation = async (user: User, type: string, date: string, count: string) => {
  if (type) await user.type(screen.getByLabelText('Tipo de Avaliação:'), type);
  if (date) await user.type(screen.getByLabelText('Data de Avaliação:'), date);
  if (count) await user.type(screen.getByLabelText('Quantidade de Alunos:'), count);
};

const clickGenerate = (user: User) => user.click(screen.getByRole('button', { name: 'Gerar PDF' }));

describe('ExamPdfGeneration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAllExams.mockResolvedValue([gitExam, { code: 'exam-2', name: 'Prova de Testes', questionCodes: ['A'] }]);
    getExamByCode.mockResolvedValue(gitDetail);
    generatePdfs.mockResolvedValue({ blob: zip, fileName: 'provas_prova-de-git_bimestral_25-12-2026.zip' });
  });

  test('lists the registered exams to choose from, with empty evaluation fields', async () => {
    await renderPage();
    expect(screen.getByRole('heading', { name: 'Gerar PDFs' })).toBeInTheDocument();
    const options = screen.getAllByRole('option').map(o => o.textContent);
    expect(options).toEqual(['Selecione uma prova', 'Prova de Git', 'Prova de Testes']);
    expect(screen.queryByTestId('selected-questions')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Tipo de Avaliação:')).toHaveValue('');
    expect(screen.getByLabelText('Data de Avaliação:')).toHaveValue('');
    expect(screen.getByLabelText('Quantidade de Alunos:')).toHaveValue(null);
  });

  test('shows a hint when no exam is registered', async () => {
    getAllExams.mockResolvedValue([]);
    await renderPage();
    expect(screen.getByTestId('no-exams')).toBeInTheDocument();
    expect(screen.queryByLabelText('Prova:')).not.toBeInTheDocument();
  });

  test('shows an error when the exams cannot be loaded', async () => {
    getAllExams.mockRejectedValue(new Error('network'));
    await renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao carregar as provas cadastradas');
  });

  test('shows the questions and subjects of the chosen exam, without telling which alternative is true', async () => {
    const user = userEvent.setup();
    await renderPage();
    await chooseExam(user);
    expect(getExamByCode).toHaveBeenCalledWith('exam-git');
    expect(screen.getByText('Questões Selecionadas (3)')).toBeInTheDocument();
    expect(screen.getByText(/Assuntos: Gerência de configuração/)).toBeInTheDocument();
    expect(screen.getByTestId('selected-question-B')).toHaveTextContent('Enunciado B (3 alternativas)');
  });

  describe('Gerar PDF', () => {
    test('sends the chosen exam and the data to the server and downloads the archive', async () => {
      const user = userEvent.setup();
      await renderPage();
      await chooseExam(user);
      await fillEvaluation(user, 'Bimestral', '25/12/2026', '38');
      await clickGenerate(user);

      await waitFor(() =>
        expect(saveFile).toHaveBeenCalledWith(zip, 'provas_prova-de-git_bimestral_25-12-2026.zip')
      );
      expect(generatePdfs).toHaveBeenCalledWith('exam-git', {
        evaluationType: 'Bimestral',
        evaluationDate: '25/12/2026',
        studentCount: 38
      });
      expect(screen.getByTestId('exam-success')).toHaveTextContent('Arquivo gerado com 38 provas e 1 planilha de gabaritos.');
    });

    test('shows the warning, and still downloads the archive, when there are not enough combinations', async () => {
      const user = userEvent.setup();
      generatePdfs.mockResolvedValue({
        blob: zip,
        fileName: 'provas.zip',
        warning: 'Não há combinações suficientes para gerar 20 provas únicas'
      });
      await renderPage();
      await chooseExam(user);
      await fillEvaluation(user, 'Bimestral', '01/12/2026', '20');
      await clickGenerate(user);

      expect(await screen.findByTestId('exam-warning')).toHaveTextContent(
        'Não há combinações suficientes para gerar 20 provas únicas'
      );
      expect(saveFile).toHaveBeenCalledTimes(1);
    });

    test('shows "Dados insuficientes" and generates nothing when type and date are empty', async () => {
      const user = userEvent.setup();
      await renderPage();
      await chooseExam(user);
      await fillEvaluation(user, '', '', '20');
      await clickGenerate(user);

      expect(screen.getByRole('alert')).toHaveTextContent('Dados insuficientes');
      expect(generatePdfs).not.toHaveBeenCalled();
      expect(saveFile).not.toHaveBeenCalled();
    });

    test('shows "Nenhuma questão selecionada" and generates nothing when no exam was chosen', async () => {
      const user = userEvent.setup();
      await renderPage();
      await fillEvaluation(user, 'Bimestral', '25/12/2026', '20');
      await clickGenerate(user);

      expect(screen.getByRole('alert')).toHaveTextContent('Nenhuma questão selecionada');
      expect(generatePdfs).not.toHaveBeenCalled();
      expect(saveFile).not.toHaveBeenCalled();
    });

    test('shows the error reported by the server and downloads nothing', async () => {
      const user = userEvent.setup();
      generatePdfs.mockRejectedValue(new Error('Ocorreu uma falha na geração das provas'));
      await renderPage();
      await chooseExam(user);
      await fillEvaluation(user, 'Bimestral', '25/12/2026', '10');
      await clickGenerate(user);

      expect(await screen.findByRole('alert')).toHaveTextContent('Ocorreu uma falha na geração das provas');
      expect(saveFile).not.toHaveBeenCalled();
    });
  });
});
