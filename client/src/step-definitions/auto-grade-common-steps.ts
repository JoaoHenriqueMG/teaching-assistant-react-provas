import { Given, Then, Before, After, DataTable } from '@cucumber/cucumber';
import expect from 'expect';
import { createClassWithStudents, enrollments, removeScenarioData, resetScenario, scenario } from '../test-support/autoGradeScenario';

/**
 * Steps shared by auto_grade_gui.feature and auto_grade_service.feature: the
 * Background, which creates the class through the API, and the check that
 * nothing was saved. Every scenario starts with a clean class and removes it
 * at the end.
 */

Before({ tags: '@gui or @service' }, function () {
  resetScenario();
});

After({ tags: '@gui or @service' }, async function () {
  await removeScenarioData();
});

Given('all exams have {int} alternatives', function (alternatives: number) {
  scenario.alternatives = alternatives;
});

Given('the class {string} has the students:', async function (className: string, table: DataTable) {
  const students = table.hashes().map(row => ({ name: row.name, cpf: row.CPF }));
  await createClassWithStudents(className, students);
});

Then('no grade is saved', async function () {
  for (const enrollment of await enrollments()) {
    expect({ student: enrollment.student.name, evaluations: enrollment.evaluations }).toEqual({
      student: enrollment.student.name,
      evaluations: []
    });
  }
});
