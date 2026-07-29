# Correções da auditoria de Programação

## Objetivo

Fechar os quatro achados da auditoria da categoria Programação sem aumentar a
complexidade inicial para crianças e sem aceitar programas que podem falhar em
tempo de execução por referências inexistentes ou prematuras.

## Contrato de símbolos

O validador do IR passa a ter um inventário central dos campos que representam
referências a variáveis. Esse inventário cobre tanto expressões quanto comandos
que hoje carregam nomes em strings. Os seletores Blockly que consomem variáveis
ou alvos DOM também exigem uma declaração visível; campos declaradores continuam
como entrada de texto livre.

## Ordem temporal

Funções continuam sendo içadas e podem fechar sobre declarações textualmente
posteriores, como no JavaScript. Cada chamada direta conhecida revalida o corpo
com os símbolos já inicializados naquele ponto. Assim `mostrar(); let pontos`
é recusado quando `mostrar` lê `pontos`, mas `let pontos; mostrar()` é aceito.
Parâmetros, recursão e declarações internas continuam respeitando o escopo léxico.

## Primeiro degrau

O orçamento permanece em 25 blocos. `console_log_text` é substituído por
`console_log_value`, que também aceita texto, e `set_property_calc` é substituído
por `set_property_var`. O aluno passa a conseguir observar valores mutáveis no
console e na própria página sem receber APIs adicionais.

## Cobertura ponta a ponta

Uma matriz gerada a partir de `PROGRAMMING_VISIBLE_DEFINITIONS` exercita cada
bloco real, sem mocks, no caminho Blockly → IR válido → código → parser e
IR → workspace → IR. Hosts, escopos e declarações de apoio são criados por
fixtures explícitas quando o bloco exige contexto. O teste também prova que o
inventário da matriz coincide exatamente com o catálogo visível, evitando que
novos blocos entrem sem cobertura.

## Verificação

Cada achado recebe primeiro um teste de regressão que falha no estado atual.
Depois das correções, serão executados os testes focados, o typecheck, a suíte
completa do Studio e o build de produção.
