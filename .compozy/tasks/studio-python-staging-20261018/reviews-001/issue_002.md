---
status: resolved
file: packages/member-shell/src/components/creator/studio-pro-client.tsx
line: 191
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Namespace adulto ignora a restauração pendente do Pensa no Pro

## Review Comment

No snapshot remoto `4be50bbcafa73296164b4934540312825ed06bb1`, o host Pro chama `createStudioCloudSync({ studio: mod, cloud: created, viewerId: localNamespace })`. Para adultos, `localNamespace` é `adult:<id>`, mas `viewerId` também identifica as marcas de restauração autoritativa do Pensa. `PensaClient` registra essas marcas com a identidade real; o próprio `prepareProject` Pro consulta `pensaRestoreRevision(viewerId, projectId)` com a identidade real. O reconciliador, porém, consulta e limpa outra chave (`sz:pensa-restore:adult:<id>`).

Se uma restauração do Pensa foi confirmada na conta enquanto uma edição Pro antiga permanece aberta, o próximo upload cai em `CREATION_STALE_BASE`. O guard `resolveStale` deveria recusar com `CREATION_REOPEN_REQUIRED` até a restauração chegar ao mesmo projeto local. A identidade errada faz o guard ignorar a marca, copiar a versão restaurada como outro projeto, avançar a base e reenfileirar a edição local antiga sobre o projeto original. O host clássico já passa `viewerId` e `localNamespace` separadamente e preserva essa proteção.

Prova independente isolada: `bun test ./.cache/studio-python-l0/review-staging-pro-restore.test.ts`, cwd `C:/Users/tocha/projects/sistema-zero-python`, EXIT 0, 1 teste/3 asserts. Executa o reconciliador, as marcas em memória e `notePensaRestore` do checkout remoto fixo; apenas exports Core alheios à lógica são ligados aos mesmos leaves remotos para resolver pacotes sem instalar dependências nesse checkout. Marca real `account`/revisão 9 contra base local 1. Com os argumentos clássicos, retorna `CREATION_REOPEN_REQUIRED`, zero downloads/imports e nenhum reenfileiramento. Com os argumentos Pro, não recusa: 1 download, 1 import e 2 enqueues. Não é prova de R2/SQL/browser nem de perda efetivada na rede; comprova que o caminho Pro admite o reenfileiramento que o contrato da restauração proíbe.

Passar a identidade real como `viewerId` e o namespace local em `localNamespace`, como o host clássico. Manter `adult:<id>` nos acessos IndexedDB/personal-assets e nas marcas de sincronização locais. Não mudar a identidade enviada ao BFF, a autoria do Pensa ou o namespace Kids. Adicionar regressão do conflito durante uma restauração pendente no host Pro adulto.

## Triage

- Decision: `VALID`
- Notes: Raiz autorizou o registro como issue_002 no review remoto001 após receber a reprodução causal. Defeito novo da extração/paridade adulta, separado das recomendações de conciliação Python e dos rounds L4 até122. Nenhuma produção ou teste permanente alterado pelo revisor. Correção e gates de integração pendentes.
- Revalidation: Após o porte shared, a chamada real foi extraída de studio-pro-client.tsx e executada com createStudioCloudSync/marks/Pensa reais: viewerId=account, localNamespace=adult:account, CREATION_REOPEN_REQUIRED e zero downloads. `bun test ./.cache/studio-python-l0/review-shared-conciliation.test.ts` EXIT0,3pass/8asserts inclui também adapter explícito isolado de troca global de namespace e retirada antes de load; loader permanente4pass/6asserts EXIT0. Actor real e storageNamespace estão separados no StudioProEditor; keys incluem ambos. Mantém status valid, ainda não resolved: tipos/browser da conciliação e restante da cadeia adulta freeRuntime ainda não qualificados. Detalhes `.cache/studio-python-l0/staging-shared-conciliation-review.md`/JSON.


## Intermediate checkpoint verification — 2026-10-18

Resolved after the focused causal/source proofs, independent review and the current checkpoint gates. Studio 9257, Core 1354, member-shell 1591, Admin 651, runtime 191, language 23, Molda 3411 and Community 8 passed; release/CI contracts passed 33 with four pre-existing Linux-shell cases skipped on Windows. Host types, three language-service type configurations, build, image audit, current image, isolation smoke and all six JavaScript kit playtests/captures passed. Biome CI passed with its recorded existing warnings. The receipt audit also verifies the 24 isolated producers, 255 cases and all 49 source hashes. See [checkpoint review](../_review.md) and the execution state for commands, receipts and limits.

This closes the reproduced issue for the authorized intermediate delivery. It does not declare the complete Python feature, current SDK/export paths, full browser matrix or performance qualified. Those remain in the original implementation and final review.
