# Animações do avatar (Mixamo)

`mixamo.py` passa as animações baixadas do Mixamo para o esqueleto do avatar da plataforma
(`community-kids/public/avatar3d/base/Poses.glb`) e grava os clipes do jogo em
`src/assets/avatar/locomocao.glb`.

Os FBX ficam fora do repositório. São baixados do Mixamo com o nosso avatar
(`avatar-com-esqueleto.fbx`, o esqueleto `mixamorig` de 75 ossos), sem marcar "In Place"; o script
os procura pelo nome em qualquer subpasta de `MIXAMO_DIR`:

```sh
MIXAMO_DIR=/caminho/dos/fbx /tmp/claude-0/blender-venv/bin/python -B arte/avatar/mixamo.py
```

`LOCOMOCAO_OUT` grava em outro lugar (para comparar antes de trocar o do jogo) e `MIXAMO_BLEND`
salva a cena do Blender antes de exportar (para fotografar as poses com o avatar vestido).

## O que o script faz com cada clipe

- Passa o movimento osso a osso pela rotação no mundo em relação à pose de descanso dos dois
  esqueletos. É o mesmo esqueleto, então nada distorce.
- Tira o deslocamento: quem anda, sobe e cai é o corpo do jogo. Nos ciclos, a reta do começo ao
  fim sai da bacia e vira a `passada` (quanto o corpo anda por ciclo), que a regra usa para o pé não
  patinar. No pulo e na queda a bacia fica parada na altura de pé e só pernas e braços mexem.
- Encaixa onde o jogo espera: o bumbum no assento (0,53 m) e na sela, as mãos na barra do
  planador (1,25 m) e na quina da borda, as costas no colchão, o nadador na linha da água e os pés
  dos que sobem (tronco, escada) logo acima da origem.
- Ajustes de pose: andar e correr recomeçam no toque do pé esquerdo (os dois tocam na mesma
  fase); o planador usa o corpo do "Hanging Idle" com os braços do "Driving" (as mãos na frente do
  peito); a montaria abre as pernas do "Driving" para os lados da sela; o "Climbing Ladder" vem de
  costas e leva meia volta.
- Grava cada clipe como uma faixa e enxuga o GLB: só os giros dos ossos e a posição da bacia.

No fim imprime um `RESUMO` em JSON: as durações, as passadas e onde ficaram as mãos, a bacia, os
pés e a cabeça (medidos no esqueleto do jogo).

## Ao trocar um clipe

As durações e as passadas de `src/sistemas/locomocao.ts` têm de bater com o resumo (quadros de
30 por segundo). Depois de gerar, rode `bun test tests/locomocao.test.ts` (nomes, durações, só
giros e a bacia, e o pé no apoio parado no chão) e tire os prints no jogo com
`playground/verificar-animacoes-browser.ts`.
