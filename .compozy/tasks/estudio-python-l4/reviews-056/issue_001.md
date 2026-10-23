---
status: resolved
file: packages/studio/src/persistence/service.ts
line: 262
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Primeiro save de fonte nova perde a linhagem do documento vivo

## Review Comment

Um documento Python Classic novo recebido pelo host ainda não tem revisão local. Editar `main.py` marca `bridgeCodeAhead`; `snapshotForSave` então chama `snapshotProjectWithCurrentAuthority`, que devolve uma cópia com IR/blocos descartados. Antes da correção, o adapter/coordinator instalava a linhagem CAS somente nessa cópia. O primeiro save gravava normalmente e limpava `isDirty`, mas o documento vivo continuava sem stamp. A próxima edição e save criavam outro writer com base nula e eram recusados pela head que a própria instância acabara de gravar. Publicar depois do primeiro save também falhava ao persistir o vínculo, impedindo recuperar o histórico desse link no projeto local. O segundo texto continuava apenas na memória; o disco conservava o primeiro texto.

O implementador encontrou o fluxo no navegador e registrou a falha no teste permanente ShareDialog em `.cache/studio-python-l0/l7-share-after-save-repro.log`. O revisor confirmou a causa independentemente em `packages/studio/.cache/review056-local-save.test.ts`: a service já estava corrigida quando a prova começou, portanto o caso histórico usa uma cópia cache da service atual com apenas o hunk de inicialização da linhagem removido e imports apontados às implementações reais. Essa reprodução confirma primeiro save bem-sucedido/documento vivo sem stamp, seguido de conflito no segundo save, memória suja e disco intacto na primeira versão. Não é uma alegação de defeito ainda presente na fonte atual.

Inicializar a revisão no documento vivo antes de produzir qualquer snapshot separado, somente quando o adapter oferece `localScope`; as cópias e edições seguintes devem compartilhar essa linhagem. Preservar o CAS de heads existentes: não adotar a head atual de outro writer como base de um documento recém-recebido, e não introduzir stamp local em adapters remotos.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador antes da conclusão desta revisão e revalidado independentemente. `snapshotForSave` instala a revisão no documento vivo apenas para `adapter.localScope` e somente se ainda não existir revisão. `bun test ./.cache/review056-local-save.test.ts`, em `packages/studio`: 5 pass, 0 fail, 37 verificações, exit0. Inclui reprodução histórica reconstruída, fresh host com primeiro save/edição/segundo save/publication save e reload exato, identidade da linhagem, colisão de ID sem stamp recusada sem adotar head alheia, writer carregado desatualizado recusado e adapter remoto sem stamp. Comando permanente `bun test ./src/persistence/service.test.ts ./src/state/projectStorageCoordinator.test.ts ./src/state/projectStorageDocuments.test.ts ./src/components/layout/ShareDialog.test.tsx`: 68 pass, 0 fail, 313 verificações, exit0; inclui o fluxo ShareDialog original e CAS/partições JS/Python. Biome dos três arquivos service.ts/service.test.ts/ShareDialog.test.tsx: exit0, nenhuma alteração. A remoção do mock global no-op de idb-keyval em service.test.ts é correta: seus casos injetam adapters e a factory real é lazy. Limitação separada: combinando o antigo state/persistence.test.ts com ShareDialog, seu mock global não restaurado ainda contamina a leitura IndexedDB real (106 pass/1 fail, loaded=null); não é regressão da correção CAS e não integra o combinado permanente acima. Não houve alteração de produção pelo revisor, nem execução de navegador/TSC/build/SQL; nenhum claim de desempenho.
