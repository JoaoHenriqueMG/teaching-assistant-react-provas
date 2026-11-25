import { Express } from 'express';
import { createApp } from '../../app';
import { StudentSet } from '../../models/StudentSet';
import { Classes } from '../../models/Classes';
import { InMemoryOnlyRepository } from '../../persistence/AppStateRepository';

/** Builds a fresh, empty application that persists nothing. */
export function newTestApp(): Express {
  return createApp({
    students: new StudentSet(),
    classes: new Classes(),
    repository: new InMemoryOnlyRepository()
  });
}
