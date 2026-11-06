import { Question } from '../models/Question';
import { QuestionBank} from '../models/QuestionBank'

describe('QuestionBank', () => {
    test('cadastra uma questão válida', () => {
        const bank = new QuestionBank();

        const question = new Question(
            'Gerência de configuração',
            'Quais comandos podem gerar conflitos?',
            [
                { text: 'merge', isTrue: true},
                { text: 'log', isTrue: false}
            ]
        );

        bank.addQuestion(question);

        expect(bank.getAllQuestions()).toHaveLength(1);
    });

    test('rejeita questão repetida com alternativas reordenadas', () => {
        const bank = new QuestionBank();

        bank.addQuestion(new Question(
            'Gerência de configuração',
            'Quais comandos podem gerar conflitos?',
            [
                { text: 'merge', isTrue: true },
                { text: 'log', isTrue: false}
            ]
        ));

        const repeated = new Question(
            'Gerência de configuração',
            'Quais comandos podem gerar conflitos?',
            [
                { text: 'log', isTrue: false },
                { text: 'merge', isTrue: true }
            ]
        );

        expect(() => bank.addQuestion(repeated)).toThrow(
            'Essa questão já foi criada no sistema'
        );
        expect(bank.getAllQuestions()).toHaveLength(1);
    });

    test('aceita mesmo enunciado com alternativas diferentes', () => {
        const bank = new QuestionBank();

        bank.addQuestion(new Question(
            'Gerência de configuração',
            'Quais comandos?',
            [{ text: 'merge', isTrue: true}]
        ));

        bank.addQuestion(new Question(
            'Gerência de configuração',
            'Quais comandos?',
            [{ text: 'stash', isTrue: true}]
        ));

        expect(bank.getAllQuestions()).toHaveLength(2);
    });

    test('rejeita questão sem alternativas', () => {
        expect(() => new Question(
            'Gerência de configuração',
            'Quais comandos?',
            []
        )).toThrow('É preciso adicionar alternativas');
    });
});