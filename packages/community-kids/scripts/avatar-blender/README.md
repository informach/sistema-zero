# Peças do avatar feitas no Blender

Scripts que geram as peças próprias do avatar 3D. As 32 de 26/10/2026 são os cabelos `hair-12` a
`hair-18`, o rosto delicado, roupas, calçados, óculos, acessórios e a aba Enfeite; as oito roupas
de festa de 31/10/2026 estão na seção própria, abaixo. Todas usam o mesmo esqueleto
(`public/avatar3d/base/Armature.glb`) e as mesmas regras de material das peças do pacote
Quaternius: `Color_*` pega a cor escolhida e `Skin_*` usa a pele.

## Preparar

O Blender roda sem tela pelo pacote `bpy` do PyPI, que pede Python 3.13:

```sh
uv venv --python 3.13 /tmp/blender-venv
uv pip install --python /tmp/blender-venv/bin/python bpy==5.2.3
```

O pacote ocupa perto de 1 GB.

## Gerar uma peça

Cada arquivo agrupa uma família, e o nome da função vai depois de `--`:

```sh
/tmp/blender-venv/bin/python cabelos.py -- longo ponytail trancas afro cachos coque chiquinha
/tmp/blender-venv/bin/python enfeites.py -- laco tiara flores presilhas gatinho
/tmp/blender-venv/bin/python roupas.py -- mangalonga moletom listrada calca saialonga vestidolongo bota sapatilha
/tmp/blender-venv/bin/python rosto.py -- redondo gatinho sardas bochecha colar cachecol
/tmp/blender-venv/bin/python rostos.py -- sorrisos cilios brilho sobrancelha nariz
/tmp/blender-venv/bin/python festas.py -- cartolinha colete palha chita lanternas capa gorro sueter
/tmp/blender-venv/bin/python conferir_festas.py
```

O arquivo sai em `out/<id oficial>.glb` (ou na pasta de `AVATAR_OUT`). Peça gerada entra nas DUAS
pastas, `community-kids/public/avatar3d/parts/` e `community/public/avatar3d/parts/`, e ganha a
miniatura com `bun run gen:avatar-thumbs <id>` (copie o PNG para as duas pastas `thumbs/`). Peça
que ainda não está no catálogo também ganha miniatura: o gerador aceita o id quando o GLB já está
em `public/avatar3d/parts/` e tira a categoria do prefixo (`hat`, `enfeite`, `top`, `outfit`...).

## Roupas de festa (31/10/2026)

Uma peça de cabeça e uma de corpo por festa, todas em `festas.py`:

| Festa | Id | Função | Peça | Cor própria (sem `Color_`) |
| --- | --- | --- | --- | --- |
| Carnaval | `hat-08` | `cartolinha` | cartolinha de lantejoula com pluma curta e serpentina na aba | fita, pluma, serpentina |
| Carnaval | `top-07` | `colete` | colete de franjas coloridas sobre camiseta com confetes | camiseta, franjas, confetes |
| Junina | `hat-09` | `palha` | chapéu de palha com dois remendos de chita e aba desfiada | palha, chita (a fita é `Color_`) |
| Junina | `outfit-07` | `chita` | vestido de chita com babado, barra repesada nas coxas | chita e florzinhas (o babado é `Color_`) |
| Lanternas | `enfeite-06` | `lanternas` | tiara com três lanterninhas de papel penduradas | lanternas (com emissão), arame, ouro |
| Lanternas | `top-08` | `capa` | capa curta de estrelas, dos ombros à cintura | camiseta, estrelas (capa e gola são `Color_`) |
| Fim de ano | `hat-10` | `gorro` | gorro de tricô com pompom e barra branca | barra, pompom |
| Fim de ano | `top-09` | `sueter` | suéter com estrela grande no peito e flocos na barra | estrela, faixa e flocos |

- **Chapéus e tiara cabem sobre os cabelos.** O oco de cada chapéu e o arco da tiara são medidos
  contra os próprios cabelos (`assentar`, `menor_escala`): nenhum vértice de `hair-01` a `hair-18`
  nem das cabeças fica fora do oco. Os cabelos de `FORA_*` (topete alto, pontas para os lados, rabo
  alto, crespo volumoso...) não cabem num chapéu desse tamanho; `conferir_festas.py` aceita esses
  só quando TODOS os chapéus que já existem e ficam na cabeça também os atravessam (a auréola
  `hat-05` flutua e fica de fora), e grava a conta em `festas-relatorio.json`. Hoje o app esconde o
  cabelo e o enfeite debaixo de qualquer chapéu (`AVATAR_HIDE_GROUPS`).
- **Roupas herdam os pesos do pacote** (`herdar_pesos`: cada vértice novo copia os pesos do vértice
  mais próximo de `top-01`/`outfit-01`; a capa só do tronco, para não seguir o braço).
- **Ainda fora do catálogo.** As oito peças não estão em `AVATAR_PART_INFO` (o catálogo é da dona);
  `tests/avatar3d-catalog.test.ts` lê os oito GLBs direto: arquivos iguais nos dois apps, juntas na
  ordem do `Armature.glb`, só o osso da cabeça nos chapéus e na tiara, `Color_` presente e abaixo
  do maior triângulos/KB da família. A categoria `hat` não tem paleta no catálogo: a cor do
  `Color_` dos chapéus só troca quando ela ganhar uma.

## Cuidados

- **Ordem das juntas.** O exportador de glTF do Blender grava as juntas do esqueleto em outra
  ordem, e o avatar prende cada peça pelo índice da junta. Por isso toda exportação passa por
  `reordenar.py`, que devolve a ordem do `Armature.glb`. Sem ele a peça fica parada no ar quando o
  corpo faz uma pose. O teste `tests/avatar3d-catalog.test.ts` confere todas as peças.
- **Coordenadas.** A armadura importada tem escala 0,01 e eixo Y para cima. `worldify` (em
  `lib.py`) grava cada malha copiada em metros, com z para cima e o rosto virado para -Y.
- **Pesos.** Cabelos, enfeites, óculos e rosto ficam presos só ao osso da cabeça. Roupas nascem das
  peças do pacote e herdam os pesos delas; a barra das saias compridas passa do quadril para as
  coxas (`repesar_barra`), para o joelho não atravessar o tecido.
- **Cor embutida.** Peça sem material `Color_` numa categoria com paleta entra em
  `AVATAR_FIXED_COLOR_PARTS` (`member-shell/src/lib/avatar3d-catalog.ts`).
