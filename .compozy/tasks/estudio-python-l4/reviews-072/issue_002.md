---
status: resolved
file: packages/studio-runtime/src/python-input-gc.ts
line: 86
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Operação antiga apaga input de geração reaberta

## Review Comment

Os bytes usam chaves derivadas apenas de inputId/hash. remove exclui o admission record, enquanto open deriva novamente o mesmo inputId para owner/execution/project/revision/requestId iguais, agora com createdAt/expiresAt novos. Um GC que já capturou o admission anterior pode verificar que a validade antiga acabou e excluir os bytes da geração nova, que ainda está ativa. Seu checksum e a revisão são válidos: a divergência é a geração do input, não os bytes ou o owner.

Prova independente `.cache/review072-input-gc.test.ts` segura o get do GC depois de capturar o objeto antigo. Dez segundos antes da validade antiga acabar, store.remove(ref) e open da mesma solicitação recriam o mesmo inputId com expiresAt maior; upload transfere os bytes válidos para o novo input. Ao liberar o objeto antigo para o GC após a validade antiga acabar, o GC remove esse blob ativo. O teste confirma inputId igual e expiry maior, depois falha com expected file present=true / received=false. O relógio injetado representa uma janela menor que o limite de25s do GC; os corpos e APIs usados são os reais do módulo, sem alteração externa de metadata. Recorte: 5 pass, 2 fail, 21 verificações, exit1.

Impedir reutilização de uma geração encerrada/nonce, ou separar as chaves dos bytes pela geração imutável do admission. O GC deve excluir somente os bytes da geração cuja expiração comprovou. Uma segunda leitura do estado antes de delete apenas estreita a janela TOCTOU; não resolve a reutilização das mesmas chaves entre leitura e exclusão. Considerar também a remoção posterior dos tombstones pelo lifecycle ao definir a identidade/retensão.

Extensão confirmada na revalidação: o UUID separado corrigiu as chaves dos bytes do GC, mas remove ainda excluía a chave compartilhada python-input-states/id.json. O probe segura o delete de um remove antigo; um segundo remove conclui, open recria o mesmo nonce com geração nova no mesmo clock e upload transfere bytes válidos. Quando o delete antigo é liberado, apaga o admission novo e resolve da referência nova falha404. A prova confirma UUID diferente e expiry igual antes da falha: 7 pass, 1 fail, 25 verificações, exit1. É a mesma ausência de isolamento de geração, agora no admission; não foi criada outra issue. Manter admission imutável e marcar fechamento dentro da geração impede que limpeza antiga remova a identidade nova.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou o original e a extensão. Fix final usa UUID criado somente pelo serviço em state/reference e namespace inputId/generation/files/hash; conditional open recupera a geração vencedora e load compara a geração exata. remove mantém o admission imutável, escreve closed.json dentro da geração com checksum/onlyIf e exclui somente os bytes dessa geração. Mesmo nonce fechado retorna410; retry remove é idempotente. Após lifecycle, um novo UUID permite reutilizar inputId sem reutilizar bytes/fechamento. Provas independentes mantêm GC com body antigo e delete antigo pendentes, confirmam closed410, simulam retirement de admission e recriam/upload no mesmo nonce; novo input e bytes permanecem acessíveis após liberar a operação antiga. Também testadas recriação no mesmo clock, oldref negada e geração vencedora em opens concorrentes com conditional put atômico na porta R2. Onze probes independentes passaram; combinado final 40 pass, 0 fail, 1182 verificações, exit0; Core8/86 e Biome8 exit0. Nenhuma produção alterada pelo revisor; nenhum Docker/browser/build/TSC/R2 real executado. Não qualifica endpoints/quota/scheduled/lifecycle real ou grants; fonte do projeto/publicações não são alteradas.
