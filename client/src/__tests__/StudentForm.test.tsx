import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentForm from '../components/StudentForm';
import { studentService } from '../services/StudentService';
import EnrollmentService from '../services/EnrollmentService';

jest.mock('../services/StudentService', () => ({
  studentService: { createStudent: jest.fn(), updateStudent: jest.fn() }
}));
jest.mock('../services/EnrollmentService', () => ({
  __esModule: true,
  default: { enrollStudent: jest.fn() }
}));

const mocked = {
  createStudent: studentService.createStudent as jest.Mock,
  updateStudent: studentService.updateStudent as jest.Mock,
  enrollStudent: EnrollmentService.enrollStudent as jest.Mock
};

const ana = { name: 'Ana Lima', cpf: '123.456.789-01', email: 'ana@cin.ufpe.br' };
const softwareEngineering = { id: 'SE-2025-1', topic: 'SE', semester: 1, year: 2025, averageCalculationSpecification: { gradeWeights: { MA: 10, MPA: 7, MANA: 0 }, goalWeights: {} }, enrollments: [] };

const renderForm = (props: Partial<React.ComponentProps<typeof StudentForm>> = {}) => {
  const callbacks = { onStudentAdded: jest.fn(), onStudentUpdated: jest.fn(), onError: jest.fn(), onCancel: jest.fn() };
  render(<StudentForm {...callbacks} {...props} />);
  return callbacks;
};

describe('StudentForm', () => {
  beforeEach(() => jest.clearAllMocks());

  test('applies the CPF mask while typing and limits it to 11 digits', async () => {
    const user = userEvent.setup();
    renderForm();
    const cpf = screen.getByLabelText('CPF:') as HTMLInputElement;
    await user.type(cpf, '12345678901999');
    expect(cpf.value).toBe('123.456.789-01');
  });

  test('creates a student and clears the form', async () => {
    const user = userEvent.setup();
    mocked.createStudent.mockResolvedValue(ana);
    const callbacks = renderForm();
    expect(screen.getByRole('heading', { name: 'Add New Student' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Name:'), 'Ana Lima');
    await user.type(screen.getByLabelText('CPF:'), '12345678901');
    await user.type(screen.getByLabelText('Email:'), 'ana@cin.ufpe.br');
    await user.click(screen.getByTestId('submit-student-button'));
    await waitFor(() => expect(callbacks.onStudentAdded).toHaveBeenCalled());
    expect(mocked.createStudent).toHaveBeenCalledWith({ name: 'Ana Lima', cpf: '123.456.789-01', email: 'ana@cin.ufpe.br' });
    expect(mocked.enrollStudent).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Name:') as HTMLInputElement).value).toBe('');
    expect(callbacks.onError).not.toHaveBeenCalled();
  });

  test('reports a creation failure through onError', async () => {
    const user = userEvent.setup();
    mocked.createStudent.mockRejectedValue(new Error('Student with this CPF already exists'));
    const callbacks = renderForm();
    await user.type(screen.getByLabelText('Name:'), 'Ana');
    await user.type(screen.getByLabelText('CPF:'), '12345678901');
    await user.type(screen.getByLabelText('Email:'), 'ana@cin.ufpe.br');
    await user.click(screen.getByTestId('submit-student-button'));
    await waitFor(() => expect(callbacks.onError).toHaveBeenCalledWith('Student with this CPF already exists'));
    expect(callbacks.onStudentAdded).not.toHaveBeenCalled();
  });

  test('auto-enrolls the new student in the selected class', async () => {
    const user = userEvent.setup();
    mocked.createStudent.mockResolvedValue(ana);
    mocked.enrollStudent.mockResolvedValue({});
    const callbacks = renderForm({ selectedClass: softwareEngineering });
    expect(screen.getByText(/Auto-enrollment/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Name:'), 'Ana Lima');
    await user.type(screen.getByLabelText('CPF:'), '12345678901');
    await user.type(screen.getByLabelText('Email:'), 'ana@cin.ufpe.br');
    await user.click(screen.getByTestId('submit-student-button'));
    await waitFor(() => expect(callbacks.onStudentAdded).toHaveBeenCalled());
    expect(mocked.enrollStudent).toHaveBeenCalledWith('SE-2025-1', '123.456.789-01');
  });

  test('reports an enrollment failure but still counts the student as added', async () => {
    const user = userEvent.setup();
    mocked.createStudent.mockResolvedValue(ana);
    mocked.enrollStudent.mockRejectedValue(new Error('Class not found'));
    const callbacks = renderForm({ selectedClass: softwareEngineering });
    await user.type(screen.getByLabelText('Name:'), 'Ana Lima');
    await user.type(screen.getByLabelText('CPF:'), '12345678901');
    await user.type(screen.getByLabelText('Email:'), 'ana@cin.ufpe.br');
    await user.click(screen.getByTestId('submit-student-button'));
    await waitFor(() => expect(callbacks.onStudentAdded).toHaveBeenCalled());
    expect(callbacks.onError).toHaveBeenCalledWith('Student created successfully, but enrollment failed: Class not found');
  });

  test('in edit mode, fills the form, disables the CPF and updates name and email', async () => {
    const user = userEvent.setup();
    mocked.updateStudent.mockResolvedValue({ ...ana, name: 'Ana Souza' });
    const callbacks = renderForm({ editingStudent: ana });
    expect(screen.getByRole('heading', { name: /Edit Student/ })).toHaveTextContent('(CPF: 123.456.789-01)');
    expect(screen.getByLabelText('CPF:')).toBeDisabled();
    expect((screen.getByLabelText('Email:') as HTMLInputElement).value).toBe('ana@cin.ufpe.br');
    await user.clear(screen.getByLabelText('Name:'));
    await user.type(screen.getByLabelText('Name:'), 'Ana Souza');
    await user.click(screen.getByRole('button', { name: 'Update Student' }));
    await waitFor(() => expect(callbacks.onStudentUpdated).toHaveBeenCalled());
    expect(mocked.updateStudent).toHaveBeenCalledWith('123.456.789-01', { name: 'Ana Souza', email: 'ana@cin.ufpe.br' });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(callbacks.onCancel).toHaveBeenCalled();
  });
});
