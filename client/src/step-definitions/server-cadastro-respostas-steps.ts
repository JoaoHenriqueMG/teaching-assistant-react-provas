import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import expect from 'expect';

setDefaultTimeout(30 * 1000);

/**
 * Steps of server-cadastro-respostas.feature (@service): they talk to the
 * running server through its HTTP API only (no browser), like the service
 * acceptance tests of the student feature. Requires the server on port 3005.
 */
const serverUrl = 'http://localhost:3005';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

interface StoredQuestion {
  label: string;
  sum: number;
  propositions: number[];
}

// State of the current scenario (reset by the Before hook, so scenarios are independent)
let lastResponse: Response;
let lastBody: any;
let touchedStudents: string[];
let touchedSubmissions: { cpf: string; exam: string }[];

const submissionUrl = (cpf: string, exam: string) =>
  `${serverUrl}/api/exam-submissions/${encodeURIComponent(cpf)}/${encodeURIComponent(exam)}`;

/** Parses "1:21, 2:, 3:33" into the request's question list; an empty sum stays an empty string. */
function parseSums(sums: string): { label: string; sum: number | string }[] {
  return sums.split(',').map((part) => {
    const [number, ...rest] = part.split(':');
    const raw = rest.join(':').trim();
    return { label: `Questão ${number.trim()}`, sum: raw === '' ? '' : Number(raw) };
  });
}

/** Same format, from a stored submission: "1:21, 2:10, 3:33". */
function formatSums(questions: StoredQuestion[]): string {
  return questions.map((q) => `${q.label.replace('Questão ', '')}:${q.sum}`).join(', ');
}

async function postSubmission(cpf: string, exam: string, tipoProva: string, sums: string): Promise<Response> {
  touchedSubmissions.push({ cpf, exam });
  return fetch(`${serverUrl}/api/exam-submissions`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ studentCpf: cpf, examTitle: exam, tipoProva, questions: parseSums(sums) })
  });
}

async function expectStored(cpf: string, exam: string, tipoProva: string, sums: string): Promise<void> {
  const response = await fetch(submissionUrl(cpf, exam));
  expect(response.status).toBe(200);
  const stored = await response.json();
  expect(stored.tipoProva).toBe(tipoProva);
  expect(formatSums(stored.questions)).toBe(sums);
}

Before({ tags: '@service' }, function () {
  touchedStudents = [];
  touchedSubmissions = [];
});

// Leaves the server's data as it found it, even when a scenario fails
After({ tags: '@service' }, async function () {
  for (const { cpf, exam } of touchedSubmissions) {
    await fetch(submissionUrl(cpf, exam), { method: 'DELETE' }).catch(() => undefined);
  }
  for (const cpf of touchedStudents) {
    await fetch(`${serverUrl}/api/students/${encodeURIComponent(cpf)}`, { method: 'DELETE' }).catch(() => undefined);
  }
});

Given('o estudante {string} com CPF {string} está cadastrado no sistema', async function (name: string, cpf: string) {
  // Never touch a student that was not created by these tests: the server keeps real data
  const existing = await fetch(`${serverUrl}/api/students/${encodeURIComponent(cpf)}`);
  if (existing.status === 200) {
    throw new Error(`O CPF ${cpf} já pertence a um estudante do servidor; use outro CPF de teste`);
  }
  touchedStudents.push(cpf);
  const response = await fetch(`${serverUrl}/api/students`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ name, cpf, email: `${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()}@cin.ufpe.br` })
  });
  expect(response.status).toBe(201);
});

Given('não existe estudante cadastrado com CPF {string}', async function (cpf: string) {
  const response = await fetch(`${serverUrl}/api/students/${encodeURIComponent(cpf)}`);
  expect(response.status).toBe(404);
});

Given('o estudante com CPF {string} ainda não respondeu a avaliação {string}', async function (cpf: string, exam: string) {
  touchedSubmissions.push({ cpf, exam });
  await fetch(submissionUrl(cpf, exam), { method: 'DELETE' });
  const response = await fetch(submissionUrl(cpf, exam));
  expect(response.status).toBe(404);
});

Given(
  'o sistema possui armazenadas para o estudante com CPF {string} na avaliação {string} o tipo de prova {string} e as somas {string}',
  async function (cpf: string, exam: string, tipoProva: string, sums: string) {
    await fetch(submissionUrl(cpf, exam), { method: 'DELETE' });
    const response = await postSubmission(cpf, exam, tipoProva, sums);
    expect(response.status).toBe(201);
  }
);

When(
  'eu submeto para o estudante com CPF {string} na avaliação {string} o tipo de prova {string} com as somas {string}',
  async function (cpf: string, exam: string, tipoProva: string, sums: string) {
    lastResponse = await postSubmission(cpf, exam, tipoProva, sums);
    lastBody = await lastResponse.json();
  }
);

Then('a submissão é aceita pelo servidor', function () {
  expect(lastResponse.status).toBe(201);
});

Then('o sistema rejeita a submissão com a mensagem {string}', function (message: string) {
  expect(lastResponse.status).toBeGreaterThanOrEqual(400);
  expect(lastResponse.status).toBeLessThan(500);
  expect(lastBody.error).toBe(message);
});

Then(
  'o sistema armazena para o estudante com CPF {string} na avaliação {string} o tipo de prova {string} e as somas {string}',
  async function (cpf: string, exam: string, tipoProva: string, sums: string) {
    await expectStored(cpf, exam, tipoProva, sums);
  }
);

Then(
  'o sistema mantém armazenadas para o estudante com CPF {string} na avaliação {string} o tipo de prova {string} e as somas {string}',
  async function (cpf: string, exam: string, tipoProva: string, sums: string) {
    await expectStored(cpf, exam, tipoProva, sums);
  }
);

Then(
  'o sistema não possui respostas armazenadas do estudante com CPF {string} para a avaliação {string}',
  async function (cpf: string, exam: string) {
    const response = await fetch(submissionUrl(cpf, exam));
    expect(response.status).toBe(404);
  }
);
