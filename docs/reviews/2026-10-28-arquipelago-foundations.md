# Arquipélago — auditoria da base em crescimento

## Estado e escopo

Em execução. Base inicial: `f443054af468e8fc3fc06b26b5a89eadb87146ff` de `origin/staging`.
Composição revisada atual: `c12a249e7` + integração de `ac751aacc` e correções deste lote.
Inclui remoto `78118738c` e staging local até `ac751aacc`: salvamento V4, casa em kit, modo
Construir, materiais/fogueira, diário, pegadas, telhados, quintal, mundo reativo e projetos azuis.
Os resultados históricos abaixo não substituem a
validação desta composição. Novos commits locais e remotos também entram no escopo; edições
não commitadas de outras sessões ficam preservadas nos respectivos worktrees.
Branch isolada: `fix/arquipelago-audit-foundations-20261028`.

Fontes fornecidas: `AcompanhapentoArquipelagoAtualizado.pdf` (15 páginas, todas lidas
visualmente) e `relatorio_auditoria_arquipelago_atualizado_2026-10-28.md` (leitura completa).
O relatório externo é uma lista de hipóteses a verificar, não evidência de execução.
O PDF distingue entregas de fases futuras: esta auditoria não declara as 149 tarefas prontas
nem transforma as ilhas e mecânicas futuras em pré-requisito para corrigir a base atual.

Inventário inicial: 331 caminhos de fonte nos pacotes do cliente, contratos e API.
Também entram no escopo os consumidores no shell, Admin, gateway, Members e os workflows.
Resultados anteriores a esta base não são homologação desta composição.

## Sequência de trabalho

- [x] Atualizar referências e isolar a composição sem alterar arquivos de outras sessões.
- [x] Ler integralmente os dois documentos fornecidos.
- [ ] Conferir arquitetura, dependências, recursos e consumidores de cada subsistema.
- [ ] Salvamento: persistência local, retomada, concorrência e conflitos sem perda silenciosa.
- [ ] Movimento, câmera e entradas: colisões, transições, mistura de dispositivos e pausa.
- [ ] API e contratos: identidade, acesso, revisões, validação e isolamento de perfis.
- [ ] Integrações: desafios, paleta, ferramentas, moedas, limite diário e Admin.
- [ ] Recursos gráficos: carregamento, descarregamento, física e medições de custo.
- [ ] Corrigir os bloqueios do CI sem enfraquecer verificações.
- [ ] Executar testes, banco descartável, tipos, build e provas de navegador pertinentes.
- [ ] Fazer revisão final, reconciliar novos commits remotos e entregar evidência verificável.

## Achados e evidências atuais

| ID | Estado | Evidência / ação |
| --- | --- | --- |
| SAVE-01 | Correção local e prova de navegador | Diário IndexedDB por público/perfil, trava entre abas e recuperação após fechar; erro local pausa mutações. Não depende de PUT no unload. |
| SAVE-02 | Correção local com regressões causais | Conciliação em três vias, domínio econômico atômico e escolha explícita. Envio incerto é preservado e consultado antes de substituir; alterações feitas durante o PUT continuam pendentes. |
| CAM-01 | Correção local, prova gráfica pendente | A distância mínima vencia uma parede mais próxima. Regressão reproduziu 0,4 m quando havia só 0,2 m livres. Agora o espaço livre limita a distância, inclusive quando a folga da sonda produz valor negativo. |
| INPUT-01 | Correção local, testes verdes | Canais por dispositivo: liberar gamepad/toque não zera teclado ainda pressionado. Blur e desmontagem liberam o próprio canal. |
| MOVE-01 | Corrigido com Rapier real em teste | Alvos guiados passam pelo controlador livre; colisão limita o deslocamento e interrompe o trilho bloqueado. Contatos de apoio, pela normal e pelo limite de inclinação do corpo, não são tratados como paredes. Equilíbrio, tronco, teto, borda, sensor, escada e rampa cobertos. Navegação visual completa ainda pendente. |
| PAUSE-01 | Correção local, RED/GREEN no Chrome real | Menu parava o cronômetro mas a cápsula continuava caindo (31,76 → 1,96 m). `Physics.paused` usa a mesma política do percurso; animação e cordas também aguardam. Após correção: cinco amostras em 38,46 m, retomada da queda ao fechar. |
| CI-01 | Perfil regenerado pelo comando canônico | Run `40714518976`: alteração do conferidor 3D não atualizou fingerprint; a verificação bloqueou corretamente a imagem. Novo perfil precisa acompanhar a nova distribuição. |
| CI-02 | Sintoma confirmado; causa ainda pendente | WebKit esperou o servidor E2E por 120 s. Build e preview dividem o prazo, mas stdout era descartado. Agora há fases/duração e stdout visível; timeout preservado até obter diagnóstico da execução macOS. |
| DOC-01 | Corrigido localmente | Regras e CLAUDE da API descrevem sessões, concessão curta, relógio monotônico e recuperação legada separadamente. |
| PALETTE-01 | Hipótese do documento não se confirma na base atual | `ServicoDosDesafios.abrir` envia conquistas; host passa `grantedBlockIds`; `StudioLesson` repassa ao Core; `isBlockTypeAllowed` aplica teto antes de blocos do projeto/nível. Equipe recebe `null` intencionalmente. Falta prova gráfica do fluxo hospedado. |
| CAM-02 | Corrigido com Rapier real em teste | Dois destinos livres não garantem uma interpolação livre. A posição final da câmera é conferida depois da interpolação e da correção pelo chão. |
| SAVE-03 | Corrigido, teste causal | Recusa permanente do salvamento preserva o diário e pausa mutações/repetições automáticas; a pessoa pode baixar a cópia e tentar novamente. Suporte somente leitura não grava o perfil observado. |
| REQUEST-01 | Corrigido, testes causais | Caderno e desafios abortam leituras substituídas/desmontadas. Resposta tardia não reaplica dados; 403 remove coleção e festa anteriores. Falha de rede preserva cache sem declará-lo atualizado. |
| BUILD-01 | Corrigido, testes causais | Construir respeita somente leitura, limite diário e conflito. Desfazer não reaplica obra antiga depois de adotar outro salvamento. |
| BUILD-02 | Corrigido, prova gráfica de cancelamento/confirmar/desfazer | Cancelamento, perda de captura, blur e troca de ferramenta descartam o gesto; somente pointerup confirma. Câmera de exploração suspende escrita/controles enquanto Construir é responsável pela câmera. |
| ARCH-01 | Corrigido, inventário estático | `giroDaIlha` saiu do componente de ilha para medidas, eliminando o ciclo com pintura. Grafo atualizado dos 197 arquivos TS/TSX de fonte não encontrou ciclos de imports de valor. Não certifica imports dinâmicos nem revisão semântica integral. |
| BUILD-03 | Corrigido, regressão causal | Confirmação da obra confere `ObraSchema`, além dos limites geométricos do lote. Impede gravar fragmentação de paredes que o servidor recusaria. |
| ITEM-01 | Corrigido, regressão causal | Retirar da geladeira com 999 unidades na mochila perdia um alimento. A transferência agora é recusada sem mudar nenhum dos dois inventários; o botão informa o limite. |
| GPU-01 | Corrigido por revisão do ciclo de recursos | Hologramas clonam os materiais que alteram e liberam somente os materiais próprios ao desmontar/trocar. Geometrias, texturas e materiais compartilhados do GLTF permanecem no cache. Não equivale a medição de GPU. |

### Evidência mais recente

- Composição com `ac751aacc` e correções: **678 pass, 0 skip, 0 fail**, 32.842 asserções
  em 78 arquivos, incluindo Postgres descartável (`integrated-complete-tests-r4.log`).
- Tipagem do cliente: exit 0 (`integrated-types-client-r6.log`). Build: exit 0,
  **43 arquivos / 20,87 MB** (`integrated-build-r4.log`). O aumento inclui os modelos dos objetos.
- Escada/rampa reais: RED 6 pass / 2 fail; contato no último degrau e na rampa era confundido
  com bloqueio. Após distinguir as normais de apoio: 8 pass / 0 fail; com testes puros dos modos,
  35 pass / 0 fail / 135 asserções. Paredes e tetos ainda bloqueiam; todo deslocamento aplicado
  continua vindo do Rapier, inclusive ao corrigir contato de apoio.
- Geladeira: RED 7 pass / 1 fail, GREEN 8 pass / 0 fail / 37 asserções. Preserva alimento
  no limite da mochila e permite completar de 998 para 999.
- Chrome `integrated-browser-r6.log` e `integrated-time-browser-r1.log`: salvamento/abas,
  conflito, pausa/retomada, construção e recuperação do limite diário passaram na composição
  com `7a027a4d2`, antes de integrar os projetos azuis. Não transferir esse resultado à nova UI.
- Chrome `integrated-browser-r7.log`, após integrar `ac751aacc` e as correções: IndexedDB real,
  conflito acessível, viewport estreito, duas abas/liberação da trava, pausa/retomada da física e
  arrasto cancelado/confirmado/desfeito passaram, exit 0. Não exercita ainda aparência autoral.
- Biome: **96 arquivos**, zero erros; diff sem erros de whitespace. Inventário atualizado:
  197 arquivos de fonte, zero ciclos estáticos de imports de valor.

### Evidência histórica (Construir e telhados)

- Composição `3a859172a` + correções: **653 pass, 0 fail**, 32.603 asserções em 75 arquivos,
  incluindo banco descartável (ambas as variáveis de testes de Postgres configuradas).
- Tipagem do cliente após conciliar Construir/telhados: exit 0 (`integrated-types-client-r2.log`).
- Tipagem de API/contratos e build anteriores: exit 0 na composição `44f3aea9a` + correções;
  build de 33 arquivos/18,59 MB. Não transferir essa prova de build às alterações posteriores.
- Chrome `integrated-browser-r2.log`: IndexedDB, duas abas, conflito, viewport estreito,
  retomada e pausa da física passaram antes da integração de Construir/telhados.
- `integrated-browser-r3.log`: a extensão para Construir esperou a câmera do medidor e falhou.
  O medidor lia entre dois escritores de câmera no mesmo quadro; foi estabelecida posse única
  enquanto Construir está aberto. `r4` parou antes, aguardando o menu após reabrir; causa ainda
  não estabelecida. Negativos preservados. `r5` passou no Chrome: salvamento, conflito, duas abas,
  reabertura, pausa e retomada, Construir com arrasto cancelado, confirmação do mesmo arrasto e
  desfazer. Não houve filtro de erros das páginas; a instrumentação de falhas foi ampliada.
- Build posterior em `integrated-build-r2.log`: **34 arquivos / 18,78 MB**, exit 0.
  Biome: 54 arquivos conferidos, sem erros. Isso não mede desempenho em hardware de aluno.
- Regressões novas de Construir: RED 5 pass/4 fail, GREEN 9 pass/0 fail. Desafios: RED 6/2,
  GREEN 8/0. Inventário em `.audits/arquipelago-source-inventory-20261028.json`.

### Presente dos quatro bichos

A outra sessão implementa o presente e o campo que registra a entrega única. Esta frente revisa
e integra o commit. Conferir migração de saves antigos, reconhecimento dos quatro bichos,
persistência após reabrir, resposta perdida e conflito entre aparelhos. Marcador de recebimento
e recompensa devem permanecer no mesmo domínio transacional; não somar recompensas de snapshots.
Nenhum campo concorrente foi inventado nesta frente.

### Limites da integração de projetos azuis

O commit `ac751aacc` guarda o identificador da aparência devolvido pela ferramenta, mas o
renderer nesta composição escolhe o GLB padrão pelo estado `completo`; não carrega ainda o
desenho/modelo autoral desse identificador. A prova com a plataforma falsa não demonstra essa
integração real. O carregamento da aparência autoral e a validação hospedada Pinta/Molda seguem
pendentes; não declarar essa personalização concluída. O lote atual preserva a implementação
recebida e corrige transferência de itens e propriedade dos materiais.

### Verificações desta composição

- Câmera, antes: 5 testes passaram, 1 falhou na regressão da parede próxima.
- Câmera, após: 16 testes passaram, 0 falhas, 250 asserções em três arquivos
  (`camera-e-copas`, `controle-da-camera`, `perfis-de-camera`). Isso prova a regra pura e os
  controles existentes; não substitui um percurso gráfico completo nem valida todos os movimentos.
- Logs locais em `.cache/arquipelago-audit-20261028/`. Resultados relevantes serão consolidados
  aqui; arquivos temporários não são requisito para compreender a entrega.

### Atualização integrada em ff8b7cc5c + correções locais

- Contratos, cliente, API e workflow: **544 pass, 40 skip, 0 fail**, 30.402 asserções (67 arquivos).
  Os skips não são positivos. Banco foi executado separadamente: **32 pass, 0 fail**, 119 asserções.
- Tipagem do cliente: `bun run --cwd packages/arquipelago typecheck`, exit 0 após a correção da pausa.
- Chrome/Windows: IndexedDB real, conflito modal, Escape, viewport 390×844, segunda aba recusada,
  liberação da trava ao fechar, adoção online sem reescrever o servidor, reabertura e pausa/retomada
  da física passaram. Não prova Safari, aparelhos físicos ou toda a matriz do jogo.
- A primeira prova de salvamento passou; a extensão para física teve duas tentativas com
  pré-condição inadequada (o clique aguardava estabilidade e a queda já terminara). A terceira
  acionou o botão no quadro da queda, reproduziu o defeito e passou após a correção. Negativos
  preservados nos logs `pause-browser-red*`; positivo em `pause-browser-green-r1.log`.
- Harness Node: o lançamento inicial via Bun não chegou aos testes por timeout de Chrome;
  a compilação do runner para Node resolveu o lançamento. Não é evidência de defeito do jogo.
- Job independente do Arquipélago preparado no CI: contratos, API, banco descartável, cliente,
  tipos, build e provas de tempo/salvamento/pausa. Nenhuma etapa existente foi dispensada.

### Alterações remotas sob revisão

Pontes flexíveis e colisores cinemáticos marcados, caderno dos Lumis, currículo adulto nos cartões,
correnteza, boias, recursos de arte e reorganização dos cursos/Jardim Secreto. A preparação de
pontes e o custo das copas ainda precisam de provas geométricas e medição. Caderno é leitura
da coleção; execução de rotinas da Fase 2 continua futura. O deploy e a validação hospedada
desta composição ainda não foram feitos.

### Conciliação do salvamento V4 de staging local

O commit `93a36d61e` acrescenta `construcao` e `projetos`. A primeira versão local da conciliação
enumerava só os domínios econômicos da V3; quatro testes novos reproduziram descarte de obra,
projeto azul e transferência à geladeira, além de resolução silenciosa de duas obras diferentes.
A correção exclui do grupo atômico apenas os campos que têm regra explícita de união. Assim,
campos novos entram conservadoramente no grupo até receberem política própria.

- RED: 6 pass / 4 fail na conciliação V4; após correção, contratos + salvamento: 55 pass / 0 fail.
- Diário V3 com base/local/envio diferentes foi inserido no IndexedDB de teste e relido como V4,
  preservando os três estados. Grupo de persistência: 7 pass / 0 fail, 25 asserções.
- Composição V4 + correções: **588 pass, 0 skip, 0 fail**, 30.587 asserções em 67 arquivos,
  incluindo os testes de Postgres com as duas variáveis de banco configuradas.
- Tipos dos três pacotes (cliente, API e contratos): exit 0, execuções seriais.
- Prova de navegador repetida com V4: salvamento/abas/conflito/pausa/retomada passaram.
- As edições não commitadas da outra sessão não foram copiadas nem modificadas. O commit
  posterior `0492880d6` (dobradiças/placa de peso) foi integrado; sua revisão continua separada.

### Pendência de arte: geração do bosque em outra máquina

Por determinação do usuário, nenhuma sessão nesta máquina deve regenerar o GLB ou instalar
Blender para essa tarefa. O usuário está preparando a arte em outra máquina mais potente.

O gerador alterado em `0492880d6` prevê as âncoras `mecanismos-casa` e `mecanismos-rumo`,
consumidas por `BosqueVivo` para montar os mecanismos. O `bosque.glb` presente nesta composição
ainda não contém essas âncoras. Portanto, a integração do código não comprova que dobradiças,
alçapão e placa de peso estejam visíveis e utilizáveis no jogo.

Entrega pendente da máquina de arte: regenerar e commitar
`packages/arquipelago/src/assets/ilhas/bosque.glb` a partir do gerador correspondente. Após integrar
o artefato, conferir as âncoras, a geometria de colisão, o acionamento dos mecanismos e a
pausa/retomada no navegador. A revisão do código e os demais testes continuam independentes
dessa geração; a validação visual dos mecanismos permanece explicitamente aberta.
O commit local `8a8608bb3` também registra a falta de um lote adequado para a cabana do Bosque:
as âncoras `lote-cabana-a` e `lote-cabana-b` e o terreno correspondente pertencem à entrega de arte.

### Conciliação da grade e do vento

Os commits `c18c58a2e` (regras de construção) e `41bd0bf17` (vento) foram incorporados à
composição de revisão. O vento moveu a simulação das cordas para `useBeforePhysicsStep`.
Na resolução do conflito, foi preservado esse passo fixo e removida a chamada anterior por
quadro: manter ambas simularia as cordas duas vezes. A pausa continua no ancestral `Physics`.

Verificação focada desta composição: **41 pass, 0 fail, 1.336 asserções**, cobrindo construção,
vento, política de pausa, conciliação V4 e diário durável. Isso não substitui a prova de navegador
do novo conjunto nem valida os mecanismos que dependem do GLB pendente.

## Cuidados de implementação

Não somar inventários de snapshots concorrentes: isso pode duplicar recompensas ou desfazer
consumo. Preservar alterações locais com identidade/base, reconhecer resposta perdida e tratar
conflitos não conciliáveis explicitamente. Progresso e moedas conferidos pelo servidor não devem
se tornar autoridade do navegador. A proteção entre perfis precisa valer também no armazenamento
local e na recuperação após fechar a página.

Manter Rapier e o controlador universal existentes. Alterações de segurança em modos guiados
devem preservar trajetórias e animações e ser verificadas com colisores reais. Medição precede
alegações de desempenho e otimizações de alocação. Não declarar teste em dispositivo real que
não foi realizado nesta revisão.
