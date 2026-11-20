# Geração dos cursos e restauração após desfazer

## Regressão confirmada

A revisão `696d1923e` preservou a ausência de cabeçalho JavaScript em todas as edições. Isso resolveu a igualdade do código ao desfazer, mas mudou o texto gerado nas atividades gravadas. A comparação com as referências imutáveis detectou a ausência de `// Gerado pelo Sistema Zero Studio` nos cinco testes de aulas no CI `44653891504`, em Linux e Windows. A entrega não estava homologada para os cursos.

## Correção

Edições novas voltam a usar o contrato de geração existente, incluindo o cabeçalho. A carga continua preservando a presença ou ausência do cabeçalho salvo.

O painel mantém somente um checkpoint do IR e do cabeçalho da carga. Quando a pilha nativa de desfazer do Blockly está vazia **e** o IR volta a ser igual ao carregado, a geração usa o cabeçalho original. O checkpoint é substituído na próxima carga e liberado com o painel. Não há outra pilha de histórico, serialização persistida ou regra específica para um curso.

O CSS semanticamente equivalente é preservado também ao editar outras partes do programa; alterações reais de CSS continuam sendo geradas e recebem o mapa posicional correspondente.

## Evidências locais

- 18 testes focados, 56 asserções, aprovados.
- 11 casos de Chromium no Windows, aprovados em 3,3 minutos: primeiras aulas de Cadê Todo Mundo? e Desafio do Primeiro Jogo, dois casos de blocos fora da tela, metadados HTML e três exemplos em 390/1280 px, incluindo troca real de fonte.
- Nenhuma referência dos cursos foi regravada. O teste de desfazer continua exigindo igualdade do JavaScript original.
- Logs: `.cache/mission/banner-undo-unit.txt`, `.cache/mission/banner-undo-browser.txt`.

TypeScript completo do pacote aprovado, saída 0 sem diagnósticos (`.cache/mission/banner-undo-types.txt`). A cobertura local destas duas aulas não substitui os cinco testes de aulas no CI nem a homologação de Verificar/Enviar/Concluir no Members real.

## Próximos bloqueios conhecidos

O CI `44653891504` também falhou na colagem da Ponte (sombra decorativa do Monaco interceptando cliques), no fechamento de menu do aprendizado de CSS e na primeira execução hostil no Linux. Um teste de autoridade do Pinta falhou em etapa separada; a frente ativa do Pinta não foi modificada nesta correção. Contratos Linux/Windows, Firefox, WebKit, isolamento medido, Python e runtime hospedado passaram nos respectivos recortes, sem comprovar aprovação global.
