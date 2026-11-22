# Pinta — execução da continuação aprovada

Base inicial: staging `30f6d22963ee57769c970a93c9c63d4492101bb5`.
Execução isolada em `pinta-missao-retomada-20261121`, sem alterar arquivos do Molda.
Este documento continua o plano da missão e o design de regiões de 20/11.

## Ordem e critérios de fechamento

- [x] 0. Fechar gravador 6 com produtor real, leitor anterior, erros de cliente
  antigo, CAS, recuperação offline e rollback B → A → B em staging.
- [ ] 1. Promover regiões somente após adaptar todos os consumidores, preservando
  IDs, metadados, recursos, snapshots e formatos antigos.
- [ ] 2. Completar os dois motores JavaScript e Python, atualização e publicação
  sem perder arquivos, blocos ou programação; investigar a divergência histórica de IR.
  Python inclui obrigatoriamente **Pygame, Pygame Zero e Raylib 2D**, conforme
  esclarecimento de 22/11. Conferir cada extensão/runtime separadamente: carga
  estruturada, camadas, animações, objetos/propriedades, colisões, portas e
  atualização preservando o programa. Provas de Pygame não qualificam os outros
  dois destinos. Compartilhar dados/codec e geometria independentes de motor,
  com adaptadores próprios nas fronteiras; sem alterações funcionais 3D.
  Outra frente reorganiza áreas/categorias dos blocos. Esta missão reutiliza os
  blocos existentes e acrescenta somente operações ausentes, preservando IDs,
  entradas e projetos salvos; não reorganiza áreas, categorias ou navegação.
  Acordo confirmado com a frente Áreas do projeto no Python (22/11): categorias
  das extensões permanecem livres para os novos comandos; Áreas do projeto é
  uma categoria separada. Carregamento solto usa Ao iniciar; desenho e operações
  ficam nos eventos/laços existentes; valores não têm área. Não editar
  `src/python/blocks/areas.ts` para comandos/valores. Se for necessário um chapéu
  novo de evento/laço ou controle de ligar/desligar o jogo, informar seu ID para
  coordenação dessa tabela. Não há chapéus adicionais previstos no escopo atual.
  Não editar `python/extensions/raylib/commonCatalog.ts`: usar apenas arquivos
  específicos do 2D. Pontos de contato: `official-extensions/map-2d/catalog.ts`
  e catálogos Python pygame/pgzero/raylib2d. IDs adicionais ainda não definidos.
  Esta missão requalifica os jogos/recibos afetados pelos blocos que acrescentar,
  incluindo os catálogos após a reorganização da outra frente (58 Pygame Zero,
  nove Raylib 2D e conferência Pygame no inventário informado; conferir o
  inventário final real). A versão do motor Python e a lista aprovada de blocos
  saem juntas, com todas as frentes, geradas por quem concluir por último sobre
  a integração final. Não publicar uma versão independente somente deste lote.
- [ ] 3. Adaptar todas as ferramentas existentes de terreno às regiões.
- [ ] 4. Integrar objetos, conjuntos vinculados, cópias e espalhamento.
- [ ] 5. Integrar geometria, caminhos, portas, animações e profundidade.
- [ ] 6. Completar câmera, minimapa, teclado/toque, cancelamento e mensagens na oficina atual.
- [ ] 7. Validar os novos contratos em Tiled, Phaser, Pygame e Godot reais.
- [ ] 8. Completar IO incremental, cache, autorregras multicamadas e projeções.
- [ ] 9. Executar os dez passos da Vila e Floresta, variantes e PyDew Valley;
  revisar, atualizar guias, registrar evidências e preparar PR, sem merge automático.

## Continuação dos consumidores de recursos e histórico

1. [x] Capturar, atualizar, reconectar e limpar versões no mesmo núcleo genérico de
   mapas. O ramo 8 deve carimbar e conferir a nova versão sem normalização com
   perda, compartilhar os chunks e recusar atomicamente uma referência inválida.
   Manter a política densa existente e verificar seus controles reais na oficina.
   Fechado em `qa/versoes-de-recursos-por-regioes-2026-11-21/`, no diretório da
   missão: dez regressões novas, oito falhas históricas reproduzidas, 2.592 testes
   completos e sete ensaios de navegador. A migração conserva IDs/buffers e recusa
   snapshots não preserváveis. O formato 8 continua interno.
2. [x] Adaptar a estimativa de memória e a enumeração das partes compartilhadas para
   medir buffers dos chunks, sem materializar a extensão lógica. O histórico deve
   contar uma vez os mesmos buffers entre mapas, conjuntos e revisões, mantendo
   seus tetos. Demonstrar desfazer/refazer sobre o núcleo real de histórico; isso
   não promove regiões artificialmente para o store público antes do IO.
   Fechado em `qa/memoria-por-regioes-2026-11-21/`: medição finita de buffers,
   50 gestos no documento de 4 MiB e descarte por orçamento, sem perder redo.
   Metadados passam a participar da estimativa de edição/captura, preservando a
   métrica do leitor legado e seu backup. Suíte 2.600, 62 testes focados e dez
   ensaios de navegador; tipos completos dos dois pacotes aprovados.
3. [x] Completar operações de árvore de camadas, remapeamento de peças e dependentes
   pelo contrato comum antes de ampliar store, protocolo físico e adaptadores.
   Camadas verificadas em `qa/camadas-por-regioes-2026-11-21/`: suíte 2.608,
   45 testes focados, 39 ensaios e tipos completos dos dois pacotes. Camada
   regional vazia não aloca a extensão; defaults/frações e vínculos explícitos
   sobrevivem ao codec, sem serializar payload na edição de cabeçalhos.
   Remapeamento e dependentes verificados em
   `qa/remapeamento-por-regioes-2026-11-21/`: chunks e flags preservados,
   admissão agregada antes do payload e lote inteiro recusado se um consumidor
   falhar. Correção pública também conserva revisões pendentes entre duas edições
   de peças antes do autosave; desfazer/refazer e reabertura no IndexedDB real.
   Suíte 2.622; ensaios distinguem controles atuais e falhas históricas esperadas.
   Próximo: leitores de consulta/achatamento orçado e demais consumidores antes
   da promoção do store, persistência física e adaptadores.
   Consultas verificadas em `qa/consultas-por-regioes-2026-11-21/`: sete testes
   novos, quatro falhas históricas reproduzidas, saída temporária com orçamento
   fixo de 65.536 casas, mundo assinado consultado sem materializar lacunas e
   192 comparações JSON densas idênticas no Chromium. Suíte 2.629 e 13 ensaios
   de navegador, incluindo controles anteriores do laboratório e oficina real.
   Prosseguir a crescimento/redimensionamento, curadoria, IO e adaptadores.
   Crescimento, recorte e curadoria verificados em
   `qa/tamanho-por-regioes-2026-11-21/`: expansão compartilha buffers e conserva
   coordenadas globais; recorte preserva objetos e restaura peças por undo/redo.
   Inclui correção pública da confirmação do diálogo. Suíte 2.638, 54 testes
   focados e matriz Chromium de 24 verificações (três reproduções históricas
   esperadas), com 192 comparações JSON densas exatas. Fecha este conjunto de
   operações internas, não a etapa macro 1 ou a ativação da oficina regional.
   Consulta oficial em 21/11 para o adaptador Phaser 3.90.0: o ramo `infinite`
   de `ParseTileLayers.js` ainda preenche uma matriz `width × height` antes de
   aplicar chunks. O pacote atual chama `make.tilemap` mesmo usando o compositor
   próprio para a imagem. Antes de admitir mundos regionais grandes, retirar
   essa materialização do caminho novo ou carregá-la por janelas limitadas;
   conservar os pacotes antigos e provar o orçamento no motor real. Fonte:
   https://github.com/phaserjs/phaser/blob/v3.90.0/src/tilemaps/parsers/tiled/ParseTileLayers.js
   Na promoção, exercitar também a edição de uma folha viva por um leitor que
   não entende um mapa consumidor futuro, inclusive com inventário parcial de
   nuvem. Verificar os guardas existentes e a recuperação antes de escolher a
   proteção; não presumir que recusar somente a gravação direta do mapa cobre
   a mudança dos índices da folha. É critério pendente, não falha já comprovada
   nem motivo para anunciar um protocolo novo sem evidência.
   O escopo deste sublote foi: criar camada regional vazia sem alocar a
   extensão, preservar defaults explícitos, frações e offsets do contrato 8,
   admitir propriedades/árvore sem normalização com perda e comparar apenas
   metadados ao alterar um cabeçalho. Depois remapear índices/flags nos chunks
   armazenados e nos objetos, compartilhando regiões intactas e recusando lotes
   inválidos integralmente. Manter a política densa e provar ambas no navegador.
4. [ ] Completar admissão global de metadados, modelos do store, protocolo físico
   3, backup/transporte 8 e adaptadores de cena 4/PNG 5 antes da promoção pública.
   Preservar recuperação, conflitos, clientes anteriores e programação do Estúdio.
   Integrar primeiro a staging atualizada, revisar a fronteira/runtime afetados
   e repetir os controles correspondentes. Novos leitores precedem a escrita.
   Staging `f5b1ceca8` integrada após revisão da fronteira: 2.641 testes do Pinta
   com os controles reais de Pygame, 184 de contratos/runtimes, 12 percursos
   Pinta–Estúdio e dez de Phaser real, tipos/lint aprovados. Conflito restrito
   ao texto de uma exceção de QA, resolvido pelo remoto; conteúdos 3D recebidos
   preservados. Provas em `qa/integracao-staging-f5b1ceca8-2026-11-21/`.
   Prosseguir à admissão e persistência regional; a etapa macro 1 segue aberta.
   Admissão global de metadados implementada no store existente e no leitor de
   conjuntos, com cache fraco por identidade imutável e recusa antes de host,
   histórico/autosave e decodificação. Provas em
   `qa/admissao-de-metadados-2026-11-21/`: suíte 2.650 e 55 testes focados.
   O padrão público continua `PintaAsset`; a parametrização interna não ativa
   oficina/IO 8. Seguir ao orçamento JSON com encoder efetivo, backup/transporte,
   físico 3 e adaptadores antes de fechar este item ou promover os formatos.
   O contêiner de backup 8 foi preparado internamente em
   `qa/backup-regional-interno-2026-11-21/`, reutilizando RLE, codec de chunks e
   layout da galeria. Medição UTF-8 antes de montar o texto e restauro atômico;
   campos futuros de bitmap não são descartados pelo decoder legado. Orçamento
   de trabalho novo, exclusivo do contêiner 8: 32 MiB de buffers decodificados
   por arquivo, conferidos globalmente por cabeçalhos antes de alocar; separado
   dos 32 MiB de texto e sem alterar 0–7. Não é orçamento de heap total ou limite
   por quantidade. Suíte 2.665 e 46 testes focados. Ainda falta ligar o medidor
   antes de histórico/autosave sem reencodar o mapa por gesto, integrar o backup
   público/transporte, físico 3 e adaptadores. O item 4 e a etapa macro 1 seguem abertos.
   Admissão JSON do documento/lote ligada ao store em
   `qa/admissao-json-2026-11-21/`: resumos numéricos por identidade autoral,
   acordo com o encoder real, timestamp incluído e recusa antes de host,
   histórico/autosave. Uma célula nova recodifica um chunk entre 2.048, sem
   guardar as strings codificadas. Suíte 2.678, 48 focados e 48 ensaios de
   navegador; formatos públicos preservados. A quota da galeria fora do lote
   continua no inventário/host e precisa da integração regional. Seguir ao
   físico 3, proteção dos dependentes, transporte e adaptadores; manter o item aberto.
   Recuperação local diante de formatos futuros verificada em
   `qa/recuperacao-de-formatos-futuros-2026-11-21/`: RAM compatível ganha cópia
   persistente sem tocar o mapa ilegível; edição de peças com consumidor futuro
   isola o lote inteiro e religa as cópias. Selo exato do inventário permite
   continuar a cópia e é revogado se uma revisão opaca mudar. Suíte 2.688,
   61 focados e 24 ensaios Chromium/IndexedDB real, incluindo oficina e CPU 4×.
   O código protege leitores atualizados; não modifica binários históricos nem
   cobre inventário parcial da nuvem. Esses critérios e físico 3 seguem abertos.
   O IO físico 3 foi preparado como política interna do mesmo transacionador,
   sem selecioná-lo na persistência pública. Cabeçalhos precedem payloads;
   conjuntos/metadados e dois chunks em mundo de 100 milhões de casas reabrem
   em outro contexto. No teto de 32 camadas/4 MiB, uma edição grava cabeçalho e
   um chunk. Falha/quota aborta tudo; o leitor público 7 recusa 3 e recupera RAM
   em cópia. Provas em `qa/io-regional-interno-2026-11-21/`: suíte 2.699,
   43 focados, 15 Core e 29 ensaios Chromium. Autoridade/CAS 8, espelho,
   inventário de galeria, host e transporte precisam selecionar/integrar essa
   política antes da promoção. Ainda não é carregamento sob demanda nem fecha
   o item 4 ou a etapa macro 1.
   A política autoral interna 8 foi integrada ao mesmo mecanismo de CAS,
   recuperação, lápides e quota, com espelho compacto por ID/revisão. O clonador
   comum conserva as células regionais. Provas em
   `qa/autoridade-regional-interna-2026-11-22/`: 2.709 testes completos,
   72 focados e 33 ensaios de navegador, tipos/lint aprovados. A revisão
   reproduziu quota incorreta com identidades mutáveis; resumos da persistência
   agora duram uma transação. Cinco mapas máximos cabem no JSON e o sexto é
   recusado; excluir dados inalterados acima do teto continua possível.
   O fluxo de negócio real grava cabeçalho, um chunk e referência, com rollback
   conjunto. A fábrica pública, galeria/host e transporte não selecionam 8;
   inventário parcial de nuvem, adaptadores e rollout seguem pendentes. Não
   fechar o item por essa preparação interna nem anunciar SLA de autosave/heap.
   Antes da fábrica regional, a revisão corrigiu a classificação não atômica
   do caminho público de sprites: consumidor futuro surgido depois da consulta
   de chaves agora força recuperação na própria transação. O inventário não
   requisita chunks antes da validação pelo codec; o leitor antigo passou de
   duas buscas de payload futuro para zero. Medições especulativas de quota
   também foram separadas das confirmadas, inclusive durante warmup/falha com
   timestamp igual. Provas em `qa/gravacao-atomica-de-sprites-2026-11-22/`:
   suíte 2.713, 90 focados e 43 ensaios Chromium; galeria de 500 sprites mantém
   dez leituras para dez autosaves. Isso protege o código atualizado, sem
   promover 8 ou resolver o inventário parcial da nuvem. Próximo: incorporar
   a staging observada `69ced6cb3`, revisar seus pontos do Estúdio e prosseguir
   à fábrica/host, transporte e adaptadores.
   Integração de `69ced6cb3` verificada em 22/11, sem conflitos e com os 16
   conteúdos recebidos idênticos ao remoto. Revisados carga antiga de blocos,
   janela de projeto e recuperação ao esconder/sair da página. Passaram 89
   testes do Estúdio, 12 percursos Pinta–Estúdio e quatro de carga/recarga,
   tipos completos e lint. Fontes Pinta/Core inalteradas; a suíte 2.713 é a do
   pai, não uma nova execução. Recibos em
   `qa/integracao-staging-69ced6cb3-2026-11-22/`. Sem promoção de formatos ou
   merge da feature em staging. Prosseguir à fábrica regional existente.
   Fábrica regional privada integrada ao mesmo mecanismo de persistência:
   namespace, FIFO, CAS, eventos, paletas, recuperação e lápides. Seleciona
   autoridade 8/IO 3 e quota regional, sem alimentar o cache legado com chunks
   ou espelhos compactos. Suíte 2.721, 55 focados e 47 ensaios Chromium, mais
   repetição dos quatro novos após guards de tipo das fixtures. Provas em
   `qa/fabrica-regional-interna-2026-11-22/`. Host/barril público continuam
   na seleção anterior; captura, transporte, inventário parcial da nuvem e
   adaptadores ainda pendem. Não fechar o item 4. Próximo: captura do mundo
   completo pela mesma autoridade e transporte regional, antes do host 8.
   Captura/arquivo nativo regional privados verificados com a Vila real: seis
   recursos, 16 camadas de peças, conjunto e portas, coordenadas negativas e
   reimportação em outro contexto/banco com bytes iguais. O mesmo grafo inclui
   portas ocultas de conjunto usado como raiz. Duas recusas foram reproduzidas
   e corrigidas: folha secundária ausente e lugar futuro opaco. O caminho
   estrito não busca chunks desconhecidos nem muda a captura visual legada.
   Suíte 2.728, 50 focados e quatro ensaios novos aprovados; matriz completa e
   fronteira do Estúdio têm recibos em
   `qa/captura-e-transporte-regional-2026-11-22/`. Ainda não ativa a galeria/host
   ou o transporte público 8. Próximo: contrato cena 4/PNG 5 e seus leitores,
   integração dos consumidores públicos e segurança do inventário parcial da
   nuvem, antes do rollout. O item 4 e a etapa macro permanecem abertos.
   Leitor interno de cena 4 preparado no Core, reutilizando a validação
   semântica da cena anterior e o codec existente. Cabeçalhos globais precedem
   payloads; JSON tem teto de 8 MiB UTF-8 e orçamento agregado de índices
   derivado, mantendo 4 MiB por mapa. Suíte Core 3.214, Pinta 2.728 e 624
   comparações legadas com dados/erros idênticos. Dois controles de mutação
   detectam a retirada das guardas. Provas em
   `qa/leitor-de-cena-regional-2026-11-22/`. Leitor é anterior ao emissor:
   ainda faltam conversão do Pinta/cena 4, PNG 5, motores, host/galeria e
   proteção de inventário parcial da nuvem. Não promover constantes ou fechar
   o item 4 a partir desse contrato isolado.
   Emissor privado cena 4 integrado ao preparo comum de recursos do exportador:
   admissão global de cabeçalhos/índices e metadados antes de payloads/imagens,
   JSON final de até 8 MiB UTF-8 pelo codec nativo compartilhado. Modo de física
   explícito conserva a escolha autoral; armazenamento não ativa colisão precisa.
   Comparação com o commit anterior conserva exatamente 98 exportações 1–3.
   A Vila usa imagens reais e reabre em outro contexto desktop/CPU 4×. Provas em
   `qa/emissor-de-cena-regional-2026-11-22/`. Continuar para composição/PNG 5,
   leitores dos motores e consumidores públicos; não fecha o item 4 ou a missão.
   A staging recebida em `2bb893918` também foi integrada: 39 conteúdos iguais
   ao remoto, sem fonte Pinta/Core/3D alterada. Revisados flush na saída/aba
   escondida, estado do Blockly e arte das atividades. Provas da integração em
   `qa/integracao-staging-2bb893918-2026-11-22/`. Continuar com os adaptadores.
   Composição privada da cena 4 integrada ao mesmo `drawScene`: origem global,
   origem de conjuntos e visita esparsa pelo leitor comum, com resolução da
   imagem admitida antes de DOM/arte. Comparações RGBA denso/regional e históricas,
   PNGs reais da Vila e miniatura 512 do mundo esparso em
   `qa/composicao-de-cena-regional-2026-11-22/`. Não é runtime ou PNG de dados 5;
   seguir a essas fronteiras e aos consumidores públicos antes de fechar o item.
   Envelope PNG de dados 5 preparado privadamente: leitor Core reutiliza cena 4,
   escritor usa o chunk/encoder existente e conserva PNGs legados em 256
   comparações históricas. A revisão corrigiu o ponto assíncrono de serialização
   da primeira refatoração. A Vila real reabre em outra página com pixels e
   dados; leitor Pygame PNG 4 autêntico recusa os novos metadados. Recibos em
   `qa/envelope-png-regional-2026-11-22/`. É fronteira de uma cena e descritores;
   ainda faltam montagem/carga completa de mundos, leitores de jogo/capacidades
   e seleção no host. Não fecha PNG 5 integral, item 4 ou etapas macro.
   Consulta/visita esparsa movida do Pinta ao Core, com reexportação das mesmas
   funções no editor e índice/chaves compartilhados pelos mutadores. Provas em
   `qa/leitura-regional-compartilhada-2026-11-22/`: 16.384 consultas e 512
   percursos idênticos ao código anterior, mais referência densa independente.
   Próximo: consultas/geometria e motores. A criação atual de `rows × cols`
   não serve para cena 4 e seu número de versão não pode ativar física precisa
   em mapas migrados. Sem promoção pública ou fechamento do item por esse núcleo.
   Staging `6a3028a8d` recebida e revisada em
   `qa/integracao-staging-6a3028a8d-2026-11-22/`: 26 de 27 blobs idênticos ao
   remoto; teste SQL unido conserva os corpos anteriores e o caso novo. Correções
   recebidas de recuperação, migração interrompida e abertura transitória do
   Blockly validadas com 157 testes, 36 ensaios de navegador e tipos completos
   Estúdio/member-shell. Nenhuma fonte Pinta/Core/3D alterada. Prosseguir às
   consultas/geometria regionais, sem promover contratos por esta integração.
   Consultas de cena 4 verificadas em
   `qa/consultas-de-cena-regional-2026-11-22/`: contexto por snapshot com o
   leitor comum, origem de conjuntos e bounds assinados nos núcleos existentes.
   O fallback de início mantém a casa zero válida. Probe anterior corrigido,
   sem alterar o recibo histórico: cinco lacunas privadas passam a conferir.
   Suítes 3.241 Core/2.748 Pinta, 50 focados, 44 dos motores, 18.560 comparações
   históricas e 85 ensaios de navegador. Tipos e gerados aprovados; compactação
   controlada mantém os tetos existentes. Seguir aos players/adaptadores e ao
   loader de mundo 5; geometria em memória não seleciona física ou ativa o host.
   Python/Pygame e suas extensões continuam obrigatórios também para regiões,
   atualização sem perda de programação e homologação externa, antes de fechar
   a missão. Não reduzir a entrega a JavaScript ou aos formatos anteriores.
   Admissão dos metadados do mundo preparada em duas fases em
   `qa/admissao-de-mundos-regionais-2026-11-22/`: todos os cabeçalhos e o saldo
   global de texto/índices precedem o primeiro chunk; retorno inteiro ou recusa.
   Vila/Cabana em PNGs reais reabrem em outra página com IDs e início preservados.
   Suítes 3.251 Core/2.748 Pinta, 26 focados, 144 comparações históricas e 77
   ensaios de navegador. Não fecha loader PNG: faltam descompressão limitada,
   CRC/captura de imagens, pixels/superfícies e adaptadores de runtime.
   Extração PNG limitada e admissão de imagens implementadas privadamente em
   `qa/leitor-png-de-mundos-regionais-2026-11-22/`: zlib com saída explícita,
   consumo/checksum/UTF-8 estritos, CRC/duplicatas, captura própria de bytes e
   orçamento global de capas/recursos. Vila/Cabana reabrem em outra página e
   a Vila recomposta conserva exatamente os pixels. Suíte Pinta 2.766,
   25 focados, 79 ensaios, tipos/gerados aprovados. O leitor devolve dados/bytes;
   ainda faltam superfícies/compositores e gameplay dos motores. Seguir à base
   Python independente do motor e seus três adaptadores, sem ativar os formatos
   ou alterar catálogos/versão comum antes da qualificação coordenada.
   Lote verificado: extrair a geometria Python já entregue pelo compositor, com
   conservação exata do texto gerado, e preparar o codec de células regional
   independente de motor. O leitor admite todos os cabeçalhos antes do base64,
   captura os payloads imutáveis, oferece uma tentativa de decode e mantém
   índices por contexto, sem materializar a extensão lógica. Comparar o resultado
   com o Core em CPython real. Isso não admite cenas completas ou PNGs Python,
   nem seleciona física, imagens ou distribuição nas três extensões. Catálogos,
   recibos e versão única do motor permanecem para a integração coordenada.
   Provas em `qa/base-python-geometria-e-regioes-2026-11-22/`: 2.776 testes
   completos Pinta, 22 focados, 79 ensaios de navegador, tipos dos três pacotes,
   lint e geradores aprovados. Geometria/animações comparadas com o Core em
   CPython sem imports gráficos; o compositor entregue conserva seu hash.
   A revisão corrigiu consultas com metadados extras e registrou a auditoria de
   células inteiras na guarda existente. Seguir à admissão Python de cenas e
   mundos, depois aos três adaptadores, sem promover contratos por esse lote.
   Lote verificado: admissão de cena 4 em Python independente de motor. Gerar
   a tabela estrutural do esquema Core, conservando explicitamente propriedades
   tipadas, limite de propriedades e flags de regex; recusar vocabulário novo
   não suportado no gerador. Conferir referências e orçamento de todas as
   definições antes de decodificar; plano privado de tentativa única, sem
   publicar resultados parciais. Comparar Vila, Unicode/UTF-16, números binary64,
   dados inválidos e fronteiras de orçamento com o leitor Core. O PNG/mundo e
   os adaptadores gráficos continuam separados; não ativar receitas ou versões.
   Provas em `qa/admissao-python-de-cenas-regionais-2026-11-22/`: Core 3.252,
   Pinta 2.783, 29 focados e 16 ensaios de navegador. Tipos Core/Pinta e do
   gerador, lint e gerados aprovados; Studio completo pertence ao lote anterior.
   A Vila real e 81 variações são comparadas com o Core; a revisão conserva
   binary64 e entrega inteiros nativos após a admissão. Recusa tardia não muda
   outro snapshot. A guarda oficial reprova tabela adulterada e passa após
   restaurar os mesmos bytes. Seguir ao PNG/mundo Python e aos três adaptadores.
   Lote verificado: captura/CRC e texto PNG no Python comum. Mesmo perfil
   estrutural estático e limites do leitor JavaScript existente; capturar bytes
   imutáveis, recusar duplicata antes de descomprimir, limitar janelas de entrada
   e saída a 16 KiB e exigir fim exato/checksum/UTF-8. Conferir BOM, caps exatos,
   corrupção, URLs inline canônicas e recusa antes da cópia de entrada acima do
   teto. Ainda não admite JSON autoral, mundos, pixels ou superfícies de motor.
   Provas em `qa/leitor-png-python-compartilhado-2026-11-22/`: Pinta 2.790,
   17 focados, quatro controles de navegador, tipos Pinta, lint e gerados.
   BOM/UTF-8, checksum, sobra, fronteira exata de janela e orçamento conferem
   com JavaScript. Expansão limitada e entrada acima do teto recusam antes da
   alocação ampliada. Sem promoção de formato ou catálogo; seguir ao registro
   completo de mundos no Python, com admissão agregada antes de devolver dados.
   Lote verificado: registro de mundo PNG 5 no Python comum. Capturar raiz,
   destinos e recursos; conferir nomes, IDs, escalas, geometria e saldos antes
   dos índices. Tabela de envelope derivada do Core conserva controles Unicode
   e refinamentos de mundos. Medir JSON.stringify sem alocar outra string grande,
   com Unicode/UTF-16 e números binary64. Decodificação de tentativa única,
   nenhuma publicação parcial ou alteração de outro mundo válido.
   Provas em `qa/mundo-png-python-compartilhado-2026-11-22/`: Core 3.253,
   Pinta 2.804, 47 focados e sondagem de 100.026 padrões numéricos sem divergência.
   Tipos Core/Pinta e do gerador, lint e gerados aprovados. Limites reais de
   índices, mapas e texto têm aceitação exata e recusa seguinte; cabeçalhos de
   recursos inválidos recusam antes de buffers. IDAT/pixels e superfícies não
   são qualificados pelo loader; seguir ao núcleo de jogo e três adaptadores.
   Execução paralela autorizada em 22/11: núcleo Python comum (Astra/high),
   adaptadores Pygame Zero/Raylib 2D e motores JavaScript (Sol/high), com arquivos
   e worktrees exclusivos, gates pesados coordenados e revisão central.
   Pygame-ce e integração permanecem na frente principal. Cada entrega passa
   por revisão e provas antes da integração; sem promoção pública antecipada.
   Lotes integrados: núcleo Python comum, adaptadores nativos e os dois
   jogadores JavaScript privados. A revisão independente reproduziu FRect sem
   apoio em plataforma distante, expansão antecipada de objetos e contato
   numérico divergente. O iterador evita alocar milhões de filhos; precisão
   float32 é política do adaptador, mantendo o padrão Core de precisão dupla.
   `qa/adaptadores-python-regionais-2026-11-22/` registra 20 testes focados
   nativos, quatro provas CE/Wasm reais com pixels/portas e 40 quadros de apoio
   fracionário, tipos Pinta e lint. O pequeno fix de elipse subnormal também
   atualiza o helper gerado do compositor legado. A suíte completa deste
   conjunto e tipos completos Studio pertencem ao gate integrado seguinte.
   Permanecem em revisão: transporte browser PGZero/Raylib2D, culling de
   conjuntos, watermark de inventário remoto, causalidade multi-item e todos
   os consumidores públicos. Não considerar a etapa macro concluída.

Na promoção do store, conferir também os orçamentos globais de metadados e JSON
antes do histórico/autosave. A soma de objetos/propriedades em várias camadas
pode exceder o documento mesmo com cada objeto individualmente válido. Reusar
o orçamento compartilhado e os caches por identidade; não descobrir a recusa
somente na gravação nem ampliar os tetos para acomodar o caso.

Cada item conserva revisão, provas e commit próprios. Não acrescentar outro
editor, estilo, teto de memória ou implementação paralela de histórico.

## Decisões aprovadas

Autorregras visuais próprias do Pinta, por exemplos de entrada/saída, com ordem
explícita, prévia determinística e uma entrada de histórico por confirmação.
Tetos: 64 regras, padrões 16×16, oito camadas de entrada/saída,
65.536 células alteradas e 1.048.576 comparações por aplicação.

Regiões 32×32, até 2.048 chunks, 32 camadas, 4 MiB de índices e extensão
de 10.000 células por eixo nos intervalos assinados do contrato existente.
Nativo 8 para regiões; nativo 9 para autorregras/projeções; físico local 3.
Cena 4/PNG 5 para regiões, cena 5/PNG 6 para projeções. Nuvem 7/8 somente
depois dos leitores. Receitas e formatos anteriores permanecem compatíveis.
Hexágonos usam codec de células 32 bits com transformações na própria célula;
o orçamento de 4 MiB permite até 1.024 chunks nesse codec. Não reutilizar
silenciosamente a diagonal quadrada para rotações de 60°/120°.

Alvos nesta máquina: quadro aquecido p95 ≤33,3 ms e feedback do gesto p95
≤100 ms, viewport 1024×768. Medir abertura fria, autosave, buffers e CPU 4×;
não apresentar emulação como outro aparelho físico. Cache de render: 32 MiB.

## Situação de partida comprovada

Leitura do Railway nesta retomada: Community e Kids ainda na fonte 85d16fcd9.
O código da staging já declara escrita 6; integração Git não prova ativação.
As provas anteriores de publicação e análise Python continuam históricas,
com suas versões e escopos. Nenhum rollout novo ocorreu nesta retomada.

Cada lote exige testes, ensaio funcional aplicável, revisão e commit.
Um teste HTTP local com repositório em memória não substitui IndexedDB real,
R2/Postgres, login ou rollback dos serviços publicados.

## Etapa 0 fechada: gravador 6 (21/11)

Produtor autenticado, recusas 4/5, CAS e recuperação offline já registrados foram
complementados pelo ciclo publicado B → A → B em frontend temporário de staging.
A reteve a edição local sem rebaixar a nuvem; B a sincronizou intacta na revisão 4.
Um contexto sem o IndexedDB anterior e o parser público sobre download R2 real
confirmaram os documentos completos. Serviço e regra CORS temporários removidos;
Community/Kids conservaram os deployments concorrentes. Provas e alcance em
`qa/rollback-publicado-2026-11-21/`, no diretório da missão. Isso não homologa a
atualização da cena no Estúdio, Python no domínio temporário ou o formato 8.

## Lote verificado: referências dos conjuntos (21/11)

Clonagem do grafo extraída para o núcleo, com escopos distintos de IDs de
camadas/objetos. Captura e separação religam propriedades de objetos nas versões
de arte incorporadas, versionando somente recursos alterados. Separar conserva
locks herdados; capturar recusa recortes inválidos antes de alocar. O remapeamento
interno preserva vínculos explícitos de regiões, mantendo o legado denso.
Relatório e resultados em `qa/referencias-de-conjuntos-2026-11-21/`, no diretório
da missão. Isso não fecha as etapas 1 ou 4: conjuntos nativos esparsos e seus
consumidores ainda precisam ser integrados.

## Lote verificado: conjuntos internos por regiões (21/11)

Contrato/codec de conjuntos 8, captura assinada por leitor comum, posicionamento
vinculado e separação atômica em chunks. A árvore de grupos, propriedades,
recursos e geometria fracionária são conservados; tetos globais e por gesto são
recusados antes de substituir a instância. Inserção/atualização de objetos usam
admissão estrita; o legado mantém sua normalização. A revisão corrigiu perda de
parallax na separação e a edição acima do teto efetivo do leitor. Provas em
`qa/conjuntos-por-regioes-2026-11-21/`, no diretório da missão. O formato 8 continua
interno: seleção/clipboard, templates, geometria/render, IO e adaptadores seguem
pendentes antes da promoção pública. As etapas 1 e 4 continuam abertas.

## Lote verificado: seleção, clipboard e templates

- [x] Acrescentar edição atômica de vários objetos em `tiles/mapObjects.ts`,
  compartilhando a normalização da edição única; alinhar/distribuir deve calcular
  todos os destinos antes de criar um novo valor de histórico.
- [x] Reutilizar o grafo de `core/mapClone.ts` para copiar objetos e versões de arte
  juntos, sem representar um fragmento como mapa persistível. Em regiões, preservar
  deltas assinados/fracionários; o caminho denso mantém sua política de coordenadas.
- [x] Integrar a admissão e a mescla de recursos no núcleo de `pasteObjects`;
  retirar a mescla duplicada de `MapObjectSelectionPanel.tsx`. Referências de objeto
  nas peças incorporadas devem apontar para as cópias corretas.
- [x] Adaptar `tiles/objectTemplate.ts` ao contrato interno de conjuntos 8,
  com base neutra por chunks, recorte orçado e conservação da geometria completa.
- [x] Reproduzir as perdas antes da correção, executar testes direcionados,
  suíte/tipos e ensaios reais de colagem/modelo; revisar, registrar provas e commitar.

Esse lote segue o design de regiões aprovado em 20/11. Não altera a exposição
pública do formato nem o estilo da oficina.

Revisão e recibos em `qa/objetos-por-regioes-2026-11-21/`, no diretório da missão.
Clipboard 3 protege coordenadas assinadas; os bytes 1/2 continuam iguais ao módulo
histórico. A colagem religa dependências indiretas das versões imutáveis. Os testes
de oficina usam o formato público denso; o teste entre abas de regiões usa apenas
os módulos reais do clipboard em uma página de QA. Nenhuma ativação pública 8.

## Lote verificado: espalhamento de objetos por regiões

- [x] Adaptar `tiles/objectScatter.ts` ao mapa autoral comum, com limites assinados
  e geometria fracionária, preservando a saída densa e a ordem/semente existentes.
- [x] Admitir amostras antes de acumular/sortear, com teto de gesto de 65.536 casas,
  e recusar excedentes atomicamente. Evitar coleções proporcionais ao mundo lógico.
- [x] Conservar grupos, offsets, vínculos vivos, autorreferências e versões de arte;
  a repetição da prévia precisa gerar exatamente o mesmo documento.
- [x] Validar travas, posições, bordas, cancelamento e orçamentos; executar regressão
  da oficina por mouse/toque e revisar antes do commit. Render/IO seguem no lote seguinte.

Provas e revisão em `qa/espalhamento-de-objetos-por-regioes-2026-11-21/`, no diretório da missão.
Incluem 48 comparações idênticas com o núcleo denso anterior e a correção da arte
privada ausente na prévia. O hook de CPU dos ensaios de recursos foi corrigido;
o relatório anterior identifica os quatro casos que não aplicaram o fator.
As etapas 1/4 continuam abertas até o formato público e seus consumidores.

## Próximos lotes: consumidores visuais e renderização

1. [x] Adaptar `tiles/chunks.ts` ao leitor comum, com chunks assinados, recorte dos
   chunks ocupados e orçamento constante do viewport/cache. Comparar pixels do
   legado e regiões deslocadas, transformações, offsets e animações reais.
2. Adaptar renderizadores de miniatura/imagem e minimapa com dimensões limitadas,
   sem achatar a extensão lógica numa matriz ou canvas gigante. Conservar o
   comportamento visual legado, recursos e múltiplas folhas.
3. Completar ferramentas (`mapBrush`, formas, seleção/movimento e recursos) com
   admissão antes de alocar, coordenadas assinadas e mensagens explícitas de recusa.
   Integrar câmera, viewports e navegação aos mesmos contratos de coordenadas.
4. Medir e perfilar o caminho de renderização estabilizado; otimizar uma causa por
   commit, conservando os pixels. Medir quadro aquecido, primeira pintura e gesto
   separadamente, com o cache de 32 MiB. Não confundir a redução anterior de 60%
   com aprovação dos alvos de fluidez.

Cada item será um lote revisado e verificado. A promoção pública e o IO 3 seguem
condicionados à integração de todos os consumidores e às provas dos adaptadores.

O primeiro item foi verificado em `qa/renderizacao-por-regioes-2026-11-21/`, no
diretório da missão: 84 testes focados, suíte completa, 168 comparações de imagens
e 12 ensaios da oficina. A referência conserva os mesmos chunks globais e o mesmo
orçamento. Isso não fecha os demais consumidores visuais nem o formato público.

### Lote imediato da revisão: composição com opacidade

- [x] Corrigir a condição de equivalência do caminho direto sob pressão quando
  há opacidade de camada, sem alterar o caminho rápido nas condições qualificadas.
- [x] Reproduzir o achado no renderer anterior, isolar fonte/camada e conservar
  os recibos; comparar contra o cache canônico no Chromium, além do motor nativo.
- [x] Acrescentar provas de caminho rápido com opacidade total e de fallback com
  opacidade composta, sem retirar a comparação rigorosa de pixels.
- [x] Repetir suíte, navegador e revisão; registrar o custo/limites da guarda e
  commitar separadamente antes de prosseguir às miniaturas e ao minimapa.

A reprodução densa de `8d40b4b1b` já confirmou 36.061 canais diferentes (delta
máximo 2) na escala 1. Fonte opaca não bastou; camadas opacas eliminaram a
diferença nos quatro zooms ensaiados. A correção fica em commit próprio para
separar mudança de armazenamento e condição de composição.

Fechado em `qa/precisao-de-opacidade-2026-11-21/`, no diretório da missão. A guarda
exige opacidade composta total para o caminho direto; os demais casos conservam
o cache canônico. A reprodução anterior e as 24 variantes passaram a zero canais
diferentes. As 192 comparações de imagens e os 12 ensaios da oficina passaram,
sem ampliar memória ou mudar estilos. Os alvos de latência seguem não qualificados.
O trabalho volta ao item 2 dos consumidores visuais: miniaturas e minimapa.

### Lote do item 2: visão geral e navegação pelo minimapa

- [x] Tornar a resolução de folhas/versões independente do armazenamento das
  células. Em regiões, referência padrão ausente não deve escolher uma arte
  diferente; o fallback de folha única dos mapas legados permanece compatível.
- [x] Centralizar o cache de cores dominantes no núcleo, sem montar um mapa
  autoral fictício para calcular a cor de cada peça. Conservar a API antiga.
- [x] Criar visão geral com no máximo 256 × 256 pixels. Em regiões, visitar
  células armazenadas; não alocar `cols × rows`. Respeitar ordem, visibilidade,
  offsets, recorte lógico e fontes compatíveis. Ela continua sendo representação
  aproximada em cores, não exportação visual nem documento autoral.
- [x] Quando várias casas ocupadas caírem no mesmo pixel, desempatar pela ordem
  global linha/coluna dentro de cada camada, independentemente da ordem dos chunks.
  Peças transparentes não devem apagar a paisagem da camada inferior nessa visão.
- [x] Integrar o painel existente, teclado, toque e retângulo de navegação. Aplicar
  a origem lógica nos destinos e contar buffers efetivamente guardados no orçamento.
  Preservar componentes, estilos e comportamento das visões densas existentes.
- [x] Verificar mundo 10.000 × 10.000, origens negativas, fontes privadas/múltiplas,
  regressão do legado e memória/resolução limitadas. Exercitar o componente real
  em página isolada de QA e a oficina pública, revisar e commitar.

Não promover o documento público 8 neste lote. As miniaturas/imagens completas
seguem no próximo sublote do mesmo item 2, com orçamento próprio de rasterização.

Provas e revisão em `qa/minimapa-por-regioes-2026-11-21/`, no diretório da missão.
A API bruta antiga conserva recomputação; o cache por identidade é compartilhado
pelos consumidores imutáveis. O componente real foi exercitado em host de QA,
e a oficina pública continuou usando mapas densos. O item 2 permanece aberto.

### Lote verificado do item 2: imagens de peças por regiões

- [x] Acrescentar visita opcional em ordem global linha/coluna ao leitor comum,
  sem visitar lacunas do mundo e sem mudar a ordem padrão dos consumidores atuais.
  Isso conserva a composição das imagens quando chunks são deslocados/reordenados.
- [x] Adaptar PNG/miniatura pixel ao mesmo leitor, subtraindo a origem lógica
  apenas na imagem de saída. Folhas privadas e múltiplas passam pelo resolvedor comum.
- [x] Adaptar SVG e raster vetorial, sem achatamento ou arrays de uma entrada por
  casa do mundo. Reutilizar símbolos, máscaras, gradientes, transformações e fontes.
  Conservar os bytes dos SVGs densos existentes no subconjunto verificado.
- [x] Admitir as novas imagens antes de criar canvas/carregar fontes: até 8.192
  pixels por lado e 16.777.216 pixels por imagem, mantendo o orçamento de área da
  imagem de cena já existente. Miniaturas até 512 pixels; SVG por regiões até
  8 Mi de unidades UTF-16, com recusa inteira. Não aumentar limites de destinos.
- [x] Usar a visão geral limitada na miniatura de cores da galeria, conservando
  estilos e o contrato público atual; o caminho 8 só entra após os demais consumidores.
- [x] Reproduzir falhas em mapas pequenos antes das correções; validar mundos
  esparsos grandes após admissão, fontes privadas, múltiplas folhas, offsets,
  transparência, máscaras/gradientes e transforms no Chromium. Comparar resultados
  densos históricos, revisar, executar suíte/tipos e registrar antes do commit.

Estes renderizadores de peças mantêm o seu escopo anterior. A imagem de cena com
objetos/conjuntos usa `sceneDrawing.ts` e depende do futuro adaptador Scene 4;
não substituir esse compositor por um segundo sistema, nem declarar o item 2
inteiro pronto apenas por adaptar as imagens de peças. Nada muda no escritor 7/8.

Provas em `qa/imagens-por-regioes-2026-11-21/`, no diretório da missão: suíte
2.449 aprovada, 121 testes focados, 12 ensaios de navegador e três controles
Pygame reais. As 168 comparações de imagens conservam pixels; SVGs legados
conservam hashes. O decoder recebe SVG com dimensões raster limitadas, pelo
helper extraído do compositor portátil. Imagem achatada antiga e composição
completa são contratos distintos, qualificados com referências correspondentes.
O restante do item 2 depende de Scene 4. O trabalho segue ao item 3 das ferramentas.

### Lote verificado do item 3: admissão e pincéis na oficina

- [x] Expor o resultado detalhado do escritor comum de células, mantendo o
  wrapper que devolve o mesmo mapa ao recusar. Reutilizar as operações atuais de
  terreno, espalhamento e carimbo, sem segundo escritor ou perda de flags.
- [x] Admitir linha/retângulo antes de gerar pontos e trabalhar com origem
  assinada. Limitar cada coleção a 65.536 casas; não recortar a linha alterando
  a fase de Bresenham. Recusar coordenadas inválidas e retângulos excessivos.
- [x] Expandir carimbos por blocos distintos, sem repetir o mesmo bloco para
  cada casa do trajeto. Admitir o trabalho antes da alocação e conservar a ordem
  da primeira visita, a ancoragem, os buracos e a saída visual anterior.
- [x] Adaptar `mapBrush.ts` ao mapa autoral comum. Propagar recusa do balde,
  terreno e armazenamento, distinguindo-a de um gesto vazio ou sem mudanças.
- [x] Integrar coletores/resultados ao ponteiro e teclado da oficina atual,
  com mensagens curtas pelo Toast existente. Uma recusa durante o traço deve
  cancelar o gesto inteiro; prévia/teclado não devem gravar um pedaço recusado.
- [x] Contar destinos distintos acumulados do traço livre, sem cobrar revisitas,
  com teto explícito de 65.536. Cada gesto usa o snapshot do pincel do começo.
  Conservar
  a revisão produzida pelo próprio gesto. Cancelar/recusar não pode restaurar
  a base por cima de outra revisão, inclusive quando ela conserva o mesmo ID.
- [x] Reproduzir falhas de origem, duplicação e recusa em fixtures pequenas;
  provar atomicidade, limite anterior à leitura/alocação, cancelamento, histórico
  e conservação de documentos legados. Exercitar a oficina no Chromium com
  mouse/toque, executar suíte/tipos, revisar e registrar antes do commit.

Esse lote não promove o formato 8. Câmera/seleção/movimento, editor de recursos,
IO e adaptadores continuam no restante dos itens 1–3 e no plano principal.

Provas em `qa/pinceis-por-regioes-2026-11-21/`, no diretório da missão. Escrita
condicional em RAM retém a revisão produzida pelo próprio gesto, inclusive na
fachada de conjuntos; não substitui o CAS da autoridade local. O módulo anterior
do controlador falha nos cinco cenários corrigidos em três perfis; o controle
positivo continua passando. Versão atual: 51 ensaios de navegador aprovados,
101 testes focados, suíte 2.469 + três controles Pygame reais e tipos/lint.

### Continuação do item 3

Integração intermediária do remoto em 21/11: `33cd419d8`, depois do lote
`2fb2f58de`. Entrada sem conflitos, preservando os arquivos concorrentes do Molda
idênticos ao remoto. Os 84 testes de fronteira/runtime e 12 percursos locais
Pinta → Estúdio passaram. Recibos e limites em
`qa/integracao-remota-2026-11-21/`, no diretório da missão. Isso não é merge da
feature em staging, nem implantação. Não altera a ordem ou fecha etapas macro.

Lote em execução: propriedade dos gestos contínuos. A reprodução com o overlay
real encontrou nove falhas: movimento/soltura/cancelamento após revisão do mesmo
ID, em mapa e conjunto, cancelamento nativo e recusa do host no meio do gesto.
Extrair uma sessão de gesto em RAM que retenha a revisão produzida e use o CAS
existente; aplicá-la aos objetos e à opacidade de camada, sem alterar estilos.
Testar criação, movimento, vértice, resize, Esc/cancelamento, troca de camada e
desmontagem; conservar um desfazer por gesto e provar no Chromium. Gestos de
vetor e recursos serão revisados em seguida; não inferir proteção global desses
consumidores a partir deste lote.

#### Lote de objetos e opacidade verificado

Sessão de gesto compartilhada sobre o CAS em RAM: criação/movimento/resize,
vértices, inserção de pontos e opacidade só escrevem/finalizam a própria revisão.
Cancelamento nativo, Esc e desmontagem descartam a edição inteira. Keyup não
encerra o arrasto de ponteiro; rascunhos ponto a ponto retêm sua origem.
O módulo anterior reproduz 12 falhas de revisão no Chromium, com 12 controles
positivos; o atual passa 111 ensaios e os 33 percursos da oficina. Evidências em
`qa/gestos-de-objetos-e-camadas-2026-11-21/`. A revisão dos demais consumidores e
a geometria assinada continuam na lista abaixo; nenhuma etapa macro é fechada.

- [ ] Revisar os demais gestos de objetos, transformações e controles contínuos
  de camada/recursos, adotando a escrita condicional com sua revisão de origem.
  Reproduzir cancelamento/admissão tardios com o mesmo ID e com conjuntos.
- [ ] Completar geometria, seleção, movimento e edição de versões em coordenadas
  assinadas; integrar câmera, palco, viewport e navegação antes da promoção 8.

Próximo lote em execução: geometria do papel e inserção da biblioteca. Reproduzir
conversão de origem assinada e conservação de posições fracionárias; extrair as
conversões comuns, aplicá-las aos consumidores do ponteiro/cursor/seleção e
navegação existentes e adaptar o canvas de oficina ao leitor de regiões.
Conservar a composição densa anterior e os estilos, com comparação de pixels no
Chromium e regressão da biblioteca/teclado. Não otimizar a grade neste lote: o
perfil e o culling dela ficam em mudança isolada, depois da geometria correta.
O store público/IO e a ativação 8 continuam condicionados aos demais consumidores.

Lote do papel/canvas verificado em `qa/geometria-do-papel-2026-11-21/`, no
diretório da missão: 2.543 testes do Pinta, 39 focados, 240 comparações de imagens
e conservação dos destinos/seleções legados no Chromium. Consumidores de
ponteiro/cursor/seleção e navegação usam os limites lógicos; a biblioteca conserva
frações e offsets. O documento por regiões continua interno: movimento SVG,
modelos do store e recursos/IO permanecem pendentes. A grade inteira foi medida
na prova esparsa, sem otimização misturada à correção geométrica. Não fecha o item
3 ou a etapa macro 6. Seguir para o restante da geometria/consumidores e perfil.

Lote verificado: espaço de edição dos objetos. Reproduzir o SVG de
objetos regionais recortado na origem errada; centralizar bounds locais, conversão
do ponteiro, snap e criação estrita. Integrar ao overlay atual, conservando a
aritmética legada, as classes e os eventos protegidos por revisão. O documento 8
continua interno; não usar um store falso ou cast de asset para simular sua edição
pública antes do IO. Qualificar geometria pura regional, render de leitura no SVG
e regressão de gestos/objeto da oficina pública antes do commit.
Provas em `qa/espaco-de-objetos-2026-11-21/`: 2.558 testes do Pinta, 69 focados,
126 ensaios do controlador e 33 da oficina. O módulo anterior reproduz 12 falhas
de perda de layout/zoom, com seis controles positivos. A revisão acrescentou o
cancelamento por mudança do contexto geométrico, sem restaurar revisão externa.
O SVG regional foi exercitado apenas em leitura; não fecha a etapa macro.
- [ ] Prosseguir ao perfil de render estabilizado e aos adaptadores/IO, conforme
  os itens anteriores. O contrato público e as etapas macro continuam abertos.

Lote verificado: confirmação de prévias e coleta do espalhamento. Extrair a
amostragem por limites assinados, com admissão antes de expandir segmentos e teto
acumulado atômico; conservar círculo, ordem e revisitas legados. Compartilhar o
SVG da prévia da biblioteca com origem lógica, sem novas classes. Confirmar
biblioteca/espalhamento pela sessão condicional: adoção por assinante durante a
escrita não pode criar histórico alheio ou anunciar a inserção como própria.
Reproduzir com mapas/conjuntos e testar mouse/toque, zoom, cancelar e reabrir.
O formato 8 permanece interno; a prova de SVG regional é somente de leitura.
Recibos em `qa/confirmacao-de-previas-2026-11-21/`: suíte 2.570, 24 focados e
96 ensaios de navegador aprovados. Os hooks anteriores reproduzem 12 falhas de
adoção durante a confirmação, com 12 controles positivos. A revisão incluiu a
auditoria do novo coletor e repetição da suíte sem aumentar o timeout do percurso
que o havia atingido sob carga concorrente. Seguir ao perfil de render/culling;
as etapas macro, IO e a promoção pública continuam abertas.

Lote em execução: recorte da grade pelo viewport. Perfil anterior à alteração,
sem contador nos trechos medidos: em mundo esparso 10.000², `moveTo`/`lineTo`
e o laço da grade dominam as amostras; 20.002 linhas por frame. O controle denso
de 32 camadas é dominado por `drawImage` e pressão do cache, problema separado.
Matriz: impacto 1 × confiança 5 ÷ esforço 1 = 5 para a grade (não resolve a
fluidez densa). Uma única alavanca: limitar os índices das linhas, conservando
coordenadas, pontas, ordem, path, alpha e traço originais. Margem conservadora
de um pixel para antialiasing. Preservar todos os hashes RGBA; contador de linhas
é diagnóstico de trabalho, não parte da imagem. Não ampliar cache/formatos.
Medir novamente sem outros jobs desta sessão; submissão CPU do renderer não é
latência ponta a ponta da oficina, composição GPU ou abertura/IO.

Recorte verificado em `qa/recorte-da-grade-2026-11-21/`: 93 testes de render,
12 ensaios de navegador e 840 comparações RGBA aprovados, com tipos/lint.
Em 1024 × 768, o caso esparso passa de 20.002 para 114 linhas. O controle ABBA
confirma a redução do custo esparso; o denso continua lento e apresentou cauda
maior com CPU 4×. A causalidade dessa variação e a latência global não foram
qualificadas. Não declarar fluidez de mapas cheios: seguir ao cache/composição,
com novo perfil, orçamento igual e conservação exata de pixels. A suíte completa
2.570 pertence à base anterior; neste lote foi executada a regressão de render.

Lote verificado: reutilizar canvases canônicos com células, atlas, tamanho,
contagem de peças e fase de animação idênticos. O perfil denso anterior aponta
mais de 95% das amostras em desenho. Matriz: impacto 4 × confiança 4 ÷ esforço 2
= 8. Uma alavanca: reaproveitamento por conteúdo dentro do mesmo LRU/orçamento.
Fingerprint serve apenas para buscar candidatos; igualdade integral continua
obrigatória, inclusive numa colisão real reproduzida. Não criar aliases por cada
posição do mundo. Manter a estimativa de pressão e a guarda de alpha inalteradas
neste lote; sua eventual evolução será separada, depois de novo perfil.
Revisão: o contrato do hit também precisa incluir contagem de peças quando o
canvas de atlas é compartilhado. Fixtures de LRU devem conter conteúdos distintos
para realmente exercer expulsão; duplicatas têm prova própria de reutilização.
Conservar pixels, validar limpeza/reciclagem e animação, medir antes de commitar.
Provas em `qa/cache-por-conteudo-2026-11-21/`: suíte completa 2.576, 87 testes do
renderer/cache, nove ensaios e 612 comparações RGBA aprovados, tipos e lint.
ABBA: periódico CPU normal p50 291,8 → 133,4 ms, retenção 32 → 2 MiB. O cenário
sem repetições mantém a reconstrução e apresenta cauda maior na amostra, sem
qualificação de latência. O perfil ainda aponta desenho direto; a estimativa de
pressão nominal permanece 128 MiB. Próximo lote: estimar pressão por composições
distintas, reutilizando a mesma identidade completa, sem ampliar orçamento ou
alterar guardas de alpha/pixels. Não fecha a fluidez densa ou as etapas macro.

Lote verificado: refinar a pressão pelo número de composições distintas quando
a estimativa nominal exceder o orçamento. Usar o mesmo preparo/identidade do LRU,
sem duplicar regras de células/atlas/fase. Preservar as receitas admitidas só no
quadro atual para evitar uma segunda leitura; metadados por posição não entram no
cache persistente. Parar conservadoramente ao exceder bytes ou oito candidatos
de colisão; nesse caso, manter a estimativa nominal e o caminho anterior.
A classificação de alpha e seus guardas permanecem iguais. O cache segue em
32 MiB; as receitas canônicas retidas para o quadro cabem nesse orçamento, com
no máximo 128 vetores de 2 KiB no menor tamanho de peça. Não somar regiões vazias
como imagens, nem confundir hash com identidade. Qualificar mapas repetidos e
únicos, callbacks de atlas, pixels, animação/contagem e colisões antes de promover.
Recibos em `qa/pressao-por-composicoes-2026-11-21/`: suíte 2.582, 93 testes focados,
nove ensaios e 612 comparações RGBA aprovados, tipos e lint. ABBA periódico CPU
normal p50 170,2 → 9,2 ms, p95 235,9 → 11,5 ms, 49.216 → 128 blits, 4 MiB retidos.
CPU 4× e composição sem repetição continuam acima do alvo; não é qualificação
da oficina, do gesto ou do IO. Seguir aos consumidores restantes de recursos e
modelo autoral, protocolo físico 3 e adaptadores antes da promoção pública 8.

## Revisão integrada dos jogadores privados — 22/11

Os dois jogadores JavaScript e os três destinos Python compartilham o contrato
regional sem criar um canvas proporcional ao mundo. Revisão integrada até
`c34117d6a`, registrada em `qa/integracao-dos-runtimes-regionais-2026-11-22/`:
Core 3.255, Pinta 2.838 e Studio focado 32 testes, todos sem falhas; 48 ensaios
reais de navegador, incluindo PyDew Valley e os controles legados. Tipos do Pinta
e geradores aprovados; Studio completo será conferido após incorporar a staging.
A revisão corrigiu a organização da matriz visual sem remover comparações ou
aumentar prazos, além de uma espera por relógio no teste de cancelamento da nuvem.
O candidato Python foi reconstruído e seus 126 arquivos revalidados por hash.
Nenhum contrato público, catálogo ou release foi ativado por estas provas.

O piso do inventário protege leitores incapazes, mas não resolve sozinho um
escritor moderno com uma galeria parcial. Segue em implementação o commit causal
de folha e consumidores, com blobs selados, snapshot remoto de epoch único,
outbox no mesmo commit local e recuperação de formatos opacos separada do sync.
Revisão intermediária exige remapeamentos compostos, desfazer já sincronizado,
proteção dos consumidores locais offline e orçamento agregado da outbox. Esses
critérios precedem a promoção regional; as etapas macro 1–9 continuam abertas.

### Revisão da persistência causal — 22/11, em andamento

A branch isolada incorporou a staging `208c8571a`, conservando os arquivos
funcionais 3D do remoto. O conflito entre duas correções equivalentes de um teste
3D ficou com a versão remota; cinco testes e a instalação com lockfile congelado
passaram. O candidato Python foi reconstruído: 126 arquivos verificados, hash
`e685d5c2731e5c5e5c221431979894e8c02ea6d50b63518e7b924c3610eb4298`.
Quatro ensaios regionais CE, oito de Pygame Zero/Raylib 2D e 32 de jogos legados
passaram novamente em Chrome/Chromium, incluindo PyDew Valley. Recibos desta
rodada em `qa/causal-integrado-2026-11-22/`.

O servidor causal passou na revisão local com PostgreSQL real: 21 casos/132
asserções e um percurso HTTP/30 asserções. O armazenamento condicional foi
repetido em MinIO real (um caso/19 asserções); a prova anterior com R2 de staging
continua separada. Cinco ensaios de IndexedDB real passaram no candidato terminal
`5ef94cc85`, incluindo abort no último write e bloqueio por outra aba.

A revisão independente desse candidato encontrou uma perda que os cinco ensaios
não cobriam: um escritor causal anterior pode substituir a revisão local de um
PUT já selado ou da ponta mutável da fila. A recuperação não pode descartar os
bytes retidos nem confundir a revisão posterior com a enviada. Os negativos estão
versionados em `docs/pinta-cenarios/revisao-2026-11-18/qa/nuvem-causal-cliente/`.
Está em implementação uma sombra durável da ponta pendente, substituída na
coalescência, no mesmo CAS e orçamento dos documentos. Deve cobrir também a
primeira gravação offline, anterior ao epoch da conta. Não ativar a candidata
antes do replay verde, da revisão e dos gates integrados.

A homologação autenticada nova exige entrada limitada ao perfil de QA, tanto no
BFF quanto no Members. A flag pública precisa entrar no build Next das duas
comunidades; o padrão permanece desligado. Nenhum destes testes ativa formatos
regionais, catálogos, versão de motor, release ou rollout público.
