import React, {useEffect, useState} from 'react';
import { Question } from '../types/Question';
import { questionService } from '../services/QuestionService';
import QuestionForm from './QuestionForm';
import QuestionList from './QuestionList';

const QuestionsTab: React.FC = () => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        let active = true;

        const loadQuestions = async () => {
            try {
                const data = await questionService.getAllQuestions();

                if (active) {
                    setQuestions(data);
                }
            } catch (err) {
                if (active) {
                    setLoadError(
                        err instanceof Error
                            ? err.message
                            : 'Erro ao carregar questões'
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadQuestions();

        return () => {
            active = false;
        };
    }, []);

    const handleQuestionCreated = (question: Question) => {
        setQuestions(previous => [...previous, question]);
    };

    return (
        <div className="questions-container">
            <h2>Gerenciamento de questões</h2>

            <QuestionForm onCreated={handleQuestionCreated} />

            {loadError && (
                <p role="alert" className="error-message">
                    {loadError}
                </p>
            )}

            <QuestionList
                questions={questions}
                loading={loading}
            />
        </div>
    );
};

export default QuestionsTab;