# Cuidado com bônus, sem reduzir o ritmo básico

Lote A03c, base local `579cb2840`. `RITMO.cansado` passa de 0,8 para 1. O humor bem mantém 1,
e ótimo mantém 1,1. São os multiplicadores da regra existente, sem novo campo ou recompensa.
Comida, necessidades, descanso e cochilo não mudaram.

## Evidência

Antes da correção, as duas provas falharam: o ritmo caía abaixo de 1, e o passo real
do modo de movimento não atingia a velocidade básica com energia baixa. Depois passaram
44 testes dirigidos, com 593 asserções. O teste de movimento usa os modos reais, com
necessidades cansadas, normais e ótimas: andar, correr e nadar conservam a base nas duas
primeiras e recebem o bônus na terceira. A matriz de necessidades cobre os limites de 0 a 100.

No Chrome com SwiftShader, 1280 × 720 e 390 × 844 com toque emulado, o avatar com energia 10
andou a 2,2 m/s e correu a 4,6 m/s. Houve deslocamento real de mais de 1 m, pulo e pouso,
sem erro de página. A aceleração é aguardada pela velocidade observada, e o deslocamento
também é aguardado, sem supor que dois computadores desenham à mesma taxa.

As entradas de movimento desta prova foram de teclado nos dois tamanhos. A captura móvel
confere a apresentação no layout de toque; não substitui um teste em aparelho físico.
As medidas completas e os prints estão nesta pasta. Nenhuma escrita remota, arte ou push.

## Comandos

No pacote do jogo:

```text
bun test tests/sistemas.test.ts tests/modos.test.ts
bun --smol test --timeout 30000
NODE_OPTIONS=--max-old-space-size=8192 bunx tsc --noEmit
bun build playground/verificar-ritmo-browser.ts --target=node --external playwright-core --outfile .cache/verificar-ritmo.mjs
node .cache/verificar-ritmo.mjs
```

Resultado completo: 1.299 testes aprovados, 1 ignorado (Postgres local), 175.339 asserções em
150 arquivos. Tipagem com teto de 8 GB aprovada. Na raiz: Biome dos seis arquivos TS/TSX
tocados e `git diff --check` aprovados. Os prints nos dois tamanhos foram inspecionados.
Na revisão foram conferidos os dois consumidores de `ritmo`: chão/ar/água e equilíbrio.
O medidor apenas expõe a velocidade já calculada, sob demanda. Não muda física, colisão,
orçamento de quadros ou regra de percurso. Nenhum pedido de arte.
