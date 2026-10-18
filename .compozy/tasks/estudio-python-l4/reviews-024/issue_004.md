---
status: resolved
file: packages/studio/src/components/blocks/PythonBlocklyEditor.tsx
line: 534
severity: medium
author: claude-code
provider_ref:
---

# Issue 004: Reaplicar seleção da fonte após a análise assíncrona

## Review Comment

O effect de sourceCursor chama selectOffset imediatamente. Antes do primeiro parse, origins está vazio; durante uma atualização de fonte, a revisão ainda diverge e o método retorna. A seleção mais recente não é reaplicada quando load ou a confirmação atualiza as origens. Assim um cursor recebido na montagem, hidratação ou durante o debounce/parse desaparece até o usuário gerar outro evento de cursor.

Prova independente com componente React real e workspace headless, simulando parser/SVG: montar com sourceCursor.offset=0. Após carregar os dois blocos, os comandos de highlight foram apenas [null]. Reemitir o mesmo offset depois do carregamento produziu o ID correto. Não é um problema de cálculo de intervalo; a publicação das origens não reexecuta a seleção pendente.

Conservar o cursor mais recente e aplicá-lo quando a fonte correspondente terminar de carregar/confirmar, com as mesmas guardas de projeto/revisão. Evitar depender de um novo movimento artificial do usuário.

## Triage

- Decision: `VALID`
- Notes: O cursor agora inclui a fonte exata. load e confirmação reaplicam a seleção mais recente, além do effect do prop; fonte divergente é recusada. Revalidação independente confirmou os casos abaixo. Nenhuma implementação alterada pelo revisor.

## Verification

- Prova independente com componente React, Blockly e controller reais, simulando parser/SVG: cursor emitido na montagem seleciona um bloco depois do primeiro parse sem novo evento; fonte alterada para '42\n' com cursor durante debounce seleciona a origem nova; evento tardio associado à fonte '1\n' limpa a seleção em vez de aplicar offset obsoleto. Resultado: startupSelected e afterTypingSelected contêm IDs vivos, staleCleared=true, nenhum workspace remanescente.
- Log browser do implementador inspecionado: l4-python-blockly-editor-browser-7.log termina com `4 passed (17.9s)`, incluindo startup/debounce/stale em Chrome/Edge. O revisor não executou navegador.
