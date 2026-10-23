---
status: resolved
file: packages/studio/src/runtime/python/turtle/renderer.ts
line: 247
severity: high
author: claude-code
provider_ref:
---

# Issue 004: Mainloop ocioso continua solicitando RAF a cada atualização

## Review Comment

O backend executa `_update()` continuamente em `mainloop`; cada chamada solicita `present`. O renderer agenda `requestAnimationFrame` incondicionalmente, mesmo com `dirty === false`, e devolve a resposta para iniciar a próxima volta. Uma tela parada mantém portanto polling na frequência de frames, sem aguardar entrada ou vencimento de timer.

Isso contradiz o contrato explícito em `docs/plans/2026-10-16-estudio-python-desempenho.md:99`: uma tartaruga parada em mainloop deve aguardar eventos/timers e o renderer só deve pedir frames com trabalho visual. Execução isolada: após o primeiro paint, dez presents sem operações/entrada agendaram dez novos RAF. Não foi feita medição de CPU nem se atribuiu um número de consumo ao caso.

Separar a apresentação visual de uma espera ociosa do event loop. O protocolo precisa permitir acordar por entrada, próximo timer ou cancelamento, preservando a semântica de update explícito, delay/sleep e reentrância. Acrescentar prova de inatividade sem RAF/polling contínuo e retomada por timer/entrada, com Stop durante a espera.

## Triage

- Decision: `VALID`
- Notes: Corrigido com query wait acordada por entrada/deadline/cancelamento, usada por mainloop; present sem dirty não agenda frame. Revalidação isolada: dez presents limpos geram zero RAF e dispose durante wait rejeita imediatamente. Prova real Chrome/Edge conferida em runs/2026-10-16T23-33-04.863Z/report.json: zero RAF durante 500 ms, depois tecla, timer e retorno de mainloop. Sem alegação de consumo de CPU medido por esta revisão.
