import {
  DEFAULT_MAX_SUM,
  MAX_ALLOWED_SUM,
  ExamSubmission,
  ExamSubmissionOptions,
  decodePropositions
} from '../models/ExamSubmission';
import { ExamSubmissionSet } from '../models/ExamSubmissionSet';
import { DomainError } from '../models/DomainError';

/**
 * Class tests (no HTTP, no persistence): they exercise the domain classes
 * directly and are driven by invariants, not by acceptance scenarios.
 * Every test starts from a fresh instance (beforeEach), so tests are
 * independent and can run in any order.
 */

const REQUIRED_QUESTIONS_MESSAGE =
  'Todas as questões são obrigatórias. Digite 0 caso não marque nenhuma proposição';
const RANGE_MESSAGE = 'A soma de cada questão deve ser um valor entre 0 e 63';

const validQuestions = () => [
  { label: 'Questão 1', sum: 21 },
  { label: 'Questão 2', sum: 0 },
  { label: 'Questão 3', sum: 63 }
];

const newSubmission = (overrides: Partial<{
  name: string; cpf: string; exam: string; tipo: string; questions: { label: string; sum: number }[];
  options: ExamSubmissionOptions;
}> = {}) =>
  new ExamSubmission(
    overrides.name ?? 'João',
    overrides.cpf ?? '111.111.111-11',
    overrides.exam ?? '1ª EE',
    overrides.tipo ?? '1',
    overrides.questions ?? validQuestions(),
    overrides.options
  );

describe('decodePropositions', () => {
  test.each([
    [0, []],
    [1, [1]],
    [21, [1, 4, 16]],
    [33, [1, 32]],
    [63, [1, 2, 4, 8, 16, 32]],
    [65, [1, 64]] // exams with more than 6 alternatives
  ])('sum %i decodes to propositions %j', (sum, expected) => {
    expect(decodePropositions(sum)).toEqual(expected);
  });

  test('negative and non-integer sums decode to nothing', () => {
    expect(decodePropositions(-5)).toEqual([]);
    expect(decodePropositions(2.5)).toEqual([]);
  });

  test('the propositions of a sum always add back up to that sum (all boundary values)', () => {
    for (let sum = 0; sum <= 63; sum++) {
      const total = decodePropositions(sum).reduce((acc, weight) => acc + weight, 0);
      expect(total).toBe(sum);
    }
  });
});

describe('ExamSubmission', () => {
  let submission: ExamSubmission;

  beforeEach(() => {
    submission = newSubmission();
  });

  describe('valid data', () => {
    test('stores the student, the exam and the exam type (trimmed)', () => {
      const s = newSubmission({ name: '  João  ', exam: ' 1ª EE ', tipo: ' 2 ' });
      expect(s.getStudentName()).toBe('João');
      expect(s.getExamTitle()).toBe('1ª EE');
      expect(s.getTipoProva()).toBe('2');
    });

    test('stores the CPF clean internally and formatted in the API representation', () => {
      expect(submission.getStudentCPF()).toBe('11111111111');
      expect(submission.getFormattedStudentCPF()).toBe('111.111.111-11');
      expect(submission.toJSON().studentCpf).toBe('111.111.111-11');
      expect(submission.toPersistenceJSON().studentCpf).toBe('11111111111');
    });

    test('accepts the boundary sums 0 and 63 and decodes their propositions', () => {
      expect(submission.getQuestions()).toEqual([
        { label: 'Questão 1', sum: 21, propositions: [1, 4, 16] },
        { label: 'Questão 2', sum: 0, propositions: [] },
        { label: 'Questão 3', sum: 63, propositions: [1, 2, 4, 8, 16, 32] }
      ]);
    });

    test('keeps the e-mail and the submission time, or uses the current time when none is given', () => {
      const given = newSubmission({
        options: { studentEmail: ' joao@cin.ufpe.br ', submittedAt: '2026-11-23T14:00:00.000Z' }
      });
      expect(given.getStudentEmail()).toBe('joao@cin.ufpe.br');
      expect(given.getSubmittedAt()).toBe('2026-11-23T14:00:00.000Z');

      const before = Date.now();
      const defaults = newSubmission();
      expect(defaults.getStudentEmail()).toBe('');
      expect(Date.parse(defaults.getSubmittedAt())).toBeGreaterThanOrEqual(before);
    });

    test('exposes e-mail and submission time in both JSON representations', () => {
      const s = newSubmission({
        options: { studentEmail: 'joao@cin.ufpe.br', submittedAt: '2026-11-23T14:00:00.000Z' }
      });
      for (const json of [s.toJSON(), s.toPersistenceJSON()]) {
        expect(json.studentEmail).toBe('joao@cin.ufpe.br');
        expect(json.submittedAt).toBe('2026-11-23T14:00:00.000Z');
      }
    });

    test('the same CPF in different formats yields the same clean CPF', () => {
      expect(newSubmission({ cpf: '111.111.111-11' }).getStudentCPF()).toBe('11111111111');
      expect(newSubmission({ cpf: '11111111111' }).getStudentCPF()).toBe('11111111111');
    });
  });

  describe('invalid data', () => {
    test.each([
      ['empty exam type', { tipo: '' }, 'O tipo da prova é obrigatório'],
      ['blank exam type', { tipo: '   ' }, 'O tipo da prova é obrigatório'],
      ['empty exam title', { exam: '' }, 'A avaliação é obrigatória'],
      ['empty student name', { name: '' }, 'Nome do estudante é obrigatório'],
      ['invalid CPF', { cpf: '123' }, 'Invalid CPF format'],
      ['no questions', { questions: [] }, REQUIRED_QUESTIONS_MESSAGE]
    ])('rejects %s', (_description, overrides, message) => {
      expect(() => newSubmission(overrides)).toThrow(DomainError);
      expect(() => newSubmission(overrides)).toThrow(message);
    });

    test.each([-1, 64, 1.5, 100])('rejects sum %p (outside 0..63 or not an integer)', (sum) => {
      const questions = [{ label: 'Questão 1', sum }, { label: 'Questão 2', sum: 10 }];
      expect(() => newSubmission({ questions })).toThrow(RANGE_MESSAGE);
    });

    test.each([null, undefined, ''])('rejects an unfilled sum (%p)', (sum) => {
      const questions = [{ label: 'Questão 1', sum: sum as unknown as number }];
      expect(() => newSubmission({ questions })).toThrow(REQUIRED_QUESTIONS_MESSAGE);
    });

    test('rejects an invalid submission time', () => {
      expect(() => newSubmission({ options: { submittedAt: 'ontem' } })).toThrow('A data de envio é inválida');
    });

    test('rejects a question without label', () => {
      expect(() => newSubmission({ questions: [{ label: ' ', sum: 1 }] })).toThrow(
        REQUIRED_QUESTIONS_MESSAGE
      );
    });
  });

  describe('limit of the sums (exams with a different number of alternatives)', () => {
    test('the sums are limited to 63 unless the exam allows more', () => {
      const questions = [{ label: 'Questão 1', sum: DEFAULT_MAX_SUM + 1 }];
      expect(() => newSubmission({ questions })).toThrow(RANGE_MESSAGE);
      expect(newSubmission({ questions, options: { maxSum: 127 } }).getQuestions()[0].sum).toBe(64);
    });

    test('a smaller limit applies too (4 alternatives -> 15)', () => {
      const questions = [{ label: 'Questão 1', sum: 16 }];
      expect(() => newSubmission({ questions, options: { maxSum: 15 } })).toThrow(
        'A soma de cada questão deve ser um valor entre 0 e 15'
      );
    });

    test.each([0, 1.5, MAX_ALLOWED_SUM + 1])('rejects the invalid limit %p', (maxSum) => {
      expect(() => newSubmission({ options: { maxSum } })).toThrow(DomainError);
    });

    test('accepts the largest limit, 2^30 - 1 (30 alternatives, as the auto-grading)', () => {
      const questions = [{ label: 'Questão 1', sum: MAX_ALLOWED_SUM }];
      expect(newSubmission({ questions, options: { maxSum: MAX_ALLOWED_SUM } }).getQuestions()[0].sum).toBe(
        MAX_ALLOWED_SUM
      );
    });
  });

  describe('encapsulation', () => {
    test('changing the array returned by getQuestions does not change the submission', () => {
      const questions = submission.getQuestions();
      questions[0].sum = 0;
      questions[0].propositions.push(2);
      questions.pop();

      expect(submission.getQuestions()).toEqual([
        { label: 'Questão 1', sum: 21, propositions: [1, 4, 16] },
        { label: 'Questão 2', sum: 0, propositions: [] },
        { label: 'Questão 3', sum: 63, propositions: [1, 2, 4, 8, 16, 32] }
      ]);
    });
  });
});

describe('ExamSubmissionSet', () => {
  let set: ExamSubmissionSet;

  beforeEach(() => {
    set = new ExamSubmissionSet();
  });

  test('starts empty', () => {
    expect(set.getCount()).toBe(0);
    expect(set.getAllSubmissions()).toEqual([]);
  });

  test("doesn't accept two submissions of the same student for the same exam", () => {
    set.addSubmission(newSubmission({ tipo: '1' }));

    expect(() => set.addSubmission(newSubmission({ tipo: '2' }))).toThrow(
      'Você já enviou as respostas desta avaliação'
    );
    expect(set.getCount()).toBe(1);
    expect(set.findSubmission('11111111111', '1ª EE')?.getTipoProva()).toBe('1'); // original kept
  });

  test('treats the same student in another CPF format and the same title with spaces as the same submission', () => {
    set.addSubmission(newSubmission({ cpf: '111.111.111-11', exam: '1ª EE' }));
    expect(() => set.addSubmission(newSubmission({ cpf: '11111111111', exam: ' 1ª EE ' }))).toThrow(
      DomainError
    );
  });

  test('accepts the same student for different exams, and different students for the same exam', () => {
    set.addSubmission(newSubmission({ cpf: '111.111.111-11', exam: '1ª EE' }));
    set.addSubmission(newSubmission({ cpf: '111.111.111-11', exam: '2ª EE' }));
    set.addSubmission(newSubmission({ name: 'Maria', cpf: '222.222.222-22', exam: '1ª EE' }));

    expect(set.getCount()).toBe(3);
    expect(set.findSubmissionsByStudentCPF('11111111111')).toHaveLength(2);
    expect(set.findSubmissionsByExamTitle('1ª EE')).toHaveLength(2);
  });

  test('removes a submission and allows the student to submit that exam again', () => {
    set.addSubmission(newSubmission());

    expect(set.removeSubmission('11111111111', '1ª EE')).toBe(true);
    expect(set.findSubmission('11111111111', '1ª EE')).toBeUndefined();
    expect(() => set.addSubmission(newSubmission())).not.toThrow();
  });

  test('removing a submission that does not exist returns false and changes nothing', () => {
    set.addSubmission(newSubmission());

    expect(set.removeSubmission('22222222222', '1ª EE')).toBe(false);
    expect(set.removeSubmission('11111111111', '2ª EE')).toBe(false);
    expect(set.getCount()).toBe(1);
  });

  test('getAllSubmissions returns a copy: changing it does not change the set', () => {
    set.addSubmission(newSubmission());
    set.getAllSubmissions().pop();
    expect(set.getCount()).toBe(1);
  });
});
