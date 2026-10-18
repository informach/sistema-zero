---
status: resolved
file: packages/studio/src/components/blocks/PythonBlocklyEditor.tsx
line: 313
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Não confirmar gestos posteriores junto da geração anterior

## Review Comment

Na confirmação de flush, o componente recalcula fingerprint a partir do workspace vivo. Esse workspace pode já conter uma edição posterior à projeção usada no commit, cujo evento Blockly ainda não foi entregue. A implementação instalada agenda eventos mediante requestAnimationFrame seguido de setTimeout; uma resposta do parser pode chegar nessa janela. O callback considera a edição posterior confirmada sem tê-la gravado como fonte ou rascunho.

Reprodução independente com React, Blockly headless, store, controller e helper reais, simulando somente parse/render e o invólucro SVG: iniciar no valor1, editar para2 e flush; um subscriber da publicação de source2 altera o campo para3 antes do callback da Promise. Após a fila de eventos, source='(2)\n', campo='3', pending=false. Um novo pendingEditorEdits.flush também não altera source2, pois o fingerprint já foi atualizado para3. A perda persiste no fechamento/reabertura.

Usar como fingerprint confirmado somente o snapshot capturado pelo gesto concluído, com suas origens rebaseadas. Após atualizar documento/origens, detectar e materializar diferenças posteriores do workspace vivo, sem atribuí-las ao commit antigo.

## Triage

- Decision: `VALID`
- Notes: O implementador confirmou o fluxo e passou a derivar o fingerprint do snapshot capturado, rebaseado, seguido de novo flush após atualizar documento/origens. A mesma reprodução independente confirmou a correção. Nenhuma implementação alterada pelo revisor.

## Verification

- Repetida a prova React/Blockly/store/controller/helper: subscriber altera o campo2 para3 durante a publicação. Agora source='(3)\n', campo='3', pending=false; um flush posterior conserva3.
- A confirmação marca somente o snapshot capturado. A diferença viva posterior continua detectável e é enviada ao próximo gesto, incluindo o caminho com evento Blockly ainda enfileirado.
- Regressão permanente acrescentada ao componente no navegador: subscriber altera40 para41 durante o CAS e exige fonte41, campo41 e ausência de rascunho pendente.
- Verificação fresca das dependências: 23 testes, 87 verificações, zero falhas; Biome de cinco arquivos passou. Prova browser do implementador registrada no resumo da rodada, sem execução pelo revisor.
