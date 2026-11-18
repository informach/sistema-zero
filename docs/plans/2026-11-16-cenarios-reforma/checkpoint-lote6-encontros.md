# Lote 6.2 — Encontros dos pisos sem sobreposição

18/11/2026 · continuação de `833f854f6` na staging. **Lote 6 continua aberto.**

## Correção

A praça e as trilhas importadas compartilhavam o mesmo espaço. Duas malhas de lajes ficavam sobrepostas, causando cintilação. O encontro agora recorta a geometria de acabamento de menor precedência: a praça recebe as chegadas; entre trilhas/estradas, prevalece a ordem do documento. Não desloca superfícies em Y, não altera GLBs e não abre buracos no terreno.

A planta do caminho é compartilhada pelo piso, pelos encontros e pela conformação. O piso nativo passa uma única vez pelo recorte do solo. Circuitos fechados conservam o vazio interno. Polígonos côncavos, bordas e UVs continuam preservados; a mesma malha resultante serve ao desenho, picking e colisão.

O cache considera os recortes dos vizinhos e seus erros. Mover, ocultar ou remover uma praça restaura os trechos de trilha que estavam dentro dela. O orçamento limita controles e regiões antes de acumular recortes sem limite. Curvas inválidas produzem erro individual.

## Regressão de movimento encontrada

Com a camada duplicada removida, o ensaio revelou que o ajuste de apoio ao descer podia devolver a cápsula à posição anterior, depois de um passo horizontal sem colisão. O detector de degrau não via bloqueio porque o retrocesso acontecia depois dele.

O ajuste para baixo agora só aceita uma solução que preserve X/Z dentro da mesma precisão usada na validação de subida. Caso a resolução exija empurrar lateralmente, o personagem continua a queda e resolve o próximo contato físico. Não há superfície invisível, aumento de velocidade ou exclusão da colisão das lajes. O diagnóstico com o modelo real compara cinco aproximações sobre terreno e sobre lajes; as dez simulações passaram. Paredes, degraus altos, rampas, encostas, teto, salto e queda continuam na regressão automatizada.

## Verificação e evidências

| Verificação | Resultado |
|---|---|
| Núcleo | 266 testes / 10.164 asserções; sem falhas |
| Motor | 116 testes / 3.696 asserções; sem falhas |
| Oficina | 96 testes / 610 asserções; sem falhas |
| Tipagem núcleo, motor e oficina | aprovada |
| Biome e build | aprovados; permanece o aviso conhecido de chunk acima de 500 kB |
| Workers compilados | terreno, PNG 16 e água aprovados, sem erros |
| Seis variantes e catálogo real no Chrome | sem erros; três ciclos de geometrias/texturas estáveis |
| Faísca completa com Cute Characters | altura 1,17004 m; casa–praça 12,62 m; praça–horta 19,42 m; horta–ponte 43,17 m; retorno e chegada ao Farol em Y=9,61 m; sem erros |

Os testes geométricos verificam a área da união em pisos nativos e de catálogo: 40 m², sem contar a interseção duas vezes; ao ocultar a praça, trilha de 32 m²; ao mover a praça, 48 m² distribuídos entre as duas regiões. O picking não encontra trilha duplicada dentro da praça.

Comparação de câmera normal: [praça antes](evidencias/lote6-encontros/antes-praca-terceira.png) e [praça depois](evidencias/lote6-encontros/depois-praca-terceira.png). [Percursos registrados](evidencias/lote6-encontros/percursos.json). As demais comparações e vídeo do percurso estão em `output/cenarios-reforma/lote6-encontros` e `lote3-testar-faisca/movimento`.

Inspeção estática mostra a remoção da disputa de superfícies nesse encontro. O percurso completo foi repetido com a física das lajes; isso não equivale à aprovação artística de todo o cenário ou homologação de aparelhos físicos.

## Próxima frente exclusiva

Continuar em **6.2**: validar pontes de catálogo, principalmente tampas dos pilares sob modelos arqueados, aproximações e recursos. Autoria/worker/edição de pontos (6.3), interface Caminhos (6.4) e fechamento do lote (6.5) permanecem pendentes. Lotes 7–10, composição final, full review, CI e implantação/validação de staging continuam no encerramento global.
