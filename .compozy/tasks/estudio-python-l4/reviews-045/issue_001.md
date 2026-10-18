---
status: resolved
file: packages/studio/src/runtime/lessonEnvironment.ts
line: 228
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Resolver da aula entrega a URL errada ao analisador

## Review Comment

`resolvePythonAnalysis` devolve `decision.frame` sem adaptar o entrypoint. A própria factory exige que esse endereço termine em `/frame.html`, destinado à execução. O consumidor real, `preparePythonAnalysisSession` (`python/language/session.ts:52`), exige `/analysis.html` e recusa o endereço antes de criar o canal. Assim, mesmo uma autorização válida da aula impede a inicialização do parser utilizado por Blocos/Ponte e operações Python que dependem de análise.

Reprodução independente: `bun test --preload ./packages/studio/test-setup.ts --tsconfig-override .cache/studio-python-l0/review045.tsconfig.json ./.cache/studio-python-l0/review045-contextual.test.tsx` — 3 pass, 15 verificações, exit 0. O segundo caso usa a factory real, obtém seu resolver e passa o resultado à sessão real; a promessa rejeita com `Distribuição de análise não aprovada`. O teste confirma o defeito existente, não a sua resolução. Nenhum interpretador nem navegador real foi iniciado nessa prova.

Derivar o entrypoint de análise a partir do prefixo de distribuição aprovado e da mesma origem/release, sem aceitar URL do documento nem relaxar a validação da sessão. Exercitar a composição factory→resolver→sessão, além dos testes isolados que substituem o parser por um fake.

## Triage

- Decision: `FIXED`
- Notes: Implementador acrescentou a derivação de `analysis.html` sobre o prefixo/origem da distribuição já aprovada, preservando a validação estrita da sessão. Fontes de produção permaneceram somente leitura para o revisor. O teste de controles reais demonstrou que o grant inicial apenas de edição não desabilita Executar; essa hipótese foi descartada.

## Revalidation

- `bun test --preload ./packages/studio/test-setup.ts --tsconfig-override .cache/studio-python-l0/review045.tsconfig.json ./.cache/studio-python-l0/review045-revalidate.test.tsx` — 7 pass, 0 fail, 56 verificações, exit 0. O caso de URL usa a sessão real: a origem aprovada é preservada, o pathname é `analysis.html`, o iframe recebe essa URL e o aborto subsequente fecha o boot com `Análise cancelada`, restaurando `about:blank`. Não houve rejeição de distribuição nem relaxamento de guardas. Log completo preservado em `.cache/studio-python-l0/review045-revalidate.log`.
- `bun test src/runtime/lessonEnvironment.test.ts src/runtime/python/controller.test.ts src/python/language/controller.test.ts`, em Studio — 23 pass, 0 fail, 142 verificações. As negativas de contexto, identidade, catálogo, URL adulterada, duração consumida e resposta atrasada continuam passando.
- Os avisos do harness independente são o `directory mismatch` interno do Bun ao usar tsconfig externo e a navegação de iframe deliberadamente bloqueada no Happy DOM. Essa prova confere a composição/validação de URL e cancelamento; não comprova o handshake CPython em navegador real nem qualifica L6 completo.
