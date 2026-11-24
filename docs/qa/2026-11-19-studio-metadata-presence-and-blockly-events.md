# Presença de metadados futuros e entrega de eventos Blockly

## Problemas reproduzidos

A montagem do documento a partir das partições removia qualquer campo raiz com valor `undefined`. Para campos desconhecidos, presença e ausência são dados diferentes. A regressão nova falhou antes da correção: `Object.hasOwn(restored, 'futureSlot')` retornou `false`. A montagem agora normaliza somente projeções opcionais conhecidas; campos futuros preservam sua presença, valores aninhados e zero negativo. O marcador local de armazenamento continua fora do documento portátil. Não houve mudança do formato ou ativação v4 nesta branch.

O laboratório `f9ddd5e16` passou em 11/12 grupos no run 44499224893. O único caso reprovado no Windows foi o desfazer de argumentos Python em Blockly: após um sleep fixo de 10 ms, a fila ainda não havia entregue a mutação. O teste passa a enviar e observar uma barreira `FinishedLoading` pelas APIs públicas do Blockly. Só então limpa o histórico ou executa undo. As mesmas conexões, sombras, valores e passos de undo/redo continuam sendo exigidos. Não se alterou o mutator, a fila interna, limites do produto ou tentativas da CI.

## Evidência local

- Regressão da presença: 7 testes passaram e 1 falhou antes da correção; depois, 8 passaram / 49 asserções.
- Metadados e Blockly reais: 18 testes / 442 asserções, sem falhas.
- Biome dos quatro arquivos alterados aprovado; orçamento/grafo da carga inicial aprovado com 41 asserções, sem aumentar os tetos.
- Typecheck completo aprovado na repetição. A primeira tentativa detectou o transporte indevido de assinaturas exclusivas do laboratório; o diff foi restringido à preservação de presença antes da repetição, sem ativar v4.

## Qualificação remota anterior

Os runs 44496616558 (`e46f579f0`) e 44500058001 (`302edd9dc`) passaram em 12/12 grupos. O run 44492414266 (`53ce8709b`) teve uma falha de criação da página do Chrome no Windows antes de navegar na aplicação; o diagnóstico separado permanece em `2026-11-19-studio-windows-browser-startup.md`. O sucesso posterior não prova uma causa específica de sistema para a falha anterior.

## Escopo aberto

Esta correção não conclui a missão global. O laboratório de ativação v4 continua separado e precisa de gates próprios antes de integrar. Também permanecem as aceitações de isolamento JS, escalabilidade visual, ferramentas profissionais, mundos extensos, compatibilidade integral no host, medições prolongadas e hardware físico.
