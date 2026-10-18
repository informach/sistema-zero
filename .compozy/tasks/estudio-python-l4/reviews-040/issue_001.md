---
status: resolved
file: packages/member-shell/src/components/live/live-assistance-cursor.tsx
line: 20
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Ocultar posição antiga enquanto resolve outro alvo de código

## Review Comment

O componente armazena apenas `{left, top}`. Quando muda a revisão ou o alvo, o efeito inicia outra chamada assíncrona de `getCodeCursorPosition`, mas mantém a posição anterior renderizada até a promessa nova terminar. Os guards `active/generation` impedem uma resposta antiga de publicar depois, porém não revogam o resultado já armazenado. Nesse intervalo o aluno vê a indicação da revisão anterior sobre o novo código, contrariando o contrato de que uma revisão antiga não produz indicação.

Reprodução independente: `bun .cache/studio-python-l0/review040-cursor-observer.ts` (exit0). Monta o componente React real em HappyDOM, recebe posição100/120 na revisão1, muda props para revisão2 e outro offset com a resolução nova pendente. O elemento `role=img` continua em `left:100px; top:120px` até o handle devolver `null`. Não é prova de geometria de navegador.

Associar o resultado à identidade do cursor/revisão/editor e renderizar somente se ainda corresponde à identidade atual, ou revogar a posição ao mudar essa identidade. Evitar limpar a cada polling de150ms, pois isso causaria piscar mesmo quando o cursor continua válido. Cobrir troca de alvo/revisão com promessa pendente e resultado posterior, conservando os guards contra respostas antigas.

## Triage

- Decision: `FIXED`
- Notes: O resultado agora conserva a identidade `cursorKey` e só é renderizado quando corresponde às props atuais. A assinatura `onCodeCursorChange` revoga imediatamente a posição diante de edição, troca de modelo, rolagem, layout ou desregistro; o contador de geração impede a publicação de consultas anteriores. Implementação alterada pelo agente principal, revisor manteve fonte somente leitura.

## Revalidation

- `bun .cache/studio-python-l0/review040-cursor-observer-revalidate.ts` — exit0: componente React real oculta a posição imediatamente ao trocar revisão/alvo; aceita a resposta atual; invalidação local oculta e impede resposta anterior de reaparecer; desmontagem remove assinatura. Porta de coordenadas controlada, sem alegação de geometria real de navegador.
- `bun .cache/studio-python-l0/review040-registry-revalidate.ts` — exit0: buffer PieceTree real do Monaco com CR/LF/CRLF mistos e emoji conserva offset UTF-16 e hash da fonte original; recusa texto pendente e hit incompatível; quatro eventos invalidam, e desregistro limpa os listeners.
- `bun test src/monaco/codeObservation.test.ts` em `packages/studio` — 6 pass, 0 fail, 13 verificações.
