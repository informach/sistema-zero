---
status: resolved
file: packages/studio-runtime/src/python-requests.ts
line: 446
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Preview commitado permanece público após job rejeitado

## Review Comment

O novo wiring chama storePythonPreview depois da destruição do sandbox, recebe a referência e então aguarda approve/resolve/fences finais. Se essas etapas rejeitam, catch responde erro/cancelamento mas não retira o preview já commitado. O rollback interno do store terminou ao retornar. Assim uma operação que não alcançou aceitação conserva marker, fontes e launcher público até TTL, apesar de a resposta ter sido410/408. A mesma propriedade deve alcançar falhas posteriores no DO/ingresso e recusa de aceitação contextual no cliente BFF, sem apagar previews legítimos de outros jobs.

Reprodução independente leve: `bun test ./.cache/review086-preview-final-fence.test.ts`, cwd Runtime. Handler, owner de duas fases, preview store/serve, input store e registry reais; porta SDK e bytes/relatórios sintéticos. Depois do marker do preview, a próxima leitura de aprovação fecha o input OU aborta request. Response410/408 e created1/destroy1/exec2 passam; porém servePythonPreview retorna200 e marker permanece (esperado404/semmarker): exit1/0pass2fail/14assertions. Não houve browser/SDK/R2 real nessa prova. Nova falha de wiring após retorno do store, distinta da085002 que cobre I/O/cancelamento dentro do store e da073 sobre aceitação do relatório.

Manter ownership explícita do preview até aceitação final e fazer rollback limitado do prefixo daquele job em cada caminho de rejeição. O cliente precisa retirar o preview recebido mas recusado por autoridade atual, mediante S2S com identidade verificável do job/input; referência forjada de outro job nunca concede cleanup. Recuperação após reset também precisa endereçar somente o preview daquele owner. Preservar o caso válido: cleanup normal de input/remove após sucesso não elimina o preview aprovado, cuja retenção é independente do input.

## Triage

- Decision: `VALID`
- Notes: Correção revalidada: manifesto vincula jobId SHA do input; serve exige decisão privada antes/depois storage; DO exige succeeded/cleanup/scope/parent/validade e previewRetired ausente. Falha handler/ingresso solicita discard persistido independente de runtimeconfig e rollback físico owned limitado; cliente catch também cobre autorização final após cleanup e solicita discard somente pelo input próprio, inclusive sem referência de preview recebida. Normal inputremove preserva preview aprovado; retenção DO acompanha deadline+24h, input TTL15min permanece. Originais adaptados somente com authorize port obrigatório=true para demonstrar rollback físico:2/16 exit0; suite própria com positivo normalremove/decisão durante storage:3/28 exit0. DO+SQLite própria7/55, requests+previews27/194, Core7/65, nativeHTTPwrapper1/3 e Biome9+fresh2 exit0. Artefato workerd real6dcabf2c-deca-4d23-83ca-1b7bd80bc276 lido independentemente exit0/verifiedtrue com previewDecision/previewRetention/previewDiscardReset; state terminal semeado, SQLite/RPC/ctx.abort/reset reais, sdkfalse explícito. Não se atribui essa extensão ao baseline b3f7 anterior sem flags. Nenhuma fonte/teste permanente alterado pelo revisor; preview browser/SDK atual/remoto/performance não qualificados por esta revisão.
