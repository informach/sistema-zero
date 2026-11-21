# Pro em escala: evidência da etapa 3 (20/11/2026)

A régua é a linha "3. Pro em escala" da tabela de critérios do
[`plano-execucao.md`](plano-execucao.md). Cada critério com a prova versionada e o que ainda falta.

## Projeto modular de 60 arquivos

`e2e/fixtures/pro-workspace/modularProject.ts` (`?modular` no fixture do Pro): 60 arquivos
TypeScript que se importam em cinco camadas (10 do núcleo, a classe base e 20 entidades, 15
sistemas, 9 cenas, 4 de interface e o `main.ts`). O laboratório antigo tinha 78 arquivos soltos,
sem nenhuma importação entre eles. A análise passa pelos 60 e não acha problema.

`e2e/pro-workspace-performance.spec.ts`, caso "modular 60-file project", mede DENTRO da página
(do clique ou do evento de entrada até o quadro seguinte ao alvo aparecer), no Monaco e no worker
de linguagem de verdade:

| Medida (p95) | Critério | Linux, homologação | Windows, homologação | Windows local |
| --- | --- | --- | --- | --- |
| Digitar: tecla até o segundo quadro | < 50 ms | 32,9 ms | 33,9 ms | 33 ms |
| Abrir painel do trilho (Procurar ⇄ Arquivos) | < 150 ms | 28,9 ms | 30,4 ms | 26 ms |
| Abrir a gaveta (Problemas) | < 150 ms | 24,5 ms | 32,3 ms | 28 ms |
| Primeira resposta da busca no projeto | < 200 ms | 18,4 ms | 12,4 ms | 10 ms |
| Problemas dos arquivos fechados depois de quebrar a base (registro) | | 432 ms | 452 ms | 389 ms |
| Problemas somem depois de consertar (registro) | | 443 ms | 514 ms | 384 ms |

Homologação 44854588851 em `a674e4c16`, Chrome 156.0.8078.4 dos runners do GitHub (Ubuntu 24.04
e Windows Server 2025, sem placa de vídeo), 21/11/2026 02:21 e 02:24 UTC. Os relatórios inteiros,
com as amostras, estão em [`evidencias/pro-modular-2026-11-20/`](evidencias/pro-modular-2026-11-20/).

O teste reprova acima dos critérios. O relatório de cada rodada (com SHA, data, navegador e as
amostras) vai para `pro-modular-current.json` ao lado da medição antiga; no `studio-mission.yml`,
em `.cache/mission/` do artefato da rodada, no Linux e no Windows.

## Nenhum resultado de análise de versão antiga

O mesmo caso troca o tipo de um método da classe base (`points(): number` para `string`): a gaveta
acusa as entidades e os sistemas FECHADOS que dependem dela (0,4 s depois da última tecla) e, ao
voltar o tipo, os problemas somem (0,4 s). Por trás, dois cortes: o laço da análise abandona a
rodada quando a geração muda ou quando o modelo mudou de versão no meio
(`monaco/pro/session.ts`, `diagnose`), e a gaveta só mostra o diagnóstico cujo hash de origem é o
do texto de agora (`modes/pro/workspace/diagnostics.ts`, `currentProDiagnostics`).

## Fila de arquivos

Já coberta antes desta etapa, conferida aqui:
- `src/modes/pro/proFsSync.test.ts`: ordem entre terminal e editor nas duas direções,
  editores concorrentes, escrita tardia do terminal detectada antes de sobrescrever, escrita
  parcial repetida sem duplicar recuperação, troca de projeto cancelando o que estava pendente,
  arquivo que o terminal criou e o Estúdio não suporta;
- `src/modes/pro/useWebContainerSync.test.tsx`: posse do filesystem no StrictMode, montagem em voo
  da instância desmontada e troca de projeto esperando a montagem antiga.

## Escolha da execução

Documentada em [`pro-execucao.md`](pro-execucao.md): leve (no navegador, quando o projeto cabe),
hospedada (o Vite no servidor) e completa (WebContainer, quando o host não entrega o compilador).

## Mapa de símbolos: o índice inteiro, decidido com medida

O plano de 20/11 previa mandar o mapa em partes. Medido no pior caso possível, um arquivo no teto
de 256 mil caracteres só de declarações (TypeScript 5.9.3, Windows local, sete rodadas):

| Parte | Tempo |
| --- | --- |
| Árvore de navegação do TypeScript | 9 a 23 ms (180 ms na primeira, fria) |
| Achatar o índice | 1 a 5 ms |
| Copiar os 9.527 símbolos (642 KB) entre worker e página | 5 a 7 ms |

Mandar em partes economizaria só a cópia, uns 6 ms no pior caso. A árvore do TypeScript é
montada inteira de qualquer jeito, e a tela já monta 100 itens por vez (com a busca sobre o índice
inteiro, `docs/qa/2026-11-19-studio-pro-file-map.md`). Fica o índice inteiro.

## Limites

As cotas do compilador (`STUDIO_PRO_BUILD_LIMITS`: 80 arquivos, 256 mil caracteres por arquivo,
1,5 milhão no total) são as mesmas no editor (quando o host as declara), no BFF, no Worker e
agora na execução leve. As do artefato (`STUDIO_PRO_ARTIFACT_LIMITS`: 338 arquivos, 2,5 MB)
somam aos 80 fontes os materiais e o manifesto. Nenhuma foi aumentada.

## Ensaio com tudo ligado ao mesmo tempo (21/11/2026)

Pedido dos relatórios de 20 e 21/11. Teste `tudo ligado ao mesmo tempo` em
`e2e/pro-workspace-performance.spec.ts`, com o harness em `?ensaio`.

- **O projeto:** os 60 arquivos do projeto modular com um `index.html` e um laço de jogo de
  verdade em canvas (`src/jogo.ts` chama o `frame()` do `main.ts` a cada quadro e troca de cena a
  cada 2 s).
- **A execução:** leve, montada no navegador. O teste confere que o compilador do servidor não foi
  chamado.
- **O que roda junto:**
  - a análise dos 61 arquivos;
  - o jogo;
  - uma pergunta ao Zappy em voo (o adaptador responde depois de 1,5 s, de uma vez, como o produto
    hoje);
  - painéis e busca;
  - um arquivo criado e renomeado pela interface com o jogo rodando;
  - dez ciclos de Parar e Rodar.

**Números locais (Windows; Chromium 156 do Playwright e Chromium 159 completo, o da homologação):**

| Medida (p95) | Chromium 156 | Chromium 159 completo | Critério |
|---|---|---|---|
| Digitar com a pergunta do Zappy em voo | 32,8 ms | 32,9 ms | < 50 |
| Digitar com o jogo rodando à vista | 32,0 ms | 31,7 ms | < 50 |
| Abrir painel com o jogo rodando | 27,4 ms | 26,5 ms | < 150 |
| Primeira resposta da busca com o jogo rodando | 22,3 ms | 20,1 ms | < 200 |
| Intervalo entre quadros do jogo enquanto se digita | 16,8 ms | 16,8 ms | < 34 (no máximo um quadro perdido) |
| Memória do editor depois de 10 Parar e Rodar | +1,6% | +2,0% | < 20% |

**Na homologação de `1dd1f51c6`** (Chromium 159 completo, CPU sem desaceleração), os relatórios
brutos estão em [`evidencias/pro-ensaio-2026-11-21/`](evidencias/pro-ensaio-2026-11-21/):

| Medida (p95) | Linux | Windows |
|---|---|---|
| Digitar com a pergunta do Zappy em voo | 32,0 ms | 31,2 ms |
| Digitar com o jogo rodando à vista | 31,6 ms | 31,3 ms |
| Abrir painel com o jogo rodando | 24,0 ms | 21,1 ms |
| Primeira resposta da busca com o jogo rodando | 21,0 ms | 17,1 ms |
| Intervalo entre quadros do jogo enquanto se digita | 16,7 ms | 16,8 ms |
| Memória do editor depois de 10 Parar e Rodar | +1,5% | +1,5% |

O critério dos quadros do jogo só existia neste documento até a revisão do lote 1 (21/11): o
teste conferia que o jogo desenhava, sem limite. Agora ele exige o p95 abaixo de 34 ms.

**O que o ensaio mostrou:** na largura do computador, o painel do Zappy ocupa o lugar do palco.
Enquanto ele está aberto, o jogo fica atrás dele, e o navegador pausa os quadros de um quadro que
não está à vista. Não é travamento: ao fechar o Zappy, o jogo volta a desenhar. Por isso os
quadros do jogo são medidos com o Zappy fechado.

**Limites:**
- só a execução leve: o build hospedado com dependências e o WebContainer não entram;
- apagar arquivo não é exercitado;
- a memória é a da página do editor (o jogo roda em outro processo).

## O que falta

- O build hospedado com dependências reais e o WebContainer no mesmo ensaio. O WebContainer
  precisa de rede para fora.
