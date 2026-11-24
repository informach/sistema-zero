# Mapas no formato do Tiled, escritos à mão

Estes arquivos foram escritos à mão em 18/11/2026 seguindo o formato oficial do Tiled 1.10
(JSON `.tmj`/`.tsj` e XML `.tmx`/`.tsx`): `tiledversion`, `nextlayerid`, `nextobjectid`,
`infinite`, `renderorder`, folha embutida e folha externa. Eles NÃO foram gravados pelo
programa Tiled: nenhuma execução do Tiled real foi feita (não realizado).

- `fazendinha.tmj` e `fazendinha.tmx`: folha embutida, camadas em base64 com zlib.
- `fazendinha-externo.tmj` (+ `terreno.tsj`) e `fazendinha-externo.tmx` (+ `terreno.tsx`):
  folha externa, camadas em lista/CSV.
- A folha externa em XML fica no disco como `terreno.tsx.xml`, e não `terreno.tsx`: neste
  repositório um arquivo `.tsx` é lido como código TypeScript pelo tsc e pelo Biome. O mapa
  aponta para `terreno.tsx`, como o Tiled grava; o teste entrega o conteúdo do `.tsx.xml`
  nesse nome. Para abrir no Tiled, copie o arquivo tirando o `.xml` do fim.
- `terreno.png`: folha de 8 peças de 16 pixels, gerada com `@napi-rs/canvas`.

O teste `../../realTiled.test.ts` importa os quatro e confere a cena exata.
