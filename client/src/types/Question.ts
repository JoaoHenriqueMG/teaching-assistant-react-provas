export interface Alternative {
    text: string;
    isTrue: boolean;
}

export interface Question {
    code: string;
    subject: string;
    statement: string;
    alternatives: Alternative[];
}

export type CreateQuestionRequest = Omit<Question, 'code'>;