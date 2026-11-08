import {
    Question,
    CreateQuestionRequest
} from '../types/Question';

import { get, sendJson } from './apiClient';

const QUESTIONS = '/api/questions';

export const questionService = {
    getAllQuestions: (): Promise<Question[]> =>
        get(QUESTIONS,'Erro ao buscar questões'),

    createQuestion: (question: CreateQuestionRequest): Promise<Question> =>
        sendJson('POST', QUESTIONS, question, 'Erro ao cadastrar questão')
};
