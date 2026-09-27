# Molda — contrato de pintura animada para o Estúdio (lote 225)

Recorte do plano aprovado em `2026-09-06-molda-evolution.md`, fases 5 e 8. Implementação
interna; público/cloud continuam v1 e o `.glb` que a criança baixa não muda um byte.
Primeiro incremento de três: contrato e produtor aqui, consumidor e conexão da oficina depois.

## Problema

A pintura animada existe inteira no Molda: `SceneImage.flipbook` guarda `frameWidth`,
`frameHeight`, a sequência explícita de quadros (com repetições), `fps` e `loop`; o kernel
de amostragem, o recorte compartilhado 2D/3D e a reprodução na oficina estão prontos desde
os lotes 75 a 77. Na fronteira do GLB tudo isso morre: `SceneGlbMaterials.raster` recorta
o primeiro quadro e registra `flipbook-first-frame`, e o painel avisa que
"a pintura animada fica parada no primeiro quadro".

Do outro lado, o Estúdio não tem nada de pintura animada: nenhuma ocorrência de flipbook
no pacote, e a única UV dinâmica dos runtimes 3D é o `repeat` estático de ladrilho.

## Decisões

- **O transporte viaja DENTRO do GLB**, não num canal novo ao lado dele. O motivo é o
  payload: para animar, a folha inteira precisa chegar ao destino, então os pixels já
  teriam que viajar no arquivo de qualquer jeito. Um segundo canal só duplicaria posse,
  orçamento e invalidação sem carregar nada que o GLB não carregue melhor.
- **Duas gravações do mesmo encoder, escolhidas explicitamente.** `encodeSceneGlb` ganha
  `animatedPaint`. Ausente (o padrão, e o caminho do "Baixar .glb") mantém o recorte do
  primeiro quadro e o aviso de perda exatamente como hoje. Ligado, a textura passa a ser a
  folha inteira e a perda desaparece porque não há mais perda.
- **`KHR_texture_transform` para o quadro inicial.** As UVs exportadas já são do QUADRO
  (`dimensions()` devolve `frameWidth`/`frameHeight`), então basta declarar escala e
  deslocamento da célula. Quem entende a extensão, e o GLTFLoader entende, mostra o primeiro
  quadro certo sem saber nada de Molda; animar é mexer no `offset` que o loader já montou.
- **`materials[i].extras.molda.flipbook` leva o contrato versionado**, na mesma convenção
  `extras.molda` que o exportador já usa em cena, skins e clipes. O GLTFLoader copia `extras`
  para `userData`, então o consumidor acha o contrato sem parser próprio.
- **Uma amostragem, não duas.** O contrato transporta a grade e a sequência, não uma tabela
  de deslocamentos já calculada: o consumidor recalcula pela mesma fórmula e as duas pontas
  são conferidas contra a mesma fixture. Tabela pronta viraria uma segunda fonte da verdade.
- **Só a cor base anima nesta versão.** Um mapa de normal, rugosidade ou metal com quadros
  continua no primeiro quadro, com o aviso de perda de sempre. É limite declarado, não
  esquecimento: sequências independentes por mapa exigiriam mais do que o consumidor precisa.

## Contrato

```ts
/** materials[i].extras.molda.flipbook */
interface SceneGlbFlipbookContract {
  contract: 1
  sourceId: string        // imagem autoral, para diagnóstico e ressincronização
  columns: number         // colunas da folha
  rows: number            // linhas da folha
  frames: number[]        // sequência explícita, células 0..columns*rows-1, topo-esquerda
  fps: number
  loop: boolean
}
```

Deslocamento da célula `frame`, na convenção UV do glTF (origem no topo-esquerda):

```
scale  = [1 / columns, 1 / rows]
offset = [(frame % columns) / columns, floor(frame / columns) / rows]
```

A numeração das células segue a folha VISÍVEL, igual à do editor. As linhas nativas do
Molda são de baixo para cima e o exportador já reflete V na geometria e inverte as linhas
do raster: a fórmula acima vale depois dessas duas reflexões, e é isso que os testes provam.

## Orçamentos

A folha inteira ocupa `columns × rows` vezes os pixels de uma célula. O teto continua sendo
o `SCENE_LIMITS.pixelBytes` de 32 MiB que o `texture()` já confere, e `imageSide` de 1024
limita a folha a 4 MiB por imagem. Estourar recusa a exportação com a mensagem que já existe,
nunca cai calado para o primeiro quadro. `SCENE_FLIPBOOK_LIMITS` (256 células, 256 passos,
0,1 a 60 quadros por segundo) continua sendo a régua da sequência.

## Provas e limites

- Roundtrip pelo leitor de GLB independente do pacote (`testing/glbRead.ts`): a textura tem
  o tamanho da folha, o material carrega o contrato e a transformação aponta para a primeira
  célula da sequência, não para a célula 0 quando a sequência começa em outra.
- Validador Khronos e GLTFLoader reais: `KHR_texture_transform` declarado em `extensionsUsed`,
  arquivo válido, e o loader entrega `map.offset`/`map.repeat` iguais aos do contrato.
- Pixels: a célula amostrada em cada passo da sequência bate com a mesma célula lida do
  documento nativo, inclusive com repetição de quadro e sequência fora de ordem.
- Sem a opção, o GLB sai byte a byte igual ao de hoje, com `flipbook-first-frame` intacto.
- Fixture compartilhada com o Estúdio, impressa por `print-scene-studio-contract.ts --flipbook`.
  Atualizar a fixture revisada do Estúdio continua sendo uma edição explícita de arquivo.
- Não homologa aparência, GPU, toque nem criança. Não liga formato público, não altera o
  writer v1 e não implementa o consumidor: reprodução por entidade no runtime do Estúdio é
  o lote 226, e o destino "Usar no Estúdio" na oficina é o 227.
