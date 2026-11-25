import { studentService } from '../services/StudentService';

/** Records the HTTP contract each service method relies on. */
describe('studentService', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as any;
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  const respond = (status: number, body: unknown) =>
    fetchMock.mockResolvedValue({ ok: status < 400, status, statusText: 'x', json: async () => body });

  test('getAllStudents GETs /api/students', async () => {
    respond(200, [{ name: 'Ana', cpf: '123.456.789-01', email: 'a@a.com' }]);
    await expect(studentService.getAllStudents()).resolves.toEqual([{ name: 'Ana', cpf: '123.456.789-01', email: 'a@a.com' }]);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3005/api/students', undefined);
  });

  test('getAllStudents rejects when the response is not ok', async () => {
    respond(500, {});
    await expect(studentService.getAllStudents()).rejects.toThrow('Failed to fetch students');
  });

  test('createStudent POSTs JSON to /api/students and returns the created student', async () => {
    respond(201, { name: 'Ana', cpf: '123.456.789-01', email: 'a@a.com' });
    const created = await studentService.createStudent({ name: 'Ana', cpf: '12345678901', email: 'a@a.com' });
    expect(created.cpf).toBe('123.456.789-01');
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3005/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ana', cpf: '12345678901', email: 'a@a.com' })
    });
  });

  test('createStudent surfaces the server error message', async () => {
    respond(400, { error: 'Student with this CPF already exists' });
    await expect(studentService.createStudent({ name: 'Ana', cpf: '12345678901', email: 'a@a.com' }))
      .rejects.toThrow('Student with this CPF already exists');
  });

  test('updateStudent PUTs to /api/students/:cpf', async () => {
    respond(200, { name: 'Ana Lima', cpf: '123.456.789-01', email: 'a@a.com' });
    await studentService.updateStudent('123.456.789-01', { name: 'Ana Lima', email: 'a@a.com' });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3005/api/students/123.456.789-01', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ana Lima', email: 'a@a.com' })
    });
  });

  test('deleteStudent DELETEs /api/students/:cpf', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204, json: async () => { throw new Error('no body'); } });
    await expect(studentService.deleteStudent('123.456.789-01')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3005/api/students/123.456.789-01', { method: 'DELETE' });
  });

  test('deleteStudent surfaces the server error message', async () => {
    respond(404, { error: 'Student not found' });
    await expect(studentService.deleteStudent('123.456.789-01')).rejects.toThrow('Student not found');
  });

  test('getStudentByCPF GETs /api/students/:cpf', async () => {
    respond(200, { name: 'Ana', cpf: '123.456.789-01', email: 'a@a.com' });
    await expect(studentService.getStudentByCPF('123.456.789-01')).resolves.toMatchObject({ name: 'Ana' });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3005/api/students/123.456.789-01', undefined);
  });
});
