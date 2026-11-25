import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import { Express } from 'express';
import { newTestApp } from './support/newTestApp';
import { JsonFileRepository } from '../persistence/JsonFileRepository';
import { StudentSet } from '../models/StudentSet';
import { Classes } from '../models/Classes';
import { Student } from '../models/Student';
import { ExamSubmission } from '../models/ExamSubmission';
import { ExamSubmissionSet } from '../models/ExamSubmissionSet';

describe('Server API - Exam Submission Endpoints', () => {
  let app: Express;

  const joao = {
    name: 'João',
    cpf: '111.111.111-11',
    email: 'joao@cin.ufpe.br'
  };

  beforeEach(async () => {
    app = newTestApp();
    await request(app).post('/api/students').send(joao).expect(201);
  });

  test('GET /api/exam-submissions initially returns an empty list', async () => {
    const response = await request(app).get('/api/exam-submissions').expect(200);
    expect(response.body).toEqual([]);
  });

  test('POST /api/exam-submissions stores valid answers (including 0 and 63) and decodes propositions', async () => {
    const payload = {
      studentCpf: joao.cpf,
      examTitle: '1ª EE',
      tipoProva: '1',
      questions: [
        { label: 'Questão 1', sum: 21 },
        { label: 'Questão 2', sum: 0 },
        { label: 'Questão 3', sum: 63 }
      ]
    };

    const created = await request(app)
      .post('/api/exam-submissions')
      .send(payload)
      .expect(201);

    expect(created.body).toEqual({
      studentName: 'João',
      studentCpf: '111.111.111-11',
      studentEmail: 'joao@cin.ufpe.br',
      examTitle: '1ª EE',
      tipoProva: '1',
      submittedAt: expect.any(String),
      questions: [
        { label: 'Questão 1', sum: 21, propositions: [1, 4, 16] },
        { label: 'Questão 2', sum: 0, propositions: [] },
        { label: 'Questão 3', sum: 63, propositions: [1, 2, 4, 8, 16, 32] }
      ]
    });

    const list = await request(app).get('/api/exam-submissions').expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toEqual(created.body);

    const fetched = await request(app)
      .get(`/api/exam-submissions/${encodeURIComponent(joao.cpf)}/${encodeURIComponent('1ª EE')}`)
      .expect(200);
    expect(fetched.body).toEqual(created.body);
  });

  test('GET /api/exam-submissions/export generates CSV compatible with auto-grading Spreadsheet.ts', async () => {
    await request(app)
      .post('/api/exam-submissions')
      .send({
        studentCpf: joao.cpf,
        examTitle: '1ª EE',
        tipoProva: '1',
        questions: [
          { label: 'Questão 1', sum: 21 },
          { label: 'Questão 2', sum: 0 },
          { label: 'Questão 3', sum: 63 }
        ]
      })
      .expect(201);

    const response = await request(app)
      .get('/api/exam-submissions/export')
      .query({ examTitle: '1ª EE' })
      .expect(200);

    expect(response.headers['content-type']).toContain('text/csv');
    const lines = response.text.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('Carimbo de data/hora,nome,e-mail,CPF,número da prova,Questão 1,Questão 2,Questão 3');
    expect(lines[1]).toContain(',João,joao@cin.ufpe.br,111.111.111-11,1,21,0,63');
  });

  test('POST /api/exam-submissions rejects unregistered student', async () => {
    const response = await request(app)
      .post('/api/exam-submissions')
      .send({
        studentCpf: '999.999.999-99',
        examTitle: '1ª EE',
        tipoProva: '1',
        questions: [
          { label: 'Questão 1', sum: 21 },
          { label: 'Questão 2', sum: 10 },
          { label: 'Questão 3', sum: 33 }
        ]
      })
      .expect(404);

    expect(response.body.error).toBe('Estudante não cadastrado');
  });

  test('POST /api/exam-submissions rejects missing tipoProva', async () => {
    const response = await request(app)
      .post('/api/exam-submissions')
      .send({
        studentCpf: joao.cpf,
        examTitle: '1ª EE',
        tipoProva: '',
        questions: [
          { label: 'Questão 1', sum: 21 },
          { label: 'Questão 2', sum: 10 },
          { label: 'Questão 3', sum: 33 }
        ]
      })
      .expect(400);

    expect(response.body.error).toBe('O tipo da prova é obrigatório');
  });

  test('POST /api/exam-submissions rejects empty question sum', async () => {
    const response = await request(app)
      .post('/api/exam-submissions')
      .send({
        studentCpf: joao.cpf,
        examTitle: '1ª EE',
        tipoProva: '1',
        questions: [
          { label: 'Questão 1', sum: 21 },
          { label: 'Questão 2', sum: '' },
          { label: 'Questão 3', sum: 33 }
        ]
      })
      .expect(400);

    expect(response.body.error).toBe(
      'Todas as questões são obrigatórias. Digite 0 caso não marque nenhuma proposição'
    );
  });

  test.each([-1, 64])('POST /api/exam-submissions rejects out-of-range sum %i', async (invalidSum) => {
    const response = await request(app)
      .post('/api/exam-submissions')
      .send({
        studentCpf: joao.cpf,
        examTitle: '1ª EE',
        tipoProva: '1',
        questions: [
          { label: 'Questão 1', sum: invalidSum },
          { label: 'Questão 2', sum: 10 },
          { label: 'Questão 3', sum: 33 }
        ]
      })
      .expect(400);

    expect(response.body.error).toBe('A soma de cada questão deve ser um valor entre 0 e 63');
  });

  test('POST /api/exam-submissions rejects duplicate submission and preserves original answers', async () => {
    const firstPayload = {
      studentCpf: joao.cpf,
      examTitle: '1ª EE',
      tipoProva: '1',
      questions: [
        { label: 'Questão 1', sum: 21 },
        { label: 'Questão 2', sum: 10 },
        { label: 'Questão 3', sum: 33 }
      ]
    };

    await request(app).post('/api/exam-submissions').send(firstPayload).expect(201);

    const duplicate = await request(app)
      .post('/api/exam-submissions')
      .send({
        studentCpf: joao.cpf,
        examTitle: '1ª EE',
        tipoProva: '2',
        questions: [
          { label: 'Questão 1', sum: 15 },
          { label: 'Questão 2', sum: 8 },
          { label: 'Questão 3', sum: 32 }
        ]
      })
      .expect(400);

    expect(duplicate.body.error).toBe('Você já enviou as respostas desta avaliação');

    const stored = await request(app)
      .get(`/api/exam-submissions/${encodeURIComponent(joao.cpf)}/${encodeURIComponent('1ª EE')}`)
      .expect(200);

    expect(stored.body.tipoProva).toBe('1');
    expect(stored.body.questions.map((q: { sum: number }) => q.sum)).toEqual([21, 10, 33]);
  });

  test('DELETE /api/exam-submissions/:cpf/:examTitle removes a submission', async () => {
    await request(app)
      .post('/api/exam-submissions')
      .send({
        studentCpf: joao.cpf,
        examTitle: '1ª EE',
        tipoProva: '1',
        questions: [
          { label: 'Questão 1', sum: 21 },
          { label: 'Questão 2', sum: 10 },
          { label: 'Questão 3', sum: 33 }
        ]
      })
      .expect(201);

    await request(app)
      .delete(`/api/exam-submissions/${encodeURIComponent(joao.cpf)}/${encodeURIComponent('1ª EE')}`)
      .expect(204);

    const list = await request(app).get('/api/exam-submissions').expect(200);
    expect(list.body).toEqual([]);
  });
});

describe('JsonFileRepository - Exam Submissions Persistence', () => {
  let directory: string;
  let filePath: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ta-exam-repo-'));
    filePath = path.join(directory, 'data', 'app-data.json');
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test('save and load preserve examSubmissions in app-data.json', () => {
    const repo = new JsonFileRepository(filePath);
    const students = new StudentSet();
    const classes = new Classes();
    const submissions = new ExamSubmissionSet();

    const joao = students.addStudent(new Student('João', '111.111.111-11', 'joao@cin.ufpe.br'));
    const timestamp = '2026-11-23T14:00:00.000Z';
    submissions.addSubmission(
      new ExamSubmission(
        joao.getName(),
        joao.getCPF(),
        '1ª EE',
        '1',
        [
          { label: 'Questão 1', sum: 21 },
          { label: 'Questão 2', sum: 0 },
          { label: 'Questão 3', sum: 63 }
        ],
        { studentEmail: joao.getEmail(), submittedAt: timestamp }
      )
    );

    repo.save(students, classes, submissions);

    const reloadedStudents = new StudentSet();
    const reloadedClasses = new Classes();
    const reloadedSubmissions = new ExamSubmissionSet();
    repo.load(reloadedStudents, reloadedClasses, reloadedSubmissions);

    expect(reloadedSubmissions.getCount()).toBe(1);
    const loaded = reloadedSubmissions.findSubmission('11111111111', '1ª EE');
    expect(loaded?.toJSON()).toEqual({
      studentName: 'João',
      studentCpf: '111.111.111-11',
      studentEmail: 'joao@cin.ufpe.br',
      examTitle: '1ª EE',
      tipoProva: '1',
      submittedAt: timestamp,
      questions: [
        { label: 'Questão 1', sum: 21, propositions: [1, 4, 16] },
        { label: 'Questão 2', sum: 0, propositions: [] },
        { label: 'Questão 3', sum: 63, propositions: [1, 2, 4, 8, 16, 32] }
      ]
    });
  });
});

describe('Server API - Exam Submission limits and CSV export', () => {
  let app: Express;

  const joao = { name: 'João', cpf: '111.111.111-11', email: 'joao@cin.ufpe.br' };
  const maria = { name: 'Maria, "a Grande"', cpf: '222.222.222-22', email: 'maria@cin.ufpe.br' };

  const submit = (student: { cpf: string }, examTitle: string, tipoProva: string, sums: number[], maxSum?: number) =>
    request(app)
      .post('/api/exam-submissions')
      .send({
        studentCpf: student.cpf,
        examTitle,
        tipoProva,
        questions: sums.map((sum, index) => ({ label: `Questão ${index + 1}`, sum })),
        ...(maxSum === undefined ? {} : { maxSum })
      });

  beforeEach(async () => {
    app = newTestApp();
    await request(app).post('/api/students').send(joao).expect(201);
    await request(app).post('/api/students').send(maria).expect(201);
  });

  describe('limit of the sums sent with maxSum', () => {
    test('accepts sums above 63 when the exam allows them (7 alternatives -> 127)', async () => {
      const response = await submit(joao, '1ª EE', '1', [100, 127], 127).expect(201);
      expect(response.body.questions[0]).toEqual({ label: 'Questão 1', sum: 100, propositions: [4, 32, 64] });
    });

    test('rejects a sum above the limit of an exam with fewer alternatives (4 alternatives -> 15)', async () => {
      const response = await submit(joao, '1ª EE', '1', [16], 15).expect(400);
      expect(response.body.error).toBe('A soma de cada questão deve ser um valor entre 0 e 15');
    });

    test('uses 63 when no limit is sent', async () => {
      const response = await submit(joao, '1ª EE', '1', [64]).expect(400);
      expect(response.body.error).toBe('A soma de cada questão deve ser um valor entre 0 e 63');
    });

    test.each([0, 1.5, 2 ** 30, '63'])('rejects the invalid limit %p', async (maxSum) => {
      const response = await submit(joao, '1ª EE', '1', [1], maxSum as number).expect(400);
      expect(response.body.error).toBe('O limite máximo da soma deve ser um inteiro entre 1 e 1073741823');
    });
  });

  describe('GET /api/exam-submissions/export', () => {
    test('has the answers after the "número da prova" and "CPF" columns, as the auto-grading reads them', async () => {
      await submit(joao, '1ª EE', '1', [21, 0, 63]).expect(201);
      await submit(maria, '1ª EE', '2', [1, 2, 4]).expect(201);

      const response = await request(app).get('/api/exam-submissions/export').expect(200);
      const [header, ...rows] = response.text.split('\n');
      const columns = header.split(',');

      expect(columns.slice(0, 5)).toEqual(['Carimbo de data/hora', 'nome', 'e-mail', 'CPF', 'número da prova']);
      expect(columns.slice(5)).toEqual(['Questão 1', 'Questão 2', 'Questão 3']);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatch(/^\S+,João,joao@cin\.ufpe\.br,111\.111\.111-11,1,21,0,63$/);
      // A name with comma and quotes stays a single cell
      expect(rows[1]).toMatch(/^\S+,"Maria, ""a Grande""",maria@cin\.ufpe\.br,222\.222\.222-22,2,1,2,4$/);
    });

    test('exports only the exam asked for', async () => {
      await submit(joao, '1ª EE', '1', [1, 2, 3]).expect(201);
      await submit(joao, '2ª EE', '1', [4, 5]).expect(201);

      const response = await request(app).get('/api/exam-submissions/export').query({ examTitle: '2ª EE' }).expect(200);

      expect(response.headers['content-disposition']).toContain('respostas-2_EE.csv');
      expect(response.text.split('\n')).toHaveLength(2);
      expect(response.text.split('\n')[0]).toMatch(/,Questão 1,Questão 2$/);
    });

    test('refuses to put exams with different questions in the same sheet', async () => {
      await submit(joao, '1ª EE', '1', [1, 2, 3]).expect(201);
      await submit(joao, '2ª EE', '1', [4, 5]).expect(201);

      const response = await request(app).get('/api/exam-submissions/export').expect(400);
      expect(response.body.error).toBe(
        'As avaliações têm quantidades de questões diferentes: escolha uma avaliação para exportar'
      );
    });

    test('answers 404 when there is nothing to export', async () => {
      const response = await request(app).get('/api/exam-submissions/export').expect(404);
      expect(response.body.error).toBe('Nenhuma resposta registrada para exportar');
    });
  });
});
