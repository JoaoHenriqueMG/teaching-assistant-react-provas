/** STAND-IN (see Question.ts): an exam is a name plus references to questions. */
export class Exam {
  constructor(readonly code: string, readonly name: string, private readonly questionCodes: string[]) {}

  getQuestionCodes(): string[] {
    return [...this.questionCodes];
  }

  toJSON(): { code: string; name: string; questionCodes: string[] } {
    return { code: this.code, name: this.name, questionCodes: this.getQuestionCodes() };
  }
}
