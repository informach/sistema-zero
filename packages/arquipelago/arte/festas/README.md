# Movimento, veículos e festas do Arquipélago no Blender

Lote 7 do `arte/INVENTARIO.md`: o kit de movimento (cipó, mergulho, planador e patins), os veículos
(o barquinho da chegada e o barco entre ilhas) e as quatro festas (Carnaval, Festa Junina, Noite das
Lanternas e fim de ano). Cada script monta as peças no Blender sem tela (o mesmo `bpy` do mundo, dos
personagens, dos itens e dos bichos) e grava os GLBs em `src/assets/movimento/` e
`src/assets/festas/`. Só os patins já estão no jogo (fase2-05, calçados nos ossos dos pés); o resto
ainda não. O trenó e o balão de passeio são das ilhas completas (Lote 6) e moram lá.

## Rodar

```sh
# tudo, a conferência do contrato e o relatorio.json (triângulos, tamanho, nós, vazios, clipes)
/tmp/claude-0/blender-venv/bin/python -B arte/festas/build_all.py

# um grupo, ou só algumas peças dele
PECA=cipo,patins /tmp/claude-0/blender-venv/bin/python -B arte/festas/movimento.py

# prévias (fora do jogo): uma peça, ou todas de uma pasta
/tmp/claude-0/blender-venv/bin/python -B arte/festas/render.py previa /tmp/junina.png src/assets/festas/junina.glb
NOITE=1 /tmp/claude-0/blender-venv/bin/python -B arte/festas/render.py previa /tmp/lanternas.png src/assets/festas/lanternas.glb
QUADRO=30 /tmp/claude-0/blender-venv/bin/python -B arte/festas/render.py previa /tmp/fogos.png src/assets/festas/fim-de-ano.glb
/tmp/claude-0/blender-venv/bin/python -B arte/festas/render.py todas /tmp/previas movimento
```

`FESTAS_OUT=/outra/pasta` grava as duas pastas (`movimento/` e `festas/`) em outro lugar.

## Ajudantes

`lib_festas.py` é uma cópia do `arte/itens/lib_itens.py` (mesmas formas, torno, paleta e
exportação), com a paleta do Lote 7 e três mudanças:

- `exportar(..., pasta='festas' | 'movimento')` escolhe a pasta;
- `pais={vazio: nó}` faz o vazio ser filho de um nó animado: a `pegada` do cipó e o `assento` dos
  barcos acompanham o clipe;
- a pose de repouso é lida antes de gravar os clipes, então clipes de posição (`location`, em
  deslocamento a partir do pivô) e de escala também voltam ao lugar certo no arquivo.
  `escala_repouso={nó: k}` deixa um nó pequeno quando parado (o estouro dos fogos);
- `enfileirar(pecas)` põe as peças de uma festa lado a lado, em fileiras, cada uma com o pivô no
  meio da própria base.

## Convenções

- **Origem e eixos:** no Blender o z aponta para cima e a frente olha para −Y; o glTF converte para
  o y para cima do three.js (a frente fica em +Z). Cada arquivo sai com a origem no meio da base
  (o ponto mais baixo em y = 0), na escala do avatar (1,6 de altura).
- **Peças vestidas (mergulho, patins):** saem na posição em que ficam no corpo do avatar, com a
  origem nos pés dele. ⚠️ O `AV` (0,751) dos scripts supunha o avatar menor que o `Armature.glb`;
  no jogo as peças do avatar ficam na escala delas (conferido em 29/10/2026). Os patins são
  desenhados com as medidas multiplicadas por `AV` e crescidos por `1 / AV` no fim (`CRESCER`); os
  vazios `pe-esq` e `pe-dir` ficam nos ossos `LeftFoot` e `RightFoot` sem o `AV`. O mergulho
  (`cabeca` = `mixamorig:Head`) ainda está com o `AV`: conferir antes de ligá-lo.
- **Patins:** a bota foi medida pelas peças do avatar (`community-kids/public/avatar3d/parts`): por
  dentro cabem o pé, a perna e a barra das calças e das fantasias de bicho; a boca fica logo acima
  do tornozelo, com acolchoado, e um fundo escuro por onde a perna entra. A faixa branca (biqueira,
  lados e contraforte) é uma curva lisa, porque cada coluna do casco tem um anel na altura dela.
  O jogo faz da bota uma malha com o esqueleto (o pé leva a sola, o chassi e as rodas, a canela leva
  o cano) e esconde o calçado do avatar. As rodinhas ficam 0,11 abaixo da sola; parado, o jogo sobe
  o avatar 0,089 (`ELEVACAO_DOS_PATINS`: o calçado parado desce 2,1 cm abaixo do osso do pé). O teste `tests/patins-nos-pes.test.ts` confere as peças do avatar dentro da bota.
- **Festas:** um arquivo por festa, com uma peça por nó. Cada nó tem o pivô no meio da própria base,
  então o jogo pode copiar o nó e pôr a peça em qualquer lugar (o arquivo é um catálogo, não a cena
  montada). Nós com mais de um material viram um grupo com uma malha por material no three.js.
- **Materiais que o jogo procura pelo nome:** `luz` (lampião do barquinho e do barco, chamas das
  lanternas, lâmpadas do varal e da palmeira, vela da ceia), `fogo` e `brasa` (fogueira),
  `estrela` (o alto da palmeira), `placaFace` (a placa de cada barraca, para escrever) e os papéis
  das lanternas (`lanternaVermelha`, `lanternaAmarela`, `lanternaAzul`, `lanternaRosa`), que
  brilham um pouco sozinhos. Os fogos usam `fogoArtificio1` a `fogoArtificio3`. Todos saem com a
  emissão já ligada; o jogo regula o brilho, como no lampião da casa.
- **Clipes:**
  - em laço: `balancar` (cipó, 2 s; barco, 3 s), `planar` (2 s), `remar` (1,5 s), `girar` (os raios
    do sol do carro alegórico, 4 s), `crepitar` (o fogo, 1 s) e `flutuar` (a lanterna do lago, 4 s);
  - uma vez: `estourar` (2 s, `LoopOnce` com `clampWhenFinished`). O foguete sobe e some, o estouro
    abre e se apaga. Parados, o foguete fica no tubo e o estouro fica com escala 0,01.
- **Emendas:** `bandeirinhas` e `varal-de-luzes` são trechos de 2 de comprimento. Os vazios
  `ponta-esq` e `ponta-dir` marcam as pontas do fio; para fazer um varal comprido, o jogo emenda
  trechos ponta com ponta. As lanternas de papel têm um vazio `gancho-<cor>` no ponto de pendurar.

## Peças

| Arquivo | Pasta | Nós | Vazios | Clipes | Triângulos | GLB |
|---|---|---|---|---|---|---|
| `cipo.glb` | movimento | `cipo` (pivô no alto) | `pegada`, `topo` | `balancar` | 1192 | 32 KB |
| `mergulho.glb` | movimento | `mascara`, `pe-de-pato-esq`, `pe-de-pato-dir` | `cabeca`, `pe-esq`, `pe-dir` | — | 1556 | 41 KB |
| `planador.glb` | movimento | `planador`, `asa-esq`, `asa-dir` | `pegada` | `planar` | 562 | 28 KB |
| `patins.glb` | movimento | `patim-esq`, `patim-dir` | `pe-esq`, `pe-dir` | — | 6064 | 150 KB |
| `barquinho.glb` | movimento | `barquinho`, `remo-esq`, `remo-dir` | `assento` | `remar` | 1770 | 66 KB |
| `barco.glb` | movimento | `barco` | `assento` | `balancar` | 2304 | 87 KB |
| `carnaval.glb` | festas | `confetes`, `serpentinas`, `mascaras`, `carro-alegorico`, `sol-do-carro`, `faixas` | — | `girar` | 9670 | 295 KB |
| `junina.glb` | festas | `bandeirinhas`, `fogueira`, `fogo`, `barraca-pescaria`, `barraca-milho`, `barraca-suco`, `balao` | `ponta-esq`, `ponta-dir` | `crepitar` | 7216 | 321 KB |
| `lanternas.glb` | festas | `lanterna-vermelha`, `lanterna-amarela`, `lanterna-azul`, `lanterna-flutuante`, `varal-de-luzes` | `gancho-vermelha`, `gancho-amarela`, `gancho-azul`, `ponta-esq`, `ponta-dir` | `flutuar` | 5284 | 120 KB |
| `fim-de-ano.glb` | festas | `palmeira-enfeitada`, `fogos`, `foguete`, `estouro`, `mesa-da-ceia` | — | `estourar` | 8574 | 251 KB |

Tetos conferidos pelo `build_all.py`: 4 mil triângulos por peça (por nó, nas festas), 15 mil por
festa e 500 KB por arquivo. Somados: 41,5 mil triângulos e 1,3 MB.

## Linha d'água e assentos

- **Barquinho:** o casco tem 0,36 de altura até a borda; a linha d'água fica perto de y 0,16 (onde
  a faixa azul de baixo encontra a branca). O `assento` fica no banco de trás.
- **Barco:** o casco tem 0,55 de altura até a borda; a linha d'água fica perto de y 0,22 (o fim da
  faixa vermelha). O `assento` fica no banco da esquerda (bombordo) do convés de trás.
