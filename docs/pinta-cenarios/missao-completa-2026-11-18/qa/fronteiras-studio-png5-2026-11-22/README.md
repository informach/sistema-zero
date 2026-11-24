# Fronteiras do Studio para PNG 5 e cena 4

Auditoria baseada em `0127c6a7d`. A sonda monta PNGs reais pelo emissor do Pinta, com Vila, Cabana, peças e arte. O leitor privado admite o mundo e o decodificador gráfico abre os PNGs capturados. Nenhum formato ou runtime público foi ativado.

## O que os caminhos atuais preservam

| Fronteira | Contrato confirmado |
| --- | --- |
| Emissor privado | `embedPintaRegionImage(cover, sceneJson, { scale, world })` produz PNG estático com `iTXt` Pinta 5, cena 4 serializada e destinos embutidos. `readPintaRegionImageWorld` captura os bytes, confere CRC e limites, admite o mundo completo e devolve `maps` e `images`. A decodificação de pixels pertence ao consumidor. |
| Derivada Python | `PintaImageDerivationSchema` aceita `dataVersion` 2, 3 ou 4 quando compatível com a seleção. `readPintaImageAssetMetadata` cruza receita, origem, ID, MIME, caminho e tamanho. A derivada tem uma única fonte de cena e recusa `scene` ou `tilemap` paralelos. `assertPintaImageAssetBytes` cruza SHA-256 e IHDR. `assertPintaPngReaderContract` recusa PNG 5 mesmo quando a receita omite a versão. |
| Projeto | `ProjectAsset.scene` e `sanitizeSceneMeta` atendem a cenas 1–3. Isoladamente, `sanitizeProjectAssets` perde a cena 4. A abertura e a leitura dos materiais de jogo fechado comparam o original via `assertProjectContentPreserved` e recusam a perda. A sonda verifica que as partições de materiais, arquivos e blocos ficam íntegras. |
| Biblioteca pessoal | `PersonalAsset` e `PersonalAssetInput` transportam a cena legada em paralelo a `dataUrl`. `preparePersonalAsset` recusa cena explícita inválida. Leituras usam `sanitizePersonalAsset`, que devolve a capa quando a cena bruta não é lida. O upsert seguinte pode substituir a mesma chave `asset:<id>` sem reconhecer o registro regional. |
| Atualização de arte | `mergeDrawingIntoAsset` mantém ID, nome usado pelos blocos e vínculo pessoal. Para imagem de mesma geometria sem cena, ainda herda a cena legada. A sonda grava PNG 5 sem marcador na biblioteca e confirma que o jogo fechado pode persistir e reabrir PNG 5 com a cena 1 anterior. Arquivos e blocos continuam iguais mesmo nesse caso. |
| Preview JS | `assetManifest` transfere os bytes codificados em `dataUrl`. `assetMetaManifest` condiciona a cena ao mesmo `codeUsesPintaScenePlayer` do bootstrap e envia `hasScene` quando omite uma cena conhecida. `buildAssetsRuntime` chama `sanitizeSceneMeta` novamente. O IIFE semeia a capa PNG 5 sem cena ou sinal quando recebe a estrutura regional ainda sem suporte. |

## Contrato proposto para os próximos lotes

1. Promover primeiro o leitor de mídia e as cercas de preservação. Manter `dataUrl` como cópia exata do PNG e conferir um vínculo explícito entre versão, saída e bytes antes de aceitar o material. Reusar a admissão PNG/mundo regional em fronteira neutra, sem criar dependência do Studio para o editor Pinta. O modelo em memória de cena 4 contém índices tipados e depende de admissão. Gravar o PNG original e derivar o registro do motor e o manifesto de preview a partir dele.
2. Na derivada Python, o ponto de extensão é `PintaImageDerivation.output.dataVersion` com exigência explícita da capacidade da versão do runtime. Preservar `pintaImageRecipeKey`, nome, ID, vínculo, `proPath` e a impressão da fonte e das dependências. A validação do asset e o materializador de ZIP/FS devem conferir os bytes completos. `createPintaImageSync` já reaplica a receita e troca só os materiais se a fonte capturada ainda corresponde. Recusar o downgrade de uma imagem regional durante a atualização.
3. No material canônico JS, distinguir um envelope regional de uma capa antes do merge. Um marcador pequeno como `{ dataVersion: 5, sha256 }`, vinculado ao `dataUrl` e ao ID capturado, identifica a cópia. A projeção regional recusa herança de `scene`, `tilemap` e `tilemapFront` legados. A biblioteca precisa tirar um registro futuro das fontes de sincronização e impedir que seja sobrescrito pelo mesmo ID. Uma versão antiga já em execução não reconhece marcador novo dentro de `asset:`. Sem uma cerca comprovada, guardar a única cópia regional da biblioteca sob uma chave fora de `asset:`, com precedência explícita por ID. O projeto continua autocontido. Contabilizar bytes e identidade sob o orçamento existente e cercar os commits dos leitores promovidos antes de admitir o registro novo.
4. No preview JS, transportar sob o nome atual do material o PNG já disponível em `__SZGAME_ASSETS` e um descritor regional validado. Usar `hasScene` nos caminhos de compatibilidade, preservar os filtros de nome e orçamento e admitir o registro regional antes do primeiro uso pelo programa. Um PNG rejeitado ou um destino que falhe na decodificação interrompe a instalação. Manter a saída de cenas 1–3 e de jogos que não usam cenário.
5. Admitir o mundo e seu custo antes de substituir a revisão. Para projeto aberto, atualizar materiais no store existente. Para fechado, reusar `loadProjectAssetsSnapshotById` e `persistProjectAssets` com a cabeça observada e a cerca de abertura. Conferir `id`, `name`, `libId`, arquivos e blocos após a troca. Se a cópia regional não couber ou o leitor não estiver apto, preservar o material anterior e mostrar a recusa.

## Reproduzir

Com as dependências normais do monorepo instaladas, executar em `packages/studio`.

    bun test ./scripts/qa/pinta-regional-boundary.cases.ts

Em Bun 1.4.3, a base deu **5 controles verdes, 3 falhas esperadas e 34 verificações**. A sonda fica fora da descoberta usual de testes do Studio. As falhas mostram o upsert na chave pessoal, a atualização fechada com cena anterior e a ausência do metadado regional no IIFE do preview. Nenhuma delas demonstra que hoje o editor publique PNG 5 por esses caminhos.

## Controle com o bundle da versão de staging

A sonda de navegador executa o leitor e o gravador da árvore `16bf6725f8704ed3305e5783397cdee0b230b6ab`, compilada de novo para o teste. O blob Git de `personal.ts` nesse commit é `c5c7f50d9c76a69bd6d271e2d7266ee4a877ec19`, igual ao da base auditada. O navegador foi Chrome 157.0.8103.80, com IndexedDB próprio em origem loopback servida em memória. O SHA-256 do bundle foi `457072e796bb0c50af7a8c3607dce5e8defd08f089ed8d00f95006c58916b090`.

| Operação do bundle antigo | Estado observado |
| --- | --- |
| Ler a linha futura em `asset:world` | A projeção omite cena e marcador regionais. O registro bruto ainda contém ambos e mantém o PNG 5 exato, SHA-256 `08dd5ea5181ee5802134a4812c8c729520949381bd40c59f887bb760b3cf3642`. |
| Atualizar o mesmo ID em `asset:world` | `savePersonalAsset` confirma a gravação. A linha passa a conter cena 1 e PNG 4, SHA-256 `a131d155a9db0ff59ccf9d2f92396fc0b15dae748d34f5304939ca6a8513dac8`. O PNG 5 e o marcador deixam a linha. |
| Atualizar o ID antigo enquanto a captura regional fica em chave separada | O gravador confirma a mesma atualização legada. A única cópia regional da biblioteca, em `region-map:world`, mantém o SHA-256 do PNG 5. O teste prova o isolamento físico da chave para este gravador, sem definir o comportamento da futura galeria. |

Para reproduzir o bundle, abrir um checkout independente do commit de staging e instalar as dependências do respectivo lockfile. Execute no diretório `packages/studio` desse checkout.

~~~powershell
'export { getPersonalAsset, savePersonalAsset } from "./src/asset-library/personal"' |
  Set-Content -LiteralPath pinta-legacy-entry.ts
$qaLegacyBundle = Join-Path (Get-Location).Path 'pinta-legacy-personal.mjs'
bun build ./pinta-legacy-entry.ts --target browser --format esm --minify "--outfile=$qaLegacyBundle"
~~~

Em `packages/studio` da base auditada, use o mesmo caminho absoluto em `$qaLegacyBundle`.

~~~powershell
$env:PINTA_REGION_BROWSER_FIXTURE = '1'
bun test ./scripts/qa/pinta-regional-boundary.cases.ts
node ./scripts/qa/pinta-legacy-personal-probe.mjs .cache/pinta-regional-browser-fixture.json $qaLegacyBundle
~~~

A primeira chamada escreve a fixture antes das três falhas esperadas. A segunda deve terminar com exit 0 e os hashes acima. O cenário em staging, a conta, os runtimes e as flags ficam fora deste ensaio.
