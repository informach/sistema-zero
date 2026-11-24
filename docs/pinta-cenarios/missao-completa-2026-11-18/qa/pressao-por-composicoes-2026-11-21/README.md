# Pressão por composições distintas — 21/11/2026

Base `822462a4858fb3224434147f7f8b814189d40373`. Continuação da otimização
isolada do renderer; sem ativar formato 8 público, IO 3 ou novos leitores.

## Implementação e revisão

O perfil anterior continuou concentrando mais de 93% das amostras nas chamadas
de desenho. A estimativa nominal somava 128 MiB de chunks no cenário periódico,
embora suas composições coubessem no cache. Isso mantinha o desenho direto de
dezenas de milhares de peças por quadro. A alavanca deste lote é refinar a pressão
somente quando a estimativa nominal excede o orçamento.
Matriz: impacto 5 × confiança 4 ÷ esforço 3 = **6,7**. Reversão: reverter o
commit completo do lote, conservando as evidências históricas de cada versão.

Preparação e identidade foram extraídas do próprio LRU: atlas, tamanho, contagem,
fase e todas as células, incluindo flags, continuam obrigatórios. O preparo do
quadro reaproveita as receitas admitidas durante o desenho, sem ler as células
novamente. Os destinos são chaves transitórias, fora do cache retido e do documento.
O histórico continua guardando somente os dados autorais.

Se os bytes distintos excederem o orçamento ou um bucket exigir mais de oito
candidatos de colisão, o refinamento para e conserva a estimativa nominal. Isso
abandona uma otimização, sem recortar ou recusar o mapa. A consulta do atlas fica
limitada a uma vez por camada, mesmo após esse abandono. Blocos vazios não são
contados como imagens. A capacidade de produção permanece em 32 MiB.

O preparo conserva apenas receitas canônicas que cabem no orçamento. Com a menor
peça admitida e a capacidade de produção, são no máximo 128 vetores de 2 KiB,
além dos destinos limitados pelos chunks do documento. O mapa não é expandido
para um vetor do tamanho do mundo. Leituras e buffers de imagens continuam sob
os limites existentes; não há nova afirmação de heap total do aplicativo.

## Prova de comportamento

A ordem de composição, pontas/posições, números de ponto flutuante, semente,
animação e bits de giro não mudam. As guardas de alpha, transformações, filtro e
sombra do caminho direto permanecem iguais. A comparação usa o módulo anterior
real; somente os diagnósticos de retenção podem diferir, nunca os hashes RGBA.

Seis regressões verificam repetição, conteúdo único que não cabe, vazio, consulta
de atlas, contagem/fase no mesmo canvas e a colisão real de fingerprint. Remover
a igualdade integral faz reprovar tanto a prova do cache quanto a de pressão;
o script restaura e confere os bytes originais antes das verificações normais.

## Evidências

- Suíte completa: 2.582 aprovados, três controles nativos omitidos pela configuração
  comum, zero falhas e 29.736 asserções em 227 arquivos. Os controles Pygame não
  foram repetidos neste lote do renderer.
- 93 testes focados de render/cache, zero falhas e 511 asserções. A reprodução
  anterior tem três falhas esperadas e um controle positivo de excesso de orçamento.
- Três perfis Chromium preservam as imagens: 32 casos densos, 48 regionais,
  120 bordas e quatro quadros completos por perfil, com e sem repetições.
  São 612 comparações RGBA. No periódico, o desenho passa a 128 blits no canvas
  principal; no controle único, o caminho anterior e sua quantidade são mantidos.
- Seis percursos da oficina pública verificam pixels reais, teclado, cancelamento,
  seleção, rolagem, desfazer e reabertura. Total: nove ensaios, sem retries.
- Tipos completos do Pinta e arquivos de QA conferidos. O índice reúne fontes,
  hashes, diagnósticos, provas no editor e medições separadas dos testes.

As contagens de blits são feitas numa passada não cronometrada, delegando ao
método nativo e restaurando-o em `finally`. Emulação de toque e CPU usa a mesma
máquina; não representa crianças ou outro aparelho físico. Este lote não homologa
abertura, salvamento, motores externos, implantação ou latência global da oficina.
As etapas macro continuam abertas até seus consumidores, IO e ciclo completo.

## Medição do renderer

ABBA, com três aquecimentos e 15 quadros por bloco, aguardando rAF antes de pintar:
30 amostras por versão/caso. Preparação, IO, leitura RGBA, contadores, GC solicitado
entre blocos e perfis de CPU ficam fora do tempo medido. Não houve outros jobs
de QA desta sessão durante a medição. Os perfis são registrados separadamente.

| Caso | p50 anterior → atual | p95 anterior → atual |
|---|---:|---:|
| Esparso, CPU normal | 0,3 → 0,3 ms | 0,6 → 0,5 ms |
| Denso periódico, CPU normal | 170,2 → 9,2 ms | 235,9 → 11,5 ms |
| Denso sem repetições, CPU normal | 357,5 → 341,9 ms | 514,5 → 470,6 ms |
| Esparso, CPU 4× | 0,7 → 0,7 ms | 1,0 → 1,0 ms |
| Denso periódico, CPU 4× | 727,3 → 45,1 ms | 820,3 → 51,8 ms |

No periódico, a estimativa passa de 128 para 4 MiB; o cache retém quatro canvases
em 4 MiB, dentro dos 32 MiB. São **49.216 → 128 blits** no canvas principal.
O hash RGBA permanece igual, incluindo as camadas com transparência. O controle
sem repetições mantém 49.216 blits, reconstrução e estimativa anteriores.

O p95 do renderer periódico desta amostra em CPU normal fica abaixo de 33,3 ms.
Isso não qualifica a oficina completa, gestos, abertura fria ou salvamento. CPU
4× e conteúdo único continuam acima desse tempo; não há promessa de fluidez para
toda composição admitida. Tempos de rodadas/protocolos distintos não devem ser
tratados como a mesma medição. O plano segue com IO, consumidores e homologação.
