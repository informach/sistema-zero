---
status: resolved
file: packages/members/src/application/studio/python-activity-inspection.service.ts
line: 80
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Autorização externa ignora prazo e cancelamento do helper

## Review Comment

O helper cria signal com prazo45s, mas authorize faz await authorizeContext(signal) diretamente. Se a consulta de contexto não coopera com AbortSignal, nem cancelamento do request nem expiração desse prazo encerram a promise grade enquanto a consulta não termina. As chamadas iniciais e final de authorize estão fora do transporte Core S2S, que já usa awaitWithSignal; portanto a proteção do cliente não abrange estas esperas. A materialização do snapshot também é aguardada diretamente. O check após await impede aprovação tardia, mas não limita a espera anunciada pelo helper.

Prova independente `bun test ./.cache/review090-inspection.test.ts`, cwd Members, exit1/1pass2fail/7asserts. Callback de autorização controlado aguarda gate sem observar signal, na primeira ou terceira chamada final. Após owner.abort e25ms, grade permanece pendente; só rejeita depois de liberar gate. No cenário inicial inspect não é chamado; no final nenhuma nota é aceita. Controle de bytesBOM/CRLF, cópias independentes entre read e failedcompile negando estrutura forjada passa. Nenhum DB/SDK/browser real utilizado, nem alegação de recurso SDK vazando ou consulta SQL interrompida.

Cercar todas as esperas fora do cliente S2S pelo lifetime proprietário, usando Core awaitWithSignal para autorização e materialização, com checks antes de continuar para dispatch/grading. Operações puras de leitura/hash podem terminar em segundo plano sem permitir efeito tardio; não prometer cancelamento real do DB. Preservar DomainError contextual e erro de indisponibilidade nas falhas do serviço. Cobrir cancel durante autorização inicial/final, fonte capturada e callback/materialização que termina tarde.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e usou Core awaitWithSignal em authorizeContext e preparePythonExecutionSnapshot fora do cliente S2S. Originais próprios inicial/final agora rejeitam apósabort semaguardar gate; extensão de digest materialização retardado confirma settlement antesliberação e nenhum dispatch/segundaauth depois do hash tardio. Combinado própria5+permanentes6:11pass/0fail/33asserts exit0; Biome4 exit0. BytesBOM/CRLF/readcopy/failedcompile/clientstructurefalse/owneridentity/curation e mapping503 preservados. Sem claim DBcancelreal/SDK/browser/R2/consumidoresC habilitados, nenhum produto/teste permanente editado pelo revisor. Não reabre074.
