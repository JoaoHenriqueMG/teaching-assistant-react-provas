import React from 'react';
import QuestionsTab from './QuestionsTab';

const ProvasTab: React.FC = () => {
  return (
    <section className="provas-tab">
      <h2>Provas</h2>

      <QuestionsTab />
    </section>
  );
};

export default ProvasTab;