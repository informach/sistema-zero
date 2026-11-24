# Reutilização de composições do cache — 21/11/2026

Base `47e21b13a0fb94995d24bf4d0fc041af2d0de952`. Continuação do perfil de mapas
densos; formato 8 e IO 3 continuam internos, sem implantação ou merge em staging.

## Decisão e revisão

O perfil anterior concentrou mais de 95% das amostras densas nas chamadas de
desenho. Blocos com as mesmas células e o mesmo atlas eram reconstruídos em cada
posição/camada. Matriz: impacto 4 × confiança 4 ÷ esforço 2 = **8**. A alavanca
deste lote é compartilhar uma composição canônica dentro do LRU existente.

Um fingerprint de 32 bits busca candidatos; não decide identidade. Reutilizar
exige o mesmo canvas de atlas, tamanho, contagem de peças, fase das animações e
igualdade de todas as células, incluindo flags e vazios. Há uma colisão real do
fingerprint nos testes; retirar a comparação integral faz esse teste reprovar.
O programa de mutação restaura os bytes originais em `finally` e confere a restauração.

Cada composição retida tem um único dono no LRU. Outras posições tomam o canvas
emprestado até a próxima consulta, sem criar aliases por posição. Expulsão e
limpeza retiram também o índice de fingerprints. Os bytes RGBA e o scratch seguem
o orçamento anterior; as entradas do índice são limitadas pelas entradas retidas.
Nenhum canvas é colocado no documento ou no histórico autoral.

A revisão reproduziu um defeito adicional do próprio contrato do hit: um atlas
compartilhado com uma contagem menor podia reapresentar a imagem de uma peça que
deveria ser omitida. A contagem agora faz parte da identidade, tanto no hit por
posição quanto no compartilhamento. Isso corrige a imagem em cache, sem mudar o
mapa. O teste guarda uma peça válida junto da removida, evitando um falso positivo
em que o bloco inteiro já seria tratado como vazio.

As duas fixtures antigas de expulsão repetiam o mesmo conteúdo em todas as
posições. Passaram a usar conteúdos distintos para continuar exercitando o LRU
e a reciclagem, mantendo verificações de pixels e orçamento. Duplicatas têm sua
prova própria de reutilização. Não foram removidas as verificações de expulsão.

## Isomorfismo e alcance

A ordem de desenho, desempate, coordenadas flutuantes, semente, flags, clipping e
composição de alpha não mudam. Só se reutilizam canvases produzidos pela mesma
receita completa. O atlas continua imutável por identidade, como já exigia o cache.
O teste de origem negativa e opacidade parcial conserva o caminho canônico.

Este lote não muda a estimativa de pressão nem a guarda que seleciona desenho
direto. O controle usa tanto um mapa periódico quanto uma distribuição sem
repetições, para medir o custo quando não há compartilhamento possível. A fluidez
global de mapas densos continua sujeita aos próximos lotes e à medição final.

## Verificação registrada

- Suíte completa: 2.576 aprovados, três controles nativos omitidos pela configuração
  comum, zero falhas e 29.704 asserções. Os controles Pygame não foram repetidos.
- 87 testes do renderer/cache aprovados, zero falhas e 483 asserções. Os cinco
  testes novos foram repetidos após as correções de tipagem das fixtures: 92
  asserções, zero falhas. Cobrem colisão, troca de atlas, contagem, fase, edição do
  dono, limpeza, reutilização e orçamento.
- A reprodução anterior tem duas falhas esperadas e um controle positivo. O
  mutante sem igualdade integral falha no teste da colisão, como necessário.
- Tipos completos do Pinta e arquivos de QA conferidos, sem casts para esconder
  camadas ou cores indefinidas. Os diagnósticos intermediários foram preservados.
- Nove ensaios Chromium sem retries: três comparações do renderer anterior e seis
  percursos da oficina pública com pintura, desfazer, seleção, rolagem e reabertura.
  São 612 comparações RGBA exatas nos três perfis: 32 casos densos, 48 regionais,
  120 bordas e quatro quadros densos (periódicos/sem repetições) por perfil.

## Medição desta alavanca

Controle ABBA com três aquecimentos e 15 quadros por bloco, aguardando rAF antes
de pintar; 30 amostras por versão/caso. Preparação, IO, leitura RGBA, GC solicitado
entre blocos e captura dos perfis ficam fora do tempo da submissão do renderer.
Não houve outro job de QA desta sessão durante a medição. Os módulos antigo e
atual foram compilados das fontes reais; ambos usam o mesmo produtor de fixtures.
Os números não são latência ponta a ponta nem qualificação de composição GPU.

| Caso | p50 anterior → atual | p95 anterior → atual |
|---|---:|---:|
| Esparso, CPU normal | 0,2 → 0,2 ms | 0,3 → 0,3 ms |
| Denso periódico, CPU normal | 291,8 → 133,4 ms | 416,9 → 176,8 ms |
| Denso sem repetições, CPU normal | 283,7 → 279,4 ms | 336,2 → 372,9 ms |
| Esparso, CPU 4× | 0,7 → 0,7 ms | 1,0 → 1,0 ms |
| Denso periódico, CPU 4× | 1.873,4 → 833,5 ms | 2.519,5 → 893,2 ms |

No periódico, a retenção passa de 32 para dois canvases, de 32 para 2 MiB.
Depois do primeiro desenho, não houve reconstrução adicional nas amostras; o
controle sem repetições mantém a reconstrução anterior e o teto de 32 MiB.
Sua mediana ficou próxima, mas a cauda aumentou nesta amostra: não há afirmação
de aceleração ou ausência de regressão de latência para composições únicas.
As leituras em CPU 4× e os desvios dos blocos ficam nos dados brutos; emulação
não substitui medição em outro aparelho. Não comparar diretamente protocolos
diferentes com os tempos históricos da missão.

Os perfis atuais ainda concentram mais de 93% das amostras de CPU normal nas
chamadas de desenho. A estimativa de pressão continua nominal, em 128 MiB nesse
caso, embora só dois canvases sejam retidos. O próximo lote precisa avaliar a
pressão pelas composições distintas e medir novamente, mantendo os mesmos
guardas de pixels, colisões de fingerprint e orçamento. Os alvos de 33,3/100 ms,
o ciclo de abertura/salvamento e a homologação global continuam abertos.

Os relatórios de navegador, fontes, hashes, perfis e medições acompanham o índice.
Não houve novo teste com motores externos, crianças ou outros aparelhos físicos.
Emulação de toque/CPU nesta máquina não é homologação em outro dispositivo. A
entrega não promove contratos, não encerra etapas macro e não qualifica abertura,
salvamento, heap ou latência ponta a ponta do editor.
