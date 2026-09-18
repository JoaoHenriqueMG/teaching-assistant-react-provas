import * as path from 'path';
import { createApp } from './app';
import { StudentSet } from './models/StudentSet';
import { Classes } from './models/Classes';
import { JsonFileRepository } from './persistence/JsonFileRepository';

/**
 * Composition root: creates the collections, loads the persisted state and
 * starts the HTTP server.
 */
const PORT = 3005;

const students = new StudentSet();
const classes = new Classes();
const repository = new JsonFileRepository(path.resolve('./data/app-data.json'));
repository.load(students, classes);

createApp({ students, classes, repository }).listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
