import request from 'supertest';
import { newTestApp} from './support/newTestApp';

const validQuestion = {
  subject: 'Gerência de configuração',
  statement: 'Quais comandos podem gerar conflitos?',
  alternatives: [
    { text: 'merge', isTrue: true },
    { text: 'stash', isTrue: true },
    { text: 'log', isTrue: false }
  ]
};

describe('API de questôes', () => {
    test('GET retorna uma lista vazia inicialmente', async () => {
        const app = newTestApp();

        const response = await request(app)
            .get('/api/questions')
            .expect(200);
        
        expect(response.body).toEqual([]);
    });

    test('POST cadastra uma questão válida', async () => {
        const app = newTestApp();

        const response = await request(app)
            .post('/api/questions')
            .send(validQuestion)
            .expect(201)

        expect(response.body).toMatchObject(validQuestion);
        expect(response.body.code).toEqual(expect.any(String));

        const list = await request(app)
            .get('/api/questions')
            .expect(200)
        
        expect(list.body).toHaveLength(1);
    });

    test('POST rejeita uma questão duplicada', async () => {
        const app = newTestApp();

        await request(app)
            .post('/api/questions')
            .send(validQuestion)
            .expect(201);

        const repeatedQuestion = {
            ...validQuestion,
            alternatives: [...validQuestion.alternatives].reverse()
        };

        const response = await request(app)
            .post('/api/questions')
            .send(repeatedQuestion)
            .expect(400);

        expect(response.body.error).toBe(
            'Essa questão já foi criada no sistema'
        );

        const list = await request(app)
            .get('/api/questions')
            .expect(200);

        expect(list.body).toHaveLength(1);
    });

    test('POST rejeita questões com campos obrigatórios vazios', async () => {
        const invalidCases = [
        {
            ...validQuestion,
            subject: '',
            expectedError: 'É preciso definir o assunto da questão'
        },
        {
            ...validQuestion,
            statement: '',
            expectedError: 'É preciso definir o enunciado da questão'
        },
        {
            ...validQuestion,
            alternatives: [],
            expectedError: 'É preciso adicionar alternativas para a questão'
        }
        ];

        const app = newTestApp();

        for (const { expectedError, ...body } of invalidCases) {
            const response = await request(app)
                .post('/api/questions')
                .send(body)
                .expect(400); 

            expect(response.body.error).toBe(expectedError);
        }

        const list = await request(app)
            .get('/api/questions')
            .expect(200);

        expect(list.body).toHaveLength(0);
    });
});