# Conclusão funcional da missão do Pinta

Plano de execução aprovado pelo pedido de concluir a missão, mantendo sua ordem e identidade
visual. Parte de staging `4fe2aac0f`, na branch isolada `pinta-missao-completar-20261118`.
As alterações em andamento de Molda no worktree principal não fazem parte desta entrega.

## Arquitetura e critérios globais

- Evoluir documento, stores, ferramentas e componentes existentes; um único editor.
- Autoridade offline e CAS da issue 026 são obrigatórias em todo novo formato/migração.
- Recursos novos que um leitor anterior perderia exigem capacidade/formato novos e guards
  no documento, host, arquivos e backend. Formatos antigos conservam seus bytes e comportamento.
- Dados autorais são separados de geometria/render, interface, comportamento e exportação.
- Limites dependem de orçamento verificável de células, imagens, histórico, render e salvamento.
- Cada destino precisa consumir os mesmos dados completos; não entregar seletor sem suporte.
- Provas de navegador, motor nativo e ambiente autenticado são distintas. O usuário disponibilizou
  a conta de staging e restringiu a homologação de aparelhos a esta máquina, aceitando simulações
  de toque e CPU; não declarar teste físico externo nem participação de crianças.

## Execução, na ordem da missão

- [x] 0a. Reauditar staging e recuperar matriz R01–R33 e critérios originais.
- [ ] 0b. Acrescentar ensaio de implantação gradual/rollback de versões e executar o ciclo
  autenticado entre clientes de staging com a conta de teste fornecida pelo usuário.
  Login confirmado e runtime C4 armazenado no R2 real, com 128 objetos conferidos;
  nenhuma ativação realizada. Provas e limites em `qa/runtime-c4-staging/README.md`.
  O CI remoto de `7347a7707` encontrou quatro bloqueios adicionais; diagnóstico,
  correções e limites da prova local em `qa/ci-remoto-2026-11-19/README.md`.
  A recompilação `132db1b…` passou por 16 casos Pinta/Pygame e 83 casos do runtime,
  com upload e leitura independente de 128 objetos em staging, sem ativação.
  Provas em `qa/runtime-132-local/README.md` e `qa/runtime-132-staging/README.md`.
  O Worker leitor A e as imagens qualificadas foram implantados em staging;
  módulo, perfil, digest e objetivo real no contêiner conferidos. Isso não ativa
  a distribuição Python nem o gravador. O aplicativo leitor nos hosts, abas
  offline e rollback continuam pendentes; ver `qa/leitor-a-runtime-staging-2026-11-19/README.md`.
  Em 20/11, preflight e verificação canônicos confirmaram a base de staging saudável
  e a jornada publicada na versão 3. Aba legada mantida aberta e mapa próprio
  conferido pela API autenticada; leitor controlado preparado sem dados autorais
  em RAM. O CI foi fixado em uma branch de qualificação. Aplicativos leitores,
  seletor Python e gravador continuam pendentes; isso não fecha o ciclo 0b.
  A revisão local registrou 11.919 testes do Estúdio sem falhas; quatro casos
  ignorados por caminho de Chromium foram reexecutados com Chrome real e passaram.
  Deltas posteriores, tipos, formatação e limites da prova estão em
  `qa/revisao-integrada-2026-11-20/README.md`.
  Continuidade de 20/11: os aplicativos Community e Kids leitores foram implantados
  por outra sessão no commit 08f040a9 e conferidos em uso. A aba publicada antiga
  gravou offline após fechar a página nova; duas reaberturas preservaram integralmente
  o mapa 7 e recuperaram a edição antiga como cópia estável. Aplicativo real e
  exportação/importação oficial conservaram o mesmo hash. Ver
  `qa/aba-antiga-autenticada-2026-11-20/README.md`, incluindo a distinção entre
  código de leitura previamente disponível e cold start HTTP offline do aplicativo.
  Members/Auth permanecem na política anterior; distribuição Python 132, gravador
  novo, rollback e publicação completa continuam pendentes. A CI de qualificação
  44741178796 falhou no observador do DOM; uma reprodução com coleta de memória
  identificou o defeito upstream Happy DOM 2264, cuja correção está em verificação.
  O lote remoto 9456c3da foi integrado e o runtime correspondente 4daf3280… passou
  na qualificação Linux e na execução real em staging; módulo e ambos os contêineres
  foram conferidos em `qa/leitor-a-runtime-staging-2026-11-19/continuidade-4daf-2026-11-20/`.
  A CI 44749541850 parou na formatação de um JSON remoto de QA; o ajuste preserva
  seus dados. A CI 44752366629 aprovou os demais jobs e falhou no typecheck de Members:
  a coleção de nomes do Estúdio declarava um ReadonlySet incompleto sob ESNext.
  O contrato foi corrigido somente nos tipos, com JavaScript gerado idêntico nos
  quatro arquivos envolvidos. Members e Estúdio passaram na checagem completa;
  84 regressões, perfil oficial e Biome de 16.635 arquivos também passaram.
  Evidências em `qa/contrato-de-nomes-ci-2026-11-20/`. É necessária nova qualificação
  remota; nenhuma ativação de Python, política nova ou gravador foi feita por essas provas.
  A integração posterior combina o remoto publicado 6c32a1fb3 com Pinta c08075547,
  sem copiar o trabalho privado de outras sessões. Passaram 14 verificações locais,
  incluindo 2.272 testes Pinta sem pulos, 48 ensaios de cenários, 12 de integração,
  tipos completos de Estúdio/Members e Biome. Foram regenerados somente os três
  SDKs autorizados, mantendo imports e licenças. A revisão também corrigiu o sinal
  de atualização para duas gravações no mesmo milissegundo, preservando os dados.
  O primeiro typecheck integrado encontrou 20 erros nos diagnósticos/fixtures do
  remoto; foram corrigidos nos tipos e a repetição passou. As tentativas constam
  em `qa/integracao-6c32-2026-11-20/`. O perfil db27c95b… ainda precisa de nova CI,
  imagem Linux e rollout independente; esta prova local não conclui a etapa 0b.
  O lote público b2c8d5e7b foi incorporado em seguida para conservar as mudanças
  de Members já implantadas por outra sessão. A CI 44781842284 encontrou três
  falhas de QA: fixture sem o fragmento real de texto do motor, contagem de blocos
  que omitia a cauda adiada e teclado Juggler fora do contexto remoto focado.
  As correções conservam os orçamentos e a programação; o caso Firefox usa
  ações nativas WebDriver, sem clicar nem forçar foco na prévia, em três ciclos.
  Os 14 ensaios Firefox, o teste de Reino Zero, os dez contratos Node, três
  repetições de startup, tipos de Estúdio/Members e Biome passaram localmente.
  A imagem db27 foi qualificada em 44781914334 e armazenada no registry de staging,
  com leitura independente do digest. Isso ainda não a ativa nem libera a escrita.
  Ver `qa/integracao-b2c8-2026-11-20/`; nova CI geral e rollout continuam necessários.
  A integração pública f923972b4 passou por 16 verificações locais. A CI anterior
  44790132975 revelou a nova política de foco do Chromium 159 e o modo Blocos
  99 bytes acima do teto. A delegação explícita no host e o carregamento adiado
  do comando Python corrigem as causas, sem mudar estilos, sandbox ou os tetos.
  Os 185 cartões passaram; três fixtures com quadros próprios foram corrigidas
  e repetidas, junto do gesto de colagem que lia coordenadas antes do aviso.
  Passaram 641 casos de componentes, 266 de projetos, 12 da regressão dirigida,
  14 Firefox, sete WebKit, 12 Pinta/Estúdio, tipos completos e Biome. O caso de
  isolamento de CPU continua ignorado no WebKit, conforme o contrato anterior.
  Tentativas e limites em `qa/integracao-f923-chromium-2026-11-20/`.
  O perfil 4de439a6… exige outra imagem qualificada: a imagem db27 armazenada
  não corresponde à casca nova. CI geral, novos lotes publicados do remoto,
  rollout e ciclo autenticado continuam pendentes; esta prova não conclui 0b.
  O remoto publicado até a2f0b0ab6 foi integrado depois, incluindo correções de
  argumentos/cauda, carregamento do editor 3D e contratos de testes do aluno.
  Os dois conflitos preservam a prova de teclado Firefox e regeneram o perfil
  pelo script oficial. O módulo Python gerado é idêntico ao publicado no remoto.
  Passaram os 16 gates do lote: Core completo (3.170 casos), componentes (641),
  regressões dos contratos, 18 Chromium, dois Firefox, dois WebKit, 12 de
  integração e tipos completos. Ver `qa/integracao-a2f0-2026-11-20/`.
  O perfil combinado agora é 18aedad…; precisa de CI geral e imagem Linux
  próprias. Nenhuma ativação de política, distribuição Python ou gravador
  é demonstrada por essas verificações locais.
  A distribuição reconstruída a partir de 2662 revelou outra fronteira de foco:
  os seis casos Pinta/Pygame completavam o percurso, mas emitiam erro no console
  do Chromium 159. O host Python passou a delegar a mesma capacidade nominal,
  conservando sandbox e identidade visual. Os casos agora verificam também os
  erros do navegador. Passaram 17 ensaios reais, 307 testes Python e os cinco
  gates de tipos/perfil/formatação. A distribuição 55471575… tem todos os 126
  arquivos conferidos; necessita de nova qualificação Linux e ativação própria.
  Ver `qa/python-foco-2026-11-20/`. Isso não encerra o rollout nem a etapa 0b.
  A qualificação Linux 44813052295 preservou o pacote exato 52ec7bb5… e a imagem
  do perfil 18aedad…. Os 126 arquivos foram conferidos; os 110 lógicos coincidem
  com a compilação Windows, e somente 16 gzip diferem. Passaram 83 ensaios no
  Chrome do contrato oficial e 17 Pinta/Pygame no Chromium 159. A comparação
  adicional Raylib no Chromium teve seis divergências de pixels, preservadas
  com controles verdes no Chrome; não se afirma paridade entre esses navegadores.
  O teste da gaveta foi corrigido para esperar o comando adiado. A revisão ampla
  e sua retomada, tipos, catálogo e imagem estão em
  `qa/catalogo-python-linux-2026-11-20/`. Catálogo Linux preparado sem ativação;
  nova CI geral, upload imutável, rollout e ciclo autenticado continuam separados.
  Continuidade do corte publicado 994aacd3: a integração fb973c50f passou nos
  22 gates congelados, com 12.112 testes do Estúdio, 3.183 do Core, 35 ensaios
  do frontend e 12 Pinta/Estúdio. O novo executor Python escondido agora exige
  uma capacidade verificada e mantém o foco do editor nos três renderizadores;
  ver `qa/python-segundo-plano-994-2026-11-20/`. A qualificação Linux 44842695808
  passou e preservou o guest 28da7a969…: os 126 arquivos foram conferidos,
  com 110 lógicos idênticos ao Windows e 16 gzip diferentes, descompactados
  e verificados. Passaram novamente 22 casos Pygame/Pinta e 88 compartilhados
  no guest Linux exato. A nova política deve estar empacotada no leitor de
  rollback antes de qualquer ativação; o ciclo autenticado continua pendente.
- [x] 1a. Corrigir teto real do cache e medir mapas ruidosos; liberar autoria 256 × 256,
  32 camadas e 256 peças dentro de 2.097.152 células. Integrar criação, operações, limite de
  aulas, feedback e navegador, conservando migração e todas as ferramentas anteriores.
- [x] 1b. Referências autorais a animações e versões de recursos: definir resolução e
  retenção reais; integrar edição, histórico, biblioteca e formato protegido.
  Implementação verificada: documento 6, catálogo imutável, UI existente, importação,
  histórico e cena 2 nos motores. Ver `recursos-e-animacoes.md`. Escrita de nuvem 5 depende
  de verificar o rollout A do leitor em staging.
- [ ] 2a. Fechamento completo de recursos visuais e lógicos no contrato compartilhado;
  render/animação/ordem/propriedades em Jogo2D, Avançado, Python e atualização sem apagar programa.
  Consultas de recursos e propriedades verificadas em `consumo-de-referencias.md`; ciclo local
  e atualização de mapas dependentes em `atualizacao-no-estudio.md`. Mapas de destino das portas
  são acrescentados aos jogos já vinculados, abertos e fechados, em `atualizacao-de-mundos.md`.
  O fechamento Python está implementado em `mundos-no-pygame.md`, com prova offline de
  leitor antigo, importação/atualização pela interface e módulo exportado no Pygame real.
  A execução exige a capacidade do runtime fixado; o artefato foi qualificado localmente
  em Python/Wasm, com correção da decodificação de imagens no Emscripten e 13 ensaios
  incluindo PyDew Valley (`qa/python-no-navegador/README.md`). Publicar o artefato
  qualificado e executar o ciclo autenticado após rollout. O envio,
  jogo pronto e importação integral estão verificados em `mapas-ligados-no-estudio.md`;
  as provas da sincronia estão em `qa/atualizacao-de-mundos/README.md`.
  As derivações de dados 2/3 agora declaram o leitor exigido sem mudar a receita antiga;
  importação, atualização, execução, pacote web e publicação conferem esse leitor, com
  proteção da revisão pública anterior e da proveniência privada. Provas locais em
  `qa/leitores-de-cenarios/README.md`; implantação e ciclo autenticado continuam na etapa 0b.
  No piloto autenticado de 20/11, Jogar meu mapa criou e executou uma cena 3 a partir
  de documento 7. Uma variável acrescentada pelo teclado foi preservada, junto com
  o código, IR e blocos, depois de editar o mapa, atualizar o jogo e reabrir o aplicativo.
  O foco foi emulado no Chrome headless. São duas camadas, sem publicação ou nuvem 6;
  a prova não encerra a Vila nem o fechamento Python. Ver
  `qa/jogar-atualizar-autenticado-2026-11-20/README.md`.
  A própria Vila também percorreu Vila → Cabana → Vila, com colisão, água animada,
  primeiro plano e seis documentos nativos iguais após reabertura. Código, IR e
  blocos foram preservados depois de editar o Chão e reabrir o jogo. A atualização
  exigiu foco após a biblioteca estar pronta. Esse intervalo foi depois corrigido
  localmente, incluindo guardas para troca de perfil e sessão: seis regressões,
  12 fluxos, 626 componentes, tipos completos de Estúdio/Members e Biome passaram.
  A fonte final integrada ainda precisa de qualificação e repetição autenticada;
  ver `sincronia-entre-abas.md`. Provas em `qa/vila-autenticada-piloto-2026-11-20/`
  e `qa/vila-atualizacao-autenticada-2026-11-20/`; isso não encerra publicação/Python/nuvem.
- [ ] 2b. Geometria física comum para formas, transformações livres e colisões de conjuntos;
  integrar os consumidores e seus testes, sem programação dentro do Pinta.
  O primeiro lote corrige peças reduzidas que caíam entre as amostras do corpo no
  teste com personagem do editor. Geometria analítica e consulta local sem grade
  achatada em `geometria-fisica.md`. O segundo lote acrescenta marca autoral, controles,
  documento 7/cena 3/PNG 4, varredura nos motores e adaptadores externos;
  ver `colisoes-autorais.md`. A continuação integra plataformas de mão única
  transformadas, testa os consumidores reais e corrige o jogo criado pelo botão;
  provas locais em `qa/plataformas-precisas/README.md`. O ciclo de atualização e
  publicação autenticado ainda depende do rollout descrito na etapa 0b.
  O lote foi commitado em `db4ba7aa8` e integrado com staging em `04acef30b`;
  nova distribuição e regressões em `qa/colisoes-autorais-pos-merge/README.md`.
  Critérios e arquitetura das plataformas em `plataformas-precisas.md`.
  A revisão ampliada acrescenta consultas executáveis ao exemplo da Vila, conserva
  as imagens e fecha os inventários e manuais. Runner oficial: 11.543 aprovados,
  mais os quatro casos condicionados ao Chromium reexecutados sem omissão;
  `qa/fechamento-integracao/README.md`. Isso não encerra o ciclo autenticado.
- [x] 3. Ensaiar pintura inteligente com várias folhas: pincel, balde, linha, retângulo,
  transição, prévia, determinismo, vizinhos, undo/redo e cancelamento em navegador.
  Gestos verificados em desktop, toque e CPU 4×; corrigido cancelamento por Esc e
  `pointercancel`, incluindo crescimento e recuperação de conflito. Provas em
  `qa/terrenos-e-cancelamento-2026-11-19/README.md`. O modelo Bosque com terrenos e
  as cores no modo Começar foram implementados e homologados localmente; provas em
  `qa/terrenos-prontos-2026-11-19/README.md`. A suíte de cenários passou no CI
  `44572834661`; a regressão local após a correção da coluna passou novamente.
- [x] 4a. Arrasto da biblioteca com prévia, drop válido e cancelamento; encaixe e bloqueio.
  Pixel, vetor e conjunto vinculado com uma gravação por soltura, cancelamento e
  proteção da cópia recuperada. Corrigida a altura real da coluna desktop, mantendo
  o recolhimento móvel e a identidade visual. Suíte Pinta com 2.129 aprovados e
  cenários/Phaser com 32 aprovados. Provas em `qa/biblioteca-arrasto-2026-11-19/README.md`.
- [x] 4b. Pincel de objetos/conjuntos: densidade, afastamento, semente, prévia e um histórico
  por gesto; manter diferença entre conjunto vinculado e cópia independente.
  Núcleo puro, inserção em lote, ferramenta própria, cancelamento/recuperação e
  prévia real verificados. Suíte completa com 2.155 aprovados; revisão final com
  77 aprovados e três perfis de navegador, mais regressão dos três de biblioteca.
  Provas e limites em `qa/espalhar-objetos-2026-11-19/README.md`.
- [x] 5. Completar ferramentas profissionais autorais e seus consumidores: caminhos, zonas,
  portas, marcadores, colisões, animações, propriedades, regiões, profundidade e parallax.
  Autoria e dados existentes conferidos; corrigido o modelo girado que era cortado.
  Seis casos de autoria em desktop/toque/CPU, 38 cenários/Phaser e 2.160 testes Pinta
  aprovados. Ver `level-design.md` e `qa/level-design-2026-11-19/README.md`.
  Isso não encerra o rollout autenticado nem a validação externa das etapas 0b/7/9.
- [x] 6. Auditoria funcional de teclado/foco/cancelamento e mouse/toque, componentes atuais;
  fluxo infantil e testes em desktop, toque e CPU reduzida nesta máquina, conforme a
  disponibilidade informada pelo usuário. Testes com participantes são evidência distinta.
  Primeiro lote: criação de marcador por controles/teclado, resultado de recusa
  no store e preservação de seleção. Três perfis nativos e 90 testes focados
  aprovados; suíte final com 2.194 aprovados, zero falhas/omissões e três perfis
  nativos repetidos após a revisão. Ver `teclado-e-marcadores.md` e
  `qa/teclado-e-marcadores-2026-11-19/README.md`. O segundo lote acrescenta pintura,
  terrenos, conta-gotas, seleção e navegação por teclado, com cancelamento, rolagem
  e guardas do host. Suíte final com 2.192 aprovados sem omissões e 12 casos nativos
  em três perfis, mais cinco repetições de fechamento. Provas, falhas da revisão
  e limites em `qa/pintura-por-teclado-2026-11-19/README.md` e guia em
  `pintura-por-teclado.md`. O ciclo autenticado permanece na etapa 0b;
  esses perfis não comprovam uso em aparelhos físicos adicionais ou com crianças.
- [x] 7a. Evoluir contratos externos e fixtures para dados novos: Tiled JSON/TMX/TSX reais,
  pacotes Phaser/Pygame e Godot; preservar PNG/SVG/.pinta.json/ZIP e relatórios de conversão.
- [x] 7b. Executar ferramentas nativas e Godot com render visual; repetir round-trip e jogos.
  Tiled 1.12.2 revelou normalização de atlas e regras Wang zero; corrigidos metadados
  conservadores e GIDs, com fixture nativa e proteção das edições externas. Suíte Pinta
  com 2.216 aprovados sem omissões; dez conversões nativas, dez ensaios Phaser,
  Pygame real e quatro projetos Godot (dois com GPU) aprovados. Provas e limites em
  `qa/motores-externos-2026-11-19/README.md`. O comando oficial agora pode exigir
  os três programas instalados. Projeções e chunks expansíveis pertencem à etapa 8;
  publicação e atualização autenticadas continuam nas etapas 0b/9.
  O piloto encontrou uma omissão no arquivo editável: a cabana ligada por porta
  não acompanhava a Vila. A correção compartilha a resolução de portas e restaura
  mundos completos atomicamente, sem mudar formatos nem visual. Passaram 53 testes
  focados, 2.269 da suíte (três Pygame reexecutados em rodada separada com o motor real)
  e dois ensaios Chrome desktop/toque. Ver `exportacao-nativa-de-mundos.md` e
  `qa/mundo-editavel-local-2026-11-20/`. A prova verde autenticada espera o frontend corrigido.
- [ ] 8a. Documento e persistência incremental por chunks, cache/culling estritamente orçados,
  navegação, mapas expansíveis e recuperação; medir heap, buffers e tempo, sem prometer hardware.
  Lote 8a1 implementado: envelope físico local 2 com blocos 32 × 32, transação
  atômica e coleção isolada, mantendo o documento lógico completo. Suíte Pinta
  com 2.242 aprovados e 19 ensaios nativos sem falhas/omissões, incluindo leitores
  anteriores reais e recuperação offline. Medições, custos do espelho legado e
  limites em `qa/chunks-locais-2026-11-19/README.md`. A abertura ainda é densa;
  streaming, expansão e otimização do pior caso de render continuam pendentes.
  Lote 8a2: composição direta sob pressão com conservação exata de pixels e
  culling pelos limites reais do canvas; suavização, efeitos e peças transformadas
  em zoom fracionário mantêm o renderer anterior. Suíte com 2.264 aprovados,
  21 ensaios de autoridade/oficina e 72 imagens iguais ao código publicado.
  Mediana local do pior caso: 498,8 → 198,6 ms, ainda sem comprovar fluidez.
  Provas e limites em `qa/render-sob-pressao-2026-11-20/README.md`.
  O minimapa existente foi auditado e corrigido para teclado: setas e extremos,
  ativação sem coordenadas do ponteiro e teclas consecutivas. Suíte com 2.266
  aprovados e três perfis nativos conservando todas as células. Provas em
  `qa/minimapa-teclado-2026-11-20/README.md`; não há outro minimapa ou mudança visual.
- [ ] 8b. Automapping em várias camadas: regras autorais, prévia, determinismo e histórico.
- [ ] 8c. Isométrico e hexagonal: contratos próprios, coordenadas/picking, desenho, objetos,
  colisão e adaptadores reais; não apenas opções de interface.
- [ ] 9. Executar os dez passos da Vila e Floresta como um ciclo: autoria livre de16+
  camadas, múltiplas folhas, arte animada, portas, conjuntos, reabertura, Estúdio/programa,
  atualização, externos, falhas/migração e conflitos. Regressão de PyDew Valley.
- [ ] 10. Revisar mudanças, executar gates e atualizar arquitetura, guias e matriz com provas.
  Commitar entregas verificadas; integração/push de staging seguem a autorização do usuário.

## Primeiro lote: autoria ampliada com memória limitada

Arquivos: `src/tiles/chunks.ts` e testes; `src/core/projectConfig.ts`, operações de mapas,
grupos e tilesets, componentes de camadas, limites de aulas e testes de conformidade.
Um canvas de chunk é emprestado apenas até a próxima consulta ao cache: o render o consome
imediatamente. A política pode reciclar canvases já desenhados, sem manter todos os blocos
de todas as camadas no mesmo frame. Um orçamento por frame não aumenta o teto de retenção.

Aceite: pixels e animação iguais, camadas numerosas renderizadas, cache retido dentro do
orçamento, pressão/working set explícitos, nenhum corte no save/reopen, budget de células
em todas as mutações, criação de 16 camadas pela UI e medidas de render/autosave com dados
ruidosos no Chromium. Exportações mantêm seus próprios tetos até o lote 2 validá-los.

## Registro de execução

- Auditoria inicial: o cache de 32 MiB usava `Math.max(budget, frameBudget)` e podia reter muito
  mais que o teto. A autoria ficava em 8/128/64 embora o leitor já aceitasse 32/256/256.
- Lote 1a implementado: autoria ampliada, cache com retenção fixa e reciclagem de canvases,
  orçamento próprio das aulas preservado com recusa transacional e aviso na interface.
  [Evidências e medições](qa/autoria-e-orcamento.md).
- Conta de staging fornecida e login validado, incluindo autorização temporária deste
  navegador e entrada infantil no Pinta. O usuário informou disponibilidade somente desta
  máquina e autorizou simulações; desktop, toque emulado e CPU 4× mais lenta foram exercitados.
- O pior caso medido exige otimização na etapa 8 e transporte maior/mais eficiente no lote 2;
  isso não está sendo confundido com fluidez em hardware de entrada nem com compatibilidade
  de todos os mapas máximos em todos os destinos.
