@gui
Feature: Automatic correction of exams (GUI)
  As a Professor
  I want to upload the answer keys and the students' responses
  So that the exams are corrected automatically and the students' grades are made available

  The step definitions build the spreadsheets from the tables in each scenario:
  - Answer keys: "número da prova", "questão 1", "questão 2", ...
  - Responses (Google Forms export): "Carimbo de data/hora", "nome", "e-mail", "CPF",
    "número da prova", "questão 1", "questão 2", ...

  # Regras de cálculo: ver correcao_automatica_service.feature (testadas na camada de serviço).
  # Convenções:
  # - Respostas separadas por vírgula; "(blank)" = célula vazia na planilha.
  # - Cada cenário começa com o banco limpo (hook @Before), então os cenários não dependem uns dos outros.
  # - A aluna "Joana" NÃO está matriculada de propósito.

  Background:
    Given all exams have 5 alternatives
    And the class "Engenharia de Software e Sistemas 2026.2" has the students:
      | name  | CPF            |
      | Pedro | 111.111.111-11 |
      | Maria | 222.222.222-22 |
      | Ana   | 333.333.333-33 |
    And I am on the grades page of the class "Engenharia de Software e Sistemas 2026.2"

  Scenario: Professor corrects the class and sees the ranking
    Given the answer keys are:
      | exam | answers  |
      | 01   | 3, 9, 15 |
      | 02   | 9, 15, 3 |
    And the responses are:
      | student | exam | answers  |
      | Pedro   | 01   | 3, 3, 15 |
      | Maria   | 02   | 9, 15, 3 |
    When I request the automatic correction after uploading "both spreadsheets"
    Then I see the message "grades saved"
    And I see the ranking:
      | rank | student | grade |
      | 1    | Maria   | 100%  |
      | 2    | Pedro   | 87%   |

  Scenario: Invalid answers are flagged, blank answers are not
    Given the answer keys are:
      | exam | answers  |
      | 01   | 3, 9, 15 |
      | 02   | 9, 15, 3 |
    And the responses are:
      | student | exam | answers                   |
      | Pedro   | 01   | 3, B, 40                  |
      | Maria   | 02   | 9, 15, 3                  |
      | Ana     | 01   | (blank), (blank), (blank) |
    When I request the automatic correction after uploading "both spreadsheets"
    Then I see the message "grades saved with invalid answer alerts"
    And I see the ranking:
      | rank | student | grade |
      | 1    | Maria   | 100%  |
      | 2    | Pedro   | 33%   |
      | 3    | Ana     | 0%    |
    And the details of "Pedro" show invalid answers in questions "2, 3"
    And "Maria" has no alerts
    And "Ana" has no alerts

  Scenario: Responses from students not enrolled in the class are ignored and flagged
    Given the answer keys are:
      | exam | answers  |
      | 01   | 3, 9, 15 |
    And the responses are:
      | student | exam | answers  |
      | Pedro   | 01   | 3, 3, 15 |
      | Joana   | 01   | 3, 9, 15 |
    When I request the automatic correction after uploading "both spreadsheets"
    Then I see the message "grades saved with student not found alert"
    And I see the ranking:
      | rank | student | grade |
      | 1    | Pedro   | 87%   |
    And no grade is saved for "Joana"

  Scenario Outline: Correction is rejected when a spreadsheet is malformed
    Given the answer keys are:
      | exam | answers  |
      | 01   | 3, 9, 15 |
    And the responses are:
      | student | exam | answers  |
      | Pedro   | 01   | 3, 3, 15 |
    But the "<spreadsheet>" spreadsheet has the problem "<problem>"
    When I request the automatic correction after uploading "both spreadsheets"
    Then I see the message "invalid spreadsheet format"
    And no grade is saved

    Examples: Answer keys spreadsheet
      | spreadsheet | problem                       |
      | answer keys | missing exam number column    |
      | answer keys | invalid file extension (.txt) |
      | answer keys | header only                   |

    Examples: Responses spreadsheet
      | spreadsheet | problem                           |
      | responses   | exam number not in answer keys    |
      | responses   | missing question 3 column         |
      | responses   | missing student identifier column |
      | responses   | invalid file extension (.txt)     |
      | responses   | header only                       |

  Scenario Outline: Correction is blocked when a spreadsheet was not uploaded
    Given the answer keys are:
      | exam | answers  |
      | 01   | 3, 9, 15 |
    And the responses are:
      | student | exam | answers  |
      | Pedro   | 01   | 3, 3, 15 |
    When I request the automatic correction after uploading "<uploaded>"
    Then I see the message "spreadsheets required"
    And no grade is saved

    Examples:
      | uploaded             |
      | only the answer keys |
      | only the responses   |
      | nothing              |
