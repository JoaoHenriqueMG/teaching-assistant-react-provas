O sistema deve ser capaz de permitir a geração de provas individuais pelos professores para
suas turmas.

# -------------------------------------------------------------------------------------- # 

Feature: Geração de provas
    Como um professor responsável por uma disciplina
    Eu posso selecionar as questões para uma prova
    Para que posteriormente eu possa aplicar essa prova para a turma

# --------------------------------------------------------------------------------------- #

Scenario: Professor inicia seleção de questões para uma prova
    Given eu estou na página "criação de provas"
    When eu quero criar uma prova
    Then eu vejo questões para serem selecionadas

Scenario: Professor inicia seleção de questões para uma prova mas não há questões no banco de dados
    Given eu estou na página "criação de provas"
    When eu quero criar uma prova
    Then eu vejo a mensagem de que não é possível realizar essa operação pois não há questões existentes

# -------------------------------------------------------------------------------------- #

Scenarios

Scenario: Professor procura por questões de um assunto
    Given eu estou na página "criação de provas"
    And eu vejo "duas" questões de "requisitos"
    And eu vejo "quatro" questões de "gerência de configuração"
    When eu quero ver questões de "requisitos"
    Then eu vejo "duas" questões de "requistos"

Scenario: Professor procura por questões de um assunto e não há questões desse assunto
    Given eu estou na página "criação de provas"
    And eu vejo "quatro" questões de "gerência de configuração"
    When eu quero ver questões de "requisitos"
    Then eu não vejo nenhuma questão
    And a mensagem de que não há questões de "requisitos"

Scenario: Professor procura por questões de um assunto e há somente uma questão desse assunto
    Given eu estou na página "criação de provas"
    And eu vejo "uma" questões de "requisitos"
    When eu quero ver questões de "requisitos"
    Then eu vejo "uma" questões de "requistos"

Scenario: Professor procura por questões de um assunto e não há questões no sistema
    Given eu estou na página "criação de provas"
    And eu não há questões de nenhum assunto
    When eu quero ver questões de "requisitos"
    Then eu não vejo nenhuma questões
    And a mensagem de que não há questões de "requisitos"
    And a mensagem de que não há questões cadastradas 

# ------------------------------------------------------------------------------------------ #
    
Scenario: Professor seleciona uma questão de um assunto para a prova
    Given eu estou na página "criação de provas"
    And eu vejo "duas" questões de "requisitos"
    And eu vejo "quatro" questões de "gerência de configuração"
    When eu seleciono a questão de enunciado "quais abaixo são funcionalidades não operacionais" de "requisitos"
    Then eu vejo a questão "quais abaixo são funcionalidades não operacionais" de "requisitos" entre as selecionadas para a prova
    And eu vejo que a seleção aborda questões de "requisitos" 

Scenario: Professor seleciona questão já selecionada de um assunto para a prova
    Given eu estou na página "criação de provas"
    And eu vejo "duas" questões de "requisitos"
    And eu vejo "quatro" questões de "gerência de configuração"
    And a questão "quais abaixo são funcionalidades não operacionais" de "requisitos" está selecionada para a prova
    And eu vejo que a seleção aborda questões de "requisitos"
    When eu seleciono a questão "quais abaixo são funcionalidades não operacionais" de "requisitos"
    Then eu vejo a mensagem de que a questão "quais abaixo são funcionalidades não operacionais" de "requisitos" já está selecionada
    Then eu vejo a questão "quais abaixo são funcionalidades não operacionais" de "requisitos" entre as selecionadas para a prova
    And eu vejo que a seleção aborda questões de "requisitos" 

Scenario: Professor seleciona questões de um assunto para a prova que já tem questões selecionadas
    Given eu estou na página "criação de provas"
    And eu vejo "duas" questões de "requisitos"
    And eu vejo "quatro" questões de "gerência de configuração"
    When eu seleciono a questão "Quais abaixo são funcionalidades não operacionais?" de "requisitos"
    When eu seleciono a questão "Quais abaixo não são bons cenários?" de "requisitos"
    Then eu vejo a questão "Quais abaixo são funcionalidades não operacionais?" de "requisitos" entre as selecionadas para a prova
    And eu vejo a questão "Quais abaixo não são bons cenários?" de "requisitos" entre as selecionadas para a prova
    And eu vejo que o conjunto aborda questões de "requisitos"

Scenario: Professor seleciona questãos de um assunto para a prova para a qual uma já está selecionada
    Given eu estou na página "criação de provas"
    And eu vejo "duas" questões de "requisitos"
    And eu vejo "quatro" questões de "gerência de configuração"
    And a questão "Quais abaixo são funcionalidades não operacionais?" de "requisitos" está selecionada para a prova
    And eu vejo que o conjunto aborda questões de "requisitos"
    When eu seleciono a questão "Quais abaixo são funcionalidades não operacionais?" de "requisitos"
    And eu seleciono a questão "Quais abaixo não são bons cenários?" de "requisitos"
    Then eu vejo a mensagem de que a questão "Quais abaixo são funcionalidades não operacionais?" de "requisitos" já está selecionada
    And eu vejo a questão "Quais abaixo são funcionalidades não operacionais?" de "requisitos" entre as selecionadas para a prova
    And eu vejo a questão "Quais abaixo não são bons cenários?" de "requisitos" entre as selecionadas para a prova
    And eu vejo que o conjunto aborda questões de "requisitos"

Scenario: Professor seleciona questões de assuntos diferentes para a prova
    Given eu estou na página "criação de provas"
    And eu vejo "duas" questões de "requisitos"
    And eu vejo "quatro" questões de "gerência de configuração"
    When eu seleciono a questão "Quais ações entre as seguintes podem dar conflito textual?" de "gerência de configuração"
    And eu seleciono a questão "Quais abaixo são funcionalidades não operacionais?" de "requisitos"
    Then eu vejo a questão "Quais abaixo são funcionalidades não operacionais?" de "requisitos" entre as selecionadas para a prova
    And eu vejo a questão "Quais ações entre as seguintes podem dar conflito textual?" de "gerência de configuração" entre as selecionadas para a prova
    And eu vejo que a conjunto aborda questões de "requisitos"
    And eu vejo que a conjunto aborda questões de "gerência de configuração"

Scenario: Professor seleciona questão de assunto diferente para a prova que já tem uma questão selecionada
    Given eu estou na página "criação de provas"
    And eu vejo "duas" questões de "requisitos"
    And eu vejo "quatro" questões de "gerência de configuração"
    And a questão "Quais abaixo são funcionalidades não operacionais?" de "requisitos" está selecionada para a prova
    When eu seleciono a questão "Quais ações entre as seguintes podem dar conflito textual?" de "gerência de configuração"
    And eu vejo a questão "Quais ações entre as seguintes podem dar conflito textual?" de "gerência de configuração" entre as selecionadas para a prova
    And eu vejo a questão "Quais abaixo são funcionalidades não operacionais?" de "requisitos" entre as selecionadas para a prova
    And eu vejo que a conjunto aborda questões de "requisitos"
    And eu vejo que a conjunto aborda questões de "gerência de configuração"

# -------------------------------------------------------------------------------------------------------------- #

Scenario: Professor finaliza escolha de questões para a prova com uma questão quando não há conjuntos no histórico
    Given eu estou na página "geração de pdfs"
    And eu vejo que não há provas criadas no conjunto de provas
    And eu vou para a página "criação de provas"
    And eu seleciono a questão "quais abaixo são funcionalidades não operacionais" de "requisitos" para a prova
    And eu vejo que a seleção aborda o assunto "requisitos"
    When eu finalizo a seleção de questões
    And eu nomeio essa prova como "Prova de requisitos"
    Then eu vejo a mensagem de que a prova foi criada
    And eu vou para a página "geração de pdfs"
    And eu vejo "Prova de requisitos" no conjunto de provas criadas
    And eu vejo a questão "quais abaixo são funcionalidades não operacionais" de "requisitos" em "Prova de requisitos"
    And eu vejo que "Prova de requisitos" aborda o assunto "requisitos"

Scenario: Professor finaliza escolha de questões para a prova com duas questões quando não há conjuntos no histórico
    Given eu estou na página "geração de pdfs"
    And eu vejo que não há provas criadas no conjunto de provas
    And eu vou para a página "criação de provas"
    And eu seleciono a questão "quais abaixo são funcionalidades não operacionais" de "requisitos" para a prova
    And eu seleciono a questão "quais ações entre as seguintes podem dar conflito textual" de "gerência de configuração" para a prova
    And eu vejo que a seleção aborda o assunto "requisitos"
    And eu vejo que a seleção aborda o assunto "gerência de configuração"
    When eu finalizo a escolha de questões
    And eu nomeio essa prova como "Prova de requisitos e gerência de configuração"
    Then eu vejo a mensagem de que o conjunto de questões foi criado
    And eu vou para a página "geração de pdfs"
    And vejo "Prova de requisitos e gerência de configuração" no conjunto de provas criadas
    And eu vejo a questão "quais abaixo são funcionalidades não operacionais" de "requisitos" no conjunto "Prova de requisitos e gerência de configuração"
    And eu vejo que "Prova de requisitos e gerência de configuração" aborda o assunto "requisitos"
    And eu vejo que "Prova de requisitos e gerência de configuração" aborda o assunto "gerência de configuração"

Scenario: Professor finaliza escolha de questões para a prova com uma questão quando há conjuntos já criados
    Given eu estou na página "geração de pdfs"
    And eu vejo no conjunto de provas criadas a prova "Prova de gerência de configuração"
    And eu vou para a página "criação de provas"
    And eu seleciono a questão "quais abaixo são funcionalidades não operacionais" de "requisitos" para a prova
    And eu vejo que a seleção aborda o assunto "requisitos"
    When eu finalizo a escolha de questões
    And eu nomeio esse conjunto de questões como "Prova de requisitos"
    Then eu vejo a mensagem de que o conjunto de questões foi criado
    And eu vou para a página "geração de pdfs"
    And eu vejo "Prova de gerência de configuração" no conjunto de provas criadas
    And vejo "Prova de requisitos" no conjunto de provas criadas
    And eu vejo a questão "quais abaixo são funcionalidades não operacionais" de "requisitos" em "Prova de requisitos"
    And eu vejo que "Prova de requisitos" aborda o assunto "requisitos"

Scenario: Professor finaliza escolha de questões e nomeia o conjunto com um nome de conjunto já existente
    Given eu estou na página "geração de pdfs"
    And eu vejo no conjunto de provas criadas a prova "Prova de requisitos"
    And eu vejo a questão "quais abaixo são funcionalidades operacionais" em "Prova de requisitos"
    And eu vou para a página "criação de provas"
    And eu vejo seleciono "quais abaixo são funcionalidades não operacionais" de "requisitos" para a prova
    And eu vejo que a seleção aborda o assunto "requisitos"
    And há o conjunto "Prova de requisitos" no histórico de conjuntos de questões de provas
    When eu finalizo a escolha de questões
    And eu nomeio esse conjunto de questões como "Prova de requisitos"
    Then eu vejo a mensagem de que o nome "Prova de requisitos" já foi selecionado para outro conjunto
    And eu vejo a mensagem de que não foi possível criar o conjunto
    And eu estou na página "criação de provas"
    And eu vejo a questão "quais abaixo são funcionalidades não operacionais" de "requisitos" selecionada para a prova
    And eu vejo que o conjunto aborda o assunto "requisitos"
    And eu vou para a página "criação de pdfs"
    And eu vejo o conjunto "Prova de requisitos" no histórico de conjuntos de questões de provas
    And eu vejo a questão "quais abaixo são funcionalidades operacionais" em "Prova de requisitos"

Scenario: Professor finaliza escolha de questões com nenhuma questão
    Given eu estou na página "criação de provas"
    And eu não vejo questões selecionadas
    When eu finalizo a escolha de questões
    Then eu vejo a mensagem de que não foi possível criar o conjunto de questões para a prova pois não há questões selecionadas    

# ---------------------------------------------------------------------------------------------------------- #
# ---------------------------------------------------------------------------------------------------------- # 