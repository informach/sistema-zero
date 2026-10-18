---
status: resolved
file: packages/studio/src/runtime/python/webFiles.ts
line: 5
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Falha conhecida aguarda cancelACK e retém siblings Turtle

## Review Comment

readPythonWebBytes aguarda body.cancel antes de rejeitar status inválido/redirect ou Content-Length malformado. No fluxo streaming, o finally também aguarda reader.cancel antes de propagar erro de tamanho. Se esse ACK de retirement não coopera, loadTurtleModuleSources não recebe o erro já conhecido, não aborta irmãos e permanece pendente até retirada externa ou deadline30s. O lote paralelo promete cancelar siblings na primeira falha; os guards de ownerabort introduzidos agora encerram a retirada externa, mas não resolvem esse atraso na descoberta da falha pelo batch.

Prova independente `.cache/review122-turtle-failed-retirement.test.ts`: `bun test ./.cache/review122-turtle-failed-retirement.test.ts`, cwd raiz, exit1,0pass/2fail/2asserts. Usa loadTurtleModuleSources/fetchPythonWebBytes/readPythonWebBytes reais e fetch controlado: quatro requisições começam, a primeira devolve404 ou200 com1MiB+1 byte; body.cancel entra em gate sem ACK. Depois desse gate e de64 microtasks, batch continua pending e os quatro sinais continuam false. Esperava irmãos abortados antes do ACK. Finalmente ownerabort encerra a prova e restaura fetch; sem esperar30s, sem processo externo/interpreter/browser/build/TSC.

Propagar erro de validação assim que conhecido, solicitando cancelamento sem aguardar ACK e consumindo rejeição tardia. Preservar o erro original, release do reader após leitura encerrada, byte limits e ausência de mapa/FS parcial. A falha precisa alcançar o catch owned do batch para abortar irmãos, independentemente da cooperação do body.cancel. Cobrir tanto erro pré-leitura quanto overflow streaming; redirect e Length malformado compartilham o mesmo guard causal, embora não tenham sido executados neste probe.

## Triage

- Decision: `VALID`
- Notes: Raiz confirmou medium por leitura/reprodução e planeja retirement não bloqueante no helper raiz + permanentes404/overflow gates. Distinto117: aquele era preparação do host presa após ownerabort; aqui ownerabort já encerra, mas a falha conhecida fica atrás do ACK e impede cancelamento de siblings no novo consumidor paralelo. Não é indefinição sem prazo: timeout30s existe, mas não cumpre a retirada imediata por falha. Nenhuma produção/permanente alterada pelo revisor. Patch/gates frescos pendentes.
- Resolution: Guards/finally de readPythonWebBytes agora pedem cancel sem esperar ACK, consomem rejeição e liberam reader após leitura settled. Revisor15/155exit0 preserva404/overflowcausais e ownerreason/limits/legacy. Recibo TSC2fresh exit0 time2026-10-18T16:17:20.2757530Z lido; TSC1 pré-fix não usado. Runtimebrowser smoke1 recibo exit0 time16:18:03.0550946Z/report8passed/0skips/0flaky/0unexpected, Chrome+Edge source/import/binary/Unicode/REPL, descendantworkers/policyblocked, Turtlegeometry/Tkcolors e plainPythonsemfetchTurtle; source/asserts e oito metadata attachments conferidos. Distributionhash0645e50edc7ead6692434443d07ee8f1e6b8dbafedbbc3edcec7a59b7a368c96, releasepin e74c2ff47a8fe516e4902426dc8368e00c36c632746a5670a64b36117241ddfb. Warnings CommonJSvendor/NO_COLOR visíveis, sem ocultação. Resolve somente122/LoteA; SDK/export/global/performance eF1continuam gates separados.
