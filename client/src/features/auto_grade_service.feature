@service
Feature: Automatic correction service
  As a Professor
  I want the answer keys and the students' responses to be corrected automatically
  So that the students' grades are calculated and saved consistently

  # Regras de negócio:
  # - Cada questão tem n alternativas valendo 1, 2, 4, 8, ... (potências de 2). A resposta é a soma das marcadas.
  # - Crédito parcial: cada alternativa vale 1/n da questão e conta como certa quando o estado dela
  #   (marcada ou não) bate com o gabarito.
  # - Resposta válida: inteiro entre 0 e 2^n - 1 (com 5 alternativas, de 0 a 31).
  # - Resposta inválida ou em branco zera a questão. Branco (célula vazia) é diferente de "0" (nenhuma marcada).
  #   Só respostas inválidas geram alerta.
  # - A nota final é a média das questões, arredondada para o inteiro mais próximo.
  # - A correção é atômica: se houver erro estrutural, nenhuma nota da turma é salva.
  # - Reexecutar a correção sobrescreve as notas existentes.
  # Convenções: respostas separadas por vírgula; "(blank)" = célula vazia; banco limpo antes de cada cenário.

  Background:
    Given all exams have 5 alternatives
    And the class "Engenharia de Software e Sistemas 2026.2" has the students:
      | name  | CPF            |
      | Pedro | 111.111.111-11 |
      | Maria | 222.222.222-22 |

  Scenario Outline: Service calculates the grade with partial credit per alternative
    Given the answer key of exam "01" is "<answer key>"
    And "Pedro" answered exam "01" with "<answers>"
    When I call the automatic correction service
    Then the grade of "Pedro" is "<grade>"

    Examples: Full credit in a single question
      | answer key | answers | grade |
      | 4          | 4       | 100%  |
      | 9          | 9       | 100%  |
      | 31         | 31      | 100%  |
      | 0          | 0       | 100%  |

    Examples: Partial credit in a single question
      | answer key | answers | grade |
      | 9          | 8       | 80%   |
      | 9          | 11      | 80%   |
      | 9          | 4       | 40%   |
      | 9          | 0       | 60%   |
      | 0          | 4       | 80%   |
      | 9          | 22      | 0%    |

    Examples: Whole exam
      | answer key | answers    | grade |
      | 9, 15, 3   | 9, 15, 3   | 100%  |
      | 3, 15, 9   | 1, 1, 1    | 67%   |
      | 9, 3, 15   | 22, 28, 16 | 0%    |
      | 15, 9, 3   | 9, 3, 15   | 60%   |

    Examples: Rounding to the nearest integer
      | answer key | answers  | grade |
      # 13/15 = 86,67% -> arredonda para cima
      | 3, 9, 15   | 3, 3, 15 | 87%   |
      # 14/15 = 93,33% -> arredonda para baixo
      | 3, 9, 15   | 3, 9, 7  | 93%   |

  Scenario Outline: Service scores zero for an invalid or blank answer
    Given the answer key of exam "01" is "9"
    And "Pedro" answered exam "01" with "<answer>"
    When I call the automatic correction service
    Then the grade of "Pedro" is "0%"
    And question 1 of "Pedro" is marked as "<situation>"

    Examples:
      | answer  | situation      |
      | B       | invalid answer |
      | abc     | invalid answer |
      | -1      | invalid answer |
      | 2.5     | invalid answer |
      | 32      | invalid answer |
      | 40      | invalid answer |
      | (blank) | blank answer   |

  Scenario Outline: Service rejects the whole correction when the input is inconsistent
    Given the answer key of exam "01" is "<answer key>"
    And "Maria" answered exam "01" with "3, 9, 15"
    And "Pedro" answered exam "<exam>" with "<answers>"
    When I call the automatic correction service
    Then the service returns the error "<error>"
    And no grade is saved

    Examples:
      | answer key | exam | answers     | error                  |
      | 3, 9, 15   | 05   | 3, 9, 15    | exam not in answer key |
      | 3, 9, 15   | 01   | 3, 9        | answer count mismatch  |
      | 3, 9, 15   | 01   | 3, 9, 15, 1 | answer count mismatch  |
      |            | 01   | 3, 9, 15    | invalid answer key     |

  Scenario: Service overwrites the existing grade when correcting again
    Given the answer key of exam "01" is "3, 9, 15"
    And "Pedro" already has the grade "40%" on exam "01"
    And "Pedro" answered exam "01" with "3, 3, 15"
    When I call the automatic correction service
    Then the grade of "Pedro" is "87%"
    And "Pedro" has exactly one grade for exam "01"
