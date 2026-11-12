
Feature: Criação de questões

  Scenario: Professor cria uma questão e não há questões existentes
    Given não existem questões cadastradas
    And eu estou na página "criação de questões"
    When eu inicio a criação de uma questão
    And eu defino "gerência de configuração" como o assunto da questão
    And eu defino "Quais desses abaixo são comandos que ocasionalmente podem dar conflito textual?" como enunciado da questão
    And eu adiciono a alternativa "merge" como "verdadeira"
    And eu adiciono a alternativa "stash" como "verdadeira"
    And eu adiciono a alternativa "pull" como "verdadeira"
    And eu adiciono a alternativa "log" como "falsa"
    And eu tento salvar a questão
    Then eu vejo a questão com assunto "gerência de configuração" entre as questões criadas
    And eu vejo seu enunciado sendo "Quais desses abaixo são comandos que ocasionalmente podem dar conflito textual?"
    And eu vejo sua alternativa "merge" como "verdadeira"
    And eu vejo sua alternativa "stash" como "verdadeira"
    And eu vejo sua alternativa "pull" como "verdadeira"
    And eu vejo sua alternativa "log" como "falsa"

  Scenario: Professor cria uma questão repetida
    Given existe uma questão com assunto "gerência de configuração" cadastrada
    And eu estou na página "criação de questões"
    And eu vejo a questão cadastrada na lista
    When eu inicio a criação de uma questão
    And eu defino "gerência de configuração" como o assunto da questão
    And eu defino "Quais desses abaixo são comandos que ocasionalmente podem dar conflito textual?" como enunciado da questão
    And eu adiciono a alternativa "stash" como "verdadeira"
    And eu adiciono a alternativa "pull" como "verdadeira"
    And eu adiciono a alternativa "merge" como "verdadeira"
    And eu adiciono a alternativa "log" como "falsa"
    And eu tento salvar a questão
    Then eu vejo a mensagem "Essa questão já foi criada no sistema"
    And o conjunto de questões criadas não foi alterado
