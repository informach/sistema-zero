# Lote 221 — percurso do pincel de pesos

Estado: implementado e verificado; otimização do picking segue no lote 222. Design e limites em
`docs/plans/2026-09-09-molda-skin-stroke-design.md`.

## Fronteiras

Gerador puro em tela recorta somente posições sintéticas, sempre emite a posição
real final e limita a 256 posições adicionais. Espaçamento sugerido pelo raio
projetado (1–16 px CSS). Sem promessa de curva/subpixel/geodesia exatos.
CapturedPaintInput opta pela interpolação só no viewport de pesos. Cada posição
passa pelo picking real, com oclusão/espelho/forma-base já existentes. Mistura,
binds, geometria, comando e autoria não mudam. Um undo por gesto.

## Revisão e regressões

- 8e85d2: 30/1; teste exigia igualdade literal de ponto sintético 3 quando o
  cálculo reverso produzia 3,0000000000000004. Pontos reais seguem exatos; teste
  de interpolação passou a tolerância numérica de 12 casas, sem snap produtivo.
- b6c0ee: vermelho diferencial antes de conectar o percurso ao viewport: o vértice
  intermediário permanecia em 0,5. Caso ocluído já recusava corretamente a pintura.
- add18e: 68/0, 672 asserts, seis arquivos; incluindo Three real, agrupados versus
  separados, intermediário/oclusor bloqueado, fonte intacta e undo/redo único.
- Review encontrou janela anterior durante o primeiro picking: cancel/disable/
  dispose podiam ocorrer antes de haver dono e o retorno ainda iniciava o gesto.
  17c4fe reproduziu três falhas. Dono agora é reservado antes do picking, com fase
  ainda não iniciada; cancelamento não envia end para begin inexistente. Movimento
  ignora essa fase. Sem alterar timeouts ou suprimir eventos reais.
- d1c098: **72/0, 684 asserts, seis arquivos** após a correção. Cancelamento dentro
  do picking intermediário impede que seu retorno alcance a sessão.

Benchmark novo mede picking Three + domínio, não dispatch/React/overlay/GPU.
Resultados novos diferem intencionalmente do endpoint-only; não chamar isso de
otimização de comportamento equivalente. Benchmark de pesos 120/121 mantém goldens.
Tipos/integral/builds e medição final ainda pendentes.

## Medição da capacidade nova

1d6dff: Bun 1.3.11, Ryzen 5 5600G, happy-dom somente para canvas/rect; Three e
domínio reais, 3 warmups/10 samples por modo em processos isolados. Raio 2,
canvas 1024×768, deslocamento longo de ponta a ponta. p50/p95 (p99=max de dez).

| Malha | Consultas só ponta / percurso | Vértices alterados | Move antes | Move com percurso |
| --- | --- | --- | --- | --- |
| 1.024 vértices / 1.922 triângulos | 1 / 38 | 46 / 232 | 0,375 / 0,810 ms | 7,377 / 11,006 ms |
| 8.281 vértices / 16.200 triângulos | 1 / 90 | 46 / 637 | 1,334 / 2,827 ms | 74,716 / 90,767 ms |

Prepare p50/p95 antes/depois: pequeno 0,746/0,889 → 0,799/0,928 ms;
grande 4,947/11,878 → 4,682/13,744. Commit pequeno 0,394/0,695 → 1,121/6,026;
grande 1,685/3,021 → 3,199/4,122. RSS amostrado antes/depois: pequeno
329.768.960/326.934.528; grande 423.600.128/421.056.512 B. Não é memória de browser.

Quatro hashes fixados no benchmark após revisão do resultado diferencial: fontes
intactas, mais pontos cobertos no percurso, commit igual à prévia, binds preservados.
Tipos explícitos do script passaram (55e6be). Não medir React/overlay/GPU por ele.

Perfil separado c114cf, `skin-path-l221-initial.md`: 2,19 s/295 amostras;
checkIntersection self 17,1%/inclusive 35,8%, Vector3.copy 9,1%, intersectTriangle
9,3% somando dois locais. _computeIntersections inclusive 38,0%. Não misturar
tempos instrumentados com a tabela. O custo de picking requer a próxima alavanca
perfilada, não reduzir/descartar posições reais ou afirmar fluidez no caso extremo.

## Review de navegação

cc7d78 reproduziu outra janela: zoom real por WheelEvent mudava a câmera, escondia
o cursor e deixava a pintura ativa. onCameraChange agora interrompe pintura de
pesos/imagens; interrupt conserva contatos fisicamente pressionados, ao contrário
de cancelar a ferramenta. Teste exige não reiniciar ao pousar um terceiro dedo.
485682: **93/0, 848 asserts, sete arquivos**, incluindo integração React do pincel.

## Verificação final

- Tipos 5462b8/6fb324 passaram. Biome e1ea95: 1.138 arquivos, sem correções,
  incluindo o novo benchmark.
- 3c45fc: goldens antigos do domínio (1.024/8.281/131.072 vértices) intactos;
  quatro novos goldens de percurso/ponta fixos também passaram, sem mutação da fonte.
  Segunda medida de move p50/p95: ponta pequena 0,447/0,640 ms, grande 1,321/1,965;
  percurso pequeno 7,637/10,088, grande 79,390/96,773. Confirma custo a otimizar,
  não média com o perfil instrumentado. Os 38/90 queries e 232/637 alterados se mantêm.
- Integral 1d24f2/0f7284: **2.783/0, 8.493.324 asserts, 371 arquivos, 164,22 s**.
  Sete logs WebGL e cinco avisos act em TextureEditor; pendência histórica sem supressão.
- Vite fc2052: 1,32 s, SceneViewport 112,54→114,77 kB; ScenePlayground 211,88,
  index 363,90, CSS 53,64 e workers inalterados. Three ainda 579,29 kB/aviso.
- Kids e53443/6fb11f: compilação 5,0 s, tipos 10,6 s, 59 páginas em 670 ms, exit 0.
- Diff check final passou, somente três avisos CRLF preexistentes. Nenhuma alegação
  de browser/GPU/toque/crianças. Cinco avisos act seguem como pendência de diagnóstico.

O percurso consulta centros na superfície visível. A influência ao redor de cada
centro continua seguindo o alcance pela malha existente; não é uma nova máscara
por visibilidade de cada vértice. Resultados são os da prévia e um único undo.
