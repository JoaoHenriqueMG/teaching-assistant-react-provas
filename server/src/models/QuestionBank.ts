import { Question } from './Question';
import { DomainError } from './DomainError';

/** STAND-IN (see Question.ts): in-memory collection of questions. */
export class QuestionBank {
  private readonly questions = new Map<string, Question>();

  add(question: Question): Question {
    this.questions.set(question.code, question);
    return question;
  }

  getAllQuestions(): Question[] {
    return Array.from(this.questions.values());
  }

  findQuestionByCode(code: string): Question | undefined {
    return this.questions.get(code);
  }

  require(code: string): Question {
    const question = this.findQuestionByCode(code);
    if (!question) throw new DomainError(`Questão não encontrada: ${code}`);
    return question;
  }
}
