# Lacunas para concluir o Estúdio JavaScript/Python — 21/10/2026

Análise do plano original ([proposta](../../plans/2026-10-16-estudio-javascript-python-turtle-proposta.md), [matriz R01–R22](../../plans/2026-10-16-estudio-python-validacao-entregas.md), [desempenho F0–F10](../../plans/2026-10-16-estudio-python-desempenho.md), [Pac-Man P01–P16](../../plans/2026-10-16-pacman-aceite.md) e [Space Arena S01–S10](../../plans/2026-10-16-space-arena-aceite.md)) contra o que já foi feito, e do que falta. Estado de execução em [retomada](2026-10-21-retomada-maquina-nova.md).

## Estado conferido em 22/10/2026

Este quadro prevalece sobre as anotações históricas de 21/10 abaixo. A
[revisão da continuação](2026-10-22-review-continuacao-python.md) fixa o corte
`c4222471a` e distingue os relatos da outra máquina das provas reexecutadas aqui.

| Frente | Estado atual e fronteira restante |
| --- | --- |
| Integração | A continuação já chegou ao staging remoto em `c4222471a`. Não falta autorização de push daquele lote. Os 16 testes antigos foram corrigidos; os nove jobs de validação do CI 39704535639 passaram. O deploy falhou antes de qualquer apply, na prova SSH readonly; não há aceite de implantação nesse resultado. |
| JS e Kids Pro | O reparo do contexto sem corpo e o acesso Pro da equipe Kids estão integrados. Há relatos de navegador locais e testes focados reexecutados verdes. Ainda falta qualificar os percursos hospedados de aula gravada Pro, publicação Pro e preparação de projeto antigo com o compilador. |
| Aulas/salas | `python-live` é integração com repositórios em memória, atores sintéticos e sem mídia. Não comprova autenticação/device/perfil real, persistência no banco, vídeo, gravação/pausa nem Admin→aula gravada→aluno; esses percursos permanecem abertos. |
| F1 | Os números históricos abaixo são relatos de coleta diagnóstica; status verde daquele spec não aplicava um gate estatístico. O reporter corrigido exige pelo menos 30 amostras homogêneas por fase e p95 contratado; seus testes passaram, mas a série gráfica completa ainda precisa ser executada. Na máquina do Julio, em 22/10, a série com 30 amostras por fase passou no relator para Chrome e Edge, Clássico e Pro, depois de uma primeira série Chrome Pro reprovada por duas amostras lentas sem causa identificada ([recibo](../../continuity/2026-10-22-python-acceptance-julio.md)). |
| F3 e Space | O oráculo antigo media segundo repaint, sem provar efeito causal da entrada. O instrumento causal corrigido passou em diagnósticos dos dois jogos e em F3 de 600.015,9 ms no Chrome local: resposta p95 62,4 ms, 30/30 efeitos. [Recibos e anexos](../../continuity/2026-10-22-python-witness-smoke.md). Space de dez minutos, Edge e demais composições permanecem abertos. Na máquina do Julio, em 22/10: Space Arena de 10 min passou no Chrome e no Edge, com 30 reinícios; F3 de 10 min passou no Chrome e, na segunda execução, no Edge, mantendo registrada a primeira reprovação ([recibo](../../continuity/2026-10-22-python-acceptance-julio.md)). |
| Artefatos | A candidata atual é `e3188c84…`, release `2026-10-22-visual-games-2`, reproduzida três vezes com os mesmos 41 arquivos. [Plano atual, comandos e limites](2026-10-22-python-current-candidate/README.md). `65c9bffd…` e `audio-2` são registros históricos; seus resultados não homologam a candidata nova. Promoção e ativação remotas continuam etapas separadas. |
| Jogos visuais | Pac-Man e Space Arena têm fontes e assets compartilhados entre Blocos/Ponte e Código. Qualificação R4 prova roundtrip e edições sem blocos opacos; os quatro percursos gráficos locais passaram em `ui-r12`. [Recibos](../../continuity/2026-10-22-python-reference-games-visual-evidence/). A atualização de permissões tem regressões próprias e uma nova rodada gráfica; resultados de desempenho da candidata anterior não são transferidos. |
| Infraestrutura | A sessão de chaves Railway é responsável por essa frente. Estados de pane, tokens e deploy descritos abaixo são históricos; não reaplicar plano de promoção baseado na ausência antiga dos objetos. |
| Aceite final | REF ao final; execução física móvel adiada pelo usuário. F4/F7/F8/F9, memória incremental, pico do isolate, jogos completos e áudio ouvido por pessoa continuam conforme a matriz, sem aprovação por inferência. |

## Registro histórico de 21/10/2026

Bloqueios:
- **L**: fecha nesta máquina.
- **CF**: Cloudflare, acessível.
- **RW**: Railway, em pane, com builds pausados.
- **DK**: Docker (contêineres do compilador Pro, da inspeção Python e do Pyright); não instalado.
- **REF**: computador de referência de 8 GB.
- **MOB**: celular físico.

A validação no REF e no MOB fica para o final, por decisão de 16/10.

Todas as provas são locais nesta máquina. A pilha local (`scripts/local-studio-stack`) roda Auth, Members, Gateway, Catalog, Hub, Admin, Adulto, Kids e o runtime em Wrangler local, com contas QA, cursos e jornada criados pelas rotas canônicas.

## Decisões adotadas

1. A publicação Python exige `publish`, e o Zappy Python exige `assist`. A release nova `python-browser/2026-10-21-audio-2` concede as duas. Está preparada, mas não ativada.
2. Perfis Kids de contas admin/superadmin continuam vendo a oferta Python.
3. O selo de perfil publicado aparece só no Python; a página de jogar JS não muda.
4. O Pro completo hospedado usa um perfil funcional próprio de memória. A pilha base usa cerca de 2,4 GiB nesta máquina.

## JavaScript

| Item | Situação | Falta | Bloqueio |
| --- | --- | --- | --- |
| JS padrão e preservado | CI com 8 jobs verdes; Pro completo local 4/4; Adulto e Kids de ponta a ponta na pilha local (criar, editar, executar, guardar na conta, reabrir, publicar e jogar `/jogar` anônimo) | F0 medido: 0 bytes de Python no JS Clássico e no Pro (`656124503`) | — |
| Aula com bloco Estúdio | **Bug corrigido** (`54310a834`): desde `aff20c1f9` (18/10), o BFF lia o POST sem corpo como JSON inválido, e toda aula com Estúdio mostrava "Contexto inválido." | Levar ao staging e conferir nas aulas gravadas | RW |
| Seletor Python | Galeria corrigida (`12fb2f5ee`); a pilha local confirma a regra por papel no Adulto e no Kids | — | — |
| Pro no Kids para a equipe | Corrigido (`896ef216c`): a prévia da equipe abre o Pro no perfil da própria conta, com papel de equipe. Conferido no navegador: staff JS Pro, admin JS Pro e Python Pro, criança sem Pro | — | — |
| Pro completo | Preview, edição sem reiniciar, terminal, reabrir | Reparo do documento antigo (Vite 8.0.16) e publicação do Pro, que dependem do compilador em contêiner | DK ou RW |
| Aula gravada Pro (Admin → aula → aluno) | Producer preparado (`d4afe4352`) | Compilador remoto | DK ou RW |

## Python

| R | Situação | Falta | Bloqueio |
| --- | --- | --- | --- |
| R03/R04/R19/R20 | `python-bridge` 86/86; Python Clássico e Pro executam na pilha local do Adulto e do Kids | Análise Python (Pyright) | DK ou RW |
| R05/R06/R07/R10 | `python-live` 10/10 na integração de serviços/editor, com repositórios em memória e atores sintéticos; passagem de autoridade e revogação exercitadas; bloco Estúdio de aula corrigido | Auth/device/perfis reais, banco persistente, mídia, gravação/pausa, Admin→aula gravada→aluno e prova hospedada | L + RW |
| R09 Mural/`/jogar` | 4 combinações locais; sem cliente de análise na página (`facde61ca`); selo Python; payload sem editores; 20 cards sem runtime; publicar → `/jogar` anônimo na pilha local | Prova hospedada | RW |
| R11 Turtle × CPython/Tk | Motor 10/10, linguagem 12/12, limites de fila e blocos conferidos contra CPython 3.14.2/Tk 8.6.15 | — | — |
| R12 ZIP no computador | Clássico e Pro descompactados, executados, alterados e reexecutados no CPython nativo | — | — |
| R13 publicação | Receita v2, v1 legível, GC preserva runtimes referenciados | Deploy atômico, sem rollback anterior ao merge | CF/RW |
| R14 Zappy | `assist` exigido e resolvido pelo Members | Chave do provedor de IA e prova hospedada | RW |
| Ativação no staging | `audio-2` preparada offline | Promover no R2, Worker, variáveis do Members | CF + RW |
| R17 Pinta | Cancelamento por revisão, PNG no limite com mensagem, Tk 8.6 no LEIA-ME | — | — |
| R18 Pensa JS | Verificado | — | — |

## Jogos de referência

| Critério | Situação | Falta |
| --- | --- | --- |
| Pac-Man P01–P14 | 8 cenários instrumentados (bolinha, especial, morte, vitória, derrota, geometria, IA, observação) e raster largo/estreito: 22/22 no Chrome e no Edge, com a distribuição promovida | Áudio ouvido por pessoa (P13) |
| Pac-Man P15/P16 | — | Pro/Mural/exportação hospedados; partida de 10 min e 30 reinícios |
| Space S01–S07 | Q02–Q07 instrumentados e teclado real com pausa, Stop e reinício: 16/16 nos dois navegadores; Q02–Q07 nativos | Áudio ouvido por pessoa |
| Space S08 | Q08-pause e Q08-bgm nativos nesta máquina | — |
| Space S10 | 10 min com 30 entradas reais: frame p95 de 2 frames, 0,86% acima, entrada p95 de 80 ms, nenhuma tarefa longa. 5 min de diagnóstico sem acúmulo (tick, cena e objetos estáveis). 30 reinícios: infraestrutura p95 de 76 ms | — |

## Desempenho

| Meta | Resultado nesta máquina |
| --- | --- |
| F1 frio / cache / após edição | Distribuição `65c9bffd…`, 30 amostras por caso, 120/120 dentro das metas. Clássico: p95 0,55 s / 0,48 s / 0,50 s. Pro: p95 0,86 s / 0,58 s / 0,61 s (pior entre Chrome e Edge). Metas: 12 s / 3 s / 1,5 s |
| Frio com rede de referência (20 Mbps / 80 ms) | p95 7,8 s, contra 12 s (60/60) |
| Parar ≤ 250 ms; liberação ≤ 3 s; 30 ciclos | Conferido nas suítes que passaram |
| F3 entrada ≤ 100 ms; pintura ≤ 8 ms; sem tarefa > 50 ms | p95 de 49 ms; 0,1 ms; nenhuma tarefa longa |
| F3 intervalo de frame p95 ≤ 33 ms | Lido como no máximo dois quadros da tela (≥ 30 FPS), por decisão do usuário em 21/10: os quadros apresentados seguem o vsync, e um vsync perdido mede 33,3 ms a 60 Hz. Na `65c9bffd…`: p95 de 33,4 ms (Chrome) e 33,3 ms (Edge); acima de dois quadros, 2 e 0 de ~3.240 intervalos (limite: 1%). Passa nos dois. Space Arena: 52–53 FPS (nativo: 33–36) |
| Pro completo (memória) | ~2,4 GiB da pilha WebContainer/Vite; não depende do Python |
| F10 | Python sem Turtle não baixa renderer nem módulos gráficos (`python-bootstrap`) |
| F2 arte com 10.000 segmentos, 8 cores, animação a cada 100 segmentos | Com a camada retida (`e1c5fb092`), pintura p95 de 0,4 ms (Chrome) e 0,3 ms (Edge), máximo de 0,5 ms; antes eram 3,6 ms e 5,4 ms. Nenhuma tarefa acima de 50 ms; todos os segmentos mantidos. O desenho passo a passo termina com os mesmos pixels de uma pintura completa (`python-turtle-retained-layer`) |
| F4 (diagnóstico/completion), F7, F8 completo, F9 ciclos, 128 MiB do isolate, memória incremental | A medir. F4 precisa do Pyright (DK/RW); F7 precisa do RW; 128 MiB precisa do CF |

## Releases

As mudanças do renderer e do adaptador Turtle (`f81fd9ae2`, `e1c5fb092`) geram uma distribuição nova. A candidata `audio-2` foi regenerada com a distribuição atual `65c9bffd…` (manifesto `1c9112c4…`, plano `019dfa8e…`), ainda sem promoção nem ativação.

## O que fazer a seguir

Feito nesta máquina:
- Pro da equipe no Kids e mensagem amigável de publicação;
- distribuição `65c9bffd…` com a camada retida, e a candidata `audio-2` regenerada a partir dela;
- jogos repetidos contra ela, cada spec isolada: Pac-Man 9/9 e Space Arena 9/9 em cada navegador;
- F0, F2, F10, a partida de 10 min e os 30 reinícios;
- `origin/staging` (`84a0c83a7`) integrado;
- typecheck de 8 pacotes;
- pilha local refeita com a `65c9bffd…`: verificação HTTP de todas as contas e matriz no navegador, de JS e Python, Clássico e Pro, no Kids e no Adulto, com curso Kids de uma criança nova (`--new-child`).

Falhas herdadas do staging: 16 testes unitários falham também no `origin/staging`, sem relação com este branch. Estão em core 1, member-shell 3, molda 1, admin 6 e members 5, e a maior parte espera o vocabulário anterior ("seção", "fase"). Correção aprovada pelo usuário em 21/10, em branch separado a partir do `origin/staging`.

Pendente:
1. Decisões do usuário:
   - instalar o Docker, que libera o compilador Pro, a inspeção Python e o Pyright localmente;
   - fazer o push para o staging.
2. Quando o Railway voltar:
   - deploy no staging, ativação do Python, aulas gravadas, Mural e Zappy hospedados;
   - F7 (carga de 30 alunos).
3. Ao final: REF e MOB.
