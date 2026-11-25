import request from 'supertest';
import { Express } from 'express';
import { newTestApp } from './support/newTestApp';
import { evaluation, examsByCode, questionData, readZip, xlsxRows } from './support/examFixtures';

/** Tests of POST /api/exams/:code/pdfs, with the exam registered through the API (features/GerarPdf.feature). */

let app: Express;
beforeEach(() => {
  app = newTestApp();
});

const binary = (res: any, callback: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
};

const registerExamThroughApi = async (questions = ['A', 'B', 'C'].map(n => questionData(n))): Promise<string> => {
  const codes: string[] = [];
  for (const question of questions) {
    codes.push((await request(app).post('/api/questions').send(question).expect(201)).body.code);
  }
  return (await request(app).post('/api/exams').send({ name: 'Prova de Git', questionCodes: codes }).expect(201)).body.code;
};

const generate = (code: string, body: object) =>
  request(app).post(`/api/exams/${encodeURIComponent(code)}/pdfs`).send(body).buffer(true).parse(binary);

describe('POST /api/exams/:code/pdfs', () => {
  test('answers with a ZIP archive holding the exams and the answer-key spreadsheet', async () => {
    const code = await registerExamThroughApi();
    const response = await generate(code, evaluation({ studentCount: 38 })).expect(200);
    expect(response.headers['content-type']).toMatch(/application\/zip/);
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="provas_prova-de-git_bimestral_25-12-2026.zip"'
    );
    expect(response.headers['x-warning']).toBeUndefined();
    const files = readZip(response.body);
    expect(examsByCode(files).size).toBe(38);
    expect(xlsxRows(files.get('gabaritos.xlsx')!)).toHaveLength(39);
  });

  test('sends the archive anyway, with a warning header, when there are not enough different exams', async () => {
    const code = await registerExamThroughApi([questionData('A', ['x', 'y', 'z'])]);
    const response = await generate(code, evaluation({ studentCount: 20 })).expect(200);
    expect(decodeURIComponent(response.headers['x-warning'])).toBe('Não há combinações suficientes para gerar 20 provas únicas');
    expect(response.headers['access-control-expose-headers']).toContain('X-Warning');
    expect(examsByCode(readZip(response.body)).size).toBe(20);
  });

  test('rejects missing evaluation data with 400 and sends no archive', async () => {
    const code = await registerExamThroughApi();
    const response = await request(app)
      .post(`/api/exams/${code}/pdfs`)
      .send(evaluation({ evaluationType: '', evaluationDate: '' }))
      .expect(400);
    expect(response.body).toEqual({ error: 'Dados informados são insuficientes para gerar as provas' });
  });

  test('answers 404 when the exam does not exist', async () => {
    const response = await request(app).post('/api/exams/inexistente/pdfs').send(evaluation()).expect(404);
    expect(response.body).toEqual({ error: 'Prova não encontrada' });
  });

  test('does not get in the way of the exam queries', async () => {
    const code = await registerExamThroughApi();
    const detail = await request(app).get(`/api/exams/${code}`).expect(200);
    expect(detail.body.questions).toHaveLength(3);
    expect((await request(app).get('/api/exams').expect(200)).body).toHaveLength(1);
  });
});
