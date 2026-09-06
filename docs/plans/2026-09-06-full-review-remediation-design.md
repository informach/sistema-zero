# Correções finais do full review de 06/09/2026

## Objetivo

Corrigir os três achados reproduzidos no review: o CI vermelho no benchmark do Molda, o teto de
triângulos burlado por gêmeos e o hit-test incorreto de curvas Bézier no Pinta.

## Molda

Uma função pura calculará quantos triângulos o modelo terá depois de sincronizar os gêmeos. A
contagem considerará cada fonte uma vez e acrescentará sua cópia quando o espelho exigir um gêmeo.

As operações que podem aumentar essa contagem validarão o modelo projetado antes do commit:
adicionar, duplicar, mover uma peça para fora do plano central e ativar o espelho. `syncTwins`
também recusará materializar gêmeos acima do teto; esse portão protege registros externos que
entram pelo sanitize. O sanitize preservará as peças que já cabem, desligará o espelho quando os
gêmeos excederem o orçamento e sempre devolverá no máximo 20.000 triângulos.

Os testes cobrirão ativação do espelho no teto, duplicação com espelho, criação/movimento que pede
um novo gêmeo e round-trip pelo sanitize.

## Pinta

`flatten.ts` já contém a régua autoritativa para amostrar cúbicas com erro máximo documentado. O
código exporá o achatamento de um `d` como subcaminhos com pontos e indicação de fechamento.
`shapeToPoly` e o hit-test consumirão essa mesma função.

O hit-test medirá a distância até os segmentos amostrados da curva. Um `Z` continuará fechando o
subcaminho; um caminho aberto continuará aberto. Os testes provarão que o ponto renderizado da
Bézier acerta e que o polígono de controle invisível não acerta.

## CI e verificação

O benchmark receberá apenas as mudanças produzidas pelo Biome. A verificação executará as
regressões em vermelho e verde, os testes e typechecks de Molda e Pinta, o CI global e o E2E do
Molda.
