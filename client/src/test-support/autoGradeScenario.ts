import { AnswerKey, Sheet, StudentResponse, toCsv } from './autoGradeSheets';

/**
 * State and server calls shared by the step definitions of the GUI and the
 * service auto_grade features: the class, its students, and the answer keys
 * and responses of the current scenario.
 *
 * The server must run with DATA_FILE pointing to a test data file (see
 * CUCUMBER_TESTING.md): the scenarios create and delete their own class and
 * students.
 */

export const serverUrl = 'http://localhost:3005';

/** The class goal that receives the grades of the correction. */
export const EXAM_GOAL = 'Exam';

export interface EnrollmentJSON {
  student: { name: string; cpf: string };
  evaluations: { goal: string; grade: string | number }[];
}

interface ScenarioState {
  alternatives: number;
  classId?: string;
  cpfByName: Map<string, string>; // students of the class
  answerKeys: AnswerKey[];
  responses: StudentResponse[];
}

const newState = (): ScenarioState => ({ alternatives: 5, cpfByName: new Map(), answerKeys: [], responses: [] });

export const scenario: ScenarioState = newState();

export const resetScenario = (): void => {
  Object.assign(scenario, newState());
};

/** The CPF of a student of the class or, for someone not enrolled, a CPF no student of the class has. */
export const cpfOf = (name: string): string => {
  const enrolled = scenario.cpfByName.get(name);
  if (enrolled) return enrolled;
  const digits = String(900000000 + name.length * 1000 + name.charCodeAt(0)).padStart(9, '0');
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-99`;
};

export const requireClassId = (): string => {
  if (!scenario.classId) {
    throw new Error('The scenario has no class: the Background must create it');
  }
  return scenario.classId;
};

/** "Engenharia de Software e Sistemas 2026.2" -> topic, year and semester. */
export const parseClassName = (name: string): { topic: string; year: number; semester: number } => {
  const match = /^(.*) (\d{4})\.(\d)$/.exec(name.trim());
  if (!match) {
    throw new Error(`Class name "${name}" must end with <year>.<semester>`);
  }
  return { topic: match[1], year: Number(match[2]), semester: Number(match[3]) };
};

/** The same id the server gives the class. */
export const classIdOf = (name: string): string => {
  const { topic, year, semester } = parseClassName(name);
  return `${topic}-${year}-${semester}`;
};

const send = async (method: string, path: string, body?: unknown): Promise<Response> => {
  try {
    return await fetch(`${serverUrl}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new Error(`Server is not available. Start it on port 3005 with DATA_FILE set (see CUCUMBER_TESTING.md)`);
  }
};

const expectStatus = async (response: Response, expected: number, action: string): Promise<void> => {
  if (response.status !== expected) {
    throw new Error(`${action} failed with ${response.status}: ${await response.text()}`);
  }
};

const classPath = (classId: string) => `/api/classes/${encodeURIComponent(classId)}`;

/**
 * Removes what a previous run may have left: the class and the students with
 * the given CPFs. A student with one of those CPFs but another name is not
 * test data, so the scenario stops instead of deleting it.
 */
export const removeLeftovers = async (className: string, students: { name: string; cpf: string }[]): Promise<void> => {
  await send('DELETE', classPath(classIdOf(className)));
  for (const { name, cpf } of students) {
    const existing = await send('GET', `/api/students/${cpf}`);
    if (existing.status !== 200) continue;
    const student = await existing.json();
    if (student.name !== name) {
      throw new Error(
        `The server already has the student ${cpf} (${student.name}). ` +
          'It is probably running with the development data: start it with DATA_FILE=data/test-data.json'
      );
    }
    await send('DELETE', `/api/students/${cpf}`);
  }
};

/** Creates the class, graded by numbers in the goal EXAM_GOAL, with the given students enrolled. */
export const createClassWithStudents = async (className: string, students: { name: string; cpf: string }[]): Promise<void> => {
  await removeLeftovers(className, students);

  const { topic, year, semester } = parseClassName(className);
  const created = await send('POST', '/api/classes', { topic, year, semester, gradeType: 'numeric', goals: [EXAM_GOAL] });
  await expectStatus(created, 201, `Creating the class "${className}"`);
  scenario.classId = (await created.json()).id;

  for (const { name, cpf } of students) {
    const student = await send('POST', '/api/students', { name, cpf, email: `${name.toLowerCase()}@email.com` });
    await expectStatus(student, 201, `Creating the student ${name}`);
    scenario.cpfByName.set(name, cpf);
    const enrollment = await send('POST', `${classPath(requireClassId())}/enroll`, { studentCPF: cpf });
    await expectStatus(enrollment, 201, `Enrolling ${name}`);
  }
};

/** Deletes the class and the students created by the scenario. */
export const removeScenarioData = async (): Promise<void> => {
  if (scenario.classId) {
    await send('DELETE', classPath(scenario.classId));
  }
  for (const cpf of Array.from(scenario.cpfByName.values())) {
    await send('DELETE', `/api/students/${cpf}`);
  }
};

export const enrollments = async (): Promise<EnrollmentJSON[]> => {
  const response = await send('GET', `${classPath(requireClassId())}/enrollments`);
  await expectStatus(response, 200, 'Reading the enrollments');
  return response.json();
};

export const enrollmentOf = async (name: string): Promise<EnrollmentJSON> => {
  const enrollment = (await enrollments()).find(e => e.student.cpf === cpfOf(name));
  if (!enrollment) {
    throw new Error(`${name} is not enrolled in the class`);
  }
  return enrollment;
};

/** Saves a grade for the student in the goal EXAM_GOAL, as the evaluation screen does. */
export const saveGrade = async (name: string, grade: number): Promise<void> => {
  const response = await send('PUT', `${classPath(requireClassId())}/enrollments/${cpfOf(name)}/evaluation`, {
    goal: EXAM_GOAL,
    grade
  });
  await expectStatus(response, 200, `Saving the grade of ${name}`);
};

/** Sends both spreadsheets to the automatic correction, which saves the grades in EXAM_GOAL. */
export const requestCorrection = (answerKeys: Sheet, responses: Sheet): Promise<Response> => {
  const form = new FormData();
  form.append('answerKey', new Blob([toCsv(answerKeys)], { type: 'text/csv' }), answerKeys.fileName);
  form.append('responses', new Blob([toCsv(responses)], { type: 'text/csv' }), responses.fileName);
  form.append('goal', EXAM_GOAL);
  return fetch(`${serverUrl}${classPath(requireClassId())}/auto-grade`, { method: 'POST', body: form });
};

/** The grade saved for a percentage in a class graded by numbers (87% -> 8.7), as the server converts it. */
export const numericGradeOf = (percentage: number): number => Math.round(percentage) / 10;

/** "87%" -> 87 */
export const parsePercentage = (text: string): number => {
  const match = /^(\d+)%$/.exec(text.trim());
  if (!match) {
    throw new Error(`"${text}" is not a percentage like 87%`);
  }
  return Number(match[1]);
};
