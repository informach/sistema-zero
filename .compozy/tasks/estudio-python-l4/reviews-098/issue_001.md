---
status: resolved
file: packages/studio/src/activity/python.ts
line: 199
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Retirada retorna antes de remover o frame de atividade

## Review Comment

runPythonActivity retirava os frames apenas na continuação de finally, depois de await execution.dispose(). O wrapper do helper pode encerrar o owner imediatamente quando o signal aborta, antes dessa continuação. Assim, o owner já recebe AbortError mas um iframe de análise ainda permanece anexado. No caminho com execução, a remoção também ficava dependente do ACK assíncrono de dispose. O contrato de retirada exige que os frames pertencentes à operação sejam desvinculados antes de devolver o controle ao host.

Prova anterior preservada no browser2: `.cache/studio-python-l0/section-browser/0c0625d4-58d2-470d-85be-44bea2fb253a/chrome-classic-cancel.json` contém caught.name=AbortError e framesRemaining=1; `.cache/studio-python-l0/l6-python-section-browser-2.log` registra expected0/actual1. Evidência lida independentemente. Ela demonstra o frame ainda anexado no retorno ao owner, não comprova um worker ou iframe permanentemente vazando: o cleanup poderia ocorrer em microtasks posteriores. O erro anterior de about:blank no harness foi uma asserção QA diferente e não integra esta issue.

Registrar remoção síncrona dos frames no signal combinado da operação/ambiente. Em finally, iniciar dispose e remover DOM antes de aguardá-lo, mantendo o descarte de sessões que chegam tarde e removendo o listener no encerramento normal. Não alterar o runtime comum nem acrescentar delay de produto para fazer a asserção passar.

## Triage

- Decision: `VALID`
- Notes: Resolvido. Implementador e revisor confirmam severidade medium como contrato de retirada, sem claim de leak permanente. Patch usa releaseFrames em listener abort once e remove DOM antes de await disposed no finally. Revalidação independente: permanente real runner/bootstrap2pass8asserts e probe isolado1pass6asserts exit0 (detach síncrono + late session dispose uma vez), Biome6 clean. Artefatos browser3 24 cenários Chrome/Edge verificados via Core/snapshot/SHA/decisões, framesRemaining0. NotSupportedError HappyDOM iframe loadingdisabled são dois diagnósticos esperados por execuçãoDOM; não carregam intérprete nem são falhas de produto. Sem nova execução heavy pelo revisor.
