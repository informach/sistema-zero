# Animações do avatar no Blender

`locomocao.py` abre o esqueleto do avatar da plataforma
(`community-kids/public/avatar3d/base/Poses.glb`) e grava as animações de movimento do jogo em
`src/assets/avatar/locomocao.glb`.

```sh
/tmp/claude-0/blender-venv/bin/python -B arte/avatar/locomocao.py
```

## Como cada ciclo é montado

- A pose de base é o primeiro quadro do "Idle" da plataforma (braços soltos, dedos relaxados).
- Pernas por IK de dois ossos: o script decide onde fica o tornozelo e calcula coxa e canela. O
  pé gira sobre o calcanhar ao pisar e sobre a bola ao sair; os dedos ficam no chão.
- No apoio, o pé desliza para trás na velocidade do ciclo (`passada / duracao`). No jogo o corpo anda
  para a frente na mesma velocidade, então o pé fica parado no chão.
- A bacia desce sozinha quando um pé não alcança o alvo (a perna nunca estica além do osso).
- O ciclo começa com o pé esquerdo pisando e fecha (o último quadro repete o primeiro).
- No fim, `enxugar()` tira do GLB a escala dos ossos, as posições (menos a da bacia) e as pontas
  `_end_end`, que o avatar não tem.

## Ao mudar um ciclo

`ANDAR` e `CORRER` daqui têm de bater com `CICLO_DE_ANDAR` e `CICLO_DE_CORRER` de
`src/sistemas/locomocao.ts` (duração em quadros de 30 por segundo e passada). Depois de gerar,
rode `bun test tests/locomocao.test.ts` e confira no playground em `/animacoes?v=2.2`.

Do mesmo jeito, `ESCALAR` (duração e quanto o corpo sobe por ciclo) bate com `CICLO_DE_ESCALAR`, e
os 48 quadros do Pendurado com `DURACAO_DO_PENDURADO`. Os dois se conferem em `/animacoes?escalar=1`
(com `&lado=frente` as mãos alternando aparecem melhor) e `/animacoes?cipo=1`; no jogo, no tronco
e nos cipós do Bosque.
