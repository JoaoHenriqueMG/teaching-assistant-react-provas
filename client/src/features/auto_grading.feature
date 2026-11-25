Feature: Automatic correction and update of each student's grades
As a Professor
I Want to send the answer keys and the students' responses
So that the exams are corrected automatically and the students' grades are made available

# Regras de negócio adotadas nestes cenários:
# - Cada questão tem n alternativas, valendo 1, 2, 4, 8, ... (potências de 2). A resposta é a soma das alternativas marcadas.
# - Crédito parcial por alternativa: cada alternativa vale 1/n da questão e conta como certa
#   quando o estado dela (marcada ou não) bate com o gabarito.
# - Resposta válida: inteiro entre 0 e 2^n - 1 (com 5 alternativas, de 0 a 31).
# - Reexecutar a correção sobrescreve as notas existentes.

Background:
    Given all exams have 5 alternatives
    And the answer key spreadsheet has the columns "número da prova", "questão 1", "questão 2" and so on
    And the student responses spreadsheet has the columns "Carimbo de data/hora", "nome", "e-mail", "CPF", "número da prova", "questão 1", "questão 2" and so on 
    #formato google forms

@gui
Scenario: Professor corrects the grades of a class with a registered answer key
    Given I am on the grades page of the class "Engenharia de Software e Sistemas 2026.2"
    And the following answer keys were sent:
        | exam | answers |
        | 01   | 3,9,15  |
        | 02   | 9,15,3  |
    And the following students answered the exams:
        | student | exam | answers |
        | Pedro   | 01   | 3,3,15  |
        | Maria   | 02   | 9,15,3  |
    When I send the answer keys spreadsheet with the correct format
    And I send the responses spreadsheet with the correct format
    And request the automatic correction
    Then a message will appear saying that the grades were saved
    And I will see "Maria" at rank #1 with the grade 100%
    And I will see "Pedro" at rank #2 with the grade 87%

@gui
Scenario Outline: Professor tries to correct grades with a malformed answer key spreadsheet
    Given I am on the grades page of the class "Engenharia de Software e Sistemas 2026.2"
    When I send an answer keys spreadsheet with the problem "<problem>"
    And I send the responses spreadsheet with the correct format
    And request the automatic correction
    Then the invalid format message will appear
    And no grade will be saved for the class

    Examples:
        | problem                         |
        | missing exam number column      |
        | invalid file extension (.txt)   |
        | empty spreadsheet (header only) |

@gui
Scenario Outline: Professor tries to correct the grades of a class with a wrongly formatted responses spreadsheet
    Given I am on the grades page of the class "Engenharia de Software e Sistemas 2026.2"
    And the following answer keys were sent:
        | exam | answers |
        | 01   | 3,9,15  |
    When I send the answer keys spreadsheet with the correct format
    And I send the responses spreadsheet with the "<problem>"
    And request the automatic correction
    Then the invalid format message will appear
    And no grade will be saved for the class

    Examples:
        | problem                                           |
        | Exam number that does not exist in the answer key |
        | invalid file extension (.txt)                     |
        | question 3 missing (invalid number of columns)    |
        | missing student identifier column                 |
        | empty spreadsheet (header only)                   |

@gui
Scenario Outline: Professor tries to correct without sending all the required spreadsheets
    Given I am on the grades page of the class "Engenharia de Software e Sistemas 2026.2"
    And the spreadsheet upload is in the situation "<situation>"
    When I request the automatic correction
    Then a message asking for the spreadsheets will appear
    And no grade will be saved for the class

    Examples:
        | situation             |
        | only answer keys sent |
        | only responses sent   |
        | no spreadsheet sent   |

@gui
Scenario: Professor corrects the grades of a class and a student fills in an invalid answer
    Given I am on the grades page of the class "Engenharia de Software e Sistemas 2026.2"
    And the following answer keys were sent:
        | exam | answers |
        | 01   | 3,9,15  |
        | 02   | 9,15,3  |
    And the following students answered the exams:
        | student | exam | answers |
        | Pedro   | 01   | 3,B,40  |
        | Maria   | 02   | 9,15,3  |
    When I send the answer keys spreadsheet with the correct format
    And I send the responses spreadsheet with the correct format
    And request the automatic correction
    Then a message will appear saying that the grades were saved with invalid answer alerts
    And I will see "Maria" at rank #1 with the grade 100%
    And I will see "Pedro" at rank #2 with the grade 33%
    And the system will indicate, in the details, that questions 2 and 3 of the student "Pedro" have invalid answers
    And the system will not show alerts for the student "Maria"

'''@gui
Scenario: Professor corrects grades and a student hands in a blank exam
    Given I am on the grades page of the class "Engenharia de Software e Sistemas 2026.2"
    And the following answer keys were sent:
        | exam | answers |
        | 01   | 3,9,15  |
    And the following students answered the exams:
        | student | exam | answers                 |
        | Ana     | 01   | (blank),(blank),(blank) |
    When I send the answer keys spreadsheet with the correct format
    And I send the responses spreadsheet with the correct format
    And request the automatic correction
    Then a message will appear saying that the grades were saved
    And I will see "Ana" with the grade 0%
'''

@gui
Scenario: Professor corrects grades and the spreadsheet contains a student who is not in the class
    Given I am on the grades page of the class "Engenharia de Software e Sistemas 2026.2"
    And the following answer keys were sent:
        | exam | answers |
        | 01   | 3,9,15  |
    And the following students answered the exams:
        | student | exam | answers |
        | Pedro   | 01   | 3,3,15  |
    And the responses spreadsheet contains a student whose identifier is not in the class
    When I send the answer keys spreadsheet with the correct format
    And I send the responses spreadsheet with the correct format
    And request the automatic correction
    Then a message will appear saying that the grades were saved with a student not found in the class alert
    And I will see "Pedro" with the grade 87%
    And no grade will be saved for the student who is not in the class

@gui
Scenario: Professor corrects again a class that already has grades
    Given I am on the grades page of the class "Engenharia de Software e Sistemas 2026.2"
    And the student "Pedro" already has the grade 40% on exam "01"
    And the following answer keys were sent:
        | exam | answers |
        | 01   | 3,9,15  |
        | 02   | 9,15,3  |
    And the following students answered the exams:
        | student | exam | answers |
        | Pedro   | 01   | 3,3,15  |
        | Maria   | 02   | 9,15,3  |
    When I send the answer keys spreadsheet with the correct format
    And I send the responses spreadsheet with the correct format
    And request the automatic correction
    Then a message will appear saying that the grades were saved
    And I will see "Maria" at rank #1 with the grade 100%
    And I will see "Pedro" at rank #2 with the grade 87%
    And the student "Pedro" will not have more than one grade for exam "01"

@service
Scenario Outline: Service calculates the student's grade from the answer key and the marked answers
    Given the answer key of exam "<exam>" is "<answer key>"
    And the student "<student>" marked exam "<exam>" with the answers "<answers>"
    When I call the automatic correction service
    Then the service will return the grade of the student "<student>" as "<grade>"

    Examples:
        | student | exam | answer key | answers    | grade |
        | Pedro   | 01   | 3, 9, 15   | 3, 3, 15   | 87%   |
        | Maria   | 02   | 9, 15, 3   | 9, 15, 3   | 100%  |
        | Carla   | 03   | 3, 15, 9   | 1, 1, 1    | 67%   |
        | Bruno   | 04   | 9, 3, 15   | 22, 28, 16 | 0%    |
        | Davi    | 05   | 15, 9, 3   | 9, 3, 15   | 60%   |

@service
Scenario Outline: Service applies partial credit per alternative in a question
    Given the answer key of exam "01" is "<answer key>"
    And the student "Pedro" marked exam "01" with the answers "<answer>"
    When I call the automatic correction service
    Then the service will return the grade of the student "Pedro" as "<grade>"

    Examples: Full credit
        | answer key | answer | grade |
        | 4          | 4      | 100%  |
        | 9          | 9      | 100%  |
        | 31         | 31     | 100%  |
        | 0          | 0      | 100%  |

    Examples: Partial credit
        | answer key | answer | grade |
        | 9          | 8      | 80%   |
        | 9          | 11     | 80%   |
        | 9          | 4      | 40%   |
        | 9          | 0      | 60%   |
        | 0          | 4      | 80%   |
        | 9          | 22     | 0%    |

@service
Scenario Outline: Service treats invalid or blank answers as wrong in the question
    Given the answer key of exam "01" is "9"
    And the student "Pedro" marked exam "01" with the answers "<answer>"
    When I call the automatic correction service
    Then the service will return the grade of the student "Pedro" as "0%"
    And the service will indicate "<situation>" for question 1

    Examples:
        | answer | situation      |
        | B      | invalid answer |
        | abc    | invalid answer |
        | -1     | invalid answer |
        | 2.5    | invalid answer |
        | 32     | invalid answer |
        | 40     | invalid answer |

@service
Scenario Outline: Service rounds the grade to an integer
    Given the following answer keys were sent:
        | exam | answers |
        | 01   | 3,9,15  |
    And the following students answered the exams:
        | student | exam | answers     |
        | Pedro   | 01   | <respostas> |
    When I call the automatic correction service
    Then the service will return the grade of the student "Pedro" as "<grade>"

    Examples:
        | answers   | grade |
        # 86,67 arredondado para cima
        | 3, 3, 15  | 87%   |
        # 93,33 arredondado para baixo
        | 3, 9, 7   | 93%   |

@service
Scenario: Service tries to correct an exam that does not exist in the answer key
    Given the following answer keys were sent:
        | exam | answers |
        | 01   | 3,9,15  |
        | 02   | 9,15,3  |
        | 03   | 15,9,15 |                
    And the following students answered the exams:
        | student | exam | answers |
        | Pedro   | 05   | 3,9,15  |
    When I call the automatic correction service
    Then the service will return an exam not in the answer key error
    And no grade will be saved

@service
Scenario Outline: Service tries to correct with a number of answers different from the number of questions (columns in the spreadsheet)
    Given the following answer keys were sent:
        | exam | answers |
        | 01   | 3,9,15  |
    And the following students answered the exams:
        | student | exam | answers     |
        | Pedro   | 01   | <respostas> |
    When I call the automatic correction service
    Then the service will return an answer count does not match the answer key error
    And no grade will be saved

    Examples:
        | answers     |
        | 3, 9        |
        | 3, 9, 15, 1 |

@service
Scenario: Service tries to correct with an answer key without questions
    Given the following answer keys were sent:
        | exam | answers |
        | 01   |         |
    And the following students answered the exams:
        | student | exam | answers |
        | Pedro   | 01   | 3,9,15  |
    When I call the automatic correction service
    Then the service will return an invalid answer key error
    And no grade will be saved

@service
Scenario: Service overwrites the existing grade when correcting again
    Given the following answer keys were sent:
        | exam | answers |
        | 01   | 3,9,15  |
    And the student "Pedro" already has the grade "40%" on exam "01"
    And the following students answered the exams:
        | student | exam | answers |
        | Pedro   | 01   | 3,3,15  |
    When I call the automatic correction service
    Then the service will return the grade of the student "Pedro" as "87%"
    And the student "Pedro" will have only one grade for exam "01"

