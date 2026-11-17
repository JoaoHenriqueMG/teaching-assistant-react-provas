O sistema deve ser capaz de permitir a criação de
questões fechadas com alternativas de verdadeiro e falso

# ---------------------------------------------------------------------------------- #

Feature: Criação de questões
    Como um professor responsável por uma disciplina
    Eu posso criar questões
    Para que posteriormente eu possa selecionar algumas dessas questões para uma prova

# ---------------------------------------------------------------------------------- #

Scenario: Professor cria uma questão e não há existentes
    Given eu estou na página "criação de questões"
    And eu não vejo questões criadas
    When eu inicio a criação de uma questão
    And eu defino "gerência de configuração" como o assunto da questão
    And eu defino "quais desses abaixo são comandos que ocasionalmente podem dar conflito textual?" como enunciado da questão"
    And eu adiciono a alternativa "merge" como "verdadeira"
    And eu adiciono a alternativa "stash" como "verdadeira"
    And eu adiciono a alternativa "pull" como "verdadeira"
    And eu adiciono a alternativa "log" como "falsa"
    Then eu vejo a questão com assunto "gerência de configuração" entre as questões criadas
    And eu vejo seu enunciado sendo "quais desses abaixo são comandos que ocasionalmente podem dar conflito textual?" como enunciado da questão"
    And eu vejo sua alternativa "merge" como verdadeira
    And eu vejo sua alternativa "stash" como "verdadeira"
    And eu vejo sua alternativa "pull" como "verdadeira"
    And eu vejo sua alternativa "log" como "falsa"


Scenario: Professor cria uma questão repetida
    Given eu estou na página "criação de questões"
    And eu vejo uma questão com assunto "gerência de configuração" entre as questões criadas
    And eu vejo seu enunciado sendo "quais desses abaixo são comandos que ocasionalmente podem dar conflito textual?" 
    And eu vejo sua alternativa "merge" como verdadeira
    And eu vejo sua alternativa "stash" como "verdadeira"
    And eu vejo sua alternativa "pull" como "verdadeira"
    And eu vejo sua alternativa "log" como "falsa"
    When eu inicio a criação de uma questão
    And eu defino "gerência de configuração" como o assunto da questão
    And eu defino "quais desses abaixo são comandos que ocasionalmente podem dar conflito textual?" como enunciado da questão"
    And eu adiciono a alternativa "stash" como "verdadeira"
    And eu adiciono a alternativa "pull" como "verdadeira"
    And eu adiciono a alternativa "merge" como "verdadeira"
    And eu adiciono a alternativa "log" como "falsa"
    Then eu vejo a mensagem de que essa questão já foi criada no sistema


Scenario: Professor cria uma questão com mesmo enunciado mas alternativas diferentes
    Given eu estou na página "criação de questões"
    And eu vejo uma questão com assunto "gerência de configuração" entre as questões criadas
    And eu vejo seu enunciado sendo "quais desses abaixo são comandos que ocasionalmente podem dar conflito textual?" como enunciado da questão"
    And eu vejo sua alternativa "merge" como "verdadeira"
    And eu vejo sua alternativa "stash" como "verdadeira"
    And eu vejo sua alternativa "pull" como "verdadeira"
    And eu vejo sua alternativa "log" como "falsa"
    When eu inicio a criação de uma questão
    And eu defino "gerência de configuração" como o assunto da questão
    And eu defino "quais desses abaixo são comandos que ocasionalmente podem dar conflito textual?" como enunciado da questão"
    And eu adiciono a alternativa "stash" como "verdadeira"
    And eu adiciono a alternativa "pull" como "verdadeira"
    And eu adiciono a alternativa "log" como "falsa"
    Then eu vejo a questão com assunto "gerência de configuração" entre as questões criadas
    And eu vejo seu enunciado sendo "quais desses abaixo são comandos que ocasionalmente podem dar conflito textual?" como enunciado da questão"
    And eu vejo a alternativa "stash" como "verdadeira"
    And eu vejo a alternativa "pull" como "verdadeira"
    And eu vejo a alternativa "log" como "falsa"
    And eu vejo uma questão com assunto "gerência de configuração" entre as questões criadas
    And eu vejo seu enunciado sendo "quais desses abaixo são comandos que ocasionalmente podem dar conflito textual?" como enunciado da questão"
    And eu vejo sua alternativa "merge" como "verdadeira"
    And eu vejo a alternativa "stash" como "verdadeira"
    And eu vejo a alternativa "pull" como "verdadeira"
    And eu vejo a alternativa "log" como "falsa"


Scenario: Professor cria uma questão e já há questões existentes
    Given eu estou na página "criação de questões"
    And eu vejo uma questão com assunto "gerência de configuração" entre as questões criadas
    And eu vejo seu enunciado sendo "quais desses abaixo são comandos que ocasionalmente podem dar conflito textual?" como enunciado da questão"
    And eu vejo sua alternativa "merge" como verdadeira
    And eu vejo sua alternativa "stash" como "verdadeira"
    And eu vejo sua alternativa "pull" como "verdadeira"
    And eu vejo sua alternativa "log" como "falsa"
    When eu inicio a criação de uma questão
    And eu defino "gerência de configuração" como o assunto da questão
    And eu defino "quais desses abaixo são comandos que não podem dar conflito textual?" como enunciado da questão"
    And eu adiciono a alternativa "log" como "verdadeira"
    And eu adiciono a alternativa "init" como "verdadeira"
    And eu adiciono a alternativa "config" como "verdadeira"
    Then eu vejo a questão com assunto "gerência de configuração" entre as questões criadas
    And eu vejo seu enunciado sendo "quais desses abaixo são comandos que não podem dar conflito textual?" como enunciado da questão" como enunciado da questão"
    And eu vejo a alternativa "log" como "verdadeira"
    And eu vejo a alternativa "pull" como "verdadeira"
    And eu vejo a alternativa "log" como "verdadeira"
    And eu vejo uma questão com assunto "gerência de configuração" entre as questões criadas
    And eu vejo seu enunciado sendo "quais desses abaixo são comandos que ocasionalmente podem dar conflito textual?" como enunciado da questão"
    And eu vejo sua alternativa "merge" como "verdadeira"
    And eu vejo a alternativa "stash" como "verdadeira"
    And eu vejo a alternativa "pull" como "verdadeira"
    And eu vejo a alternativa "log" como "falsa"


Scenario: Professor cria uma questão e não coloca assunto
    Given eu estou na página "criação de questões"
    When eu inicio a criação de uma questão
    And eu defino "Quais desses abaixo são comandos que ocasionalmente podem dar conflito textual?" como enunciado da questão"
    And eu adiciono a alternativa "merge" como "verdadeira"
    And eu adiciono a alternativa "stash" como "verdadeira"
    And eu adiciono a alternativa "pull" como "verdadeira"
    And eu adiciono a alternativa "log" como "falsa"
    Then eu vejo a mensagem de que é preciso definir o assunto da questão
    And o conjunto de questões criadas não foi alterado


Scenario: Professor cria uma questão e não coloca o enunciado
    Given eu estou na página "criação de questões"
    When eu inicio a criação de uma questão
    And eu defino "gerência de configuração" como sendo o assunto da questão
    And eu adiciono a alternativa "merge" como "verdadeira"
    And eu adiciono a alternativa "stash" como "verdadeira"
    And eu adiciono a alternativa "pull" como "verdadeira"
    And eu adiciono a alternativa "log" como "falsa"
    Then eu vejo a mensagem de que é preciso definir o enunciado da questão
    And o conjunto de questões criadas não foi alterado


Scenario: Professor cria uma questão e não coloca alternativas
    Given eu estou na página "criação de questões"
    When eu inicio a criação de uma questão
    And eu defino "gerência de configuração" como sendo o assunto da questão
    Then eu vejo a mensagem de que é preciso adicionar alternativas para a questão
    And o conjunto de questões criadas não foi alterado