---
status: resolved
file: packages/studio/src/python/language/controller.ts
line: 127
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Concluir o cancelamento nas fronteiras dos callbacks

## Review Comment

O cancelamento do owner não abrangia duas fronteiras dos callbacks fornecidos ao controlador. Primeiro, mountFrame podia provocar reset durante sua própria chamada; retire não encontrava release, ainda não atribuído, e o controlador preparava o frame já sem dono. A reprodução resultou em AbortError, prepares=1 e releases=0 mesmo após dispose.

Segundo, pump aguardava job.execute diretamente. Se execute já tivesse concluído o parse e permanecesse suspenso numa continuação do host, trocar writerEpoch rejeitava o caller antigo, mas não liberava pump. O novo dono ficava pendente até a continuação antiga resolver; se ela nunca terminasse, a edição posterior ficava bloqueada. A reprodução manteve secondDone=false e requests=1 até liberar manualmente o gate antigo.

Revalidar o dono imediatamente após mountFrame, liberando o frame retornado se a montagem foi invalidada, antes de prepare. Tornar a espera de execute cancelável pelo AbortSignal do dono, como já ocorre no boot. Manter os guards das operações para que a continuação antiga, se resolver depois, não reutilize o parser nem publique resultado. Esses casos pertencem ao ciclo de vida do controlador; não exigem concluir sua integração na UI.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador com a checagem após mountFrame e abortable(job.execute(...), owner.signal). As duas reproduções e a continuação tardia foram revalidadas independentemente. Nenhuma implementação alterada pelo revisor.

## Verification

- Reset dentro de mountFrame agora termina com AbortError, releases=1 e prepares=0; dispose posterior não duplica a liberação.
- Handoff durante continuação assíncrona: o novo dono conclui antes de liberar o gate antigo, requests=2, secondDone=true. Ao liberar a continuação antiga e tentar render, renders=0; dispose final contabiliza exatamente duas liberações.
- `bun test src/python/language/controller.test.ts`: 7 pass, 0 fail, 31 verificações, incluindo os dois casos permanentes. Biome dos três arquivos passou.
- O log l4-analysis-controller-browser.log anterior ao fix registra 4/4 casos reais de reutilização/coalescing/handoff; ele foi apenas inspecionado e não é usado como prova browser das correções posteriores.
