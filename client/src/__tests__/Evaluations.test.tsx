import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Evaluations from '../components/Evaluations';
import { classService } from '../services/ClassService';
import { enrollmentService } from '../services/EnrollmentService';
import { softwareEngineering, databases } from '../test-support/fixtures';

jest.mock('../services/ClassService', () => ({ classService: { getAllClasses: jest.fn() } }));
jest.mock('../services/EnrollmentService', () => ({ enrollmentService: { updateEvaluation: jest.fn() } }));

const GOALS = ['Requirements', 'Configuration Management', 'Project Management', 'Design', 'Tests', 'Refactoring'];

describe('Evaluations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (classService.getAllClasses as jest.Mock).mockResolvedValue([softwareEngineering, databases]);
  });

  test('asks for a class until one is selected', async () => {
    render(<Evaluations onError={jest.fn()} />);
    expect(await screen.findByRole('option', { name: 'Software Engineering (2025/1)' })).toBeInTheDocument();
    expect(screen.getByText('No Class Selected')).toBeInTheDocument();
  });

  test('shows one column per goal and one row per enrolled student, with the current grades', async () => {
    const user = userEvent.setup();
    render(<Evaluations onError={jest.fn()} />);
    await user.selectOptions(await screen.findByLabelText('Select Class:'), 'Software Engineering-2025-1');
    const headers = screen.getAllByRole('columnheader').map(h => h.textContent);
    expect(headers).toEqual(['Student', ...GOALS]);
    const row = screen.getByRole('row', { name: /Ana Lima/ });
    const selects = within(row).getAllByRole('combobox') as HTMLSelectElement[];
    expect(selects).toHaveLength(6);
    expect(selects[3].value).toBe('MPA');
    expect(selects[3]).toHaveClass('grade-mpa');
    expect(selects[0].value).toBe('');
    expect(within(selects[0]).getAllByRole('option').map(o => o.textContent)).toEqual(['-', 'MANA', 'MPA', 'MA']);
    expect(localStorage.getItem('evaluations-selected-class')).toBe('Software Engineering-2025-1');
  });

  test('remembers the selected class across renders', async () => {
    localStorage.setItem('evaluations-selected-class', 'Databases-2024-2');
    render(<Evaluations onError={jest.fn()} />);
    expect(await screen.findByText('No Students Enrolled')).toBeInTheDocument();
  });

  test('changing a grade updates the evaluation and reloads the classes', async () => {
    const user = userEvent.setup();
    (enrollmentService.updateEvaluation as jest.Mock).mockResolvedValue({});
    const onError = jest.fn();
    render(<Evaluations onError={onError} />);
    await user.selectOptions(await screen.findByLabelText('Select Class:'), 'Software Engineering-2025-1');
    const row = screen.getByRole('row', { name: /Ana Lima/ });
    await user.selectOptions(within(row).getAllByRole('combobox')[4], 'MA');
    await waitFor(() => expect(enrollmentService.updateEvaluation).toHaveBeenCalledWith('Software Engineering-2025-1', '123.456.789-01', 'Tests', 'MA'));
    await waitFor(() => expect(classService.getAllClasses).toHaveBeenCalledTimes(2));
    expect(onError).not.toHaveBeenCalled();
  });

  test('reports a failed grade update', async () => {
    const user = userEvent.setup();
    (enrollmentService.updateEvaluation as jest.Mock).mockRejectedValue(new Error('Class not found'));
    const onError = jest.fn();
    render(<Evaluations onError={onError} />);
    await user.selectOptions(await screen.findByLabelText('Select Class:'), 'Software Engineering-2025-1');
    const row = screen.getByRole('row', { name: /Ana Lima/ });
    await user.selectOptions(within(row).getAllByRole('combobox')[0], 'MANA');
    await waitFor(() => expect(onError).toHaveBeenCalledWith('Failed to update evaluation: Class not found'));
  });
});
