# Exclusões de paletas offline

O editor acrescenta a 49ª lápide antes de compactar o documento V1. O IndexedDB valida todos os campos dessa entrada e usa o horário da exclusão antes de escrever a janela de 48. A biblioteca enviada e a biblioteca lida da conta continuam limitadas a essa janela.

Quando sai da janela uma exclusão que atinge uma paleta confirmada ou produzida para envio, a mesma transação guarda seu ID e horário em `pinta:sync:palette-account` versão 3. Os IDs recém-produzidos e ainda sem recibo duram até que a base avance. Uma edição remota estritamente posterior vence a remoção. No empate a remoção vence. O recebimento de um documento que já exclui o ID libera a marca observada. O ACK usa a observação do envio original para preservar exclusões de gestos posteriores ao ticket. Na troca de encarnação, as exclusões históricas acompanham a recuperação local.

O leitor abre os registros 1 e 2 e eleva a versão quando precisa representar o novo estado privado. Horários de exclusões já perdidos por uma gravação antiga não podem ser reconstruídos por esse mecanismo.

## Reprodução

Na raiz, execute `bun --no-env-file docs/pinta-cenarios/revisao-2026-11-18/qa/paletas-cas/browser.ts` com Chrome instalado. O ensaio lê as revisões históricas do Git e registra os SHA-256 dos quatro bundles. Chrome 157.0.8103.80 confirmou que o escritor 45024acaaa66ccf8c4dc56de0d0d92ecae119cd2 recusa o disco 3 e mantém os dados, e que o escritor 14fcee965333172f8d101e5445b165d4ace817b1 recusa o disco 2.

Em `packages/pinta`, execute `bun --no-env-file test src/state/localPaletteRemovals.test.ts src/state/localPaletteAccount.test.ts src/core/paletteLibrary.test.ts src/state/paletteLibraryStore.test.ts`. Os 39 casos verificam 367 asserções, incluindo 51 exclusões pelo editor, GET tardio, resolução por horário e perda de ACK nos dois transportes.

Em `packages/community-kids`, execute `bun --no-env-file test tests/pinta-palette-writer.test.ts tests/pinta-cloud-persistence.test.ts tests/palette-library-conformance.test.ts tests/creations-cloud.test.ts`. Os 164 casos com 831 asserções passaram.
