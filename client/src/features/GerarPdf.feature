# -------------------------------------------------------------------------------------------------------------------- #

Feature: Geração de provas a partir das questões selecionadas
As a Professor
I want to criar N provas e 1 planilha de gabaritos a partir das questões selecionadas para uma quantidade N de alunos
So that eu possa avaliar cada aluno com sua prova e gabarito individuais, evitando plágio de respostas.

# -------------------------------------------------------------------------------------------------------------------- #

# Scenários de GUI

@gui
Scenario 1: Gerar os PDFs das provas e seus gabaritos correspondente
  Given que eu estou na página "Criação de Provas"
  And eu vejo o campo "Questões Selecionadas" com as questões "A", "B", "C" 
  And eu vejo o campo "Tipo de Avaliação" com o dado "Bimestral"
  And eu vejo o campo "Data de Avaliação" com o dado "25/12/2026"
  And eu vejo o campo "Quantidade de Alunos" com o dado "38"
  When eu seleciono a opção "Gerar PDF"
  Then o sistema deve gerar um arquivo compactado
  And o arquivo deve conter 38 provas em PDF
  And o arquivo deve conter 1 planilha de gabaritos


@gui
Scenario 2: Garantir a correspondência entre provas e gabaritos
  Given que eu estou na página "Criação de Provas"
  And eu vejo o campo "Questões Selecionadas" com as questões "A", "B", "C"
  And eu vejo o campo "Tipo de Avaliação" com o dado "Bimestral"
  And eu vejo o campo "Data de Avaliação" com o dado "25/12/2026"
  And eu vejo o campo "Quantidade de Alunos" com o dado "5"
  When eu seleciono a opção "Gerar PDF"
  Then o sistema deve gerar um arquivo compactado
  And o arquivo deve conter 5 provas em PDF
  And o sistema deve gerar 1 planilha de gabaritos
  And cada prova deve possuir um código identificador único
  And cada gabarito deve possuir o mesmo código identificador da prova correspondente
  And as respostas de cada gabarito devem corresponder às questões da prova associada


@gui
Scenario 3: Verificar os dados da avaliação nos PDFs
  Given que eu estou na página "Criação de Provas"
  And eu vejo o campo "Questões Selecionadas" com as questões "A", "B", "C"
  And eu vejo o campo "Tipo de Avaliação" com o dado "Trimestral"
  And eu vejo o campo "Data de Avaliação" com o dado "25/12/2026"
  And eu vejo o campo "Quantidade de Alunos" com o dado "3"
  When eu seleciono a opção "Gerar PDF"
  Then o sistema deve gerar 3 provas em PDF
  And cada prova deve possuir as questões "A", "B" e "C" com suas respectivas alternativas
  And cada prova deve exibir o tipo de avaliação "Trimestral"
  And cada prova deve exibir a data de avaliação "25/12/2026"


@gui
Scenario 4: Gerar provas com questões em ordem diferente
  Given que eu estou na página "Criação de Provas"
  And eu vejo o campo "Questões Selecionadas" com as questões "A", "B", "C", "D"
  And eu vejo o campo "Tipo de Avaliação" com o dado "Bimestral"
  And eu vejo o campo "Data de Avaliação" com o dado "25/12/2026"
  And eu vejo o campo "Quantidade de Alunos" com o dado "10"
  When eu seleciono a opção "Gerar PDF"
  Then o sistema deve gerar 10 provas em PDF
  And as provas devem possuir diferentes ordens de questões e alternativas
  And cada prova deve possuir um código identificador único


@gui
Scenario 5: Exibir "Warning" quando não houver combinações suficientes
  Given que eu estou na página "Criação de Provas"
  And eu vejo o campo "Questões Selecionadas" com as questão "A" de 3 alternativas
  And eu vejo o campo "Tipo de Avaliação" com o dado "Bimestral"
  And eu vejo o campo "Data de Avaliação" com o dado "01/12/2026"
  And eu vejo o campo "Quantidade de Alunos" com o dado "20"
  And não existem combinações suficientes para gerar 20 provas únicas
  When eu seleciono a opção "Gerar PDF"
  Then o sistema deve retornar uma mensagem de warning informando que "Não há combinações suficientes para gerar 20 provas únicas"
  And o sistema gera o arquivo com as provas e planilha de gabarito


@gui
Scenario 6: Exibir erro quando os dados obrigatórios não forem informados
  Given que eu estou na página "Criação de Provas"
  And eu vejo o campo "Questões Selecionadas" com as questões "A", "B", "C" 
  And eu vejo o campo "Tipo de Avaliação" vazio
  And eu vejo o campo "Data de Avaliação" vazio
  And eu vejo o campo "Quantidade de Alunos" com o dado "20"
  When eu seleciono a opção "Gerar PDF"
  Then o sistema deve retornar uma mensagem de erro informando "Dados insuficientes"
  And o sistema não gera o arquivo com as provas e planilha de gabarito


@gui
Scenario 7: Impedir a geração quando nenhuma questão for selecionada
  Given que eu estou na página "Criação de Provas"
  And o campo "Questões Selecionadas" está vazio
  And eu vejo o campo "Tipo de Avaliação" com o dado "Bimestral"
  And eu vejo o campo "Data de Avaliação" com o dado "25/12/2026"
  And eu vejo o campo "Quantidade de Alunos" com o dado "20"
  When eu seleciono a opção "Gerar PDF"
  Then o sistema deve retornar uma mensagem de erro informando "Nenhuma questão selecionada"
  And o sistema não gera o arquivo com as provas e planilha de gabarito


# Scenários de Service


@service
Scenario 1: Gerar provas e gabaritos para a quantidade de alunos informada
  Given que existem as questões "A", "B" e "C" selecionadas
  And o tipo de avaliação é "Bimestral"
  And a data da avaliação é "25/12/2026"
  And a quantidade de alunos é "38"
  When o serviço de geração de provas for executado
  Then devem ser gerado um arquivo compactado
  And o arquivo deve conter 38 provas em PDF
  And o arquivo deve conter 1 planilha de gabaritos


@service
Scenario 2: Gerar códigos identificadores únicos para as provas
  Given que existem as questões "A", "B" e "C" selecionadas
  And o tipo de avaliação é "Bimestral"
  And a data da avaliação é "25/12/2026"
  And a quantidade de alunos é "10"
  When o serviço de geração de provas for executado
  Then todas as provas devem possuir códigos identificadores distintos
  And cada gabarito deve possuir o mesmo código identificador da sua prova
  And nenhum gabarito deve estar associado a mais de uma prova


@service
Scenario 3: Gerar provas mesmo com combinações insuficientes
  Given que existe a questão "A" selecionada com 3 alternativas
  And o tipo de avaliação é "Bimestral"
  And a data da avaliação é "25/12/2026"
  And a quantidade de alunos é "20"
  And não existem combinações suficientes para gerar 20 provas únicas
  When o serviço de geração de provas for executado
  Then o serviço deve gerar um arquivo compactado
  And o arquivo deve conter 20 provas em PDF
  And o serviço deve gerar 1 planilha de gabaritos
  And as provas geradas não precisam ser únicas, mas devem ser geradas para todos os alunos


@service
Scenario 4: Rejeitar geração com dados obrigatórios ausentes
  Given que existem as questões "A", "B" e "C" selecionadas
  And o tipo de avaliação é "Bimestral"
  And a data da avaliação é "25/12/2026"
  And a quantidade de alunos é "20"
  When o serviço de geração de provas for executado
  Then o serviço deve retornar um erro informando "Dados informados são insuficientes para gerar as provas"
  And nenhuma prova deve ser gerada
  And nenhum gabarito deve ser gerado


@service
Scenario 5: Impedir geração parcial quando ocorrer uma falha
  Given que existem as questões "A", "B" e "C" selecionadas
  And o tipo de avaliação é "Bimestral"
  And a data da avaliação é "25/12/2026"
  And a quantidade de alunos é "10"
  And ocorre uma falha durante a geração dos gabaritos
  When o serviço de geração de provas for executado
  Then o serviço deve informar que ocorreu uma falha na geração
  And o pacote compactado não deve ser disponibilizado
  And nenhuma geração parcial deve ser considerada concluída


@service
Scenario 6: Impedir geração parcial quando ocorrer uma falha
  Given que existem as questões "A", "B" e "C" selecionadas
  And o tipo de avaliação é "Bimestral"
  And a data da avaliação é "25/12/2026"
  And a quantidade de alunos é "10"
  And ocorre uma falha durante a geração dos gabaritos
  When o serviço de geração de provas for executado
  Then o serviço deve informar que ocorreu uma falha na geração
  And o pacote compactado não deve ser disponibilizado
  And nenhuma geração parcial deve ser considerada concluída