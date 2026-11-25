import { randomUUID } from 'crypto';
import { DomainError } from './DomainError';

/**
 * STAND-IN for the Question model of the "Criar Questões" feature, written
 * from the integration guide so that this branch runs on its own. When
 * merging, keep the integrated branch's version: PDF generation only uses
 * `toJSON()` and the shape below.
 */
export interface Alternative {
  text: string;
  isTrue: boolean;
}

export interface QuestionData {
  code: string;
  subject: string;
  statement: string;
  alternatives: Alternative[];
}

export class Question {
  private constructor(
    readonly code: string,
    readonly subject: string,
    readonly statement: string,
    readonly alternatives: Alternative[]
  ) {}

  /** @throws DomainError when the data violates the rules of a question */
  static create(data: { subject?: unknown; statement?: unknown; alternatives?: unknown }, code: string = randomUUID()): Question {
    const subject = typeof data.subject === 'string' ? data.subject.trim() : '';
    const statement = typeof data.statement === 'string' ? data.statement.trim() : '';
    if (!subject) throw new DomainError('Assunto é obrigatório');
    if (!statement) throw new DomainError('Enunciado é obrigatório');
    if (!Array.isArray(data.alternatives) || data.alternatives.length === 0) {
      throw new DomainError('A questão deve ter pelo menos uma alternativa');
    }
    const alternatives = data.alternatives.map((raw: { text?: unknown; isTrue?: unknown } | null): Alternative => {
      const text = typeof raw?.text === 'string' ? raw.text.trim() : '';
      if (!text || typeof raw?.isTrue !== 'boolean') throw new DomainError('Alternativa inválida');
      return { text, isTrue: raw.isTrue };
    });
    return new Question(code, subject, statement, alternatives);
  }

  toJSON(): QuestionData {
    return {
      code: this.code,
      subject: this.subject,
      statement: this.statement,
      alternatives: this.alternatives.map(a => ({ ...a }))
    };
  }
}
