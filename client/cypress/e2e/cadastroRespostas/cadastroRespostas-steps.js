const { Given, When, Then } = require("@badeball/cypress-cucumber-preprocessor");

const MOCK_STUDENTS = [
  { name: "João", cpf: "111.111.111-11", email: "joao@cin.ufpe.br" },
  { name: "Maria", cpf: "222.222.222-22", email: "maria@cin.ufpe.br" },
];

let selectedStudentName = "João";

function decodePropositions(sum) {
  const propositions = [];
  let bit = 1;
  while (bit <= sum) {
    if ((sum & bit) !== 0) propositions.push(bit);
    bit *= 2;
  }
  return propositions;
}

function setupInterceptions(initialSubmissions = []) {
  cy.intercept("GET", "**/api/students", { statusCode: 200, body: MOCK_STUDENTS }).as("getStudents");
  cy.intercept("GET", "**/api/classes", { statusCode: 200, body: [] }).as("getClasses");
  cy.intercept("GET", "**/api/questions", { statusCode: 200, body: [] }).as("getQuestions");
  cy.intercept("GET", "**/api/exams", { statusCode: 200, body: [] }).as("getExams");
  cy.intercept("GET", "**/api/exam-submissions", { statusCode: 200, body: initialSubmissions }).as("getExamSubmissions");
  cy.intercept("POST", "**/api/exam-submissions", (req) => {
    const student = MOCK_STUDENTS.find((s) => s.cpf === req.body.studentCpf) || MOCK_STUDENTS[0];
    req.reply({
      statusCode: 201,
      body: {
        studentName: student.name,
        studentCpf: student.cpf,
        studentEmail: student.email,
        examTitle: req.body.examTitle,
        tipoProva: req.body.tipoProva,
        submittedAt: new Date().toISOString(),
        questions: (req.body.questions || []).map((q) => ({
          label: q.label,
          sum: Number(q.sum),
          propositions: decodePropositions(Number(q.sum)),
        })),
      },
    });
  }).as("createExamSubmission");
}

function openAnswersSectionFor(nome) {
  cy.visit("/");
  cy.wait("@getStudents");
  cy.get('[data-testid="exams-tab"]').click();
  cy.get('[data-cy="secao-respostas-da-prova"]').click();
  cy.wait("@getExamSubmissions");

  const student = MOCK_STUDENTS.find((s) => s.name === nome);
  const valueToSelect = student ? student.cpf : nome;
  cy.get('[data-cy="seletor-estudante"]').should("be.visible").select(valueToSelect);
}

Given("o estudante {string} está selecionado na seção de respostas", (nome) => {
  selectedStudentName = nome;
  setupInterceptions([]);
  openAnswersSectionFor(nome);
});

Given("eu estou na página {string}", (pagina) => {
  cy.get("body").then(($body) => {
    if (pagina === "Formulário da 1ª EE" && $body.find('[data-cy="pagina-Formulário da 1ª EE"]').length === 0) {
      cy.get('[data-cy="selecionar-1ª EE"]').click();
    }
  });
  cy.get(`[data-cy="pagina-${pagina}"]`).should("be.visible");
});

Then("eu permaneço na página {string}", (pagina) => {
  cy.get(`[data-cy="pagina-${pagina}"]`).should("be.visible");
});

Given("eu vejo a avaliação {string} com o status {string}", (avaliacao, status) => {
  cy.get(`[data-cy="status-${avaliacao}"]`).then(($el) => {
    if (status === "Respondida" && $el.text().trim() !== "Respondida") {
      const student = MOCK_STUDENTS.find((s) => s.name === selectedStudentName) || MOCK_STUDENTS[0];
      setupInterceptions([
        {
          studentName: student.name,
          studentCpf: student.cpf,
          studentEmail: student.email,
          examTitle: avaliacao,
          tipoProva: "1",
          submittedAt: "2026-11-23T14:00:00.000Z",
          questions: [
            { label: "Questão 1", sum: 21, propositions: decodePropositions(21) },
            { label: "Questão 2", sum: 10, propositions: decodePropositions(10) },
            { label: "Questão 3", sum: 33, propositions: decodePropositions(33) },
          ],
        },
      ]);
      openAnswersSectionFor(student.name);
    }
  });
  cy.get(`[data-cy="status-${avaliacao}"]`).should("be.visible").and("have.text", status);
});

Given("eu vejo o campo {string} vazio", (campo) => {
  cy.get(`[data-cy="campo-${campo}"]`).should("be.visible").and("have.value", "");
});

Given("eu vejo o campo {string} preenchido com {string}", (campo, valor) => {
  cy.get(`[data-cy="campo-${campo}"]`).then(($input) => {
    if ($input.val() === "") {
      cy.wrap($input).clear().type(valor);
    }
  });
  cy.get(`[data-cy="campo-${campo}"]`).should("be.visible").and("have.value", valor);
});

When("eu seleciono a avaliação {string}", (avaliacao) => {
  cy.get(`[data-cy="selecionar-${avaliacao}"]`).click();
});

When("eu preencho o campo {string} com {string}", (campo, valor) => {
  cy.get(`[data-cy="campo-${campo}"]`).clear().type(valor).should("have.value", valor);
});

When("eu seleciono a opção {string}", (opcao) => {
  cy.get(`[data-cy="opcao-${opcao}"]`).click();
});

Then("eu vejo a mensagem {string}", (mensagem) => {
  cy.get('[data-cy="mensagem-sucesso"]').should("be.visible").and("contain.text", mensagem);
});

Then("eu vejo a mensagem de erro {string}", (mensagem) => {
  cy.get('[data-cy="mensagem-erro"]').should("be.visible").and("contain.text", mensagem);
});

Then("eu vejo na confirmação o tipo de prova {string}", (tipoProva) => {
  cy.get('[data-cy="confirmacao-respostas"]').should("be.visible");
  cy.get('[data-cy="confirmacao-tipo-prova"]').should("have.text", tipoProva);
});

Then("eu vejo na confirmação a {string} com soma {string}", (questao, soma) => {
  cy.get(`[data-cy="confirmacao-${questao}"]`)
    .should("be.visible")
    .and("contain.text", `Soma ${soma}`);
});

// Like a Google Form: each field in its own card, one below the other, all in the same column
Then("eu vejo os campos do formulário empilhados em uma única coluna, de cima para baixo", () => {
  cy.get('[data-cy^="cartao-"]').should(($cards) => {
    expect($cards.length, "campos do formulário").to.be.at.least(2);
    const rects = Array.from($cards).map((card) => card.getBoundingClientRect());
    rects.forEach((rect, index) => {
      if (index === 0) return;
      expect(rect.top, `o campo ${index + 1} fica abaixo do anterior`).to.be.at.least(rects[index - 1].bottom - 1);
      expect(Math.abs(rect.left - rects[0].left), `o campo ${index + 1} está na mesma coluna`).to.be.lessThan(2);
    });
  });
});
