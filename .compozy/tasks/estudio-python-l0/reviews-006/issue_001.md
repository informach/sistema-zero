---
status: resolved
file: experiments/studio-python-l0/pinta.ts
line: 154
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Cancelamento mede somente a drenagem do lote inteiro

## Review Comment

O relógio workerClosureMs começa depois dos30 cancelamentos. Um worker poderia sobreviver por mais de1s e desaparecer durante operações posteriores sem reprovar a asserção. Medir a destruição do worker de cada operação antes de iniciar a seguinte. Separar rejeição da promessa e liberação física; os294ms anteriores eram a drenagem final e não a latência por cancelamento.

## Triage

- Decision: `VALID`
- Notes: pinta-cancellation.ts acompanha targetId específico e Target.targetDestroyed, aguardando encerramento antes da próxima conversão. Relógio começa antes da própria operação (limite superior conservador, sem misturar relógios Node/browser). Trinta amostras verificadas em pinta-975a3769-0d65-4020-bbb5-4a4e90eb6fcc/evidence.json, máximo146,99ms; callback retorna AbortError separadamente. IDs/inspeção parcial preservados em falha. As evidências anteriores são apenas drenagem agregada.
