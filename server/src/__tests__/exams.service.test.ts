import { DomainError } from '../models/DomainError';
import {
  ExamGenerationError, ExamGenerationService, ExamNotFoundError, MESSAGES
} from '../services/ExamGenerationService';
import {
  evaluation, examsByCode, pdfPageCount, pdfText, questionData, readZip, registerExam, trueLettersFromPdf, xlsxRows
} from './support/examFixtures';

/**
 * Service tests for the generation of PDFs from a registered exam
 * (features/GerarPdf.feature, @service scenarios).
 */

const service = new ExamGenerationService();
const generate = (registered = registerExam(), overrides: Record<string, unknown> = {}) =>
  service.generate(registered.examBank, { examCode: registered.examCode, ...evaluation(), ...overrides });
const pdfNames = (zip: Buffer) => Array.from(readZip(zip).keys()).filter(name => name.endsWith('.pdf'));
const optionLines = (pdf: Buffer) => pdfText(pdf).split('\n').filter(line => /^\d+\. |^[a-z]\) /.test(line)).join('|');

describe('ExamGenerationService', () => {
  test('generates one PDF per student and one answer-key spreadsheet in a ZIP archive', () => {
    const result = generate(registerExam(), { studentCount: 38 });
    const files = readZip(result.zip);
    expect(result.examCount).toBe(38);
    expect(pdfNames(result.zip)).toHaveLength(38);
    expect(Array.from(files.keys()).filter(name => name.endsWith('.xlsx'))).toEqual(['gabaritos.xlsx']);
    expect(result.warning).toBeUndefined();
    expect(result.fileName).toBe('provas_prova-de-git_bimestral_25-12-2026.zip');
    for (const name of pdfNames(result.zip)) {
      expect(files.get(name)!.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    }
  });

  test('gives every exam a distinct code, repeated in the answer key of that exam only', () => {
    const files = readZip(generate(registerExam(), { studentCount: 10 }).zip);
    const exams = examsByCode(files);
    const rows = xlsxRows(files.get('gabaritos.xlsx')!);
    const keyCodes = rows.slice(1).map(row => row[0]);
    expect(exams.size).toBe(10);
    expect(rows[0].slice(0, 2)).toEqual(['Código', 'Aluno']);
    expect(new Set(keyCodes).size).toBe(10);
    expect(keyCodes.sort()).toEqual(Array.from(exams.keys()).sort());
    exams.forEach((pdf, code) => expect(pdfText(pdf)).toContain(`Código da prova: ${code}`));
  });

  test('answer keys match the order of questions and alternatives of their own exam', () => {
    const registered = registerExam(['A', 'B', 'C', 'D'].map(n => questionData(n)));
    const files = readZip(generate(registered, { studentCount: 20 }).zip);
    const rows = xlsxRows(files.get('gabaritos.xlsx')!).slice(1);
    expect(rows).toHaveLength(20);
    examsByCode(files).forEach((pdf, code) => {
      expect(rows.find(r => r[0] === code)!.slice(2)).toEqual(trueLettersFromPdf(pdf, new Set(['Certa'])));
    });
  });

  test('does not assume a single true alternative: the key lists every true one, or "-" when none', () => {
    const registered = registerExam([
      { ...questionData('A'), alternatives: [
        { text: 'v1', isTrue: true }, { text: 'v2', isTrue: true }, { text: 'f1', isTrue: false }] },
      { ...questionData('B'), alternatives: [{ text: 'g1', isTrue: false }, { text: 'g2', isTrue: false }] }
    ]);
    const files = readZip(generate(registered, { studentCount: 6 }).zip);
    const rows = xlsxRows(files.get('gabaritos.xlsx')!).slice(1);
    examsByCode(files).forEach((pdf, code) => {
      const key = rows.find(r => r[0] === code)!.slice(2);
      expect(key).toEqual(trueLettersFromPdf(pdf, new Set(['v1', 'v2'])));
      expect(key).toContain('-');
    });
  });

  test('prints the exam name, the evaluation data and every question with its alternatives', () => {
    const files = readZip(generate(registerExam(), { evaluationType: 'Trimestral', studentCount: 3 }).zip);
    const exams = Array.from(examsByCode(files).values());
    expect(exams).toHaveLength(3);
    for (const pdf of exams) {
      const text = pdfText(pdf);
      expect(text).toContain('Prova de Git');
      expect(text).toContain('Avaliação: Trimestral');
      expect(text).toContain('Data: 25/12/2026');
      for (const id of ['A', 'B', 'C']) expect(text).toContain(`Enunciado da questão ${id}`);
      for (const alternative of ['Certa', 'Errada 1', 'Errada 2', 'Errada 3']) expect(text).toContain(alternative);
    }
  });

  test('never reveals which alternatives are true in the student documents', () => {
    const files = readZip(generate(registerExam(), { studentCount: 3 }).zip);
    examsByCode(files).forEach(pdf => {
      const text = pdfText(pdf);
      expect(text).not.toMatch(/isTrue|verdadeira|correta/i);
    });
  });

  test('varies the order of questions and alternatives among exams that are all different', () => {
    const registered = registerExam(['A', 'B', 'C', 'D'].map(n => questionData(n)));
    const files = readZip(generate(registered, { studentCount: 10 }).zip);
    const contents = Array.from(examsByCode(files).values()).map(optionLines);
    expect(new Set(contents).size).toBe(10);
  });

  test('does not change the registered exam or its questions', () => {
    const registered = registerExam();
    const before = JSON.stringify(registered.questions.map(q => q.toJSON()));
    const examBefore = JSON.stringify(registered.examBank.findExamByCode(registered.examCode));
    generate(registered, { studentCount: 20 });
    expect(JSON.stringify(registered.questions.map(q => q.toJSON()))).toBe(before);
    expect(JSON.stringify(registered.examBank.findExamByCode(registered.examCode))).toBe(examBefore);
  });

  test('uses every possible exam before repeating when combinations are exactly enough', () => {
    const registered = registerExam([questionData('A', ['x', 'y', 'z'])]); // 3! = 6 distinct exams
    const result = generate(registered, { studentCount: 6 });
    expect(result.warning).toBeUndefined();
    expect(new Set(Array.from(examsByCode(readZip(result.zip)).values()).map(optionLines)).size).toBe(6);
  });

  test('still generates exams for all students, with a warning, when there are not enough combinations', () => {
    const result = generate(registerExam([questionData('A', ['x', 'y', 'z'])]), { studentCount: 20 });
    expect(result.warning).toBe('Não há combinações suficientes para gerar 20 provas únicas');
    expect(result.examCount).toBe(20);
    const files = readZip(result.zip);
    expect(pdfNames(result.zip)).toHaveLength(20);
    expect(files.has('gabaritos.xlsx')).toBe(true);
    // the codes stay unique even though the contents repeat
    expect(examsByCode(files).size).toBe(20);
    expect(new Set(xlsxRows(files.get('gabaritos.xlsx')!).slice(1).map(r => r[0])).size).toBe(20);
  });

  test('counts the variants as questions! × the product of the alternatives!', () => {
    const data = registerExam().questions.map(q => q.toJSON());
    expect(ExamGenerationService.countVariants(data)).toBe(BigInt(6 * 24 * 24 * 24));
  });

  test('is repeatable with a given source of randomness', () => {
    const run = () => {
      let seed = 7;
      const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const registered = registerExam();
      const result = new ExamGenerationService({ random }).generate(registered.examBank, {
        examCode: registered.examCode, ...evaluation()
      });
      return Array.from(examsByCode(readZip(result.zip)).keys());
    };
    expect(run()).toEqual(run());
  });

  test('breaks long exams into pages with the code in the footer of each one', () => {
    const registered = registerExam([{ ...questionData('A'), statement: 'palavra '.repeat(1500) }]);
    const pdf = Array.from(examsByCode(readZip(generate(registered, { studentCount: 1 }).zip)).values())[0];
    const pages = pdfPageCount(pdf);
    expect(pages).toBeGreaterThan(1);
    expect(pdfText(pdf)).toContain(`Página ${pages} de ${pages}`);
  });

  describe('rejects the request, generating nothing', () => {
    const failure = (run: () => unknown): unknown => {
      try {
        run();
      } catch (e) {
        return e;
      }
      return undefined;
    };

    test.each([
      ['evaluation type', { evaluationType: '' }],
      ['evaluation type (only spaces)', { evaluationType: '   ' }],
      ['evaluation date', { evaluationDate: '' }],
      ['student count', { studentCount: undefined }],
      ['student count (empty)', { studentCount: '' }]
    ])('when the %s is missing', (_: string, override: Record<string, unknown>) => {
      const error = failure(() => generate(registerExam(), override));
      expect(error).toBeInstanceOf(DomainError);
      expect((error as Error).message).toBe(MESSAGES.insufficientData);
    });

    test('when no exam is chosen', () => {
      const registered = registerExam();
      const error = failure(() => service.generate(registered.examBank, evaluation()));
      expect(error).toBeInstanceOf(DomainError);
      expect((error as Error).message).toBe('Nenhuma questão selecionada');
    });

    test('when the exam does not exist', () => {
      const error = failure(() => generate(registerExam(), { examCode: 'inexistente' }));
      expect(error).toBeInstanceOf(ExamNotFoundError);
      expect((error as Error).message).toBe('Prova não encontrada');
    });

    test.each([0, -3, 2.5, 'abc', 1001])('when the student count is %p', (count: number | string) => {
      const error = failure(() => generate(registerExam(), { studentCount: count }));
      expect(error).toBeInstanceOf(DomainError);
      expect((error as Error).message).toBe('A quantidade de alunos deve ser um número inteiro entre 1 e 1000');
    });

    test('accepts the student count typed as text', () => {
      expect(generate(registerExam(), { studentCount: '4' }).examCount).toBe(4);
    });
  });

  describe('when something fails while generating', () => {
    const failing = new ExamGenerationService({
      buildAnswerKeys: () => {
        throw new Error('disk full');
      }
    });
    const run = () => {
      const registered = registerExam();
      return failing.generate(registered.examBank, { examCode: registered.examCode, ...evaluation() });
    };

    test('reports the failure and makes no package available', () => {
      let result: unknown;
      let error: unknown;
      try {
        result = run();
      } catch (e) {
        error = e;
      }
      expect(result).toBeUndefined();
      expect(error).toBeInstanceOf(ExamGenerationError);
      expect((error as Error).message).toBe('Ocorreu uma falha na geração das provas');
    });

    test('does not leak the internal cause', () => {
      expect(run).not.toThrow(/disk full/);
    });
  });
});
