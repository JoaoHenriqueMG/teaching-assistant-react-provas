Feature: Correção automática e atualização de notas de cada aluno
As a Usuário
I Want poder corrigir automaticamente todas as provas da turma com gabarito cadastrado
So that todas as notas possam ser entregues de forma eficiente e segura

# Regras de negócio adotadas nestes cenários:
# - Cada questão tem n alternativas, valendo 1, 2, 4, 8, ... (potências de 2). A resposta é a soma das alternativas marcadas.
# - Crédito parcial por alternativa: cada alternativa vale 1/n da questão e conta como certa
#   quando o estado dela (marcada ou não) bate com o gabarito.
# - Resposta válida: inteiro entre 0 e 2^n - 1 (com 5 alternativas, de 0 a 31).
# - Reexecutar a correção sobrescreve as notas existentes.

Background:
    Given todas as provas têm 5 alternativas
    And a planilha de gabarito tem as colunas "número da prova", "questão 1", "questão 2" e assim por diante
    And a planilha de respostas do aluno tem as colunas "Carimbo de data/hora", "nome", "e-mail", "CPF", "número da prova", "questão 1", "questão 2" e assim por diante 
    #formato google forms

@gui
Scenario: Professor corrige as notas de uma turma com gabarito cadastrado
    Given eu estou na página de notas da turma "Engenharia de Software e Sistemas 2026.2"
    And o gabarito da prova "01" é "3", "9" e "15"
    And o gabarito da prova "02" é "9", "15" e "3"
    And o aluno "Pedro" marcou a "prova 01" com as respostas "3", "3" e "15"
    And a aluna "Maria" marcou a "prova 02" com as respostas "9", "15" e "3"
    When eu enviar a planilha com os gabaritos com a formatação correta
    And eu enviar a planilha de respostas com a formatação correta
    And solicitar a correção automática
    Then aparecerá uma mensagem informando que as notas foram cadastradas
    And eu verei "Maria" no rank #1 com a nota 100%
    And eu verei "Pedro" no rank #2 com a nota 87%

@gui
Scenario Outline: Professor tenta corrigir notas com planilha de gabarito malformada
    Given eu estou na página de notas da turma "Engenharia de Software e Sistemas 2026.2"
    When eu enviar uma planilha de gabaritos com o problema "<problema>"
    And eu enviar a planilha de respostas com a formatação correta
    And solicitar a correção automática
    Then aparecerá a mensagem de formato inválido
    And nenhuma nota será cadastrada para a turma

    Examples:
        | problema                            |
        | coluna de número da prova ausente   |
        | extensão de arquivo inválida (.txt) |
        | planilha vazia (apenas cabeçalho)   |

@gui
Scenario Outline: Professor tenta corrigir as notas de uma turma com a planilha de respostas possuindo formatação errada
    Given eu estou na página de notas da turma "Engenharia de Software e Sistemas 2026.2"
    And o gabarito da prova "01" é "3", "9" e "15"
    When eu enviar a planilha com os gabaritos com a formatação correta
    And eu enviar a planilha de respostas com o "<problema>"
    And solicitar a correção automática
    Then aparecerá a mensagem de formato inválido
    And nenhuma nota será cadastrada para a turma

    Examples:
        | problema                                         |
        | Número de prova que não existe no gabarito       |
        | extensão de arquivo inválida (.txt)              |
        | questão 3 faltando (numero de colunas invalido)  |
        | coluna de identificador do aluno ausente         |
        | planilha vazia (apenas cabeçalho)                |

@gui
Scenario Outline: Professor tenta corrigir sem enviar todas as planilhas necessárias
    Given eu estou na página de notas da turma "Engenharia de Software e Sistemas 2026.2"
    And o envio de planilhas está na situação "<situação>"
    When solicitar a correção automática
    Then aparecerá uma mensagem solicitando o envio das planilhas
    And nenhuma nota será cadastrada para a turma

    Examples:
        | situação                   |
        | somente gabaritos enviados |
        | somente respostas enviadas |
        | nenhuma planilha enviada   |

@gui
Scenario: Professor corrige notas de uma turma e um aluno preenche uma resposta inválida
    Given eu estou na página de notas da turma "Engenharia de Software e Sistemas 2026.2"
    And o gabarito da prova "01" é "3", "9" e "15"
    And o gabarito da prova "02" é "9", "15" e "3"
    And o aluno "Pedro" marcou a "prova 01" com as respostas "3", "B" e "40"
    And a aluna "Maria" marcou a "prova 02" com as respostas "9", "15" e "3"
    When eu enviar a planilha com os gabaritos com a formatação correta
    And eu enviar a planilha de respostas com a formatação correta
    And solicitar a correção automática
    Then aparecerá uma mensagem informando que as notas foram cadastradas com alertas de respostas inválidas
    And eu verei "Maria" no rank #1 com a nota 100%
    And eu verei "Pedro" no rank #2 com a nota 33%
    And o sistema indicará, no detalhamento, que as questões 2 e 3 do aluno "Pedro" possuem respostas inválidas
    And o sistema não indicará alertas para a aluna "Maria"

@gui
Scenario: Professor corrige notas e um aluno entrega a prova em branco
    Given eu estou na página de notas da turma "Engenharia de Software e Sistemas 2026.2"
    And o gabarito da prova "01" é "3", "9" e "15"
    And a aluna "Ana" entregou a "prova 01" com todas as questões em branco
    When eu enviar a planilha com os gabaritos com a formatação correta
    And eu enviar a planilha de respostas com a formatação correta
    And solicitar a correção automática
    Then aparecerá uma mensagem informando que as notas foram cadastradas
    And eu verei "Ana" com a nota 0%

@gui
Scenario: Professor corrige notas e a planilha contém um aluno que não pertence à turma
    Given eu estou na página de notas da turma "Engenharia de Software e Sistemas 2026.2"
    And o gabarito da prova "01" é "3", "9" e "15"
    And o aluno "Pedro" marcou a "prova 01" com as respostas "3", "3" e "15"
    And a planilha de respostas contém um aluno com identificador que não pertence à turma
    When eu enviar a planilha com os gabaritos com a formatação correta
    And eu enviar a planilha de respostas com a formatação correta
    And solicitar a correção automática
    Then aparecerá uma mensagem informando que as notas foram cadastradas com alerta de aluno não encontrado na turma
    And eu verei "Pedro" com a nota 87%
    And nenhuma nota será cadastrada para o aluno que não pertence à turma

@gui
Scenario: Professor corrige novamente uma turma que já possui notas
    Given eu estou na página de notas da turma "Engenharia de Software e Sistemas 2026.2"
    And o aluno "Pedro" já possui nota 40% na "prova 01"
    And o gabarito da prova "01" é "3", "9" e "15"
    And o gabarito da prova "02" é "9", "15" e "3"
    And o aluno "Pedro" marcou a "prova 01" com as respostas "3", "3" e "15"
    And a aluna "Maria" marcou a "prova 02" com as respostas "9", "15" e "3"
    When eu enviar a planilha com os gabaritos com a formatação correta
    And eu enviar a planilha de respostas com a formatação correta
    And solicitar a correção automática
    Then aparecerá uma mensagem informando que as notas foram cadastradas
    And eu verei "Maria" no rank #1 com a nota 100%
    And eu verei "Pedro" no rank #2 com a nota 87%
    And o aluno "Pedro" não terá mais de uma nota para a "prova 01"

@service
Scenario Outline: Serviço calcula a nota do aluno a partir do gabarito e das respostas marcadas
    Given que o gabarito da prova "<prova>" é "<gabarito>"
    And o aluno "<aluno>" marcou a prova "<prova>" com as respostas "<respostas>"
    When eu chamar o serviço de correção automática
    Then o serviço retornará a nota do aluno "<aluno>" como "<nota>"

    Examples:
        | aluno | prova | gabarito | respostas  | nota |
        | Pedro | 01    | 3, 9, 15 | 3, 3, 15   | 87%  |
        | Maria | 02    | 9, 15, 3 | 9, 15, 3   | 100% |
        | Carla | 03    | 3, 15, 9 | 1, 1, 1    | 67%  |
        | Bruno | 04    | 9, 3, 15 | 22, 28, 16 | 0%   |
        | Davi  | 05    | 15, 9, 3 | 9, 3, 15   | 60%  |

    # "(branco)" representa uma célula vazia na planilha de respostas.
    Examples: Casos limites e exceções
        | aluno | prova | gabarito | respostas                    | nota |
        # Deixou a última em branco
        | Joao  | 01    | 3, 9, 15 | 3, 9, (branco)               | 67%  |
        # Entregou tudo em branco
        | Ana   | 01    | 3, 9, 15 | (branco), (branco), (branco) | 0%   |

@service
Scenario Outline: Serviço aplica crédito parcial por alternativa em uma questão
    Given que o gabarito da prova "01" é "<gabarito>"
    And o aluno "Pedro" marcou a prova "01" com as respostas "<resposta>"
    When eu chamar o serviço de correção automática
    Then o serviço retornará a nota do aluno "Pedro" como "<nota>"

    Examples: Acerto total
        | gabarito | resposta | nota |
        | 4        | 4        | 100% |
        | 9        | 9        | 100% |
        | 31       | 31       | 100% |
        | 0        | 0        | 100% |

    Examples: Crédito parcial
        | gabarito | resposta | nota |
        | 9        | 8        | 80%  |
        | 9        | 11       | 80%  |
        | 9        | 4        | 40%  |
        | 9        | 0        | 60%  |
        | 0        | 4        | 80%  |
        | 9        | 22       | 0%   |

@service
Scenario Outline: Serviço trata respostas inválidas ou em branco como erro na questão
    Given que o gabarito da prova "01" é "9"
    And o aluno "Pedro" marcou a prova "01" com as respostas "<resposta>"
    When eu chamar o serviço de correção automática
    Then o serviço retornará a nota do aluno "Pedro" como "0%"
    And o serviço indicará "<situação>" para a questão 1

    Examples:
        | resposta | situação           |
        | B        | resposta inválida  |
        | abc      | resposta inválida  |
        | -1       | resposta inválida  |
        | 2.5      | resposta inválida  |
        | 32       | resposta inválida  |
        | 40       | resposta inválida  |
        | (branco) | resposta em branco |

@service
Scenario Outline: Serviço arredonda a nota para um número inteiro
    Given que o gabarito da prova "01" é "3, 9, 15"
    And o aluno "Pedro" marcou a prova "01" com as respostas "<respostas>"
    When eu chamar o serviço de correção automática
    Then o serviço retornará a nota do aluno "Pedro" como "<nota>"

    Examples:
        | respostas | nota |
        # 86,67 arredondado para cima
        | 3, 3, 15  | 87%  |
        # 93,33 arredondado para baixo
        | 3, 9, 7   | 93%  |

@service
Scenario: Serviço tenta corrigir prova que não existe no gabarito
    Given que o gabarito da prova "01" é "3, 9, 15"
    And apenas existem as provas "01", "02", "03" no gabarito
    And o aluno "Pedro" marcou a prova "05" com as respostas "3, 9, 15"
    When eu chamar o serviço de correção automática
    Then o serviço retornará erro de prova inexistente no gabarito
    And nenhuma nota será cadastrada

@service
Scenario Outline: Serviço tenta corrigir com número de respostas diferente do número de questões (colunas na planilha)
    Given que o gabarito da prova "01" é "3, 9, 15"
    And o aluno "Pedro" marcou a prova "01" com as respostas "<respostas>"
    When eu chamar o serviço de correção automática
    Then o serviço retornará erro de quantidade de respostas incompatível com o gabarito
    And nenhuma nota será cadastrada

    Examples:
        | respostas   |
        | 3, 9        |
        | 3, 9, 15, 1 |

@service
Scenario: Serviço tenta corrigir com gabarito sem questões
    Given que o gabarito da prova "01" não possui nenhuma questão
    And o aluno "Pedro" marcou a prova "01" sem respostas
    When eu chamar o serviço de correção automática
    Then o serviço retornará erro de gabarito inválido
    And nenhuma nota será cadastrada

@service
Scenario: Serviço sobrescreve a nota existente ao corrigir novamente
    Given que o gabarito da prova "01" é "3, 9, 15"
    And o aluno "Pedro" já possui nota "40%" na prova "01"
    And o aluno "Pedro" marcou a prova "01" com as respostas "3, 3, 15"
    When eu chamar o serviço de correção automática
    Then o serviço retornará a nota do aluno "Pedro" como "87%"
    And o aluno "Pedro" terá apenas uma nota para a prova "01"

