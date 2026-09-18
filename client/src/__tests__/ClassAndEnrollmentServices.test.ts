import ClassService from '../services/ClassService';
import EnrollmentService from '../services/EnrollmentService';

/** Records the HTTP contract each service method relies on. */
describe('ClassService and EnrollmentService', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as any;
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  const respond = (status: number, body: unknown) =>
    fetchMock.mockResolvedValue({ ok: status < 400, status, json: async () => body });
  const json = (body: unknown) => ({ method: expect.any(String), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  test('getAllClasses GETs /api/classes', async () => {
    respond(200, [{ id: 'SE-2025-1' }]);
    await expect(ClassService.getAllClasses()).resolves.toEqual([{ id: 'SE-2025-1' }]);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3005/api/classes');
    respond(500, {});
    await expect(ClassService.getAllClasses()).rejects.toThrow('Failed to fetch classes');
  });

  test('addClass POSTs JSON to /api/classes', async () => {
    respond(201, { id: 'SE-2025-1' });
    await ClassService.addClass({ topic: 'SE', semester: 1, year: 2025 });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3005/api/classes', { ...json({ topic: 'SE', semester: 1, year: 2025 }), method: 'POST' });
    respond(400, { error: 'Class with same topic, year, and semester already exists' });
    await expect(ClassService.addClass({ topic: 'SE', semester: 1, year: 2025 })).rejects.toThrow('Class with same topic, year, and semester already exists');
  });

  test('updateClass PUTs JSON to /api/classes/:id', async () => {
    respond(200, { id: 'SE-2025-2' });
    await ClassService.updateClass('SE-2025-1', { topic: 'SE', semester: 2, year: 2025 });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3005/api/classes/SE-2025-1', { ...json({ topic: 'SE', semester: 2, year: 2025 }), method: 'PUT' });
  });

  test('deleteClass DELETEs /api/classes/:id', async () => {
    respond(204, {});
    await ClassService.deleteClass('SE-2025-1');
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3005/api/classes/SE-2025-1', { method: 'DELETE' });
    respond(404, { error: 'Class not found' });
    await expect(ClassService.deleteClass('SE-2025-1')).rejects.toThrow('Class not found');
  });

  test('getClassReport GETs /api/classes/:id/report', async () => {
    respond(200, { classId: 'SE-2025-1' });
    await expect(ClassService.getClassReport('SE-2025-1')).resolves.toEqual({ classId: 'SE-2025-1' });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3005/api/classes/SE-2025-1/report');
  });

  test('enrollStudent POSTs the CPF to /api/classes/:id/enroll', async () => {
    respond(201, { student: { cpf: '123.456.789-01' } });
    await EnrollmentService.enrollStudent('SE-2025-1', '123.456.789-01');
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3005/api/classes/SE-2025-1/enroll', { ...json({ studentCPF: '123.456.789-01' }), method: 'POST' });
    respond(400, { error: 'Student is already enrolled in this class' });
    await expect(EnrollmentService.enrollStudent('SE-2025-1', '123.456.789-01')).rejects.toThrow('Student is already enrolled in this class');
  });

  test('unenrollStudent DELETEs /api/classes/:id/enroll/:cpf', async () => {
    respond(204, {});
    await EnrollmentService.unenrollStudent('SE-2025-1', '123.456.789-01');
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3005/api/classes/SE-2025-1/enroll/123.456.789-01', { method: 'DELETE' });
  });

  test('getClassEnrollments GETs /api/classes/:id/enrollments', async () => {
    respond(200, []);
    await expect(EnrollmentService.getClassEnrollments('SE-2025-1')).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3005/api/classes/SE-2025-1/enrollments');
    respond(404, {});
    await expect(EnrollmentService.getClassEnrollments('SE-2025-1')).rejects.toThrow('Failed to fetch enrollments');
  });

  test('updateEvaluation PUTs goal and grade to /api/classes/:id/enrollments/:cpf/evaluation', async () => {
    respond(200, { evaluations: [{ goal: 'Design', grade: 'MA' }] });
    await EnrollmentService.updateEvaluation('SE-2025-1', '123.456.789-01', 'Design', 'MA');
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3005/api/classes/SE-2025-1/enrollments/123.456.789-01/evaluation',
      { ...json({ goal: 'Design', grade: 'MA' }), method: 'PUT' });
    respond(400, { error: 'Invalid grade. Must be MANA, MPA, or MA' });
    await expect(EnrollmentService.updateEvaluation('SE-2025-1', '123.456.789-01', 'Design', 'X')).rejects.toThrow('Invalid grade. Must be MANA, MPA, or MA');
  });
});
