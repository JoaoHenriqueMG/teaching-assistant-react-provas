O sistema deve ser capaz de permitir a geração de provas individuais pelos professores para
suas turmas.

# -------------------------------------------------------------------------------------- #

Feature: Geração de provas
    Como um professor responsável por uma disciplina
    Eu quero gerar provas individuais para a turma
    Para que eu possa monitorar o desempenho dos alunos e gerir melhor a turma

# -------------------------------------------------------------------------------------- #

Scenarios

Scenario: Professor inicia o processo de criar prova
    Given eu estou logado como "professor"
    And eu estou na página "criação de provas"
    And eu vejo a opção "criar prova"
    When eu seleciono a opção "criar prova"
    Then eu vejo o campo "criação de prova em andamento"

Scenario: Professor inicia a seleção de questões
    Given eu estou logado como "professor"
    And eu estou na página "criação de provas"
    And eu vejo o campo "criação de prova em andamento"
    When eu seleciono a opção "selecionar de questões"
    Then eu vejo o campo de texto "assunto" vazio
    And eu vejo o campo "questões do assunto" vazio

Scenario: Professor busca por questões de um assunto
    Given eu estou logado como "professor"
    And eu estou na página "criação de provas"
    And eu vejo o campo "criação de prova em andamento"
    And eu vejo o campo de texto "assunto" vazio
    And eu vejo o campo "questões do assunto" vazio
    When eu coloco a palavra "requisitos" no campo "assunto"
    Then eu vejo o campo "assunto" com a palavra "requisitos"
    And eu vejo o campo "questões do assunto" com uma lista de questões sobre "requisitos" 

Scenario: Professor busca por questões de outro assunto
    Given eu estou logado como "professor"
    And eu estou na página "criação de provas"
    And eu vejo o campo "criação de prova em andamento"
    And eu vejo o campo de texto "assunto" com a palavra "requisitos"
    And eu vejo o campo "questões do assunto" com uma lista de questões sobre "requisitos"
    When eu substituo a palavra "requisitos" por "gerência de configuração"
    Then eu vejo o campo "assunto" com a palavra "gerência de configuração"
    And eu vejo o campo "questões do assunto" com uma lista de questões sobre "gerência de configuração"
    And eu estou na página "criação de provas"

Scenario: Professor seleciona uma questão para a prova
    Given eu estou logado como "professor"
    And eu estou na página "criação de provas"
    And eu vejo o campo "criação de prova em andamento"
    And eu vejo o campo de texto "assunto" com a palavra "requisitos"
    And eu vejo o campo "questões do assunto" com uma lista de questões sobre "requisitos"
    When eu seleciono uma questão de número "1" na lista de questões sobre o assunto "requisitos"
    Then eu vejo a lista "questões selecionadas" com a questão número "1" do assunto "requisitos" adicionada

Scenario: Professor finaliza seleção de questões para a prova
    Given eu estou logado como "professor"
    And eu estou na página "criação de provas"
    And eu vejo o campo "criação de prova em andamento"
    And eu vejo a lista "questões selecionadas" com algumas questões
    When eu seleciono a opção finalizar seleção de questões
    Then eu vejo todas as questões selecionadas no campo "questões selecionadas"
    And eu vejo a opção "configurar dados da aplicação da prova"
    And eu estou na página de criação de provas

Scenario: Professor inicia a configuração os dados de aplicação da prova
    Given eu estou logado como "professor"
    And eu estou na página "criação de provas"
    And eu vejo o campo "configurar dados da aplicação da prova"
    When eu seleciono a opção "configurar dados de aplicação"
    Then eu vejo a mensagem "etapa de configuração em andamento"

Scenario: Professor configura os dados de aplicação
    Given eu estou logado como "professor"
    And eu estou na página "criação de provas"
    And eu vejo a mensagem "etapa de configuração em andamento"
    And eu vejo o campo "tipo da avaliação" vazio
    And eu vejo o campo "data da avaliação" vazio
    And eu vejo o campo "quantidade de alunos" vazio
    When eu preencho o campo "tipo de avaliação" com "bimestral"
    And eu preencho o campo "data da avaliação" com "29/09/2026"
    And eu preencho o campo "quantidade de alunos" com "38"
    Then eu vejo o campo "tipo da avaliação" com valor "bimestral"
    And eu vejo o campo "data da avaliação" com valor "29/09/2026"
    And eu vejo o campo "quantidade de alunos" com valor "38"
