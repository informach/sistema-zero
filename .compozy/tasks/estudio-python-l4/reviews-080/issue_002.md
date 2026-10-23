---
status: resolved
file: packages/studio-runtime/src/python-inspection-job.ts
line: 214
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Alarme purga o proprietário durante a conclusão retirada

## Review Comment

No vencimento do input, alarm cancela o controlador, aguarda destroyOwned e purga o registro assim que cleanup é confirmado. A operação perform pode ainda estar concluindo sua própria cadeia assíncrona: handlePythonRequest também possui um finally de cleanup e pode devolver seu envelope408 depois que a confirmação ficou disponível para o alarme. Quando perform recebe essa resposta, o signal abortado conduz ao catch, que chama current(jobId) incondicionalmente. Como a purga já removeu o registro, a RPC rejeita com `O proprietário do job Python mudou.` em vez de devolver REQUEST_RETIRED408. O finally externo não recupera essa exceção.

Reprodução independente com classe e store/SQLite reais: `bun test ./.cache/review080-controller.test.ts`, cwd packages/studio-runtime, exit1/2pass1fail/10assertions. O handler controlado inicia o sandbox, observa o aborto, espera o destroy compartilhado e posterga apenas sua resposta retirada. Avançando o relógio para expiresAt e executando o alarme, o registro é purgado com cleanup confirmado; liberar a resposta408 provoca a exceção na linha214. Os controles pré-cancelamento e cancelamento durante execução com ACK pendente passam. Não há alegação de execução SDK real nesse probe; a corrida fica no coordenador/SQL e na ordenação das respostas.

Preservar a identidade necessária enquanto a operação local ainda conclui, ou tratar ausência após expiração/cancelamento já confirmado como retirada, sem recriar estado/container nem aprovar resultado tardio. A retenção após reset deve continuar limitada à expiração real e a cleanup confirmado. Acrescentar regressão da corrida alarme/purga/conclusão, incluindo que nenhum sucesso tardio seja devolvido.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou a corrida. Alarme agora mantém o registro expirado com cleanup confirmado enquanto this.controller conserva o trabalho local, reagendando em30s; sem trabalho local (inclusive após reset), purga continua permitida. Prova independente adaptada sem enfraquecer a ordenação: mesmo handler retém resposta408 depois do ACK; primeiro alarm preserva statuscancelled/cleanuptrue; liberar resposta produz408; segundo alarm após a liberação do owner purga; destroy é chamado uma única vez. `bun test ./.cache/review080-controller.test.ts`: exit0/3pass/14assertions, incluindo pré-cancel e cancel durante trabalho sem ACK prematuro. Não é qualificação SDK nem desconexão HTTP real.
