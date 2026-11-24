# PNG 5 em projetos JavaScript locais

A sonda usa o mesmo documento JavaScript, o saneador de materiais do Estúdio e a partição de assets existente. Um perfil privado `pinta-regional-local:<perfil>` fica fora dos namespaces que o host deriva da conta autenticada. A escrita privada atualiza um ID existente pelo CAS da cabeça observada. O programa, os arquivos, a IR e os blocos ficam nas partições originais. Um material continua autocontido mesmo se a biblioteca pessoal não estiver disponível.

A partição guarda o PNG original em `dataUrl` e um descritor curto `regional` com versão 5, ID de origem e SHA-256. A geometria e as grades vivem dentro do PNG. A leitura privada cruza tamanho IHDR, origem, bytes e mundo completo e descarta a representação decodificada. O saneador conserva os orçamentos existentes e a verificação de preservação impede que a captura retire outros materiais para caber. A soma de pixels dos mundos capturados usa o teto de admissão já existente no Pinta. Colisão de identificadores ou de caminho com um material regional recusa o lote.

O espelho atual recusa montar o upload, e a publicação recusa antes de projetar os dados autorais. O escritor privado emite a atualização local sem avisar o espelho. O Studio candidato verifica o destino dentro da transação de substituição ou exclusão remota. A exclusão local explícita continua disponível. A opção é um símbolo interno e não integra os documentos, o catálogo nem os runtimes.

## Reprodução

Use a fixture emitida com `PINTA_REGION_BROWSER_FIXTURE=1` pelo ensaio anterior. [Sonda de fronteiras](../fronteiras-studio-png5-2026-11-22/README.md)

- Recompile o ponto de entrada `packages/studio/scripts/qa/pinta-project-png5-port.ts` resolvendo seus imports na árvore original `16bf6725f8704ed3305e5783397cdee0b230b6ab`. Use dependências isoladas dessa revisão e compile com Bun 1.4.3, `--target=browser --format=esm --minify` e `--define=process.env={}`, `--define=process.env.NODE_ENV="production"`.
- Para o bundle candidato, reexporte esse mesmo ponto de entrada a partir da revisão candidata. Reexporte também `PRIVATE_REGIONAL_JS_PROJECT` de `src/core/pintaRegionalReference.ts`, `privateRegionalProjectScope` e `refreshPrivateRegionalProjectAsset` de `src/state/pintaRegionalProjectRefresh.ts`. Compile com os mesmos argumentos.
- Em `packages/studio`, execute com os caminhos dos dois bundles e da fixture.

    node scripts/qa/pinta-project-png5-probe.mjs .cache/pinta-regional-browser-fixture.json .cache/pinta-project-old.mjs .cache/pinta-project-new.mjs

O ensaio usa Chrome e IndexedDB reais numa origem loopback interceptada. A fixture tem SHA-256 `cd944bcd979d6248ee675647d75205de04bdee30aafdedee26d22f3b96487e22`. Os hashes dos bundles e os resultados estão no [recibo](chrome.json).

## Resultados e limite da cerca

- O leitor antigo de baixo nível descartou o marcador e devolveu o PNG exato. A leitura completa e a leitura da partição detectaram a perda e recusaram a abertura. Um gravador da partição e uma sessão do editor que tinham lido a cabeça anterior também tiveram a escrita recusada.
- O programa candidato reabriu com o ID do material, nome, caminho, vínculo de origem, código, estado dos blocos e SHA do PNG iguais. O espelho recebeu zero sinais. Um restauro pela nuvem e uma exclusão silenciosa tentados pelas APIs novas foram recusados. A exclusão local tem controle positivo na suíte focada.
- Num perfil padrão independente do ensaio, o autosync real do Studio antigo substituiu o PNG 5 **sem marcador** pelo PNG 4 da biblioteca. O script e o ID do bloco permaneceram. O controle explica por que a escrita privada só admite capturas com marcador íntegro.
- O validador legado recusou o documento completo. No envelope multipart, ele validou o programa com `assets: []` e uma lista de hashes. Isso documenta a lacuna do commit multipart, sem atribuir ao leitor antigo inspeção de partes que ele não fez.
- A proteção nova no restauro e na exclusão depende do código novo. O restauro direto antigo pode vincular a revisão local corrente e substituí-la, e a exclusão remota antiga pode decidir pela marca de sincronização sem ler o material. A cerca para perfis sincronizados exige ativar leitores que preservem o destino antes de gravar PNG 5 e qualificar especificamente as abas com código antigo.

## Nuvem e publicação

O documento que o produtor grava por padrão usa versão 2. O leitor admite versão 3, e o cliente antigo anuncia 3 como teto de exclusão. `reserveUpload` e `commitUpload` no Members comparam o formato declarado com a versão corrente. O commit também recebe do BFF a versão verificada do programa. `delete` compara `maxFormatVersion` com a versão exigida. Esses caminhos cercam um escritor ou apagador antigo depois de publicar, no mesmo ID, uma versão numérica de documento efetivamente mais nova. A versão 4 da partição local é um contrato físico distinto.

O download Studio não negocia uma versão de leitor antes de assinar manifesto e partes. O cliente valida hashes e formato após a descida e antes de guardar. No commit multipart atual, o BFF lê o programa e verifica a existência das partes novas. Um hash na lista não prova que o conteúdo da parte tem formato, origem ou mundo admitidos. A política pública segue pendente do protocolo de partes autoritativas e imutáveis, incluindo a reutilização de chaves antigas e o replay de URLs de PUT. Nenhum formato, catálogo ou flag pública mudou neste lote.
