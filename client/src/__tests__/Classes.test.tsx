import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Classes from '../components/Classes';
import { studentService } from '../services/StudentService';
import ClassService from '../services/ClassService';
import EnrollmentService from '../services/EnrollmentService';
import { ana, bruno, softwareEngineering, databases } from '../test-support/fixtures';

jest.mock('../services/StudentService', () => ({ studentService: { getAllStudents: jest.fn() } }));
jest.mock('../services/ClassService', () => ({
  __esModule: true,
  default: { addClass: jest.fn(), updateClass: jest.fn(), deleteClass: jest.fn() }
}));
jest.mock('../services/EnrollmentService', () => ({ __esModule: true, default: { enrollStudent: jest.fn() } }));

const renderClasses = async (classes = [softwareEngineering, databases]) => {
  const callbacks = { onClassAdded: jest.fn(), onClassUpdated: jest.fn(), onClassDeleted: jest.fn(), onError: jest.fn() };
  render(<Classes classes={classes} {...callbacks} />);
  // lets the component finish loading the students for the enrollment panel
  await act(async () => {});
  return callbacks;
};

describe('Classes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (studentService.getAllStudents as jest.Mock).mockResolvedValue([ana, bruno]);
  });

  test('lists the classes with their enrollment counts', async () => {
    await renderClasses();
    expect(screen.getByRole('heading', { name: 'Existing Classes (2)' })).toBeInTheDocument();
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Software Engineering');
    expect(rows[0]).toHaveTextContent('1st Semester');
    expect(within(rows[0]).getAllByRole('cell')[3]).toHaveTextContent('1');
    expect(rows[1]).toHaveTextContent('2nd Semester');
    expect(within(rows[1]).getAllByRole('cell')[3]).toHaveTextContent('0');
  });

  test('shows a hint when there are no classes', async () => {
    await renderClasses([]);
    expect(screen.getByText(/No classes created yet/)).toBeInTheDocument();
  });

  test('adds a class with the typed topic, year and semester and resets the form', async () => {
    const user = userEvent.setup();
    (ClassService.addClass as jest.Mock).mockResolvedValue(databases);
    const callbacks = await renderClasses();
    await user.type(screen.getByLabelText('Topic:'), 'Databases');
    await user.selectOptions(screen.getByLabelText('Year:'), '2024');
    await user.selectOptions(screen.getByLabelText('Semester:'), '2');
    await user.click(screen.getByRole('button', { name: 'Add Class' }));
    await waitFor(() => expect(callbacks.onClassAdded).toHaveBeenCalled());
    expect(ClassService.addClass).toHaveBeenCalledWith({ topic: 'Databases', semester: 2, year: 2024 });
    expect((screen.getByLabelText('Topic:') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Semester:') as HTMLSelectElement).value).toBe('1');
  });

  test('rejects a blank topic without calling the service', async () => {
    const user = userEvent.setup();
    const callbacks = await renderClasses();
    await user.type(screen.getByLabelText('Topic:'), '   ');
    await user.click(screen.getByRole('button', { name: 'Add Class' }));
    expect(callbacks.onError).toHaveBeenCalledWith('Topic is required');
    expect(ClassService.addClass).not.toHaveBeenCalled();
  });

  test('reports a failed creation', async () => {
    const user = userEvent.setup();
    (ClassService.addClass as jest.Mock).mockRejectedValue(new Error('Class with same topic, year, and semester already exists'));
    const callbacks = await renderClasses();
    await user.type(screen.getByLabelText('Topic:'), 'Databases');
    await user.click(screen.getByRole('button', { name: 'Add Class' }));
    await waitFor(() => expect(callbacks.onError).toHaveBeenCalledWith('Class with same topic, year, and semester already exists'));
  });

  test('Edit fills the form and Update Class sends the changes; Cancel resets it', async () => {
    const user = userEvent.setup();
    (ClassService.updateClass as jest.Mock).mockResolvedValue(softwareEngineering);
    const callbacks = await renderClasses();
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    expect(screen.getByRole('heading', { name: 'Edit Class' })).toBeInTheDocument();
    expect((screen.getByLabelText('Topic:') as HTMLInputElement).value).toBe('Software Engineering');
    await user.selectOptions(screen.getByLabelText('Semester:'), '2');
    await user.click(screen.getByRole('button', { name: 'Update Class' }));
    await waitFor(() => expect(callbacks.onClassUpdated).toHaveBeenCalled());
    expect(ClassService.updateClass).toHaveBeenCalledWith('Software Engineering-2025-1', { topic: 'Software Engineering', semester: 2, year: 2025 });
    expect(screen.getByRole('heading', { name: 'Add New Class' })).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[1]);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('heading', { name: 'Add New Class' })).toBeInTheDocument();
    expect((screen.getByLabelText('Topic:') as HTMLInputElement).value).toBe('');
  });

  test('Delete asks for confirmation, deletes and notifies', async () => {
    const user = userEvent.setup();
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
    (ClassService.deleteClass as jest.Mock).mockResolvedValue(undefined);
    const callbacks = await renderClasses();
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[1]);
    expect(confirm).toHaveBeenCalledWith('Are you sure you want to delete the class "Databases (2024/2)"?');
    await waitFor(() => expect(callbacks.onClassDeleted).toHaveBeenCalled());
    expect(ClassService.deleteClass).toHaveBeenCalledWith('Databases-2024-2');
    confirm.mockRestore();
  });

  test('the enrollment panel lists enrolled and available students and enrolls the selected ones', async () => {
    const user = userEvent.setup();
    (EnrollmentService.enrollStudent as jest.Mock).mockResolvedValue({});
    const callbacks = await renderClasses();
    await user.click(screen.getAllByRole('button', { name: 'Enroll' })[0]);
    expect(screen.getByRole('heading', { name: 'Enroll Students in Software Engineering' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Currently Enrolled (1):' })).toBeInTheDocument();
    expect(screen.getByText('Ana Lima')).toHaveClass('enrolled-badge');
    expect(screen.getByRole('heading', { name: 'Available Students (1):' })).toBeInTheDocument();
    const enrollButton = screen.getByRole('button', { name: 'Enroll 0 Students' });
    expect(enrollButton).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Select All' }));
    expect(screen.getByRole('checkbox')).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Select None' }));
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    await user.click(screen.getByText('Bruno Melo'));
    await user.click(screen.getByRole('button', { name: 'Enroll 1 Student' }));
    await waitFor(() => expect(callbacks.onClassUpdated).toHaveBeenCalled());
    expect(EnrollmentService.enrollStudent).toHaveBeenCalledWith('Software Engineering-2025-1', '987.654.321-00');
    expect(callbacks.onError).toHaveBeenLastCalledWith('');
    expect(screen.queryByRole('heading', { name: /Enroll Students in/ })).not.toBeInTheDocument();
  });

  test('the enrollment panel says so when every student is already enrolled, and can be closed', async () => {
    const user = userEvent.setup();
    (studentService.getAllStudents as jest.Mock).mockResolvedValue([ana]);
    await renderClasses();
    await user.click(screen.getAllByRole('button', { name: 'Enroll' })[0]);
    expect(screen.getByText('All registered students are already enrolled in this class')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select All' })).toBeDisabled();
    await user.click(screen.getByTitle('Close'));
    expect(screen.queryByRole('heading', { name: /Enroll Students in/ })).not.toBeInTheDocument();
  });
});
