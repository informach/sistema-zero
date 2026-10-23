---
status: resolved
file: packages/members/src/application/learning/gallery-delivery.service.ts
line: 134
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Retry atrasado sobrescreve a cópia já aprovada da entrega

## Review Comment

O plano usa o mesmo destino de cópia para todo attempt com requestId/itemId/revision iguais. CopyObject no adapter R2 faz overwrite comum. Se dois attempts concorrentes capturam conteúdos diferentes da criação, a cópia antiga pode concluir depois do commit aprovado e substituir os bytes persistidos sob o mesmo storageKey. O commit antigo encontra requestId já concluído e retorna sucesso sem reinspecionar; a entrega mantém passedAt, mas seu snapshot agora aponta para outra fonte.

Reprodução independente `packages/members/.cache/review099-copy-generation.test.ts`: BFF real, Gallery/Submit/policies/snapshot/verificador Members e leitor TCP gzip reais, repos e transporte de compilação controlados. A primeira cópia captura uma fonte Python sem loop e fica suspensa; a segunda copia a fonte com loop, é inspecionada uma vez e aprovada. Ao liberar a primeira cópia, ambos os requests retornam200, mas o leitor da entrega devolve a fonte sem loop. Resultado antes do fix:0pass1fail/12asserts exit1, somente a comparação final de fonte imutável falha. Os dois manifestos gzip têm exatamente o mesmo ContentLength, confirmado na prova; partes/assets permanecem iguais.

O cenário é compatível com o PUT temporário reutilizável atual (`member-shell/src/server/r2.ts`), que assina ContentLength/ContentType, sem digest ou condição de criação. A prova modela o overwrite do storage; não executa R2 real nem afirma exploração externa demonstrada.

Isolar cada attempt em geração server-owned, incorporada ao plano, reconstruída/validada no commit HMAC e mantida nos fresh prepares da operação. Persistir somente a geração efetivamente aprovada, preservando idempotência por requestId e revisão e a limpeza dos prefixes. Não aceitar escolha arbitrária de geração/snapshot pelo POST público. Assim, uma cópia antiga termina em outro namespace e não altera a entrega aceita.

## Triage

- Decision: `VALID`
- Notes: Resolvido após revalidação independente com geração UUID server-owned nova em prepare público e preservada no commit HMAC/fresh prepares. Probe adaptada ao contrato, sem remover atraso A nem a igualdade ContentLength:1pass0fail/16asserts exit0 (`bun test ./.cache/review099-copy-generation.test.ts --test-name-pattern 'late copy A'`, cwdMembers). Confere explicitamente snapshot REAL persistido=geração B antes/depois da cópia A; materializa pela referência da geração persistida e recebe fonteB exata, enquanto materialização da geração A recebe fonteA. Paths distintos, não apenas resposta de API correta. Regressões Members22/150 e Shell14/72 exit0. Port storage modelado e compilador controlado; não prova R2 real. Retenção/GC de gerações órfãs explicitamente pendente com implementador, fora deste fechamento. Corrida separada de resposta quando authorize encontra completed foi reproduzida e enviada para triagem; não confundir com overwrite físico, que está corrigido.
