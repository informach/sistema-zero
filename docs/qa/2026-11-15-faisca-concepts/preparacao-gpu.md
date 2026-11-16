# Preparação de materiais antes da exploração

Verificação em 16/11/2026, Chrome headless 157, Windows, RTX 3050, 1280 × 800, DPR 1. Execuções individuais no mesmo desktop; perfil de CPU instrumentado, não benchmark de aparelhos móveis.

A primeira visita noturna aos Campos bloqueava a thread principal por cerca de 2,13 s. O perfil apontou `WebGLProgram.onFirstUse`: compilação/link de materiais somente ao aparecerem pela primeira vez. O custo apareceu depois de o HUD já informar arte pronta. A correção antecipa upload das texturas e `WebGLRenderer.compileAsync` da cena montada, com suas instâncias, avatar e luzes reais. A arte é exibida e a locomoção liberada após essa preparação. A troca dia/noite prepara as respectivas variantes. As ferramentas de reposicionamento aguardam o carregamento.

| Medição de primeira visita | Antes | Depois |
|---|---:|---:|
| Maior intervalo de RAF após arte pronta | 2.134,1 ms | 66,6 ms |
| Intervalo de RAF na chegada à horta | 2.134,1 ms | 50,1 ms |
| Arte pronta desde início da navegação | 8.835 ms | 6.552 ms |

São observações destas duas execuções, sujeitas a cache do driver, instrumentação e sistema operacional; não demonstram ausência universal de travadas. O objetivo foi retirar o custo de compilação da primeira exploração. Os resumos mantêm todos os intervalos acima de 50 ms e tarefas longas, inclusive os que ocorrem durante o carregamento.

O ensaio posterior de renderer, sem profiler de CPU, registrou 58–60 FPS nos três pontos de dia e noite. A preparação mantém antecipadamente texturas que antes só seriam enviadas à GPU ao entrar em vista: no ciclo comparável da Vila, 38 texturas residentes versus 26 antes da preparação. Em outros pontos a contagem chega a 44. Isso é contagem de recursos, não medição de VRAM em bytes. Os três retornos à Vila ficaram em 164 geometrias / 38 texturas; fora do piloto, 65–68 / 14. Não houve crescimento contínuo nesses ciclos.

## Prova de preservação

- Prioridade: impacto 5 × confiança 5 ÷ esforço 2 = 12,5. O perfil identificou o primeiro uso de shader como maior consumidor de CPU.
- Ordem: a mesma cena e os mesmos materiais são preparados antes da liberação; não há alteração da ordem das peças ou da simulação.
- Desempate, RNG e ponto flutuante: nenhuma mudança nos algoritmos de terreno, recorte, rotas, movimento ou colisão.
- Hashes SHA-256 idênticos antes/depois: `arte.generated.ts` — `e39bebb88d659789388b33e1ed680488b0faab3355099754b4ab89bc9855f456`; `arte-instancias.json` — `254eebf51347aeaee2554a9456b7895892009ede04a37f0fa5bb319ae4cc8415`.
- Uma intervenção de desempenho: antecipar a preparação GPU usando APIs públicas do Three instalado. Nenhum material foi simplificado e nenhum objeto foi retirado para melhorar o número.
- Regressões: suíte do pacote, tipagem, build, três ciclos de reentrada, falha/repetição do carregamento e toque emulado. Os vídeos registram a geometria e o controlador em movimento.
- Reversão: reverter somente o commit `perf(arquipelago): preparar materiais antes de liberar a exploração`.

Reprodução: `node playground/perf-frio-faisca-browser.mjs <identificador>`. O script grava o perfil completo em `output/faisca-concepts/qa`; apenas os resumos são versionados. Para medir o comportamento anterior, usar o commit `08fa00487` com o script atual de diagnóstico, sem alterar a biblioteca privada. Executar uma instância de navegador por vez e registrar a máquina utilizada.
