const {
  Given,
  When,
  Then
} = require("@badeball/cypress-cucumber-preprocessor");

const statement =
  "Quais desses abaixo são comandos que ocasionalmente podem dar conflito textual?";

const existingQuestion = {
  code: "q-001",
  subject: "gerência de configuração",
  statement: statement,
  alternatives: [
    { text: "merge", isTrue: true },
    { text: "stash", isTrue: true },
    { text: "pull", isTrue: true },
    { text: "log", isTrue: false }
  ]
};

let initialCount = 0;

// PREPARAÇÃO DOS DADOS

Given("não existem questões cadastradas", () => {
  initialCount = 0;

  cy.intercept("GET", "**/api/questions", {
    statusCode: 200,
    body: []
  }).as("getQuestions");

  cy.intercept("POST", "**/api/questions", {
    statusCode: 201,
    body: existingQuestion
  }).as("createQuestion");
});

Given(
  /^existe uma questão com assunto "(.+)" cadastrada$/,
  (subject) => {
    expect(existingQuestion.subject).to.equal(subject);
    initialCount = 1;

    cy.intercept("GET", "**/api/questions", {
      statusCode: 200,
      body: [existingQuestion]
    }).as("getQuestions");

    cy.intercept("POST", "**/api/questions", {
      statusCode: 400,
      body: {
        error: "Essa questão já foi criada no sistema"
      }
    }).as("createQuestion");
  }
);

// NAVEGAÇÃO

Given('eu estou na página "criação de questões"', () => {
  cy.visit("/");

  cy.get('[data-testid="exams-tab"]').click();

  cy.wait("@getQuestions");

  cy.contains("Criar questão").should("be.visible");
});

Given("eu vejo a questão cadastrada na lista", () => {
  cy.get(".question-card")
    .should("have.length", 1)
    .and("contain.text", existingQuestion.statement);
});

// PREENCHIMENTO DO FORMULÁRIO

When("eu inicio a criação de uma questão", () => {
  cy.get("#question-subject").should("be.visible");
  cy.get("#question-statement").should("be.visible");
});

When(
  /^eu defino "(.+)" como o assunto da questão$/,
  (subject) => {
    cy.get("#question-subject")
      .clear()
      .type(subject);
  }
);

When(
  /^eu defino "(.+)" como enunciado da questão$/,
  (statement) => {
    cy.get("#question-statement")
      .clear()
      .type(statement);
  }
);

When(
  /^eu adiciono a alternativa "(.+)" como "(verdadeira|falsa)"$/,
  (text, classification) => {
    cy.get(".question-alternative").last()
      .find("input")
      .invoke("val")
      .then(value => {
        if (value) {
          cy.contains("button", "Adicionar alternativa")
            .click();
        }
      });

    cy.get(".question-alternative")
      .last()
      .within(() => {
        cy.get("input").type(text);

        cy.get("select").select(
          classification === "verdadeira"
            ? "true"
            : "false"
        );
      });
  }
);

When("eu tento salvar a questão", () => {
  cy.contains("button", "Salvar questão").click();

  cy.wait("@createQuestion")
    .its("request.body")
    .should("include", {
      subject: existingQuestion.subject,
      statement: existingQuestion.statement
    });
});

// VERIFICAÇÕES DE SUCESSO


Then(
  /^eu vejo sua alternativa "(.+)" como "(verdadeira|falsa)"$/,
  (text, classification) => {
    const label = classification === "verdadeira"
      ? "Verdadeira"
      : "Falsa";
    cy.get(".question-card")
      .contains("li", text)
      .should("be.visible")
      .and("contain.text", label);
  }
);


Then(
  /^eu vejo seu enunciado sendo "(.+)"$/,
  (statement) => {
    cy.get(".question-card")
      .should("contain.text", statement);
  }
);

// VERIFICAÇÕES DE ERRO

Then(/^eu vejo a mensagem "(.+)"$/, (message) => {
  cy.get('[role="alert"]')
    .should("be.visible")
    .and("contain.text", message);
});

Then("o conjunto de questões criadas não foi alterado", () => {
  cy.get(".questions-list")
    .find(".question-card")
    .should("have.length", initialCount);

  cy.get(".question-card")
    .should("contain.text", existingQuestion.statement);
});

Then(
  "eu vejo a questão com assunto {string} entre as questões criadas",
  (subject) => {
    cy.get(".question-card")
      .should("have.length", 1)
      .and("contain.text", subject);
  }
);
