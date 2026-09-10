# Acabamento do traço de pesos — lote 221

Continuação das fases 7/2 do plano aprovado, sob autorização de implementação
sequencial e validação ao final. Sem mudar a mistura de pesos, binds, undo ou formatos.

## Contexto e alternativas

O lote 126 preserva todos os eventos agrupados, mas posições distantes só produzem
duas consultas: pincéis pequenos deixam pontos intermediários sem cobertura.

1. Interpolar pontos em mundo/domínio: barato, mas a linha pode atravessar ar,
   dobras ou oclusões; não corresponde à superfície que a criança enxerga.
2. Reamostrar o percurso em tela e fazer picking real: escolhido. Reusa oclusão,
   espelhos, forma-base e o alcance pela malha, sem inventar faces intermediárias.
3. Nova fila/worker/BVH: pode melhorar casos extremos, mas altera ownership e
   latência; exige perfil próprio e não é pré-requisito para este comportamento.

## Contrato

- CapturedPaintInput continua dono de pointerId/cancelamento/commit e dos eventos
  agrupados. Interpolador opcional só para pesos; pintura de imagens não muda.
- Toda posição real é preservada, inclusive pointerup. Não consumir previsões nem
  redisparar eventos. Capturar coordenadas, não reter PointerEvents mutáveis.
- Recortar somente o trecho sintético ao retângulo visível do canvas. Posições
  reais externas ainda produzem miss; trajetórias externas enormes não geram laços
  proporcionais à distância fora da área. Entrada não finita não gera interpolação.
- Passo sugerido a partir do raio projetado, entre 1 e 16 pixels CSS. No máximo
  256 posições sintéticas por segmento real. O orçamento afeta apenas a aproximação
  adicional: nunca elimina posição registrada. Não prometer continuidade subpixel
  ou um caminho geodésico exato; traços extremos ainda exigem medição em hardware.
- Conferir dono antes/depois de cada picking e callback. Cancelar/trocar ferramenta,
  documento, câmera ou viewport interrompe todo o segmento antigo. Um único undo.
- Cada ponto sintético consulta a superfície realmente visível; miss/objeto errado
  não é substituído por interpolação entre hits. O pincel mantém seu alcance atual
  pela conectividade da malha e sua mistura por cobertura máxima, não acumulação.

## Execução e verificação

1. Gerador puro do percurso, clipping, posições reais, orçamento e extremos numéricos.
2. Integração com ownership existente e espaçamento do pincel; regressões Three real
   de ponto intermediário, oclusão/misses, espelho, eventos agrupados e um undo.
3. Medir custo CPU da nova capacidade e revisar antes de encerrar; tipos/Biome,
   integral e builds sequenciais. Sem afirmar FPS/GPU/toque no simulador.

Browser oficial indisponível no lote 220; não contornar com outro backend. Revisão
visual real e validação com crianças ficam explicitamente pendentes, não simuladas.
