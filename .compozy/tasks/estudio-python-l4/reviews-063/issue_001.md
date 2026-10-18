---
status: resolved
file: packages/studio/src/components/blocks/tutorCategory.ts
line: 34
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Busca da categoria do tutor escolhe pai em vez da folha

## Review Comment

findBlockOwner testava getContents do pai antes de visitar getChildToolboxItems. contentsIncludeBlockType percorre recursivamente a serialização dos filhos; portanto um pai Programação que contém a definição de Textos também parece possuir sz_py_text. O helper seleciona Programação e retorna sucesso, deixando de abrir o flyout da categoria folha. Isso impede a navegação do tutor para blocos ausentes da superfície atual, inclusive após limpar a busca. O helper é compartilhado com JavaScript. É distinto062001, que tratava notificações antigas apagando a seleção do bloco atual.

Evidência browser6 do implementador em `.cache/studio-python-l0/l5-zappy-navigation-browser-6.log`: seleção por chip já passa, mas fallback para Textos termina em timeout procurando o bloco no flyout. A falha separada de loading/parser antes da ação não demonstra este defeito e não integra o achado.

Prova independente `.cache/review063-category-leaf.test.ts`: importa o helper histórico exato de HEAD copiado somente para o cache. Num toolbox com definições serializadas aninhadas e filhos reais correspondentes, o histórico seleciona apenas Programação; o corrigido encontra Textos e expande somente Valores/Programação antes de selecionar a folha. Controle de categoria dinâmica usa fallback de nome exato e expande os ancestrais; referência inexistente não seleciona nem expande qualquer ramo. `bun test ./.cache/review063-category-leaf.test.ts ./src/components/blocks/tutorCategory.test.ts`:7 pass,0 fail,19 verificações,exit0.

Priorizar filhos reais na busca por tipo e expandir os ancestrais do resultado antes da seleção. Fazer o mesmo no fallback exato por rótulo, preservando preferência por subcategoria, tipos autoritativos e ausência de expansão de ramos sem correspondência. Não construir categorias nem alterar a curadoria.

## Triage

- Decision: `VALID`
- Notes: Implementador diagnosticou no browser6 e aplicou children-first mais setExpanded(true) nos ancestrais encontrados. Revisor confirmou causa e correção por comparação histórica independente. Sem alterações de produção ou execução browser/TSC/SQL pelo revisor; prova leve não afirma visibilidade SVG. Rodada063 criada porque062 já estava encerrada1/1/0.
