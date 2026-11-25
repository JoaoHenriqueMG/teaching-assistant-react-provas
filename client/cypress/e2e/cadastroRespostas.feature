Feature: Cadastro de respostas da prova
  Como um estudante cadastrado na disciplina
  Eu quero preencher o formulário da avaliação informando o tipo da minha prova e a soma das proposições corretas de cada questão
  Para que minhas respostas sejam submetidas e confirmadas de acordo com o meu tipo de prova

  @gui
  Scenario: Estudante acessa o formulário de respostas de uma avaliação disponível
    Given o estudante "João" está selecionado na seção de respostas
    And eu estou na página "Provas Disponíveis"
    And eu vejo a avaliação "1ª EE" com o status "Disponível"
    When eu seleciono a avaliação "1ª EE"
    Then eu estou na página "Formulário da 1ª EE"
    And eu vejo o campo "Tipo da Prova" vazio
    And eu vejo o campo "Questão 1" vazio
    And eu vejo o campo "Questão 2" vazio
    And eu vejo o campo "Questão 3" vazio

  @gui
  Scenario: Estudante vê os campos do formulário empilhados em uma única coluna, como no Google Forms
    Given o estudante "João" está selecionado na seção de respostas
    And eu estou na página "Provas Disponíveis"
    When eu seleciono a avaliação "1ª EE"
    Then eu estou na página "Formulário da 1ª EE"
    And eu vejo os campos do formulário empilhados em uma única coluna, de cima para baixo

  @gui
  Scenario: Estudante altera a soma digitada em uma questão enquanto o formulário está aberto
    Given o estudante "João" está selecionado na seção de respostas
    And eu estou na página "Formulário da 1ª EE"
    And eu vejo o campo "Tipo da Prova" preenchido com "1"
    And eu vejo o campo "Questão 1" preenchido com "21"
    When eu preencho o campo "Questão 1" com "19"
    Then eu permaneço na página "Formulário da 1ª EE"
    And eu vejo o campo "Questão 1" preenchido com "19"

  @gui
  Scenario: Estudante envia o formulário da prova com todas as somas preenchidas e vê a confirmação
    Given o estudante "João" está selecionado na seção de respostas
    And eu estou na página "Formulário da 1ª EE"
    And eu vejo o campo "Tipo da Prova" vazio
    And eu vejo o campo "Questão 1" vazio
    And eu vejo o campo "Questão 2" vazio
    And eu vejo o campo "Questão 3" vazio
    When eu preencho o campo "Tipo da Prova" com "1"
    And eu preencho o campo "Questão 1" com "21"
    And eu preencho o campo "Questão 2" com "10"
    And eu preencho o campo "Questão 3" com "33"
    And eu seleciono a opção "Enviar"
    Then eu estou na página "Provas Disponíveis"
    And eu vejo a mensagem "Respostas enviadas com sucesso"
    And eu vejo a avaliação "1ª EE" com o status "Respondida"
    And eu vejo na confirmação o tipo de prova "1"
    And eu vejo na confirmação a "Questão 1" com soma "21"
    And eu vejo na confirmação a "Questão 2" com soma "10"
    And eu vejo na confirmação a "Questão 3" com soma "33"

  @gui
  Scenario: Estudante envia o formulário indicando soma zero para uma questão que não soube responder
    Given o estudante "João" está selecionado na seção de respostas
    And eu estou na página "Formulário da 1ª EE"
    And eu vejo o campo "Tipo da Prova" vazio
    And eu vejo o campo "Questão 1" vazio
    And eu vejo o campo "Questão 2" vazio
    And eu vejo o campo "Questão 3" vazio
    When eu preencho o campo "Tipo da Prova" com "2"
    And eu preencho o campo "Questão 1" com "21"
    And eu preencho o campo "Questão 2" com "0"
    And eu preencho o campo "Questão 3" com "63"
    And eu seleciono a opção "Enviar"
    Then eu estou na página "Provas Disponíveis"
    And eu vejo a mensagem "Respostas enviadas com sucesso"
    And eu vejo a avaliação "1ª EE" com o status "Respondida"
    And eu vejo na confirmação o tipo de prova "2"
    And eu vejo na confirmação a "Questão 1" com soma "21"
    And eu vejo na confirmação a "Questão 2" com soma "0"
    And eu vejo na confirmação a "Questão 3" com soma "63"

  @gui
  Scenario: Estudante tenta enviar o formulário deixando o campo de uma questão vazio
    Given o estudante "João" está selecionado na seção de respostas
    And eu estou na página "Formulário da 1ª EE"
    And eu vejo o campo "Questão 2" vazio
    When eu preencho o campo "Tipo da Prova" com "1"
    And eu preencho o campo "Questão 1" com "21"
    And eu preencho o campo "Questão 3" com "33"
    And eu seleciono a opção "Enviar"
    Then eu permaneço na página "Formulário da 1ª EE"
    And eu vejo a mensagem de erro "Todas as questões são obrigatórias. Digite 0 caso não marque nenhuma proposição"
    And eu vejo o campo "Questão 1" preenchido com "21"
    And eu vejo o campo "Questão 2" vazio
    And eu vejo o campo "Questão 3" preenchido com "33"

  @gui
  Scenario: Estudante tenta enviar o formulário sem informar o tipo da prova
    Given o estudante "João" está selecionado na seção de respostas
    And eu estou na página "Formulário da 1ª EE"
    And eu vejo o campo "Tipo da Prova" vazio
    When eu preencho o campo "Questão 1" com "21"
    And eu preencho o campo "Questão 2" com "10"
    And eu preencho o campo "Questão 3" com "33"
    And eu seleciono a opção "Enviar"
    Then eu permaneço na página "Formulário da 1ª EE"
    And eu vejo a mensagem de erro "O tipo da prova é obrigatório"

  @gui
  Scenario Outline: Estudante tenta enviar o formulário com uma soma fora do intervalo de 0 a 63
    Given o estudante "João" está selecionado na seção de respostas
    And eu estou na página "Formulário da 1ª EE"
    And eu vejo o campo "Tipo da Prova" vazio
    And eu vejo o campo "Questão 1" vazio
    And eu vejo o campo "Questão 2" vazio
    And eu vejo o campo "Questão 3" vazio
    When eu preencho o campo "Tipo da Prova" com "1"
    And eu preencho o campo "Questão 1" com "<soma>"
    And eu preencho o campo "Questão 2" com "10"
    And eu preencho o campo "Questão 3" com "33"
    And eu seleciono a opção "Enviar"
    Then eu permaneço na página "Formulário da 1ª EE"
    And eu vejo a mensagem de erro "A soma de cada questão deve ser um valor entre 0 e 63"

    Examples:
      | soma |
      | -1   |
      | 64   |

  @gui
  Scenario: Estudante tenta acessar novamente o formulário de uma avaliação já respondida
    Given o estudante "João" está selecionado na seção de respostas
    And eu estou na página "Provas Disponíveis"
    And eu vejo a avaliação "1ª EE" com o status "Respondida"
    When eu seleciono a avaliação "1ª EE"
    Then eu permaneço na página "Provas Disponíveis"
    And eu vejo a mensagem de erro "Você já enviou as respostas desta avaliação"
