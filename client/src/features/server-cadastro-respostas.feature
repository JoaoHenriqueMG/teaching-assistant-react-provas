@service
Feature: Cadastro de respostas da prova (Serviço)
  Como um sistema cliente
  Eu quero registrar e consultar as respostas de prova de estudantes cadastrados via API
  Para que as respostas submetidas sejam validadas e persistidas corretamente no servidor

  Background:
    Given o estudante "João" com CPF "777.777.777-77" está cadastrado no sistema

  Scenario: Registrar respostas válidas com tipo de prova e somas entre 0 e 63
    Given o estudante com CPF "777.777.777-77" ainda não respondeu a avaliação "1ª EE"
    When eu submeto para o estudante com CPF "777.777.777-77" na avaliação "1ª EE" o tipo de prova "1" com as somas "1:21, 2:0, 3:63"
    Then a submissão é aceita pelo servidor
    And o sistema armazena para o estudante com CPF "777.777.777-77" na avaliação "1ª EE" o tipo de prova "1" e as somas "1:21, 2:0, 3:63"

  Scenario: Rejeitar submissão sem informar o tipo da prova
    Given o estudante com CPF "777.777.777-77" ainda não respondeu a avaliação "1ª EE"
    When eu submeto para o estudante com CPF "777.777.777-77" na avaliação "1ª EE" o tipo de prova "" com as somas "1:21, 2:10, 3:33"
    Then o sistema rejeita a submissão com a mensagem "O tipo da prova é obrigatório"
    And o sistema não possui respostas armazenadas do estudante com CPF "777.777.777-77" para a avaliação "1ª EE"

  Scenario: Rejeitar submissão com questão não preenchida
    Given o estudante com CPF "777.777.777-77" ainda não respondeu a avaliação "1ª EE"
    When eu submeto para o estudante com CPF "777.777.777-77" na avaliação "1ª EE" o tipo de prova "1" com as somas "1:21, 2:, 3:33"
    Then o sistema rejeita a submissão com a mensagem "Todas as questões são obrigatórias. Digite 0 caso não marque nenhuma proposição"
    And o sistema não possui respostas armazenadas do estudante com CPF "777.777.777-77" para a avaliação "1ª EE"

  Scenario Outline: Rejeitar submissão com soma fora do intervalo de 0 a 63
    Given o estudante com CPF "777.777.777-77" ainda não respondeu a avaliação "1ª EE"
    When eu submeto para o estudante com CPF "777.777.777-77" na avaliação "1ª EE" o tipo de prova "1" com as somas "1:<soma>, 2:10, 3:33"
    Then o sistema rejeita a submissão com a mensagem "A soma de cada questão deve ser um valor entre 0 e 63"
    And o sistema não possui respostas armazenadas do estudante com CPF "777.777.777-77" para a avaliação "1ª EE"

    Examples:
      | soma |
      | -1   |
      | 64   |

  Scenario: Rejeitar submissão para estudante não cadastrado no sistema
    Given não existe estudante cadastrado com CPF "999.999.999-99"
    When eu submeto para o estudante com CPF "999.999.999-99" na avaliação "1ª EE" o tipo de prova "1" com as somas "1:21, 2:10, 3:33"
    Then o sistema rejeita a submissão com a mensagem "Estudante não cadastrado"
    And o sistema não possui respostas armazenadas do estudante com CPF "999.999.999-99" para a avaliação "1ª EE"

  Scenario: Rejeitar nova submissão para uma avaliação já respondida pelo estudante
    Given o sistema possui armazenadas para o estudante com CPF "777.777.777-77" na avaliação "1ª EE" o tipo de prova "1" e as somas "1:21, 2:10, 3:33"
    When eu submeto para o estudante com CPF "777.777.777-77" na avaliação "1ª EE" o tipo de prova "2" com as somas "1:15, 2:8, 3:32"
    Then o sistema rejeita a submissão com a mensagem "Você já enviou as respostas desta avaliação"
    And o sistema mantém armazenadas para o estudante com CPF "777.777.777-77" na avaliação "1ª EE" o tipo de prova "1" e as somas "1:21, 2:10, 3:33"
