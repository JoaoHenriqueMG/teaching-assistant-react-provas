import * as path from 'path';
import { createApp } from './app';
import { StudentSet } from './models/StudentSet';
import { Classes } from './models/Classes';
import { QuestionBank } from './models/QuestionBank';
import { JsonFileRepository } from './persistence/JsonFileRepository';

/**
 * Composition root: creates the collections, loads the persisted state and
 * starts the HTTP server.
 *
 * The port comes from the PORT environment variable (set by hosting
 * services and by the root package.json scripts); 3005 is the default.
 * The state is persisted in the file given by DATA_FILE (relative to the
 * server folder); ./data/app-data.json is the default. The acceptance tests
 * use another file so they never touch the development data.
 */
const PORT = Number(process.env.PORT) || 3005;
const DATA_FILE = process.env.DATA_FILE || './data/app-data.json';

const students = new StudentSet();
const classes = new Classes();
const questionBank = new QuestionBank();
const repository = new JsonFileRepository(path.resolve(DATA_FILE));
repository.load(students, classes);

createApp({
  students,
  classes,
  repository,
  questionBank
}).listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
