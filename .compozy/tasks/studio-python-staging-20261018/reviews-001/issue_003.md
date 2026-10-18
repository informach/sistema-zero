---
status: resolved
file: packages/member-shell/src/components/studio/section-project-check.tsx
line: 120
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Espera do parser despacha verificação após retirar o editor

## Review Comment

O novo `ObjectivesCard.verify` espera o parser da Ponte em até 15 etapas de 200 ms antes de enviar o projeto. Não existe owner/generation/AbortController para essa fase. Se o usuário deixa a parte ou o editor desmonta durante a espera, React retira `handleRef.current`, mas `handleRef.current?.getProject() ?? project` conserva o snapshot anterior. Ao terminar a espera, a função ainda despacha `apiSend` para a aula/seção/revisão capturadas, mesmo sem editor vigente.

Essa janela pré-despacho foi introduzida pelo novo await: a baseline `5fcb90157` capturava e enviava o projeto imediatamente. Não é uma alegação de cancelar SQL ou fetch que já começou; o caso reproduzido retira o owner ANTES de qualquer POST. O backend pode recusar `bridgeCodeAhead`, mas ainda recebe um trabalho que essa tela já abandonou; se a mesma ref passa a apontar para outro editor durante a espera, também não há fence da captura original.

Prova independente: `bun .cache/studio-python-l0/review-staging-objectives-retirement.ts`, cwd feature, EXIT 0. Extrai e executa o corpo real de `verify` do checkout remoto fixo `4be50bbcafa73296164b4934540312825ed06bb1`, removendo apenas o generic TypeScript apagável de `apiSend`. Um gate controla o primeiro timeout; antes de liberá-lo, a prova coloca `handleRef.current = null`, como ocorre na retirada do editor. A função termina com `requestsAfterRetirement: 1`, corpo `{revision:'old-revision', project:{id:'old-project', bridgeCodeAhead:true}}`. Porta de timer/HTTP controlada, sem React/browser/backend executados nesta reprodução; comprova o despacho tardio do código real, sem afirmar persistência ou leak permanente.

Preservar na conciliação o ownercontroller/generation já existente no WIP Python: retirar no cleanup e na troca de contexto, interromper a espera e conferir a identidade antes e depois de cada await, incluindo imediatamente antes do POST. Não reutilizar o snapshot anterior quando o handle some. Manter o novo cartão, resultados/objetivos/extras e a espera pelo parser para um owner ainda vigente; encaminhar o sinal ao transporte sem prometer cancelamento de transação previamente admitida.

## Triage

- Decision: `VALID`
- Notes: Raiz confirmou medium e autorizou issue_003. Dedupe: caso novo concreto da espera pré-despacho introduzida no remoto, não reabre095/096/098 nem repete cancelamento de SQL admitido. A conciliação deve preservar o lifetime WIP no componente compartilhado novo. Nenhuma fonte de produção ou teste permanente alterado pelo revisor. Correção/gates pendentes.


## Intermediate checkpoint verification — 2026-10-18

Resolved after the focused causal/source proofs, independent review and the current checkpoint gates. Studio 9257, Core 1354, member-shell 1591, Admin 651, runtime 191, language 23, Molda 3411 and Community 8 passed; release/CI contracts passed 33 with four pre-existing Linux-shell cases skipped on Windows. Host types, three language-service type configurations, build, image audit, current image, isolation smoke and all six JavaScript kit playtests/captures passed. Biome CI passed with its recorded existing warnings. The receipt audit also verifies the 24 isolated producers, 255 cases and all 49 source hashes. See [checkpoint review](../_review.md) and the execution state for commands, receipts and limits.

This closes the reproduced issue for the authorized intermediate delivery. It does not declare the complete Python feature, current SDK/export paths, full browser matrix or performance qualified. Those remain in the original implementation and final review.
