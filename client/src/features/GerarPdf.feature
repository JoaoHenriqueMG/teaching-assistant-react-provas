Feature: Geração de provas a partir das questões selecionadas
As a Professor
I want to criar N provas e N gabaritos a partir das questões selecionadas
So that eu possa avaliar cada aluno com prova e gabarito individuais, evitando plágio de respostas.

@gui
Scenario 1: Gerar os PDFs das provas e seus gabaritos correspondente
  Given que eu estou na página "Criação de Provas"
  And eu vejo o campo "Questões Selecionadas" com as questões "A", "B", "C" 
  And eu vejo o campo "Tipo de Avaliação" com o dado "Bimestral"
  And eu vejo o campo "Data de Avaliação" com o dado "25/12/2026"
  And eu vejo o campo "Quantidade de Alunos" com o dado "38"
  When eu seleciono a opção "Gerar PDF"
  Then o sistema deve gerar um arquivo compactado contendo 38 provas em PDF
  And o arquivo deve conter 38 gabaritos em PDF
  And cada prova deve possuir um código identificador único
  And cada gabarito deve possuir o mesmo código identificador da prova correspondente
  And cada prova deve estar associada a exatamente um gabarito

@gui
Scenario 2: Exibir erro quando não houver combinações suficientes
  Given que eu estou na página "Criação de Provas"
  And eu vejo o campo "Questões Selecionadas" com as questão "A" de 3 alternativas
  And eu vejo o campo "Tipo de Avaliação" com o dado "Bimestral"
  And eu vejo o campo "Data de Avaliação" com o dado "01/12/2026"
  And eu vejo o campo "Quantidade de Alunos" com o dado "20"
  When eu seleciono a opção "Gerar PDF"
  Then o sistema deve retornar uma mensagem de erro informando "Não foi possível criar 20 provas únicas"
  And o sistema não gera o arquivo com as provas e gabaritos

@gui
Scenario 3: Exibir erro quando os dados obrigatórios não forem informados
  Given que eu estou na página "Criação de Provas"
  And eu vejo o campo "Questões Selecionadas" com as questões "A", "B", "C" 
  And eu vejo o campo "Tipo de Avaliação" vazio
  And eu vejo o campo "Data de Avaliação" vazio
  And eu vejo o campo "Quantidade de Alunos" com o dado "20"
  When eu seleciono a opção "Gerar PDF"
  Then o sistema deve retornar uma mensagem de erro informando "Dados insuficientes"
  And o sistema não gera o arquivo com as provas e gabaritos
