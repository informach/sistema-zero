---
status: resolved
file: packages/studio/src/components/blocks/BlocklyPanel.tsx
line: 77
severity: medium
author: codex
provider_ref:
---

# Issue 018: Mídia padrão externa do Blockly impede gate limpo do Estúdio

## Triage

- Decision: VALID, preexistente na base inicial desta revisão.
- A configuração não define diretório local de mídia; o Blockly solicita
  `https://blockly-demo.appspot.com/static/media/sprites.png`, bloqueado por ORB.
- Os dois exemplos da Vila renderizam e aceitam controles após a issue 016, mas a suíte
  estrita de galeria falha ao detectar essa requisição. Não foi enfraquecida nem mockada.
- A configuração do Blockly não foi alterada por este lote do Pinta. O segundo fetch
  encontrou a correção remota `0b169f837`, integrada pela staging `42b395d93`: mídias reais
  distribuídas nos hosts/playground, caminho local compartilhado em Blockly, Python e captura.

## Integração e comprovação

O ensaio estrito da Vila nos dois motores será repetido na árvore integrada, sem mockar
a rede nem afrouxar diagnósticos. A falha anterior permanece como evidência histórica;
o resultado atual e o estado final ficam vinculados ao relatório de QA.

## Fechamento da rodada

Correção remota 0b169f837 integrada por 42b395d93; suíte estrita da Vila repetida nos dois motores sem mock de rede. Ver gate studio-vila-browser e teste de mídias na suíte do Estúdio.

Resultados, datas e limites: [QA final](../../../../docs/pinta-cenarios/revisao-2026-11-18/qa/verification.md). O lint global do Estúdio conserva uma falha preexistente de fixtures; resolução deste achado não declara a missão inteira concluída.
