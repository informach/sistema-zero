# Limites de dobra assistida, lote 132

`bendLimit: { min, max }` é opcional em grupos/locators internos. Define flexão:
0° esticado, 180° dobrado de volta. Regra da assistência de dois ossos, não física,
limitação das alças ou alteração de curvas já gravadas. Vale no referencial do pai
do começo, assim como a solução do lote 129; não prometer métrica rígida em mundo
sob escala afim não uniforme.

## Contrato e revisão

- Um leitor estrito compartilha validação com índice/comando/solver; só números
  finitos 0–180 e min ≤ max, sem campos extras ou normalização silenciosa. A regra
  pertence ao apoio da dobra, não há IDs de ossos duplicados ou store de esqueleto.
- Codec possui os valores; duplicar o apoio clona a regra. Configurar/remover é
  comando COW com travas herdadas/descendentes, no-op e um undo. Não toca geometria,
  pixels, pesos, IBMs, transforms ou animações.
- Faixa angular vira intervalo radial pela fórmula de meio ângulo em unidades do
  osso maior. Extremos naturais mantêm `too-far`/`too-close`; uma fronteira
  configurada informa `bend-limit`. Amostras mantêm comprimentos e conferem o
  ângulo final com atan2. Faixa menor que a precisão radial é recusada.
- A captura original não aplica a regra, para não alterar implicitamente a pose
  atual. Experimentar aplica a faixa, inclusive se o destino for a ponta original
  fora da faixa. Confirmar produz somente as rotações compatíveis com playback.
- RED/GREEN: escalas 1e-150, comprimentos 1:3, 0°/180° produziam altura residual por
  cancelamento na lei dos cossenos. Extremos agora têm posição longitudinal exata
  e altura zero; a tolerância não foi afrouxada. Os testes anteriores continuam
  passando. Em limites naturais de ossos desiguais, alvo interno continua sendo
  `too-close`, mesmo com uma faixa configurada; expectativa do teste corrigida.
- GLB informa `bend-limit-omitted`: poses gravadas são portáteis, a regra editável
  não. Protocolo do worker reconhece o código e reserva até dois avisos por nó
  (visibilidade/dependência e limite). Cópia no Molda continua intacta.
- UI contextual herdada do lote 131, graus exatos, faixa guardada e escopo visíveis.
  Campo editado retira a prévia anterior e bloqueia novos ajustes até guardar ou
  descartar a faixa. Configuração e pose são duas confirmações/desfazeres distintos.

## Evidências

Sete testes novos de domínio: 105 combinações de escala/comprimento/ângulo, 64
mudanças rígidas/refletidas de referencial com oráculo Three, intervalos/no-op/
precisão, roundtrip/duplicação/undo, recusas/travas e poses local/delta com GLB real
no worker idêntico ao síncrono. Teste novo da oficina cobre campo incompleto,
faixa invertida, descarte, gravação de regra sem pose, nova prévia limitada e dois
undos separados. Entrada pura do comando protegida no teste de arquitetura.

Integral: **1.613 testes, zero falhas, 237 arquivos, 91,00 s**. Tipos e Biome/709
passaram. Vite/1,37 s: inspetor lazy 16,50 kB; Three permanece 579,29 kB com aviso
>500 kB. Kids: compilação/9,3 s, tipos/11,4 s, 59 páginas/564 ms, exit 0.
Diff check passou. Não houve suíte ou build concorrente nessas verificações.

Limites de torção/cone, eixo de dobradiça, alvo 3D arrastável, espelhamento de
conjuntos de ossos e homologação visual/GPU/toque/crianças continuam pendentes.
Formato público permanece 1; nenhuma ativação de cloud/host.
