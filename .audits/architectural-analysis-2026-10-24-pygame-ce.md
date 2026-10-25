# Revisão arquitetural: extensão Pygame-ce

> **Histórico (25/10/2026):** esta revisão descreve a primeira versão da extensão, com um
> adaptador escrito à mão e jogos resumidos. Ela foi substituída pelo pygame-ce 2.5.7 real no
> worker, material do Pinta e os nove jogos completos. O estado atual está em
> [`docs/plans/2026-10-24-pygame-ce-study-and-extension.md`](../docs/plans/2026-10-24-pygame-ce-study-and-extension.md).

Data: 2026-10-24. Base: `staging` em `0b7e9e69e`, igual a `origin/staging`.
Escopo: alterações locais da extensão Pygame-ce, integração com Estúdio/Pinta,
galeria, exportação e os nove jogos adaptados. Os achados abaixo registram o estado
da revisão inicial; as correções e novas provas estão documentadas ao fim.

## Achados

### P1 — A promoção de runtime não disponibiliza a extensão nem aprova seus blocos

`packages/studio-runtime/scripts/python-promotion-plan.ts:157-160` monta a lista
imutável de extensões da nova release com Turtle e Pygame Zero, sem
`python-pygame`. Em `:212-216`, a política de autoria inclui os catálogos de
programação, Turtle e Pygame Zero, sem `PYTHON_PYGAME_CODECS`. A criação de
exemplo exige a extensão no manifesto e, para Blocos, todos os IDs aprovados
(`packages/studio/src/projects/createPythonExampleProject.ts:23-42,50-79`). Assim,
as 18 entradas da galeria existem em código, mas não podem ser criadas por meio
de uma release produzida por esse fluxo. O fixture de testes inclui Pygame
manualmente (`packages/studio/src/state/fixtures/pythonEnvironment.ts:22-27`),
mas não representa a promoção. A qualificação de execução também exige apenas
Turtle e Pygame Zero (`packages/studio-runtime/scripts/qualify-python-execution.ts:134-145`).

**Ação:** incluir a extensão e seus codecs na geração da próxima release e na
qualificação de ponta a ponta, mantendo as autorizações do host. Não editar uma
release imutável existente.

### P2 — `USEREVENT` e `custom_type()` divergem do pygame-ce 2.5.8

O adaptador define `USEREVENT = 32866` e inicializa `_custom_event` com esse
valor (`packages/studio/src/runtime/python/pygame/py/pygame/__init__.py:26,46,218-223`).
Uma execução local do pygame-ce 2.5.8 nativo retornou `USEREVENT == 32865` e
`custom_type() == 32866` na primeira chamada; o adaptador devolve `32867`.
O bloco `programar evento` também usa o literal `32867`
(`packages/studio/src/python/extensions/pygame/catalog.ts:125-130`). Um programa
que mistura tipos personalizados, literais e exportação nativa pode associar
tratadores a tipos diferentes ou colidir com o primeiro tipo personalizado.

**Ação:** alinhar a constante e o incremento ao pacote nativo e exercitar
`custom_type`, `USEREVENT` e `set_timer` no mesmo teste comparativo.

### P2 — Tempo da página entra no relógio do jogo no primeiro quadro

O renderer envia `performance.now()`
(`packages/studio/src/runtime/python/pgzero/renderer.ts:823-827`). O adaptador
guarda esse valor diretamente em `_last_now` e o devolve em `get_ticks()`
(`packages/studio/src/runtime/python/pygame/py/pygame/__init__.py:79-85,269-283`).
Antes do primeiro `flip`, `get_ticks()` e a base de `set_timer()` são zero; se a
página estiver aberta por dois minutos, o primeiro `flip` troca a base para cerca
de 120000 ms. Reproduzido com `set_timer(..., 1000, loops=1)` seguido de
`_receive({'now': 120000, 'events': []})`: o evento chega imediatamente. O pygame
nativo mede tempo desde sua inicialização. Os jogos existentes costumam iniciar
seus contadores após o primeiro quadro, por isso os testes roteirizados não
detectam esse caso para código autoral.

**Ação:** estabelecer origem monotônica ao inicializar o adaptador e usar o mesmo
tempo relativo em `get_ticks`, `set_timer` e recepção de quadros; testar uma
página já aberta antes de começar o projeto.

## Cobertura e limites observados

- Nove referências finais da pasta foram representadas por nove `main.py` e 18
  entradas de galeria. Cada par Blocos/Código usa os mesmos fontes e materiais.
  A projeção AST → Blocos → AST passou para os nove jogos sem nós opacos. Isso
  demonstra representação semântica, não a disponibilidade da paleta em uma
  release de produção.
- A integração do Pinta importou PNG em `assets/` e conservou o caminho quando o
  desenho foi substituído, nos testes Classic e Pro. A exportação preservou
  fontes, PNG, WAV e requisito nativo.
- Nove jogos passaram por 86 quadros com SDL simulado no pygame-ce nativo 2.5.8 e
  pelo adaptador Python; o teste de API e 218 testes Bun direcionados passaram.
  O gerador de galeria passou em `--check`; `git diff --check` não mostrou erros.
- O typecheck de `@sistemazero/studio` falhou com dois erros em
  `src/runtime/python/playtestCollector.ts:126` (`observePythonMission` pode ser
  indefinido). Esse arquivo não consta nas alterações Pygame-ce; os erros não
  foram atribuídos a esta implementação nem corrigidos nesta revisão.
- Não houve nesta revisão execução do Pyodide dentro do worker protegido em um
  navegador real, inspeção visual das nove telas, sessão humana de jogo nem
  qualificação de distribuição. Os testes nativos simulam entrada e relógio;
  os do adaptador simulam transporte e relógio. Esses resultados não certificam
  a experiência final do jogador.
- A adaptação é intencionalmente condensada. Por exemplo, o Pong original
  persiste placar em `data/score.txt`, enquanto o novo jogo registra um rali
  apenas durante a sessão. O README do exemplo descreve esse recorte. O Pirate
  Maker também conserva a fase editada só durante a sessão. São diferenças de
  produto a validar contra o critério de fidelidade esperado, não falhas ocultas
  de implementação.

## Estrutura e manutenção

Não identifiquei exportação nova claramente morta. O carregador de fontes do
adaptador, catálogo de blocos, galeria, Pinta e exportação têm pontos de uso.
Reusar o transporte limitado do Pygame Zero evita duplicar o renderer e o canal
de áudio; o adaptador mantém estado próprio de eventos, relógio e API. Os dois
conjuntos de fontes geradas da galeria duplicam bytes por modo apenas na
metainformação; ambos apontam para o mesmo payload carregado sob demanda.
Os jogos repetem laços de atualização e desenho de modo didático, mas não há
indício de que centralizá-los melhore este conjunto de exemplos independentes.

## Correções após a revisão

- **P1 resolvido:** a promoção inclui `python-pygame` no manifesto da release e
  `PYTHON_PYGAME_CODECS` na política de autoria. O teste de promoção verifica que
  todos os IDs exigidos pelas nove entradas de Blocos estão aprovados. A
  preparação offline da nova release exige os quatro módulos do adaptador e
  rejeita um pacote incompleto. O qualificador da nova release também exige a
  extensão.
- **P2 eventos resolvido:** `USEREVENT` vale 32865 e o primeiro
  `event.custom_type()` devolve 32866, como no pygame-ce 2.5.8. O bloco de
  temporizador usa `pygame.USEREVENT` em vez de um número fixo.
- **P2 relógio resolvido:** o primeiro tempo recebido do renderer estabelece a
  origem do relógio do jogo. `get_ticks()` e `set_timer()` usam esse tempo
  relativo; o teste inicia um timer antes do primeiro quadro de uma página com
  relógio em 120000 ms e confirma que ele não dispara cedo.
- O typecheck identificou a captura incorreta da sessão mutável em
  `playtestCollector.ts:126`. A sessão agora é capturada antes da verificação da
  capacidade; os oito testes do coletor e o typecheck do Studio passaram.
- O novo teste Playwright executou os nove projetos reais da galeria no Chrome,
  com o worker Pyodide, PNG/WAV, desenho em canvas e comandos de teclado. As nove
  provas passaram; foram salvas capturas de tela e saída de cada jogo. O Pong e
  a plataforma também tiveram suas capturas inspecionadas visualmente.
- Os nove jogos passaram novamente por 86 quadros com SDL simulado no
  pygame-ce 2.5.8 nativo e pelo adaptador Python. Os 30 testes direcionados de
  galeria, blocos, Pinta e exportação passaram, além dos 34 testes de promoção e
  artefato e dos 26 testes do qualificador. O gerador passou em
  `check:pygame-games`.
- Os 18 projetos em Blocos e Código passaram na criação, reabertura e exportação
  dentro da suíte de 180 testes. A projeção AST/Blocos foi conferida novamente
  para os nove jogos, sem nós opacos. O typecheck do Studio Runtime e do
  promotor operacional também passou.

Essas provas validam inicialização, recursos e entrada básica no navegador;
não substituem uma sessão humana completa de cada jogo nem a qualificação de
uma distribuição publicada. A fidelidade das adaptações condensadas continua
documentada nos README de cada exemplo.

## Validação restante para publicação

A ativação de uma release permanente ainda depende do processo próprio de
qualificação e publicação. A exploração humana completa dos nove jogos,
inclusive edição no Pinta, Blocos, Código, áudio, exportação e reabertura,
deve acompanhar essa etapa.
