# Review do Studio Pro — 08/11/2026

Branch: `staging`, sincronizada com `origin/staging` em `bcd3eace8` após `git fetch origin` e `git merge --ff-only origin/staging`. O checkout já estava atualizado e limpo.

Escopo: `53b46fc0a..bcd3eace8`, 15 commits e 132 arquivos. Revisão do redesenho do Studio Pro, execução JavaScript/Python, arquivos, materiais, terminal, portais, preferências, responsividade, permissões e alterações relacionadas da Ilha do Farol. Os achados e números originais abaixo registram o estado revisado; as correções solicitadas posteriormente estão descritas na seção seguinte.

## Correções aplicadas após o review

1. **Zappy no celular:** abrir o tutor a partir de Arquivos ou Saída revela a aba Código antes da pintura. Trocar de aba fecha o tutor. O grupo de painéis permanece montado, preservando editor, prévia e conversa.
2. **Palco estreito:** o cabeçalho permite quebra de linha, inclusive dos estados longos. As ações permanecem acessíveis em 720 px e após reduzir o palco de 40% para 20% da área, sem ocultar controles.
3. **Navegação para código:** `codeRequest` sai de Só o jogo para Lado a lado. Preserva Só o código quando já selecionado e não desfaz escolhas posteriores do usuário.
4. **Carga inicial:** os 216 textos `pro.*` de cada idioma ficam separados dos 439 compartilhados. A lista e seus componentes usam o tradutor compartilhado, respeitando o contexto do Studio pai; a API completa de tradução continua disponível no editor. Não há registro global nem carregamento assíncrono de traduções durante a renderização. O teste do bundle também impede a entrada dos dicionários Pro no grafo inicial.

Validação final das correções:

- Os quatro novos cenários E2E falharam antes da correção e passaram depois. A suíte `pro-workspace.spec.ts` completa passou com **14 testes**, incluindo persistência das sessões entre tamanhos e layouts.
- Conferência visual no Chromium: cabeçalho a 40% e 20% em tablet; Zappy visível no celular e rascunho preservado ao fechar e reabrir entre Saída e Arquivos (`.tmp/studio-fixes-phone-zappy.png`).
- Testes focados de layout e tradução: **13 aprovados**. Conferência independente dos dicionários anteriores versus os atuais: **655 traduções em português e 655 em inglês preservadas integralmente**.
- Teste do bundle: **351.912 bytes brutos / 114.511 bytes gzip / 2 arquivos JavaScript**. Redução de 7.426 bytes gzip; tetos de 380.000/120.000 bytes preservados.
- `bun run check`: **2.809 arquivos**, sem erros.
- `bun run typecheck` e `git diff --check`: passaram.
- `bun run test`: **11.229 aprovados, 0 falhas e 4 pulados**, em **832 arquivos / 156 processos isolados**. O comando oficial terminou com saída 0, sem retomadas nem alterações de timeout. Inclui o teste do bundle e os novos testes de layout e idioma.

Evidências das correções: `.tmp/studio-fixes-e2e-red.log`, `-e2e.log`, `-unit.log`, `-bundle.log`, `-bundle.json`, `-biome.log`, `-types.log` e `-all-tests.log`. Capturas do cabeçalho em `.tmp/studio-fixes-tablet.png` e `.tmp/studio-fixes-narrow-stage.png`.

## Achados confirmados

### 1. [P2] Zappy fica invisível nas abas Arquivos e Saída do celular

Local: `packages/studio/src/modes/pro/workspace/ProWorkspaceLayout.tsx:228`, também o contêiner `hidden={bodyHidden}`.

Em largura de 390 px, abrir Arquivos ou Saída e tocar em Abrir Zappy muda o botão para Fechar Zappy, mas não mostra o assistente. O tutor continua dentro do grupo de painéis escondido em Arquivos; em Saída, o ancestral que contém todo o grupo é escondido. O estado fica aberto, com `aria-expanded=true`, enquanto `#sz-zappy-panel` não é visível. O mesmo fluxo mostra o assistente normalmente em Código e Jogo.

Impacto: a criança não consegue pedir ajuda a partir dos arquivos ou da saída do programa, inclusive quando está vendo um erro. O overlay do tutor precisa continuar visível independentemente da aba, preservando sua instância, ou a abertura precisa trazer uma superfície que o comporte.

### 2. [P2] Cabeçalho do palco corta Atualizar e Tela cheia em largura de tablet

Local: `packages/studio/src/modes/pro/workspace/ProStage.tsx:83`; regra `.sz-pro-stage__head` em `packages/studio/src/styles/studio.css:1415`.

Com viewport de 720 px, layout padrão 60/40 e jogo rodando, o cabeçalho do palco tem 253,59 px disponíveis, mas seu conteúdo ocupa 348 px. Atualizar começa em x=742,22 e Tela cheia em x=782,22, ambos fora do viewport. O botão Só o jogo também fica parcialmente cortado. `elementFromPoint` confirma que os dois primeiros não recebem clique no centro.

Impacto: controles essenciais ficam indisponíveis em um tamanho explicitamente suportado. A variante compacta reduz apenas os rótulos dos três seletores; título, estado, espaçamentos e demais ações ainda excedem o espaço. O cabeçalho precisa se adaptar à largura efetiva do painel, inclusive após arrastar a divisória.

### 3. [P2] Escolher um arquivo em Só o jogo mantém o editor escondido

Local: `packages/studio/src/modes/pro/workspace/ProWorkspaceLayout.tsx:130`.

Em desktop, selecionar Só o jogo e depois clicar em `src/config.ts` na árvore atualiza o arquivo ativo, mas mantém o editor invisível e Só o jogo selecionado. O novo layout deixa a árvore acessível nesse modo. `handleSelectFile` dispara `codeRequest`, mas o efeito só altera `phoneTab`, sem sair de `preferences.layout === 'game'`.

Impacto: a navegação parece não funcionar e a criança precisa descobrir que deve selecionar Lado a lado para ver o arquivo que acabou de abrir. Pedidos explícitos para navegar ao código precisam também revelar o editor no desktop/tablet.

### 4. [P2] Dicionários do Pro ultrapassam o orçamento da lista inicial

Local: `packages/studio/src/core/i18n/pt-BR.ts` e `en.ts` (novos textos do Pro); guarda em `packages/studio/src/projects/__tests__/initialBundleBudget.test.ts:225`.

O teste do bundle falha tanto no grupo oficial `src/projects` quanto isoladamente: **121.937 bytes gzip**, acima do teto de **120.000**. A carga bruta é 372.064 bytes em dois arquivos; o aumento do teto bruto para 380.000 não resolve a guarda gzip. A medição de 114.755 citada no comentário do teste não representa o conjunto final medido nesta revisão.

Experimento de causalidade: conservar toda a árvore atual e fornecer somente `en.ts` e `pt-BR.ts` de `53b46fc0a` ao hook `load` do Vite, sem alterar arquivos do checkout. O mesmo build mediu 348.713 bytes brutos e **113.545 bytes gzip**. Portanto os textos adicionados, carregados também antes de abrir o editor, bastam para provocar a falha no ambiente atual. Isso não é uma medição integral da versão antiga: é um experimento controlado sobre as duas dependências.

Impacto: a suíte do Studio não está verde e a listagem de projetos carrega textos exclusivos do editor Pro. A correção deve preservar uma guarda útil e separar/reduzir essa carga inicial. Evidências: `.tmp/studio-review-2026-11-08-bundle.json`, `-bundle.log`, `-base-dictionaries.json` e script `packages/studio/.cache/review-bundle-dictionaries.mjs`.

## Evidências e verificações

- `bun run check` em `packages/studio`: passou, 2.800 arquivos.
- `bun run typecheck` em `packages/studio`: passou, saída 0.
- `bunx playwright test --config=e2e/pro-workspace.config.ts pro-workspace.spec.ts`: 10 testes aprovados; build de produção da fixture concluído. Cobre navegação, edição, renomeação, falhas da análise, exportação, observação e preservação das sessões entre layouts.
- Testes da Ilha, obstáculos e faróis básicos: 11 aprovados, 3.075 asserções. Os quatro cursos dependentes (Moedas, Cabana, Ponte e Símbolos) passaram em outros 53 testes e 4.414 asserções: 64 testes no total.
- `git diff --check 53b46fc0a..HEAD -- packages/studio packages/core`: passou.
- Suíte geral: **11.225 testes aprovados e 1 reprovado, nos 831 arquivos descobertos**, somando os grupos completos da execução inicial e das duas continuações, sem duplicar o Pico. A única falha persistente é o orçamento gzip da lista inicial. O teste foi repetido isoladamente e apresentou os mesmos 121.937 bytes. As reproduções dos três defeitos de interface acima são verificações adicionais, fora desses 11.226 casos existentes.

Reproduções adicionais no Chromium, usando os componentes reais e a fixture local com compilador remoto controlado:

- Script local: `packages/studio/.cache/review-probe.mjs` (executar com Node a partir de `packages/studio`, depois do build da fixture pelo e2e acima).
- Medições: `.tmp/studio-review-probe.json`.
- Captura do tablet: `.tmp/studio-review-tablet.png`.
- Logs desta sessão: `.tmp/studio-review-2026-11-08-*.log`.

## Limites da validação

O comando original da suíte geral parou no teste preexistente `picoManifest.test.ts` por exceder seu limite de 5 segundos (6,45 s, durante outras verificações). A repetição isolada passou em 2,39 s. As continuações usam o mesmo agrupamento/isolamento do runner oficial, retomando nesse arquivo e depois do grupo `src/projects`, com `--timeout 20000`, sem mudar fontes ou testes. O comando original não terminou verde; todos os grupos foram executados e a falha persistente está registrada acima.

O e2e de execução Python real foi tentado, mas o servidor recusou iniciar: o Windows exige Bun >=1.4.0 e indica 1.4.3; o Bun disponível é 1.3.11. Nenhum caso desse e2e foi executado. Isso é uma limitação do ambiente, não um achado introduzido pelos commits revisados. A revisão de Python inclui código e testes de componente/controlador, sem qualificar a execução real nesta sessão.

A fixture de navegador não acessa produção nem prova o serviço remoto real, instalação de dependências no WebContainer, galerias autenticadas ou desempenho em dispositivo físico. Não houve publicação, migração ou alteração de dados remotos.

Durante as verificações originais apareceram alterações locais concorrentes em cinco arquivos de `packages/member-shell` (`lesson-sections.tsx`, `lesson-youtube-video.tsx`, `vimeo-player.tsx`, `video-gate.ts` e seu teste). Foram preservadas e não fazem parte do intervalo de commits revisado. A revisão original criou apenas este relatório; as correções do Studio foram feitas depois, a pedido do usuário, e estão descritas no início do documento.
