import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExamAnswersForm, { ExamFormConfig, describeAnswer } from '../components/ExamAnswersForm';
import { decodePropositions, maxSumForAlternatives } from '../types/ExamSubmission';

const exam: ExamFormConfig = {
  title: '1ª EE',
  questions: [
    { label: 'Questão 1', maxSum: 63, statement: 'Sobre testes de software' },
    { label: 'Questão 2', maxSum: 15 },
    { label: 'Questão 3', maxSum: 63 }
  ]
};
const joao = { name: 'João', cpf: '111.111.111-11', email: 'joao@cin.ufpe.br' };

const renderForm = (props: Partial<React.ComponentProps<typeof ExamAnswersForm>> = {}) => {
  const callbacks = {
    onTipoProvaChange: jest.fn(),
    onAnswerChange: jest.fn(),
    onSubmit: jest.fn(),
    onBack: jest.fn()
  };
  const { container } = render(
    <ExamAnswersForm
      exam={exam}
      student={joao}
      tipoProva=""
      answers={['', '', '']}
      isSubmitting={false}
      {...callbacks}
      {...props}
    />
  );
  return { ...callbacks, container };
};

describe('ExamAnswersForm', () => {
  test('shows the exam type first and then one field per question, in order', () => {
    const { container } = renderForm();

    const cards = Array.from(container.querySelectorAll('.exam-answers-card')).map((card) =>
      card.getAttribute('data-cy')
    );
    expect(cards).toEqual(['cartao-Tipo da Prova', 'cartao-Questão 1', 'cartao-Questão 2', 'cartao-Questão 3']);
  });

  test('puts each field in its own card, directly inside the form (a single column, not a grid of fields)', () => {
    const { container } = renderForm();
    const form = container.querySelector('form')!;

    const fieldCards = Array.from(form.children).filter((child) => child.classList.contains('exam-answers-card'));
    expect(fieldCards).toHaveLength(4);
    fieldCards.forEach((card) => expect(card.querySelectorAll('input')).toHaveLength(1));
  });

  test('labels each field and tells the largest sum of the question', () => {
    renderForm();

    expect(screen.getByLabelText(/Tipo da Prova/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Questão 1/)).toBeInTheDocument();
    expect(screen.getByText('Soma das proposições corretas (0 a 15)')).toBeInTheDocument();
    expect(screen.getAllByText('Soma das proposições corretas (0 a 63)')).toHaveLength(2);
  });

  test('shows the statement of a question when the exam bank gave one', () => {
    renderForm();
    expect(screen.getByText('Sobre testes de software')).toBeInTheDocument();
  });

  test('reports what the student types', async () => {
    const user = userEvent.setup();
    const { onTipoProvaChange, onAnswerChange } = renderForm();

    await user.type(screen.getByLabelText(/Tipo da Prova/), '2');
    await user.type(screen.getByLabelText(/Questão 2/), '9');

    expect(onTipoProvaChange).toHaveBeenCalledWith('2');
    expect(onAnswerChange).toHaveBeenCalledWith(1, '9');
  });

  test('submits through the application, without the browser validation (which would hide its messages)', async () => {
    const user = userEvent.setup();
    const { onSubmit, container } = renderForm();

    expect(container.querySelector('form')).toHaveAttribute('novalidate');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  test('disables sending while a submission is in progress', () => {
    renderForm({ isSubmitting: true });
    expect(screen.getByRole('button', { name: 'Enviando...' })).toBeDisabled();
  });

  test('goes back to the list of exams', async () => {
    const user = userEvent.setup();
    const { onBack } = renderForm();
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(onBack).toHaveBeenCalled();
  });

  test('summarizes the answers with the alternatives each sum stands for', () => {
    renderForm({ tipoProva: '2', answers: ['21', '0', ''] });

    expect(screen.getByText('Tipo da Prova:').closest('li')).toHaveTextContent('Tipo da Prova: 2');
    expect(screen.getByText(/21 \(proposições: 1, 4, 16\)/)).toBeInTheDocument();
    expect(screen.getByText(/0 \(nenhuma proposição marcada\)/)).toBeInTheDocument();
    expect(screen.getByText(/Não preenchida/)).toBeInTheDocument();
  });
});

describe('describeAnswer', () => {
  test.each([
    ['', 63, 'Não preenchida'],
    ['  ', 63, 'Não preenchida'],
    ['0', 63, '0 (nenhuma proposição marcada)'],
    ['63', 63, '63 (proposições: 1, 2, 4, 8, 16, 32)'],
    ['64', 63, 'Valor inválido (use inteiro de 0 a 63)'],
    ['-1', 63, 'Valor inválido (use inteiro de 0 a 63)'],
    ['2.5', 63, 'Valor inválido (use inteiro de 0 a 63)'],
    ['abc', 15, 'Valor inválido (use inteiro de 0 a 15)'],
    ['16', 15, 'Valor inválido (use inteiro de 0 a 15)']
  ])('"%s" with limit %i -> %s', (raw, maxSum, expected) => {
    expect(describeAnswer(raw, maxSum)).toBe(expected);
  });
});

describe('proposition helpers (same rules as the server)', () => {
  test('decodePropositions', () => {
    expect(decodePropositions(0)).toEqual([]);
    expect(decodePropositions(21)).toEqual([1, 4, 16]);
    expect(decodePropositions(65)).toEqual([1, 64]);
    expect(decodePropositions(-1)).toEqual([]);
  });

  test('maxSumForAlternatives is 2^n - 1, limited to 30 alternatives', () => {
    expect(maxSumForAlternatives(1)).toBe(1);
    expect(maxSumForAlternatives(5)).toBe(31);
    expect(maxSumForAlternatives(6)).toBe(63);
    expect(maxSumForAlternatives(30)).toBe(2 ** 30 - 1);
    expect(maxSumForAlternatives(99)).toBe(2 ** 30 - 1);
    expect(maxSumForAlternatives(0)).toBe(1);
  });
});
