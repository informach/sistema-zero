# Retomada do plano de evolução do Molda

Atualizado em 10/09/2026. Documento de continuidade para não depender da memória de uma
conversa. O plano aprovado permanece em `2026-09-06-molda-evolution.md`.

## Contexto recuperado

- Sessão Codex: **Adapte o Molda ao Blockbench**, id
  `01a078ea-356d-75c3-b8fa-568a9ef519e4`.
- Histórico local: `C:/Users/tocha/.codex/sessions/2026/09/06/rollout-2026-09-06T19-50-10-01a078ea-356d-75c3-b8fa-568a9ef519e4.jsonl`.
  Foi consultado por registros e data, sem carregar seus 316 MB no contexto.
- O Codex implementou os lotes 1–224; o Claude Code continuou pelos lotes 225–238.
- Os pedidos de 10/09 foram conferir o trabalho posterior e fechar os critérios de
  **cada uma das nove fases**, incluindo lacunas além dos doze achados do review 238.
- A última retomada registrada começou às 10h56 e terminou às 11h17 (Brasília), ainda
  durante a auditoria. Ela não entregou a matriz nem corrigiu as falhas que reproduziu.
- Naquela sessão, build Kids, 14 e2e Chromium, 481 testes do kit 3D avançado e 626 testes
  Kids passaram. A integral Molda apresentou falhas. São evidências históricas, não gates
  desta retomada.
- Últimos achados reproduzidos: descida v2 sobre v1; descida v1 sobre v2; restauração
  após exclusão local com edição remota posterior; miniatura cancelando pose pendente.
- Houve alterações concorrentes em testes/fixtures. Na retomada atual, elas estão
  commitadas; HEAD inicial `f441bb74`. Apenas `.audits/creator-review/` estava sem rastrear,
  e pertence a outro trabalho.

## Autorização e critérios

Executar as lacunas do plano já aprovado, preservar trabalhos existentes e verificar cada
correção. Não há autorização implícita para deploy, migração em produção ou commit.
Lotes não equivalem a fases. Código, testes, homologação física e implantação devem ter
estados separados. Não declarar concluído o que só está documentado ou coberto por mocks.

## Matriz de fechamento

As lacunas funcionais identificadas na retomada foram implementadas nos lotes 239–244.
Isso não encerra automaticamente os critérios de desempenho, homologação e implantação.
Os registros abaixo da matriz são históricos; o último registro contém os gates frescos.

| Fase | Fechamento funcional desta retomada | Aceite ainda dependente de validação externa |
| --- | --- | --- |
| 1 — Segurança e medição | Transições v1/v2, preservação do original, CAS/quota/lápides, restauração e isolamento de leitura corrigidos; conflito entre duas abas exercitado | Servidor implantado, cliente antigo e dois aparelhos/perfis reais |
| 2 — Arquitetura e desempenho | Conteúdo autoral separado de miniaturas, reenvio com cache/cancelamento, backup progressivo, descarte de GPU e retenções do Three corrigidos; 20 ciclos estáveis | Orçamentos de frame/entrada em hardware de referência; custos extremos CPU continuam explicitados abaixo |
| 3 — Oficina e navegação | Carregamento recuperável, imagem de apoio, grade e snap da sessão; jornadas em três engines | Redesenho visual em outra sessão; revisão final de temas, trackpad e toque físico |
| 4 — Organização e modelagem | Caminhos fechados e chanfro com recusa antecipada; invariantes de topologia, mundo, UV e undo verificadas | Uso das ferramentas no layout final e nos dispositivos escolhidos |
| 5 — Pintura, UV e materiais | Pintura 2D/3D, reabertura, consentimento, UV animada e limite de pixels corrigidos; imagens e arquivos decodificados independentemente | Homologação visual e de toque |
| 6 — Animação e Estúdio | Poses/reprodução sobrevivem a miniaturas; revisão nos dois sentidos, fila cancelável, perfil/projeto/instância corretos e flipbook limitado | Roundtrip com a nuvem implantada e avaliação no dispositivo de referência |
| 7 — Esqueleto e skinning | Vínculo/desfazer/refazer/exportação de ossos pelo fluxo público; testes de pesos, IK, bake, clonagem/descarte e benchmarks preservam resultados | Primeiro toque e commit em cenas extremas; fluidez e compreensão do pincel em aparelho físico |
| 8 — Intercâmbio e reutilização | glTF/OBJ/PNG/apresentação adicionados, backup misto restaurável, ponte com aceite e fixtures de formatos verificadas | Homologar arquivos representativos externos dentro do contrato de compatibilidade |
| 9 — Aprendizado e homologação | Templates em três níveis, práticas/dicas, percursos públicos, offline, recuperação e três engines | Crianças de 9–11 anos, dispositivos físicos e validação do redesenho concorrente |

Contrato detalhado, incluindo PBR bbmodel e extensões glTF ainda não decodificadas:
[`2026-09-10-molda-compatibilidade.md`](2026-09-10-molda-compatibilidade.md).
Não interpretar suporte com recusa/relatório como importação irrestrita de qualquer arquivo.

## Ordem de execução

1. **Implementado e verificado no lote 239:** falhas reproduzidas de persistência/reconciliação,
   com testes que usam o armazenamento transacional do harness. Preservar versões futuras,
   originais e escritas concorrentes.
2. **Implementado:** perdas silenciosas, recuperação de carregamento e interferência da miniatura.
3. **Implementado:** demais achados confirmados do review 238, cancelamento e donos de operações.
4. **Implementado:** funcionalidades ausentes e jornadas públicas de pintura/animação/ossos/backup.
5. **Verificação final:** gates e evidências abaixo; aceite externo permanece separado na matriz.

## Registro desta retomada

- Histórico recuperado e cruzado com Git e documentos.
- **Lote 239 implementado e verificado:** `sceneCloudSource` distingue criação ativa, apagada,
  ausente e ilegível. A escrita é direcionada pela geração dona local, incluindo lápides.
  Uma edição remota v1 é convertida quando o aparelho já usa cena v2; não recria o inventário
  antigo. Uma cena remota sobre v1 preserva os registros originais e promove em uma transação.
  A restauração usa a revisão da lápide com a operação própria de restore.
- `adoptCloudScene` reutiliza a promoção atômica; download concorrente perde por comparação,
  e falta de quota não deixa promoção parcial. A geração futura/ilegível não vira ausência.
- O reconciliador compartilhado isola falha de leitura na exclusão por item e mantém a marca
  da exclusão até a restauração ter sido gravada com sucesso.
- Regressões novas: cinco casos vermelhos no armazenamento antes da correção, dois no
  reconciliador; depois, concorrência/quota e quatro percursos do espelho com IndexedDB.
  Focais: 30 testes Molda e 66 Kids, zero falhas. Typecheck Molda e Kids passou.
- Gates desta retomada: **2.858 testes Molda** (1.047 + 797 + 1.014, 382 arquivos),
  **632 testes Kids** (85 arquivos), zero falhas; typecheck nos dois pacotes;
  Biome nos sete arquivos TypeScript alterados e `git diff --check`; build Kids;
  **14/14 e2e Chromium**. Nenhum aviso `act` na integral Molda.
  Evidências em `.audits/molda-evolution/retomada-l239/`:
  `molda-tests.log`, `kids-tests.log`, `kids-build.log`, `molda-e2e.log`.
- A reconciliação real do servidor, abas de versões distintas, equipamentos físicos e
  usabilidade infantil não foram homologados neste lote. O IndexedDB dos novos testes usa
  o harness transacional `fake-indexeddb`; não é o servidor de produção nem uma GPU real.
- **Próximo trabalho funcional (lote 240):** perdas na ponte do Estúdio,
  carregamento recuperável e miniaturas interferindo na animação. A matriz de funcionalidades
  ausentes acima permanece aberta; este lote não conclui as nove fases.

## Como continuar após nova interrupção

### Trabalho em curso após o pedido “Então complete todas as fases”

O pedido permanece **executar todas as lacunas**, não apenas recuperar a conversa nem
parar após o próximo lote. Não houve commit, push ou implantação. Não há agentes auxiliares.

Lote 240 implementado, em verificação integral:

- `EditorState.content` mantém a identidade autoral enquanto `asset` inclui miniatura e
  carimbo de salvamento. Oficina, player e gestos de animação usam essa identidade. Miniatura
  não cancela pose, prévia assistida nem reprodução; mudanças autorais continuam invalidando.
  `renderThumb` recusa poses transitórias. Registrar pose conserva a miniatura mais recente;
  importar uma criação ainda limpa a foto anterior. Operações de imagem aceitam metadados
  usando o comparador COW existente, sem aceitar outro conteúdo.
- `DeferredModule` generaliza o carregador recuperável existente e abre a oficina pública.
  Retry de importação, retorno à galeria e descarte de resposta tardia permanecem testados.
  Ainda conferir a falha de chunk em navegador real (cache nativo de módulos).
- Ponte v2 usa leitura estruturada da persistência e `exportLoadedSceneForStudio` para o
  snapshot já salvo. Cache com orçamento em bytes; chave distingue perfil, id, revisão de
  armazenamento ou identidade do snapshot (não depende só do relógio). Aceite das perdas
  vale apenas para a revisão preparada. Studio/Kids exibem e devolvem o aceite; a oficina
  permite aceitar a atualização ou manter a cópia anterior. Callback antigo não apaga nova
  revisão. Miniatura não reexporta o modelo nem engole um reenvio autoral pendente.
- `KHR_texture_transform` também é obrigatório quando utilizado. Fixture flipbook do
  Estúdio atualizada após comprovar BIN idêntico e JSON idêntico fora da nova declaração.
- UV fora de [0,1] em qualquer uso de um material animado gera aviso específico e uma cópia
  estática do primeiro quadro, após aceite; não amostra uma célula vizinha. Prévia de todas
  as utilizações ocorre antes do primeiro material, reutilizando buffers derivados.
- Orçamento de pixels usa COPY com mensagem orientada à criança.
- Chanfro verifica pontos compartilhados antes de alocar IDs/reindexar por quina. Teste
  de comutatividade compara superfícies, coordenadas, orientação, UV e materiais.
- Runtime do Estúdio limita sequência/células a 256, FPS a 0,1–60 e valida inteiros/booleanos
  sem coerção. Cinco GLBs alterados reproduziram as falhas antes da correção; agora ficam
  estáticos sem executar metadados inválidos.

Evidência focal atual: 20 testes ponte/reenvio; 11 UI Studio (sem avisos act após ajustar
o helper de ações assíncronas); 11 runtime flipbook; 98 oficina/carregador; regressões de
pose/player/pintura e importação. `typecheck` Molda, Kids e Studio passou antes dos últimos
ajustes menores, repetir ao fechar. Biome aplicado nos arquivos alterados, repetir.

Integral em andamento: test:1 passou com **1.050 testes** após atualizar a expectativa da
mensagem de pixels. test:2 encontrou três regressões reais (foto antiga preservada em
importação por uma generalização excessiva do stamp) e um contrato antigo de thumbnail;
stamp corrigido, preservação da foto restrita ao registro de pose. Testes focais de
importação voltaram a passar. Segunda execução test:2 + test:3 iniciada, logs
`.audits/molda-evolution/l240-molda-tests2.log` e `l240-molda-tests3.log`.

Essas alterações foram iniciadas e estão registradas abaixo. Não repetir recuperação de histórico. Continuar pelos arquivos reais
e pelos critérios da matriz, sem transformar ausência de homologação física em conclusão.

Ler este arquivo, o acompanhamento no início do plano principal e o último registro abaixo.
Conferir `git status` e o diff antes de editar. Não reler integralmente o histórico JSONL
nem as milhares de linhas do registro de lotes. Executar os testes pertinentes ao estado
atual; contagens históricas não certificam o código novo.


### Continuação: lotes 241 e 242 (implementados, ainda sem fechamento integral)

- L240: test:1 = 1.050/0; test:2 = 799/0 após corrigir três regressões de foto na importação
  e a leitura do último asset ao executar comandos. Test:3 tinha dois contratos antigos que
  esperavam cancelamento da pose ao trocar miniatura; atualizados com testes positivos de
  registro/undo. Focais PoseSet/TwoBone = 34/0. Repetir a integral após os lotes seguintes.
- L241: `closed?: boolean` em caminhos nativos; laço sem repetir o primeiro ponto, tampas
  incompatíveis recusadas, seleção de ciclo determinística, transporte paralelo com torção
  distribuída por comprimento, UV fecha em V=1. Nove testes de geometria/comandos (8.739
  asserts), dois focais de oficina. Referência de imagem na nova oficina reutiliza o guia
  local. Grade e passo de deslocamento são estado da sessão. Teste com alças Three reais
  comprova snap relativo, coordenadas fracionárias preservadas e um undo. Teste de captura
  comprova foto em repouso, recusa de pose transitória e retomada. 14 e2e antigos passaram.
- L242: worker GLB aceita destino opcional glTF/OBJ, integrante do token. glTF contém BIN
  em data URI, sem perder materiais/clipes/ossos. OBJ produz ZIP com OBJ/MTL/PNG; assa mundo,
  reflexões e skin em repouso; cores MTL sRGB e V invertido. Perdas de organização, movimento,
  PBR/amostragem exigem aceite. Consumo independente: validator Khronos, Three GLTF/OBJ/MTL,
  Sharp. Três testes novos mais protocolos/hook passaram; repetir typecheck e Biome.
- PNG 1024² e apresentação HTML com 24 vistas 384², offline, sem autoplay/CDN. Captura
  compartilha renderer/alvo temporário, oculta guias e recusa pose/isolamento. Preparação
  cede entre vistas, cancela em edição/blur/unmount, download só por clique. O teste de
  navegador encontrou PNG baixado como texto; corrigido para Blob binário e validado
  por Sharp. E2E de quatro formatos e apresentação offline passou após a correção.
- ZIP lê/comprime uma cena por vez via `read()` adiado, preservando envelope v1. Leitor
  por faixas inclui projetos/*.molda.json de ZIPs antigos e novos, limita soma/entradas,
  verifica CRC por chunks de 4KB e recusa arquivo corrompido mesmo que JSON parseie.
  Galeria valida todos os projetos antes de gravar, restaura com IDs/nomes novos; cada
  cena é transacional. Falha parcial de quota informa a contagem já restaurada, sem
  substituir originais. Novo teste de pacote misto real com nativeDatabase, streaming/
  cancelamento e CRC = 3/0; 24 testes anteriores de ZIP/leitor/galeria passaram.
- E2E novo de referência/grade/passo/backup/restauração = passou. Falha real do módulo
  SceneWorkshopHost recupera após botão Recarregar página; a criação é conservada.
  DeferredModule também aplicado aos painéis paint/import/animação (ainda verificar
  integral da oficina após essa troca); retorno interno usa Voltar à oficina.
- Reenvio passou a abortar worker/ignorar resposta de exportação superada, sem cancelar
  entrega já iniciada. Teste serial ajustado para realmente iniciar primeira entrega antes
  de enfileirar a segunda; 13 testes de reenvio/carregador passaram. Falta teste específico
  de cancelamento de exportação. `listGalleryForStudio` prende o store de cena antes do
  await v1 (evita misturar perfis); falta regressão específica desse caso.

Logs recentes: `.audits/molda-evolution/l242-{file-tests,export-tests,backup-tests,e2e,resync-tests}.log`.
A última execução e2e contém dois testes verdes; a de chunk passou na execução anterior.
Nada foi commitado/publicado. Typecheck em execução ao escrever este registro (58701).
Ainda faltam fechar erros de tipos/lint, testes de cancelamento novos, verificar templates
progressivos e percursos públicos pintura/animação/skin/abas, medidas de desempenho/ciclos,
compatibilidades documentadas e integral Molda/Kids/Studio/build/e2e em mais navegadores.
Não encerrar a tarefa apenas por ter terminado um lote. Homologação física e com crianças
não pode ser simulada nem marcada concluída pelo teste automatizado.

### Lote 243 — jornadas e ciclo de vida (em execução)

- Templates agrupados em três níveis, com uma prática sugerida por modelo; dicas contextuais
  de ossos/pesos adicionadas. Tipos Molda e 135 testes focais de catálogo/core/ponte passaram.
- Cancelamento real do worker superado e captura do perfil na listagem agora têm regressões
  verdes. DeferredModule conserva apenas módulos carregados com sucesso; falha não fica em cache.
- E2E público de pintura 2D/desfazer/refazer/reabrir, criação/reprodução de clipe e vinculação
  de ossos/exportação GLB passou. A restauração JSON avulsa tinha um bug confirmado: o leitor
  v1 retornava `skipped` para uma cena v2 e impedia o leitor próprio; encaminhamento corrigido.
- Duas abas reais detectam revisão externa e preservam o projeto local para recuperação.
- Estúdio: regressões reproduziram importação pendente adicionando no projeto aberto depois
  ou após fechar o diálogo. Dono da operação e projeto são conferidos antes da entrega; 13/0.
- Teste de vinte aberturas encontrou contexto WebGL retido após sair; renderer dono agora chama
  `forceContextLoss` ao encerrar. Heap snapshot também mostrou listener no documento retendo
  OrbitControls/canvas: efeito de montagem alterado para layout, para descartar antes da remoção
  do canvas. Memória caiu, mas contagem de DOM ainda cresce; investigação de retenedores continua.
- Playwright agora tem Firefox e WebKit para a oficina. Primeira rodada em execução: modelagem
  e quatro exportações passam em ambos; pintura/animação/ossos/abas passam em Firefox. Um teste
  de referência/backup foi interrompido por HMR durante formatação; repetir com fonte estável.
- Novo e2e do Estúdio importa três formatos pela ponte e reabre mantendo vínculo; ainda executar.
- Biome passou em 97 arquivos (20 formatados). Último typecheck Molda passou. A integral anterior
  parou em uma falha de remount do módulo lazy; cache positivo corrigiu a regressão focal, integral
  completa ainda necessária. Testes de memória continuam abertos, não relaxar o critério sem causa.

### Fechamento técnico do lote 243 — continuação

- Memória: segundo retentor era o LUT global do Three 0.184.0. Patch versionado na raiz dá
  a cada renderer sua Texture, com dados compartilhados e descarte próprio. OrbitControls
  também passa a conservar o nó de registro, removendo keydown e keyup mesmo com canvas
  destacado e Control pressionado. A solução temporária via useLayoutEffect foi retirada;
  a correção pertence ao controle e cobre também previews/hosts sem React. Teste novo 3/0.
- Vinte ciclos com GPU real em Chromium passaram: DOM 143/142/142/142; heap após GC
  16,99/17,92/18,06/17,99 MB nos ciclos 5/10/15/20; zero contextos ativos após cada saída.
  Medição em `l243-memory-samples.json`. Antes, +3.104 nós e contexto ainda ativo ao sair.
- Patch aplicado por `bun install --frozen-lockfile`; só três linhas novas no lockfile,
  sem atualização de dependências. Three 0.180.0 do Estúdio permanece separado.
- Molda: test:1 1.057/0, test:2 803/0. test:3 encontrou select de exportação sem `name`;
  corrigido, nova execução test:3 1.028/0. São 2.888 testes verdes nos três grupos.
- Benchmarks de persistência, worker GLB e pincel de pesos rodaram com hashes originais
  e fonte intacta. O script do worker estava desatualizado: faltava `animatedPaint:false`
  no pedido obrigatório. Corrigido o script, não afrouxado o protocolo. Resultados CPU em
  `l243-bench-{persistence,glb,skin}.log`; NÃO são certificação de tablet/GPU nem de disco.
- Usuário confirmou outra sessão preparando o redesenho da interface neste diretório.
  Arquivos novos `domContract*` e `SceneWorkshop.contract.test.tsx` são dessa frente;
  preservar. As verificações finais precisam distinguir mudanças simultâneas de regressão.
- Em execução: integral Estúdio. Ainda executar tipos dos três pacotes, Kids testes/build,
  Chromium completo após patch, Firefox referência/backup, WebKit restantes (uma execução
  ficou presa e foi interrompida), e novo e2e da ponte no Estúdio. Não declarar homologação
  física, com crianças ou implantação em produção.

### Lote 244 — integração em builds estáveis

- `Guardar e voltar` drena a fila e conserva a oficina aberta quando a cópia do Estúdio
  exige revisão. O perfil é capturado na montagem; uma troca durante teardown não redireciona
  a exportação. Criações sem vínculo são identificadas antes de codificar, dispensando aviso.
- O novo e2e do Estúdio encontrou uma regressão da guarda de projeto: o handler consultava
  a store global, embora o host monte stores por instância. Agora usa `useProjectStoreApi`
  tanto para confirmar o projeto quanto para resolver colisões de nome. O teste importa GLB,
  PNG e HDR pela interface, recarrega e confirma os três vínculos. Passou; sonda temporária de
  IndexedDB foi retirada. Regressão de componente com Provider cobre a diferença entre stores.
- E2E Molda agora compila/serve uma versão estável. Instrumentação dos previews existe no
  playground em modo `e2e`; nunca entra no app Kids. Portas alternativas 5199/5200 preservam
  a sessão de interface em 5198. Reutilizar servidor exige opção explícita.
- WebKit reproduziu retenção de módulo que falhou no preload mesmo após reload. Trace mostrou
  uma única requisição abortada e nenhuma nova após recarregar, compatível com
  [WebKit 270357](https://bugs.webkit.org/show_bug.cgi?id=270357). O build Vite do playground
  desativa `modulePreload`; a recuperação por import/reload normal passa. Não foi alterada a
  asserção nem implementado retry infinito. O host Kids usa sua própria compilação Next.
- Chromium: **21/21**; Firefox: **9/9 funcionais**; WebKit: **9/9 funcionais** depois do ajuste.
  Memória depende de CDP, por isso só esse caso é pulado nas outras duas engines.
- Medição final em build minificado, após o patch definitivo de OrbitControls: heap
  7,47 / 8,39 / 8,49 / 8,52 MB e DOM 138 / 138 / 137 / 137 nos ciclos 5/10/15/20;
  zero contextos WebGL ativos após cada saída. `l244-memory-samples.json`.
- Kids: tipos e **632/0** testes passaram após o preflight do vínculo. Build em verificação.
  Ainda concluir a rodada final Molda/Estúdio e atualizar os totais; não usar os números
  históricos como se já verificassem as últimas mudanças.

Atualização dos gates: Kids concluiu build de produção, inclusive TypeScript e geração de
rotas. Molda concluiu tipos e **2.903/0 testes**: 1.057 + 817 + 1.029, em 388 arquivos,
sem avisos `act`. Estúdio: o novo teste de instância passou, **14/0** no diálogo; a integral
e tipos estão sendo repetidos após essa correção. `git diff --check` passou.

O lint completo encontrou formatação em `sceneCommandRegistry.ts` e depois no teste novo
desse registro, arquivos da sessão de interface ainda em construção. Foram preservados.
Não atribuir esse resultado ao núcleo nem anunciar lint global verde enquanto houver essa
mudança concorrente. A suíte de navegador usa build estável, mas não homologa alterações
visuais escritas depois da compilação. HEAD observado nesta rodada: `e6116c37` (interface).

Durante o gate final foram encontrados quatro processos Bun de testes do Molda iniciados
em 07–08/09 ainda consumindo CPU (PIDs 46576, 52168, 22436, 41332). Após conferir executável,
comando e data, foram encerrados; os processos da sessão de interface de 10/09 foram
preservados. Essa contenção reforça que os números CPU anteriores são observações do
ambiente, não homologação de latência em hardware de referência.

A sessão de interface concluiu a formatação do registro: lint global Molda foi repetido e
passou em **1.201 arquivos** (`l244-molda-biome.log`). Os 98 arquivos alterados do Molda,
fora desse registro concorrente, e os 14 arquivos de Studio/Kids também passaram nas
checagens escopadas. O check de tipos do Estúdio apontou duas propriedades opcionais no
novo teste de instância; os acessos foram corrigidos e o gate está sendo repetido.

Roteiro pronto para o aceite que esta máquina não pode executar:
[`2026-09-10-molda-homologacao.md`](2026-09-10-molda-homologacao.md).

Rodada final conjunta, já com modulepreload desligado: **39/39 e2e Molda** (21 Chromium,
9 Firefox, 9 WebKit), mais duas omissões esperadas da medição CDP. O e2e do Estúdio é
adicional: **1/1**, importando/reabrindo os três formatos com os vínculos preservados.

### Gates finais da frente funcional

| Gate | Resultado | Registro em `.audits/molda-evolution/` |
| --- | --- | --- |
| Molda, três grupos de testes | 2.903 passaram, zero falhas, 388 arquivos | `l244-molda-tests.log` |
| Estúdio, suíte completa após a correção por instância | 7.966 passaram, zero falhas, 506 arquivos | `l244-studio-tests.log` |
| Kids, suíte completa | 632 passaram, zero falhas, 85 arquivos | `l244-kids-tests.log` |
| Tipos Molda / Estúdio / Kids | Passaram | `l244-{molda,studio,kids}-types.log` |
| Build de produção Kids | Passou | `l244-kids-build.log` |
| Molda, Chromium / Firefox / WebKit | 39 passaram; 2 omissões CDP esperadas | `l244-molda-browser-final.log` |
| Estúdio, ponte e persistência dos três formatos | 1 passou | `l244-studio-bridge.log` |
| Lint global Molda | Passou, 1.201 arquivos | `l244-molda-biome.log` |
| Lint das alterações Studio/Kids | Passou, 14 arquivos | `l244-studio-kids-biome.log` |
| Memória, vinte ciclos Chromium | Zero contextos ativos após fechar; DOM/heap dentro dos limites | `l244-memory-samples.json` |

As evidências pertencem às fontes lidas/compiladas em cada execução. O usuário confirmou
uma sessão de interface em paralelo; a validação dela após novas alterações continua sendo
necessária. Foram preservadas também mudanças concorrentes fora do Molda. Nenhum código
foi commitado ou publicado por esta retomada.

### Desempenho: medições e limite do aceite

As sondas CPU foram repetidas sequencialmente após encerrar os processos antigos e concluir
as suítes: Windows, Ryzen 5 5600G, Bun 1.3.11, com aquecimento e hashes de resultado
preservados. Os números abaixo são da repetição `l244-bench-{persistence,glb,skin}.log`;
os registros `l243` refletem a contenção anterior. Persistência usa fake-indexeddb e não
mede disco físico. As três sondas terminaram com código zero e fontes intactas.

| Sonda | p95 observado | Interpretação |
| --- | --- | --- |
| Persistência pequena | metadados 5,29 ms; pintura 5,29 ms; leitura 1,69 ms | Custo CPU/transações do harness |
| Persistência, teto de 32 MiB | metadados 98,91 ms; pintura 147,16 ms; leitura 69,79 ms | Ainda caro em cenas extremas; não equivale ao p95 de entrada no navegador |
| GLB pequeno, worker | total 78,50 ms | Inclui a tarefa assíncrona inteira |
| GLB 9.216 faces | preparo síncrono 62,99 ms; total 410,00 ms | Precisa avaliação no orçamento de entrada do hardware escolhido |
| GLB com 32 MiB de pixels | preparo 42,05 ms; total 706,34 ms | Transferência/preparo ainda custosos no extremo |
| Pincel de pesos, 8.281 vértices | preparo 8,72 ms; primeiro ponto 34,42 ms; movimento 0,064 ms | Preparação inicial é mais cara que o movimento |
| Pincel de pesos, teto de vértices | preparo 65,19 ms; primeiro ponto 48,41 ms; commit 37,37 ms | Avaliar preparo e primeiro ponto juntos no fluxo, sem certificar latência por uma parcela isolada |

O limite de frame p95 16,7/33,3 ms e entrada p95 50 ms permanece **não certificado**.
O teste de memória prova liberação/crescimento limitado em Chromium; não certifica esses
tempos, tablets físicos ou a compreensão das ferramentas por uma criança.

## Estado para a próxima frente

As correções funcionais desta retomada e seus gates estão concluídos. Não há processo de
verificação desta frente deixado em execução. O aceite integral das nove fases continua
aberto nos itens da matriz: interface final da sessão concorrente, compatibilidade externa
representativa, desempenho em hardware de referência, dispositivos/perfis/servidor e uso
com crianças. O roteiro de homologação e a ordem de rollout estão preparados; nenhum
desses itens foi marcado como executado sem evidência.
