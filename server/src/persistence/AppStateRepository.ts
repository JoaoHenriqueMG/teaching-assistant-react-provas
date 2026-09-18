import { StudentSet } from '../models/StudentSet';
import { Classes } from '../models/Classes';

/**
 * Where the application state (students and classes) is kept between runs.
 *
 * The rest of the server depends only on this interface, so the storage
 * technology (a JSON file today, a database tomorrow) can change without
 * touching the routes or the domain model.
 */
export interface AppStateRepository {
  /** Fills the given (empty) collections with the persisted state, if any. */
  load(students: StudentSet, classes: Classes): void;

  /** Persists the current content of the given collections. */
  save(students: StudentSet, classes: Classes): void;
}

/** Repository that keeps nothing: the state lives only in memory. */
export class InMemoryOnlyRepository implements AppStateRepository {
  load(): void {
    // nothing was persisted
  }

  save(): void {
    // nothing to persist
  }
}
