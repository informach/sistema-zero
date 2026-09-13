# Jogo 2D atual — implementação aprovada

Base: `129b8f64`, branch `feat/jogo-2d-atual`. A proposta consolidada na conversa foi autorizada em 13/09/2026. Escopo operacional: staging; produção será uma decisão posterior. Fazer review e corrigir os achados entre todas as fases, além de full review final e relatório de pendências.

## Contrato da entrega

- Um editor e motor atuais; migrações históricas em módulo separado, sem participação no loop do jogo. Projetos convertidos independem do conversor.
- Conversor determinístico compartilhado entre importação/abertura e lote, validação sem perda, fonte autoritativa de Blocos/Ponte/Código preservada, idempotência, retomada e recuperação.
- Formato explícito, transporte completo de metadados, conflitos e escritores antigos tratados em nuvem/publicação. Nenhuma versão de extensão fingirá selecionar um runtime histórico.
- Mural e remix usam a mesma revisão atual. Links, autoria e vínculos preservados; importação com perda essencial não confirma cópia.
- “Blocos deste jogo” mantém os tipos atuais necessários à edição, inclusive depois de apagar sua última instância, respeitando modos e extensões da conta.
- Quatorze famílias com subseções: Jogo e telas; Sprites; Movimento; Controles; Colisões; Grupos; Vida e placar; Som; Desenho e efeitos; Tempo; Sorteios; Cenários; Inimigos; Kits prontos. Ordem estável, ajuda e busca coerentes com tutor/admin.
- Consolidar sete sons, atribuições de colisão/colisão circular/placar e parada de música com alcance explícito. Preservar semântica, escopo, avaliação única, unidades, ordem e IDs de eventos/recargas.
- Acrescentar pergunta circular, comando de recarga com corpo e destruição completa de sprite. Preservar sprites de texto/números existentes.
- Eliminar as sete definições históricas e caminhos do motor substituídos somente após conversões equivalentes e verificadas. Funções úteis do contrato atual e validações de integridade não são código histórico descartável.
- Revisar as 27 aulas atuais em `docs/aulas-interativas/*-v6`: roteiros, manifestos, critérios, montagem, configurações, interações, geradores, exemplos e QA. Preservar fontes históricas identificadas.
- Gerar `blocos-corre-dino.json`, `blocos-o-jogo-do-meu-jeito.json` e `blocos-desafio-primeiro-jogo.json` dentro dos respectivos cursos, no formato `{ "blocks": [...] }`, com matriz por aula e verificação reproduzível. Incluir núcleo, pré-requisitos e composições; não confundir lista de uso com concessão nova.
- Preservar progresso, entregas e continuidade de projetos. Fazer a revisão editorial de mídias; gravações humanas e validação pedagógica devem ser registradas como pendências quando não executáveis nesta sessão.

## Fases e reviews

Cada fase registra alterações, comandos/resultados, achados e resolução nesta seção antes da próxima. O relatório final diferencia implementação local, validação remota e etapas externas.

| Fase | Trabalho | Estado |
|---|---|---|
| 0 | Inventário local/remoto, referência de comportamento, destinos staging e plano técnico | Referência coletada; review concluído |
| 1 | Contrato de documento e infraestrutura isolada de conversão | Implementada e revisada; regras finais dependem das fases 3/4 |
| 2 | Persistência, abertura/importação, nuvem, publicação, mural/remix e ferramentas do projeto | Integração revisada; proteção local histórica e promoção remota dependem das fases 4/6 |
| 3 | Catálogo, clareza, consolidações e três capacidades novas | Implementada e revisada; exclusão física dos contratos substituídos é a fase 4 |
| 4 | Conversão das representações restantes e limpeza do editor/motor | Implementada; review registrado abaixo, verificação integrada continua nas fases 5–7 |
| 5 | Cursos atuais, listas por curso/aula, exemplos, permissões e QA | Implementada e revisada; gravações externas documentadas |
| 6 | Lote staging: simulação, aplicação, retomada, recuperação e validação integrada | Em andamento |
| 7 | Full review, correções, verificações finais e relatório | Pendente |

## Regras de migração

1. Reconhecer estrutura histórica antes de qualquer sanitização que descarte tipos; recusar formatos futuros e estruturas desconhecidas com diagnóstico.
2. Preservar original recuperável; converter uma cópia; validar; gravar; promover a revisão por comparação com a revisão de origem. Nunca sobrescrever alterações concorrentes.
3. Código manual prevalece sobre IR antiga. Transformar JavaScript por AST apenas em construções reconhecidas; casos dinâmicos não resolvidos impedem remoção do contrato necessário.
4. Mudanças de rótulo/categoria não exigem migração de lógica. Composições novas preservam expressões e defaults históricos; valores que variam por quadro continuam sendo avaliados no momento correto.
5. No lote, inventariar índices do banco, snapshots privados do mural, blobs/manifests/parts de criações e entregas. Não tratar só tabelas como se contivessem todos os documentos.
6. Nunca aplicar migração remota sem verificar ambiente e buckets de destino; esta entrega só aplica em staging. Backups ficam fora de índices ativos e da coleta de lixo até a conclusão da validação.
7. Depois do corte, gravação antiga não pode reintroduzir o formato histórico. Alterações offline divergentes são preservadas para recuperação.

## Aceitação

- Zero perda silenciosa de código, blocos ou assets; conversões repetidas não mudam o resultado.
- Abrir, modificar, apagar/recolocar bloco, salvar/reabrir, duplicar, importar/exportar, restaurar, publicar, jogar, remixar e remixar remix.
- Ordem de execução, gravidade, colisões, mapas/câmera, áudio, cenas, pausa/reinício e recarga preservados nos casos convertidos.
- Testes históricos executam o resultado no motor atual, sem reativar definições antigas.
- Cursos e permissões conferidos com perfil de aluno, sem depender de acesso de admin; critérios verificam a composição atual.
- Typecheck, lint, testes relevantes e orçamento de carregamento; navegador para fluxos alterados. Não declarar staging homologado só com testes locais.
- Produção permanece intacta. A versão candidata e os resultados do ensaio precisam ser identificáveis.

## Registro de execução

### Fase 0 — início

- Checkout original estava limpo em `staging`. Criado worktree isolado `C:/Users/tocha/projects/sistema-zero-jogo-2d`.
- Consultadas arquitetura canônica do Studio e documentação de ambientes. Railway e GitHub autenticados; nenhum deploy ou escrita remota realizado.
- O estudo anterior em `.audits/architectural-analysis-2026-09-13-jogo-2d.md` é evidência histórica. Sua recomendação de manter operações antigas no editor foi substituída pelo contrato acima.

### Review da fase 0

- Leitura remota em transação `read only`, ambiente `staging` confirmado. 45 criações Studio ativas, 6 entregas, 6 publicações e 6 configurações de Estúdio de aulas. Recebidos os 51 objetos principais do R2, sem erro, verificando buckets `testes-ugc` e `testes-privado`. Nenhuma escrita remota.
- Corpus inicial: 57 documentos, 55 em Blocos e 2 em Código; 9 com IR plana. Extensão Jogo 2D de 0.19.0 a 0.79.1. Encontrado uso real dos blocos históricos de desenho de mapa (2), câmera (1) e corações (1). Não é seguro eliminá-los só por estarem ocultos.
- Dados privados e snapshots ficaram exclusivamente em `.cache/jogo-2d/` ignorada pelo Git. Os assets externos das criações em partes ainda precisam ser materializados e verificados no ensaio completo (fase 6); o corpus inicial preserva seus manifestos e referências.
- Verificação de referência: `bun test src/projects/legacyCompatibility.test.ts src/official-extensions/game-2d/__tests__/moldCompatibility.test.ts src/official-extensions/game-2d/__tests__/textSpriteCodec.test.ts` em Studio: 17 passaram, 0 falharam, 57 asserções.
- Achado: `members.creations.format_version` e a recusa de downgrade já existem. Resolução do plano: reutilizá-los e transportar a versão do documento Studio, evitando outra infraestrutura concorrente.
- Achado: publicação tem sanitizador próprio que só aceita imagens e omite metadados/árvore Pro. Resolução prevista na fase 2: validação compartilhada e recusa de perda, incluindo arquivos e autoridade do código.
- Achado: conversões normais passam por sanitização síncrona e o carregamento do Blockly contém migrações. Resolução na fase 1/2: preparar documentos em fronteira assíncrona para carregar conversores sob demanda; o saneamento atual só valida o contrato resultante.
- Limites: ainda não houve migração aplicada, deploy, leitura dos projetos de produção nem homologação com alunos. O ensaio remoto não foi concluído por este inventário.

### Review da fase 1 — infraestrutura

- Criada fronteira assíncrona de documentos com formato explícito 2. O caminho atual não importa o conversor; o histórico carrega o módulo separado. Cópia validada sem invocar getters, limites de complexidade, detecção de ciclos e recusa de versões futuras.
- Movidos os leitores históricos de frames, campos, HTML, condicionais e assincronismo para `project-migrations`. A classificação histórica é um retrato de contratos da base, sem carregar Blockly. As entradas transitórias no diretório Blockly serão removidas na integração das fases 2/4.
- Primeiras regras: sons, variável de placar e expressão de colisão. JavaScript manual transformado por intervalos de AST, conservando comentários e argumentos; usos ambíguos são recusados. A autoridade da Ponte invalida seus derivados defasados.
- Verificação: 97 testes passaram, 0 falharam, 290 asserções; typecheck Studio passou; Biome e `git diff --check` passaram nos arquivos desta fase.
- Achado corrigido: fallback do leitor histórico podia devolver a entrada sem conversão. Agora fornece erro explícito, sem fabricar sucesso.
- Achado corrigido: getter de `formatVersion` podia executar antes da cópia. Leitura passou a usar descritor próprio validado.
- Corpus intermediário: 55 documentos passam pela infraestrutura e são idempotentes; 2 são recusados por `gk:rpgOnMap` de RPG 0.39.0. Investigado o runtime histórico: esse evento criava mapas implicitamente sem limites; o contrato atual exige mapa explícito com tamanho. Renomear ou inventar tamanho alteraria o comportamento. Estes casos continuam pendentes de regra equivalente na fase 4.
- Não é uma certificação das regras finais: câmera, mapas, corações, inimigos, colisão circular e novas operações serão fechadas nas fases 3/4. Nenhum documento convertido nesta fase pode ser promovido remotamente. A fase 6 exige a revisão dessas regras e a verificação dos assets externos.

### Review da fase 2 — fronteiras e gravações

- Extraído o validador puro de documentos, compartilhado pelo editor, player e servidor. Publicação conserva arquivos, áudio, árvore Pro e metadados; importação e restauro recusam descarte de conteúdo antes de gravar. Preparação histórica assíncrona na abertura, importação, nuvem, professor e mural/remix.
- Versão 2 transportada nos metadados locais e na nuvem. Reservas Studio exigem a versão corrente; commits verificam o documento efetivamente enviado ao R2 e recusam reservas antigas. Entregas de aulas recusam escritores antigos sem substituir entrega ou backup. Clientes atuais informam a capacidade de formato também ao excluir.
- Ferramentas usadas ficam retidas no projeto e em sua paleta, incluindo após apagar a última instância. Extensões não instaladas continuam fora da oferta. Defaults atuais da paleta substituíram a tabela histórica na reconstrução de sombras.
- Achados corrigidos: `applyProjectState` não retinha ferramentas; sombra numérica da migração de placar usava campo `VALUE` em vez de `NUM`; abertura assíncrona dependia da identidade de limites inline e não informava erro ao host; tela de erro não oferecia saída. Corrigidos e acrescentada prova de Blockly real compilando o valor migrado 37.
- Verificações: 82 testes de persistência/preview/migrações; 28 de nuvem; 90 de rotas e criações; 26 de validador, conversão real e paleta. Todos passaram. Após os últimos ajustes, persistência: 68/68, 243 asserções; entregas: 40/40, 136 asserções. Typechecks Studio e Members passaram; Kids/Admin ainda em execução no início da fase 3. Biome passou nos ajustes de encerramento.
- Corpus de 51 documentos R2: validação completa aprova 47. Quatro pendências diagnosticadas para a fase 4: dois mapas RPG implicitamente ilimitados, repetição periódica condicional antiga e um input de corpo vazio. Nenhum documento foi promovido.
- Dependências explícitas: proteção dos rascunhos contra abas antigas e backups locais (fase 4); materialização dos assets, promoção por revisão e recuperação remota (fase 6); navegador, orçamento de bundle e full review (fase 7). A integração está revisada, mas estes pontos impedem homologação/deploy do corte.

### Review da fase 3 — paleta e operações atuais

- Paleta editorial com 14 famílias e subseções, sem bloco duplicado ou categoria genérica “Mais”. O mapa usado pelo professor e pela busca deriva desta árvore. Sete efeitos passaram a uma seleção; placar e atribuições de colisão saíram da oferta; o comando de parar música tem alcance explícito. As 11 definições substituídas estão temporariamente ocultas até a exclusão física na fase 4.
- Esclarecidos rótulos e dicas de velocidade, gravidade, visibilidade, tamanho, movimento de grupos, estado da partida, mensagem de fim de jogo e consultas que consomem ações. Busca aceita vocabulário anterior sem oferecer tipos fora da paleta liberada. Manual e tutor apresentam os endereços novos.
- Novas operações: pergunta circular pura, ação síncrona com recarga e destruição permanente. Codecs e esquemas ficam na extensão; reconhecimento de áudio extraído das fachadas centrais, que passaram novamente nos limites de arquitetura.
- Destruição remove vínculos de todos os grupos gerenciados, impede reinserção, cancela imagem pendente, clique e HUD acessível, e deixa referências remanescentes inativas para desenho, colisão e ações. Sair de um grupo continua permitindo reutilização. A recarga usa quadros da partida, congela na pausa e preserva chaves explícitas. Duplicar uma ação criada no Blockly ganha recarga independente.
- Achados corrigidos: guardas iniciais de destruição não cobriam nomes de argumentos de kits e alvos secundários; cancelamento de imagem precisa continuar mesmo depois da marcação de destruição; entradas do mapa de cliques precisavam sumir ao substituir ou falhar um callback; texto acessível precisava ser retirado sem esperar outro desenho. Corrigidos com ensaios de comportamento.
- Verificações: suíte final de motor, ações, ciclo de vida, assinaturas, arquitetura e busca: 209 passaram, 0 falharam, 623 asserções. Teste adicional de duplicação incluído; seis testes de ações passaram, 15 asserções. Manual/paleta/tutor: 50 passaram, 204 asserções. Studio typecheck passou; Biome verificou 171 arquivos e corrigiu somente formatação/imports.
- Limites: Canvas em Happy DOM verifica eventos e HUD, não rasterização; pixels, navegação e desempenho de carregamento ainda precisam do navegador na fase 7. O conversor continua intermediário e nenhum projeto remoto foi promovido. Cursos e permissões são a fase 5.

### Fase 4 — checkpoint intermediário (ainda não é o review de encerramento)

- Retiradas as 11 definições consolidadas, seus casos de schema/Blockly/gerador/parser e as sete entradas públicas de áudio substituídas. Os sintetizadores internos continuam servindo ao seletor de efeitos. Exemplos 2D usam as operações novas.
- Retiradas as duas variantes de configuração de inimigos no início: o comando atual é válido em Meus moldes, Ao iniciar e nos corpos já permitidos. O conversor conserva sua posição; o normalizador corrente deixou de inventar tipos `LegacyStart`. As cinco demais definições históricas ainda precisam de conversão e retirada.
- Regras novas: colisão circular, alcance de parada musical, retenção de ferramentas já concedidas, chamadas em blocos genéricos, código bruto de IR/Blockly, JSX/TSX e JavaScript em HTML (scripts e eventos). HTML usa parse5 isolado no conversor e preserva os intervalos autorais fora do código.
- Cópia e comparação de integridade passaram a travessias iterativas; ensaio com pilha de 2.001 blocos. O corpus mostrou sombras copiadas com IDs repetidos: o conversor reidentifica somente essas sombras de forma determinística. IDs repetidos entre blocos de programa são recusados.
- Temporizadores condicionais viram condições editáveis no mesmo ponto de execução. Corrigido o parser atual que promovia qualquer `if (everyFrames(...))` a raiz periódica: só um callback de quadro constituído integralmente pela condição permite essa promoção. Chaves explícitas passam pelo schema, gerador e dados Blockly. Prova executa antes/depois da Ponte contra o contador real do motor.
- Achados durante a limpeza: exclusão de caso final de switch compartilhado retirou um `return` do coletor de nomes; reposto e conferidos os demais grupos. Deslocamento de argumentos genéricos precisava excluir todos os nomes anteriores antes de preencher os novos, para não apagar argumentos já deslocados; corrigido.
- Verificação intermediária: 98 testes de parser, motor e conversor passaram, 529 asserções. Corpus R2: 48/51 passam; restam dois mapas RPG sem limites e um projeto que instala Jogo 2D e Jogo 2D Avançado, combinação hoje recusada pelo catálogo (a falha anterior de input vazio ocultava esta segunda divergência). Typecheck em execução; fixtures antigas de moldes/inimigos e outros testes ainda precisam ser atualizados.
- Pendências desta fase: cinco definições históricas restantes e caminhos substituídos do motor; mapas RPG; declaração antiga de extensão conflitante; persistência local isolada com backup contra abas antigas; validação de IR/frame corrente e retirada final de entradas de migração; atualização dos testes e do inventário vivo. Não houve escrita remota nem deploy.

### Review da fase 4 — conversor e retirada dos contratos substituídos

- Catálogo atual: 283 definições visíveis, nenhuma oculta. Excluídas fisicamente as 18 definições substituídas/históricas da extensão, além das quatro cápsulas antigas do núcleo. Retiradas as cinco entradas de migração do diretório Blockly e o leitor antigo de snapshots que permitia perdas.
- Câmera e corações viram chamadas genéricas editáveis. Desenho antigo de mapa ganha função editável que captura argumentos uma única vez, prepara o posicionamento e desenha. O motor recebe `centerTileMap`; `drawTileMap` tem somente dois argumentos. Layout histórico e sobrecarga foram retirados.
- RPG histórico ganhou criação explícita sem limites, preservando o espaço aberto. Nomes dinâmicos, contratos misturados e registros condicionais ambíguos são recusados com diagnóstico. O conversor não inventa dimensões.
- Retirados o callback direto `onDefeat` e o reinício por recarga de página. Código que depende dessas construções precisa de conversão explícita; a auditoria de ciclo de vida impede promover um reinício sem preparação registrada. O `onStart` atual permanece como API do ciclo de vida, mesmo sem o bloco visual antigo.
- Persistência local atual usa partições v2. O conversor local guarda os registros brutos e promove backup/destino/remoção em uma transação com comparação da origem. Edição divergente de aba antiga vira cópia recuperada; repetição não ressuscita um projeto excluído. Ensaios com IndexedDB real simulado cobrem abortos, conflitos e repetição. Migrações promovidas avisam o espelho da conta ativa.
- O leitor corrente exige IR por áreas e não converte IR plana. A ordenação antiga por colunas saiu do compilador e ficou no conversor. A marca de áreas é atualizada depois da conversão estrutural. A antiga flag `disabled` vira `MANUALLY_DISABLED`, pois o Blockly 12 ignorava aquela flag.
- Corrigidos na revisão: recarga precisava ser callback síncrono na análise de execução; função auxiliar de mapa expunha um erro de análise de escopo; dependências do motor precisam incluir chamadas genéricas; abertura não pode informar pronto no intervalo entre dois projetos; Pro precisava nascer com formato explícito; marcadores antigos impediam três documentos reais de passar no leitor corrente.
- Exemplos e seus geradores usam sons consolidados e temporizadores com contexto de quadro. Sete exemplos iniciantes foram materializados e o reparo automático de seus laços foi eliminado. O índice de exemplos do servidor foi regenerado.
- Verificações: 51/51 documentos principais R2 passam pela validação estrutural; isso ainda não cobre assets externos nem execução remota. Suíte de exemplos/migrações: 176/176, 700 asserções. Revisão específica de ordem de argumentos, desativação e reinício: 3/3, 11 asserções. Persistência, migração e contratos: 137/137, 9.794 asserções. Testes corrigidos de importação, áreas, histórico e seletores: 130/130, 376 asserções. Orçamento de carregamento passou nos quatro caminhos, sem aumentar limites. `git diff --check` passou.
- A suíte ampla intermediária teve 8.187 aprovações e 32 falhas: 16 pertencem aos geradores das aulas ainda antigas (fase 5); as demais apontaram fixtures antigas, falha de isolamento de estado, limite documentado do novo parâmetro RPG e snapshot de catálogo. Os testes diretamente afetados foram corrigidos e reexecutados; a suíte ampla será repetida depois das aulas. Typecheck fresco em execução. Biome aplicou formatação e apontou um helper morto e operadores de vírgula em fixtures, ainda a limpar no full review.
- Limites para o corte: materializar partes/assets e verificar revisão/hash/CAS no lote; certificar gravações antigas, grants congelados e mural/remix; testar navegador. Esses são trabalhos das fases 6/7. Nenhuma escrita remota, deploy ou alteração de produção foi realizada.

### Review da fase 5 — cursos e critérios

- Atualizadas as 27 aulas atuais dos três cursos, seus roteiros, manifestos, montagens e geradores. Mantidas as âncoras e a proveniência dos vídeos originais; os trechos de Studio têm instruções novas e marcação de regravação necessária.
- Listas completas e ordenadas: Corre Dino, 44 tipos; Desafio Primeiro Jogo, 45; O Jogo do Meu Jeito, 49. Cada curso inclui matriz por aula com localização e descrição derivadas do catálogo corrente. Os quatro blocos novos de arte do Meu Jeito continuam distintos do programa herdado, evitando liberar ferramentas adicionais por engano.
- Comparação com os JSONs originais externos: os conjuntos Dino e Desafio correspondem exatamente à conversão das listas anteriores, sem acréscimos ou exclusões além da consolidação dos sons.
- Achados corrigidos: critérios dos sons precisam conferir o campo FX para distinguir pulo, tiro e explosão; o gerador Meu Jeito emitia uma atividade que não corresponde ao contrato publicado; o validador Dino cobrava um tipo editorial histórico. Corrigidos com casos negativos e validação das âncoras.
- Projetos QA do Meu Jeito exercitam a troca de arte nas aulas 6–8 com animação, tiros, asteroides, derrota e reinício. Os JSONs dos três cursos foram usados para montar a paleta restrita real e todos os tipos ficaram disponíveis.
- Verificações: 45 testes editoriais passaram, 438 asserções; paleta restrita, 16/16, 42 asserções. Validadores dos três cursos e conferência de arquivos gerados passaram. Suíte completa Studio: 8.231 testes, 0 falhas, 130.307 asserções em 527 arquivos. Typecheck fresco passou depois da correção do campo obrigatório `source` na imagem do teste.
- Limites: roteiros preparados não são vídeos gravados. Não houve publicação de aulas nem alteração remota de configurações, grants ou projetos. A conversão desses registros é a fase 6; a revisão final inclui navegador.

### Review da fase 6 — implementação do lote e ensaio offline completo

- Ferramenta operacional em `packages/studio/scripts/project-migrations`, com capture, plan, simulate, check-remote, apply e rollback. Destino fixo de staging, verificação do commit implantado, ambientes e buckets; nenhum caminho de produção. Instruções de operação e retirada futura no README do conversor.
- Inventário completo materializou os 205 objetos: 51 documentos principais e 154 partes/assets. Hash, tamanho e conjunto de referências conferidos. O plano converte 57 documentos de projetos/entregas/mural, 63 registros e 51 objetos, sem pendências. Projetos iniciais dentro de cursos/rascunhos são convertidos também e não entram nessa contagem de 57.
- Com os bytes reais em memória, passaram: interrupção após preparar objetos, retomada, reaplicação sem nova revisão, segundo plano vazio, recuperação dos originais sob novas revisões e recuperação repetida. Uma segunda captura confirmou a mesma cobertura. A comparação dos 63 registros e a conversão de tipos SQL passaram em transação remota somente leitura.
- Achado corrigido: JSON enviado ao postgres-js era recodificado pelo tipo JSONB inferido. A parametrização agora passa por `text::jsonb`; a conferência remota exige igualdade de todas as colunas depois da conversão SQL. Datas usam a mesma representação UTC do banco.
- Achados corrigidos: o commit precisava cruzar as partes do manifesto efetivamente validado pelo BFF com a reserva dentro da transação; entrega de galeria também contém snapshots separados; publicação de rascunhos depende do hash dos blocos, metadados, anexos e seções; a versão de curso precisava avançar para recusar abas antigas. Cobertos no código e nos testes.
- As três bases de rascunho reais coincidem com o hash publicado antes do lote e continuam coincidentes depois. Duas publicações mudam; as edições em andamento permanecem. A promoção compara o inventário completo sob bloqueio breve de escrita, incluindo linhas que não foram alteradas, e recusa inserções concorrentes.
- Backups são privados, imutáveis e independentes de índices/GC/quota. Recuperação usa diário durável, CAS e contadores crescentes; não apaga backups nem revisões produzidas pelo ensaio. Código dinâmico ou critério de composição sem equivalência demonstrada impede aplicação.
- Limite desta revisão: `apply`/`rollback` foram ensaiados offline; ainda não houve promoção de dados nem deploy em staging. A versão candidata passa agora pela revisão integrada e pelos portões de CI antes da execução remota.

### Full review — rodada da candidata local

- Suíte completa Studio: 8.241 aprovações, zero falhas, 130.346 asserções em 528 arquivos. Members: 1.071 aprovações, zero falhas, 39 casos condicionais sem banco QA; o banco descartável localhost foi preparado depois para executar esses caminhos. Kids: 781/781; Member Shell: 496/496.
- Chromium: 26 testes de texto/números, quiz, toque, colisões, reinício, abertura e gravação ao recarregar passaram. Outros três testes novos passaram para importação histórica, retenção da ferramenta após apagar/recarregar, recusa de importação inválida e preservação de arquivos locais incompletos. O navegador integrado não estava disponível; foi usado o runner Playwright do próprio repositório.
- Achados corrigidos: conversão local de um arquivo incompleto não deve impedir listar os demais; avisos de gravação devem conservar o perfil capturado; backups locais não devem ser substituídos numa repetição; limite de blocos precisa ser verificado antes das transformações caras; encaixe desconhecido de área deve ser recusado antes do descarte pelo Blockly; mapas RPG com viagem imediata antes de registrar eventos exigem revisão explícita.
- Autoria de aulas e rascunhos recusa projetos iniciais anteriores ao formato 2, conservando a edição válida. Teste com PostgreSQL real provou a recusa e a revisão inalterada. O teste precisou aguardar a operação diretamente antes da asserção: o matcher assíncrono do Bun deixava a transação parada em BEGIN, enquanto o await direto concluiu em 94 ms. Nenhum timeout foi aumentado.
- JSONs e manifestos editoriais conferidos após formatação; lint global verificou 6.451 arquivos sem erros. Typechecks frescos Studio, Kids e Admin passaram; Members/Shell e orçamento final estão sendo fechados. Resultados definitivos de CI, promoção e homologação serão registrados antes do relatório final.

### Full review — progresso antes da aplicação

- A candidata `e37bced8` foi integrada em staging pelo PR #163. CI iniciou; ainda sem aplicação dos dados.
- Achado corrigido no script isolado: trocar `content_revision` numa conversão equivalente invalidaria uma verificação parcial do projeto. O lote agora conserva a revisão pedagógica. Ao converter a representação de um critério, atualiza somente o hash correspondente em `lesson_section_progress`, com identidade composta de perfil/aula/seção, mantendo aprovação e datas. Referências que já eram antigas não são promovidas indevidamente.
- Prova com dois perfis na mesma seção conserva tanto aprovação parcial quanto conclusão, mantém a revisão do bloco e recupera as referências originais. Dez testes do lote passaram, 45 asserções. Contadores de jogadas/curtidas do mural ficam fora do bloqueio do banco, pois o ETag protege seu documento e a homologação não deve invalidar o próprio ensaio.
- Verificações finais adicionais: Members/Shell typecheck passaram; 51 testes de PostgreSQL real e autoria passaram; a suíte de publicação/migração das aulas em PostgreSQL passou após aguardar diretamente a recusa de escrita no teste. Orçamento de carregamento e revisão do lote: 16/16, 82 asserções, tetos inalterados. Os 27 manifestos, 111 seções, 145 clipes e 35 objetivos foram conferidos.
