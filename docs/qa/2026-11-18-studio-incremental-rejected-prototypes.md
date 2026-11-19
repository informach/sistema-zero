# Carga incremental: protótipos ainda sem aceite

Nenhuma destas mudanças foi integrada à PR como recurso concluído. O carregador
experimental está preservado em `582aa52b0`, branch `estudio-incremental-lab-20261118`,
separada da PR. Os resultados abaixo justificam manter
R2 aberto e não substituir a carga atual por esta implementação.

## Método e resultados exploratórios

Dois builds locais, mesma máquina Windows de 32 GB, Chromium completo
148.0.7778.96, viewport 1440×900 e fixture Farol pelo harness real `/aula?escala=N`.
Baseline: worktree separado em `ae6e348a6`, porta 5302. Protótipos: árvore de trabalho
da missão, porta 5301. Contexto novo por amostra. Sem profiler de jogo.
São amostras únicas por configuração, sem controle de outras aplicações da máquina;
não são p95 entre sessões nem homologação de aparelho de entrada.

| Configuração | 5 mil: editor editável | Maior tarefa longa |
|---|---:|---:|
| Baseline da primeira comparação | 15,46 s | 7,50 s |
| Primeiro protótipo incremental | 36,90 s | 4,11 s |
| Baseline da comparação seguinte | 12,82 s | 6,12 s |
| Visita aos corpos antes de `next` | 77,13 s | 4,40 s |
| Baseline da última comparação | 15,48 s | 6,92 s |
| Visita aos corpos + render dentro do cache | 92,12 s | 6,24 s |

Os JSONs vizinhos `incremental-first-prototype`, `incremental-partition-regression`
e `incremental-cached-regression` conservam ambiente, amostras, intervalos dos timers
e tarefas longas. Intervalos de timers NÃO são latência de digitação nem FPS.
O script `packages/studio/scripts/measure-classic-opening.mjs` permite repetir as
medições em servidores locais. CPU profiling é opcional e deve ser medido em rodada
separada: `SZ_CLASSIC_OPEN_CPU_PROFILE=1`.

Uma rodada de CPU com o segundo protótipo levou 77,65 s, com cerca de 20 s em
`getTextWidth`/estilos computados e 13,7 s em `appendChild`. Isso não prova que o cache
é a única causa: a tentativa seguinte piorou o total. A ordem antiga e a ausência
desse render adicional foram restauradas no fonte experimental. O bundle local
precisa ser reconstruído antes de novo ensaio.

## Integridade observada e falhas preservadas

- 150 exemplos oficiais, sete projetos dos cursos e 10 mil blocos headless
  conservaram identificadores, campos, sombras e conexões nas comparações com o
  carregador nativo. Isso não comprova desempenho de SVG.
- O navegador passou o fluxo completo com 2 mil e 5 mil: salvar durante carga,
  recarregar, editar, desfazer/refazer, reabrir, executar e parar.
- Um fluxo de 10 mil passou em 3,3 minutos com pilhas separadas. Na rodada final,
  2 mil, 5 mil e os dois casos offscreen passaram; 10 mil não ficou editável no
  deadline de 120 s. Não ampliar esse deadline para transformar a regressão em verde.
- Uma cadeia profunda de 10 mil falhou antes, no structured clone nativo de
  `IDBObjectStore.put`. A fixture foi conservada em
  `.cache/mission/incremental/long-chain-10000.json`; a falha não está corrigida.
- Contêineres de ciclo de vida duplicados não são uma fixture canônica: o guard
  existente os consolida, conservando seus corpos como rascunhos. A fixture de
  pilhas separadas mantém só os contêineres canônicos; não representa 10 mil blocos
  todos ativos nem benchmark de jogo grande.
- A regressão de fragmentação dos corpos permanece vermelha na ordem restaurada:
  391 eventos de criação/append para uma árvore headless de 1.200 blocos; a ordem alternativa
  produz 57, mas piora o navegador. Não aceitar a otimização só pelo contador.

## Próximos critérios

Investigar custos de montagem, conexão, layout e render separadamente. O desenho
final precisa montar somente partes necessárias, manter o modelo inteiro editável,
preservar a ligação com o código e o histórico, e superar estes controles no
navegador. O protótipo atual ainda cria todos os SVGs e não atende esse contrato.
Manter as proteções de cancelamento, projeto original autoritativo, proibição de
salvar workspace parcial e erro explícito; não trocar integridade por velocidade.
