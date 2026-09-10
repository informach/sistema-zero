# Lote 216 — codec íntegro de manifesto e pixels

Estado: implementado, revisado e verificado em 09/09/2026. Nenhum writer,
migração, GC, prefixo novo no banco, alteração de formato público ou nuvem ativado.

## Implementação e arquitetura

- `sceneBlob`: referência SHA-256 hex de pixels crus, limites da camada (4 MiB),
  recusa SAB/vazios/detached e verificação de intervalo. Subarray de ArrayBuffer
  ordinário é válido; não hashear o backing fora da view. Digest WebCrypto sem
  fallback fraco; cancelamento antes e após await, sem resultado parcial.
- `sceneStorageDocument`: envelope fechado formatVersion 2/storageVersion 2,
  identidade repetida conferida, manifesto próprio, blobs únicos na ordem da
  primeira referência. Mesmo hash com tamanho/bytes divergentes não substitui
  conteúdo. Sem IDs, tempos, IO ou cache global gerados pelo codec.
- Preflight estrutural de TODO o documento antes de copiar pixels. Depois,
  leitor nativo captura todas as camadas e valida relações antes do primeiro await.
  Hidratação confere todas as referências/recursos antes de copiar, captura tudo
  antes de await, verifica digest/tamanho e passa pelo leitor nativo completo.
  Blobs não referenciados não são inspecionados/descartados; buffers autorais de
  cada camada/leitura são independentes mesmo quando há deduplicação física.
- Leitor nativo ganhou duas fronteiras internas tipadas: readSceneImageStructure
  compartilha metadata/orçamento de camadas; readSceneDocumentStructure compartilha
  os campos canônicos. Somente readSceneDocument faz índice/bounds/relações finais.
  Nenhum hash é fingido como Uint8Array, nenhum pixel vazio é usado para validar
  um documento parcial, nenhum tipo do domínio/editor mudou.

Esse refinamento implementa o contrato da spec sem duplicar leitores de geometria,
clipes, skin ou dados da imagem. Estrutura tipada NÃO é documento pronto/autoridade
CAS. Um manifesto com pai ausente pode ser lido estruturalmente, mas hidratação
rejeita antes de devolver a cena ao consumidor.

Digest copia os bytes de entrada antes da fase assíncrona conforme o algoritmo
normativo [W3C, digest, passos 2 e 6](https://www.w3.org/TR/2017/REC-WebCryptoAPI-20170126/#SubtleCrypto-method-digest).
O teste modifica a view logo após chamar e confere o vetor conhecido de `abc`;
outros bytes são comparados com node:crypto apenas no teste. Isso não dispensa a
captura conjunta de TODOS os recursos pelo codec antes do primeiro hash.

## Achados e evidências parciais

- 4585ac: 34 passes/1 falha no novo teste de custo. Fixture compartilhava arrays
  por referência, mas o custo persistido atual já usa documento validado com arrays
  próprios. Corrigida expectativa para structuredBytes(readSceneDocument(source)),
  não produção nem ledger. c56758: **35/0, 248 asserts, quatro arquivos**, 638 ms.
- 2386c9/9f9ae2: tipos encontraram literal de referência inferido como string no
  teste. Anotação ScenePixelReference explícita, sem cast/supressão. Reexecução pendente.
- a24776: cinco cenários originais do benchmark passaram com todos os goldens,
  roundtrip e fonte intacta após extração dos leitores. Teto save metadata p50
  47,815 ms vs 47,776 baseline: não é ganho, e writer continua inline. Codec novo
  ainda não está nesse caminho cronometrado. Não alegar redução de IO/RAM aplicada.
- Cobertura nova: RGBA/indexed, RGB oculto, opacity, flipbook, clipes e skin reais;
  identidade/ordem, dedup entre encodings, independência, mutação durante hash,
  missing/hash/tamanho/SAB, campos/versões futuras, bindings e orçamento agregado,
  subarray ordinário, preabort e cancelamento em voo. Caso no teto 32 MiB adicionado.
- Review reproduziu erro de classificação de envelope futuro sem campos antigos
  (11ed23): formatVersion 3 era marcado invalid por falta de storageVersion. Guard
  do formato agora precede leitura de layout; regressão 97d707 passou. Não tentar
  interpretar estrutura futura nem mudar o guard público para resolver o caso.

## Verificação final

- 1db355: **54/0, 363 asserts, seis arquivos, 1,38 s**, incluindo teto 32 MiB.
  Regressão de versão futura foi acrescentada depois e passou em 97d707 e na integral.
- ea355c/30c25f: **2.696 testes, zero falhas, 8.346.969 asserts, 362 arquivos,
  159,01 s**. Sete logs de WebGL indisponível nos testes de MoldaApp. Cinco avisos
  act em ModelEditor.paint.test (LoadedEditor, EditorTopBar duas vezes,
  FacePaintDialog, ModelEditor). Causa da interação da suíte não diagnosticada;
  registrar junto das pendências 203/214, sem supressão nem alegação de correção.
- Tipos finais adedd5/2232ee passaram. Biome 36da75: 1.121 arquivos, sem mudanças.
- Vite 839ac3: **1,86 s**, index 363,82 kB, ScenePlayground 197,73 kB e CSS 53,64 kB
  mantidos. Worker de backup 31,09→31,35 kB; glTF/OBJ/bbmodel 183,37/157,89/214,68 kB,
  pequeno custo da extração compartilhada do leitor. Three 579,29 kB continua
  avisando >500 kB; limite não aumentado. Codec ainda não conectado à UI/writer.
- Kids ea15fe/08d39d: build passou, 4,3 s compilação, 9,8 s tipos, 59 páginas/685 ms.
- A medição a24776 preservou todos os goldens do lote 215. Ela protege a refatoração
  do leitor, não mede persistência por blobs: writer continua inline.

## Limitações explícitas

Hash de camada inteira, não chunking/compressão. Preparação ainda copia/valida campos
e pixels de forma síncrona antes do await. Hidratação possui snapshot dos blobs e
cópia autoral final; não prometer baixo pico de memória sem medir o pipeline. Falhas
de estrutura/orçamento autoral chegam como invalid do leitor nativo; budget é a
borda do blob individual. Sem acesso IndexedDB, refcount, GC, cloud ou ativação UI.

Próximo passo: compatibilidade de quota, seguida do leitor de layout,
com transações e writer ainda condicionados aos contratos da spec.
