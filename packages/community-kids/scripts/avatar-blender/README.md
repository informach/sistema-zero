# Peças do avatar feitas no Blender

Scripts que geram as 32 peças próprias do avatar 3D (26/10/2026): cabelos `hair-12` a `hair-18`,
o rosto delicado, roupas, calçados, óculos, acessórios e a aba Enfeite. Elas usam o mesmo
esqueleto (`public/avatar3d/base/Armature.glb`) e as mesmas regras de material das peças do pacote
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
```

O arquivo sai em `out/<id oficial>.glb` (ou na pasta de `AVATAR_OUT`). Peça gerada entra nas DUAS
pastas, `community-kids/public/avatar3d/parts/` e `community/public/avatar3d/parts/`, e ganha a
miniatura com `bun run gen:avatar-thumbs <id>` (copie o PNG para as duas pastas `thumbs/`).

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
