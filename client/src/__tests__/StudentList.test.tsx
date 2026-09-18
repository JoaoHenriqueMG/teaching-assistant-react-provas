import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentList from '../components/StudentList';
import { studentService } from '../services/StudentService';

jest.mock('../services/StudentService', () => ({
  studentService: { deleteStudent: jest.fn() }
}));

const students = [
  { name: 'Ana Lima', cpf: '123.456.789-01', email: 'ana@cin.ufpe.br' },
  { name: 'Bruno Melo', cpf: '987.654.321-00', email: 'bruno@cin.ufpe.br' }
];

const renderList = (props: Partial<React.ComponentProps<typeof StudentList>> = {}) => {
  const callbacks = { onStudentDeleted: jest.fn(), onEditStudent: jest.fn(), onError: jest.fn() };
  render(<StudentList students={students} loading={false} {...callbacks} {...props} />);
  return callbacks;
};

describe('StudentList', () => {
  beforeEach(() => jest.clearAllMocks());

  test('shows a loading message while loading', () => {
    renderList({ loading: true });
    expect(screen.getByText('Loading students...')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  test('shows a hint when there are no students', () => {
    renderList({ students: [] });
    expect(screen.getByRole('heading', { name: 'Students (0)' })).toBeInTheDocument();
    expect(screen.getByText(/No students registered yet/)).toBeInTheDocument();
  });

  test('lists every student with name, CPF and email', () => {
    renderList();
    expect(screen.getByRole('heading', { name: 'Students (2)' })).toBeInTheDocument();
    const row = screen.getByTestId('student-row-123.456.789-01');
    expect(row).toHaveTextContent('Ana Lima');
    expect(row).toHaveTextContent('123.456.789-01');
    expect(row).toHaveTextContent('ana@cin.ufpe.br');
    expect(screen.getAllByTestId('student-name').map(cell => cell.textContent)).toEqual(['Ana Lima', 'Bruno Melo']);
  });

  test('Edit hands the student to onEditStudent', async () => {
    const user = userEvent.setup();
    const callbacks = renderList();
    await user.click(screen.getByTestId('edit-student-987.654.321-00'));
    expect(callbacks.onEditStudent).toHaveBeenCalledWith(students[1]);
  });

  test('Delete asks for confirmation and, if confirmed, deletes and notifies', async () => {
    const user = userEvent.setup();
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    (studentService.deleteStudent as jest.Mock).mockResolvedValue(undefined);
    const callbacks = renderList();
    await user.click(screen.getByTestId('delete-student-123.456.789-01'));
    expect(confirm).toHaveBeenCalledWith('Are you sure you want to delete Ana Lima?');
    await waitFor(() => expect(callbacks.onStudentDeleted).toHaveBeenCalled());
    expect(studentService.deleteStudent).toHaveBeenCalledWith('123.456.789-01');
    confirm.mockRestore();
  });

  test('Delete does nothing when not confirmed, and reports failures', async () => {
    const user = userEvent.setup();
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    const callbacks = renderList();
    await user.click(screen.getByTestId('delete-student-123.456.789-01'));
    expect(studentService.deleteStudent).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    (studentService.deleteStudent as jest.Mock).mockRejectedValue(new Error('Student not found'));
    await user.click(screen.getByTestId('delete-student-123.456.789-01'));
    await waitFor(() => expect(callbacks.onError).toHaveBeenCalledWith('Student not found'));
    expect(callbacks.onStudentDeleted).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});
