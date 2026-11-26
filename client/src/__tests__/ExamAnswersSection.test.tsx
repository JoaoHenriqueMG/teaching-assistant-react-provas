import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExamAnswersSection from '../components/ExamAnswersSection';
import { examSubmissionService } from '../services/ExamSubmissionService';
import { studentService } from '../services/StudentService';
import { ExamSubmission } from '../types/ExamSubmission';

jest.mock('../services/StudentService', () => ({
  studentService: { getAllStudents: jest.fn() }
}));
jest.mock('../services/ExamSubmissionService', () => ({
  examSubmissionService: {
    getAllSubmissions: jest.fn(),
    getAvailableExams: jest.fn(),
    getExamDetail: jest.fn(),
    createSubmission: jest.fn(),
    exportSubmissionsCsv: jest.fn()
  }
}));

const students = studentService.getAllStudents as jest.Mock;
const service = examSubmissionService as unknown as Record<string, jest.Mock>;

const joao = { name: 'João', cpf: '111.111.111-11', email: 'joao@cin.ufpe.br' };
const maria = { name: 'Maria', cpf: '222.222.222-22', email: 'maria@cin.ufpe.br' };

const submissionOf = (student: typeof joao, examTitle: string): ExamSubmission => ({
  studentName: student.name,
  studentCpf: student.cpf,
  studentEmail: student.email,
  examTitle,
  tipoProva: '1',
  submittedAt: '2026-11-23T14:00:00.000Z',
  questions: [{ label: 'Questão 1', sum: 21, propositions: [1, 4, 16] }]
});

const renderSection = async (selected?: typeof joao) => {
  const user = userEvent.setup();
  render(<ExamAnswersSection />);
  await screen.findByRole('option', { name: /João/ });
  if (selected) {
    await user.selectOptions(screen.getByLabelText('Selecionar Estudante:'), selected.cpf);
  }
  return user;
};

describe('ExamAnswersSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    students.mockResolvedValue([joao, maria]);
    service.getAllSubmissions.mockResolvedValue([]);
    service.getAvailableExams.mockRejectedValue(new Error('no exam bank'));
  });

  test('loads its own students: it needs no props from the application', async () => {
    await renderSection();
    expect(students).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Nenhum estudante selecionado')).toBeInTheDocument();
  });

  test('uses the fallback exam "1ª EE" (3 questions) while the exam bank is unavailable', async () => {
    await renderSection(joao);
    expect(screen.getByText('1ª EE', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('Disponível')).toBeInTheDocument();
  });

  test('lists the exams of the exam bank and opens the form of the chosen one with its own questions', async () => {
    service.getAvailableExams.mockResolvedValue([{ code: 'e1', name: 'primeira prova', questionCodes: ['q1', 'q2'] }]);
    service.getExamDetail.mockResolvedValue({
      code: 'e1',
      name: 'primeira prova',
      questionCodes: ['q1', 'q2'],
      questions: [
        { code: 'q1', subject: 'Testes', statement: 'O que é um teste?', alternatives: [{ text: 'a', isTrue: true }, { text: 'b', isTrue: false }, { text: 'c', isTrue: true }, { text: 'd', isTrue: false }] },
        { code: 'q2', subject: 'Testes', statement: 'E outro?', alternatives: new Array(6).fill({ text: 'x', isTrue: false }) }
      ]
    });
    const user = await renderSection(joao);

    await user.click(await screen.findByRole('button', { name: 'primeira prova' }));

    expect(await screen.findByRole('heading', { name: 'Formulário da primeira prova' })).toBeInTheDocument();
    expect(screen.getByText('O que é um teste?')).toBeInTheDocument();
    expect(screen.getByText('Soma das proposições corretas (0 a 15)')).toBeInTheDocument(); // 4 alternatives
    expect(screen.getByText('Soma das proposições corretas (0 a 63)')).toBeInTheDocument(); // 6 alternatives
  });

  test('sends the answers with the limit of the exam and shows the confirmation', async () => {
    service.createSubmission.mockResolvedValue({
      ...submissionOf(joao, '1ª EE'),
      questions: [
        { label: 'Questão 1', sum: 21, propositions: [1, 4, 16] },
        { label: 'Questão 2', sum: 0, propositions: [] },
        { label: 'Questão 3', sum: 63, propositions: [1, 2, 4, 8, 16, 32] }
      ]
    });
    const user = await renderSection(joao);

    await user.click(screen.getByRole('button', { name: '1ª EE' }));
    await user.type(await screen.findByLabelText(/Tipo da Prova/), '1');
    await user.type(screen.getByLabelText(/Questão 1/), '21');
    await user.type(screen.getByLabelText(/Questão 2/), '0');
    await user.type(screen.getByLabelText(/Questão 3/), '63');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() =>
      expect(service.createSubmission).toHaveBeenCalledWith({
        studentCpf: joao.cpf,
        examTitle: '1ª EE',
        tipoProva: '1',
        questions: [
          { label: 'Questão 1', sum: 21 },
          { label: 'Questão 2', sum: 0 },
          { label: 'Questão 3', sum: 63 }
        ],
        maxSum: 63
      })
    );
    expect(await screen.findByText('Respostas enviadas com sucesso')).toBeInTheDocument();
    expect(screen.getByText('Respondida')).toBeInTheDocument();
    expect(screen.getByText(/Soma 63/)).toBeInTheDocument();
  });

  test.each([
    ['without the exam type', '', ['21', '10', '33'], 'O tipo da prova é obrigatório'],
    ['with an empty question', '1', ['21', '', '33'], 'Todas as questões são obrigatórias. Digite 0 caso não marque nenhuma proposição'],
    ['with a sum above the limit', '1', ['64', '10', '33'], 'A soma de cada questão deve ser um valor entre 0 e 63'],
    ['with a negative sum', '1', ['-1', '10', '33'], 'A soma de cada questão deve ser um valor entre 0 e 63']
  ])('does not send the form %s and keeps what was typed', async (_case, tipo, sums, message) => {
    const user = await renderSection(joao);
    await user.click(screen.getByRole('button', { name: '1ª EE' }));
    if (tipo) await user.type(await screen.findByLabelText(/Tipo da Prova/), tipo);
    for (let index = 0; index < sums.length; index++) {
      if (sums[index]) await user.type(await screen.findByLabelText(new RegExp(`Questão ${index + 1}`)), sums[index]);
    }
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(service.createSubmission).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Formulário da 1ª EE' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Questão 1/)).toHaveValue(sums[0]);
  });

  test('does not reopen an exam the student already answered', async () => {
    service.getAllSubmissions.mockResolvedValue([submissionOf(joao, '1ª EE')]);
    const user = await renderSection(joao);

    expect(await screen.findByText('Respondida')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '1ª EE' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Você já enviou as respostas desta avaliação');
    expect(screen.queryByRole('heading', { name: 'Formulário da 1ª EE' })).not.toBeInTheDocument();
  });

  test('another student can still answer an exam that was answered by someone else', async () => {
    service.getAllSubmissions.mockResolvedValue([submissionOf(joao, '1ª EE')]);
    const user = await renderSection();
    await user.selectOptions(screen.getByLabelText('Selecionar Estudante:'), maria.cpf);

    expect(await screen.findByText('Disponível')).toBeInTheDocument();
  });

  test('shows the server error when it refuses the answers', async () => {
    service.createSubmission.mockRejectedValue(new Error('Você já enviou as respostas desta avaliação'));
    const user = await renderSection(joao);
    await user.click(screen.getByRole('button', { name: '1ª EE' }));
    await user.type(await screen.findByLabelText(/Tipo da Prova/), '1');
    for (const n of [1, 2, 3]) await user.type(screen.getByLabelText(new RegExp(`Questão ${n}`)), '1');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Você já enviou as respostas desta avaliação');
  });

  test('exports the CSV of the chosen exam', async () => {
    service.getAllSubmissions.mockResolvedValue([submissionOf(joao, '1ª EE')]);
    service.exportSubmissionsCsv.mockResolvedValue('a,b');
    // jsdom has no object URLs
    (URL as any).createObjectURL = jest.fn(() => 'blob:csv');
    (URL as any).revokeObjectURL = jest.fn();
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const user = await renderSection();

    await user.selectOptions(await screen.findByLabelText('Filtrar avaliação para exportar'), '1ª EE');
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }));

    await waitFor(() => expect(service.exportSubmissionsCsv).toHaveBeenCalledWith('1ª EE'));
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1)); // the file is downloaded
    click.mockRestore();
  });

  test('shows the reason when the CSV cannot be exported', async () => {
    service.getAllSubmissions.mockResolvedValue([submissionOf(joao, '1ª EE')]);
    service.exportSubmissionsCsv.mockRejectedValue(new Error('escolha uma avaliação para exportar'));
    const user = await renderSection();

    await user.click(await screen.findByRole('button', { name: 'Exportar CSV' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('escolha uma avaliação para exportar');
  });
});
