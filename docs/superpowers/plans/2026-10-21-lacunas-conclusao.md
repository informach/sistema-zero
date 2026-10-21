# Lacunas para concluir o Estúdio JavaScript/Python — 21/10/2026

Análise do plano original ([proposta](../../plans/2026-10-16-estudio-javascript-python-turtle-proposta.md), [matriz R01–R22](../../plans/2026-10-16-estudio-python-validacao-entregas.md), [desempenho F0–F10](../../plans/2026-10-16-estudio-python-desempenho.md), [Pac-Man P01–P16](../../plans/2026-10-16-pacman-aceite.md) e [Space Arena S01–S10](../../plans/2026-10-16-space-arena-aceite.md)) contra o que já foi feito, e do que falta. Estado de execução em [retomada](2026-10-21-retomada-maquina-nova.md).

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
| R05/R06/R07/R10 | `python-live` 10/10, com passagem aluno → professor e revogação real; bloco Estúdio de aula corrigido | Contas hospedadas | RW |
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
| F1 frio / cache / após edição | p95 0,95 s / 0,71 s / 0,81 s, contra 12 s / 3 s / 1,5 s (30 amostras por caso) |
| Frio com rede de referência (20 Mbps / 80 ms) | p95 7,8 s, contra 12 s (60/60) |
| Parar ≤ 250 ms; liberação ≤ 3 s; 30 ciclos | Conferido nas suítes que passaram |
| F3 entrada ≤ 100 ms; pintura ≤ 8 ms; sem tarefa > 50 ms | p95 de 49 ms; 0,1 ms; nenhuma tarefa longa |
| **F3 intervalo de frame p95 ≤ 33 ms** | **33,4 ms, em aberto.** Loops de 60 Hz pedem 17 ms por tick (`ceil`) e o despertar no navegador soma ~1,8 ms. Melhorias já feitas: pintura imediata, encoder único e uma ida e volta a menos. Space Arena subiu de 46 para 52 FPS (nativo: 33–36) |
| Pro completo (memória) | ~2,4 GiB da pilha WebContainer/Vite; não depende do Python |
| F10 | Python sem Turtle não baixa renderer nem módulos gráficos (`python-bootstrap`) |
| F2, F4 (diagnóstico/completion), F7, F8 completo, F9 ciclos, 128 MiB do isolate, memória incremental | A medir. F4 precisa do Pyright (DK/RW); F7 precisa do RW; 128 MiB precisa do CF |

## Releases

As mudanças do renderer e do adaptador Turtle (`f81fd9ae2`) geram uma distribuição nova. A candidata `audio-2` foi regenerada com a distribuição atual `542cc502…` (manifesto `8f876d00…`, plano `deb6a002…`), ainda sem promoção nem ativação.

## O que fazer a seguir

1. Integrar a correção do Pro da equipe no Kids e a mensagem amigável de publicação; conferir na pilha local.
2. Gerar a distribuição atual e a release candidata nova; repetir jogos e F1 contra ela.
3. Medir F0, F10, a partida de 10 min e os 30 reinícios, e o despertar de timer mais preciso (F3).
4. Decisões do usuário:
   - instalar o Docker, que libera o compilador Pro, a inspeção Python e o Pyright localmente;
   - fazer o push para o staging.
5. Quando o Railway voltar:
   - deploy no staging, ativação do Python, aulas gravadas, Mural e Zappy hospedados;
   - F7 (carga de 30 alunos).
6. Ao final: REF e MOB.
