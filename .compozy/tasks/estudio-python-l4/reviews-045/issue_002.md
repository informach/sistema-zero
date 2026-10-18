---
status: resolved
file: packages/studio/src/runtime/lessonEnvironment.ts
line: 120
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Recusa contextual não encerra execução e análise abertas

## Review Comment

Uma resposta 401/403/404/409 conhecida invalida os recibos e zera os grants em `lessonEnvironment`, mas não transmite a perda de autoridade aos donos já preparados. `runtime/python/controller.ts:223` apenas propaga a rejeição de `authorize` em input/REPL/captura; não retira a geração. Seu caminho de eventos continua aceitando callbacks porque ownership não consulta esse estado. O analisador tem a mesma causa: `python/language/controller.ts:87` verifica apenas `releaseStatus === 'revoked'`, que continua `active` após a recusa contextual; sua sessão já iniciada não passa novamente pelo resolver.

Reprodução independente no terceiro teste de `.cache/studio-python-l0/review045-contextual.test.tsx`: factory, catálogo, registry gate e ambos os controladores são reais; apenas os interpretadores inferiores são fakes, para isolar lifecycle do defeito de URL registrado em 001. Após uma execução e uma análise válidas, uma chamada REPL recebe 403. O estado observado é `grants=[]`, runtime ainda `running`, `disposals=0`, `parserDisposals=0` e dois frames abertos. Um evento de console posterior é encaminhado ao host; outra análise consegue publicar o segundo commit. A prova não afirma execução remota nem perda de sandbox: confirma a continuidade de recursos e publicação local depois que o próprio host já soube da recusa.

Expor no environment uma autoridade contextual revogável, distinta de falhas transitórias e do status global da release. Conectar esse estado ao cancelamento dos donos de execução/análise, suprimindo eventos/commits tardios e liberando sessão/frame. A recusa deve exigir uma retomada explícita com nova autoridade; não apagar buffers nem documentos. Preservar os guards existentes contra resposta de autorização antiga e contra handoff. Cobrir recusa durante boot, operação ativa e sessão ociosa, além de aborto do contexto sem depender de um render React subsequente.

## Triage

- Decision: `FIXED`
- Notes: Implementador adicionou `environment.signal` ligado ao ciclo do contexto e à recusa permanente dessa instância. Ambos os controladores revogam ownership, removem listeners de autoridade e encerram sessões/frames; `owns` também consulta o sinal. O hook retira o ambiente recusado e oferece retry que cria outra instância. Causa nova na integração contextual, distinta dos guards de release/reentrância das revisões016/020. Nenhuma mudança de produção pelo revisor.

## Revalidation

- `.cache/studio-python-l0/review045-revalidate.test.tsx`, executado com Bun/Studio preload e configuração descritos em issue001 — 7 pass, 0 fail, 56 verificações, exit 0. Após403: `disposals=1`, `parserDisposals=1`, `frames=0`; nenhum evento posterior chega ao host, nenhum segundo parse/commit é permitido e retirar a recusa do servidor não ressuscita a instância abortada.
- O harness independente repete401/403/404/409 e distingue503 transitório. Conserva os bytes do documento. Aborto durante boot do parser libera o frame e descarta o handle tardio; aborto durante parse bloqueia o commit posterior; aborto durante `provider.prepare` libera o frame e descarta a sessão que chega depois, com zero chamadas Run. O fixture inferior deliberadamente ignora o sinal nesses casos para conferir os guards dos coordenadores.
- `bun test src/runtime/lessonEnvironment.test.ts src/runtime/python/controller.test.ts src/python/language/controller.test.ts`, em Studio — 23 pass, 0 fail, 142 verificações, exit 0. Inclui nova regressão permanente de revogação do contexto, além de guards de reentrância, handoff e respostas atrasadas.
- `bun test tests/studio-lesson-runtime-hook.test.tsx`, em Member Shell — 4 pass, 0 fail, 34 verificações, exit 0. Hook e factory reais: recusa remove environment, retry obtém outra autoridade não abortada, instância antiga mantém grants vazios; mudança de baseline e unmount descartam respostas anteriores. JS, ausência de binding e retomada offline não requisitam runtime Python.
- Prova restrita ao lifecycle e à composição local; não afirma revogação retroativa de bytes já baixados, ativação de hosts restantes, handshake no navegador ou conclusão de L6. Avisos do harness independente registrados em issue001; suites permanentes sem avisos.
