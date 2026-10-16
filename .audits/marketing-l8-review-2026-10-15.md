# L8 — inventário e carga do acervo (aberto)

## Inventário implementado e demonstrado

- Scanner Node separado do código compartilhado, com entrada por diálogo nativo do Electron. Lê `docs/marketing`/`output` do Sistema Zero e `meus-produtos` do Fluxo Criativo, incluindo arquivos ignorados pelo Git. Não executa scripts da origem.
- Contrato versionado com caminho relativo, produto, categoria, disposição, vigência não inferida, tamanho e SHA-256. Hash do retrato não depende da data da leitura. A classificação preserva arquivos iguais em origens diferentes.
- Exclusão de credenciais por nome/conteúdo, caches, dependências, links/junctions e propostas de engenharia; subárvores excluídas são registradas como tal, sem inventar contagens de descendentes. Limites de leitura, profundidade, volume e cancelamento; detecção de mudanças no arquivo durante a leitura e revalidação antes do consumo.
- Revisão do inventário real encontrou `vite-cache`, mídias de apoio e prévias dentro das pastas de produção. Regras corrigidas para não tratá-las como entregas finais. `final-media` indica candidata à entrega, não aprovação. Direção em pasta de copies recebe categoria pelo nome do documento antes da categoria da pasta.
- Inventário local durável e separado por servidor/usuário/projeto, sem caminhos absolutos na ponte. Registro no servidor é explícito e retomável em blocos de até 100, com conferência incremental do hash, estado compartilhado e paginação. Carga incompleta não é confirmada; repetição divergente é recusada. Desativação preserva registros.
- Migração Drizzle gerada `0014_bumpy_lizard`, aditiva e inspecionada, aplicada apenas ao banco local `marketing_review`.

## Evidência real

- Electron + Next BFF 15314 + gateway 15300 + marketing 15311 + PostgreSQL 15439: `.cache/proof-l8-electron.log` e `packages/marketing-desktop/.cache/connected-proof/inventory-evidence.json`.
- Projeto de revisão `029147d6-bbaa-4519-abe0-6880c8c53ad5`: **4.191 registros** do Sistema Zero (4.139 elegíveis, 41 a conferir, 11 exclusões de arquivos/subárvores, 0 bloqueios) e **561** do Fluxo Criativo (536 elegíveis, 25 a conferir). Não são contagens de peças publicadas nem de arquivos finais.
- Sistema Zero: digest `c0b254b17530d624aeeb75db92ed61af132c6bc776adfca94085eb7cf0410fd6`, 1.214.057.776 bytes lidos e 488 conteúdos repetidos preservados. Fluxo: digest `896cc5f2bf8b262f7cc8a044ca9b4820236227d6692657ead803bf0f1bb1f64f`, 226.536.574 bytes, 43 repetições preservadas.
- Ambas as transferências foram interrompidas após 100 registros, retomadas depois de recarregar o renderer e reabrir o armazenamento local, e repetidas após confirmação. Mesmo ID e digest; nenhuma duplicação. Screenshot `inventory-review.png` inspecionado visualmente; duas cargas confirmadas e botões legíveis.
- Esta prova não enviou os textos/bytes das mídias, não ativou produtos, não aprovou ou publicou conteúdo. O diálogo nativo de seleção não foi automatizado: a prova chama o scanner real sobre as duas raízes autorizadas e usa a ponte real para a transferência.
- Inventário: 8 testes / 37 assertions; armazenamento local: 1 teste / 5 assertions. Backend anterior à carga de fontes: 311 testes / 1.437 assertions, todos passando. Typecheck de backend/web/desktop e build desktop passaram nessa etapa; o aviso existente de chunks grandes do Studio continua aberto.

## Correção encontrada pela prova integrada

Criar projeto durante sincronização em voo podia esperar uma consulta iniciada antes da criação e deixar o projeto ausente do cache. Sincronização explícita agora espera um ciclo iniciado após o pedido; polling ainda compartilha o ciclo em voo. Prova com barreiras determinísticas e SQLite real passou, assim como a nova execução no Electron. Suite SQLite: 10 testes passando. O encerramento ainda pode receber pedidos de leitura do renderer depois do início do shutdown; tratar no review de lifecycle, sem ocultar o erro.

## Carga de fontes em implementação

- Migração gerada `0015_tearful_molly_hayes` registra destino/revisão exatos por origem, caminho e hash, além do resultado por item do inventário. A FK longa foi corrigida com nome explícito na migração gerada `0016_bright_tempest`, inspecionada e aplicada somente à revisão.
- API valida bytes UTF-8/base64 ou arquivo confirmado com hash/tamanho iguais ao inventário. Textos longos são repartidos preservando todos os caracteres. Origem vira referência não verificada/histórica; nunca direção vigente por inferência.
- Reimportação reutiliza a versão da origem sem sobrescrever edição da equipe. Fonte alterada cria outra versão de referência; a anterior e suas revisões continuam disponíveis. Adoção da amostra anterior exige path/hash/body exatos e a tag de carga preparatória.
- PostgreSQL: 4 testes / 22 assertions na suite de importação, incluindo preservação de edição humana, bytes/BOM/CRLF, repetição, fonte alterada, texto longo, credencial recusada e ACL. Revisão ampliada posterior: **313 testes / 1.449 assertions**, zero falhas; `.cache/tests-l8-sources-full.log`.
- Carga textual nativa por item implementada, com revalidação dos bytes, limite de 192 KiB por pedido, operação determinística e consulta dos destinos pela web/desktop. Prova real no Electron/BFF/gateway/PostgreSQL importou duas fontes das duas origens com SHA idêntico, confirmou sincronização local e repetiu sem duplicar. Evidências: `.cache/proof-l8-sources-current.log`, `source-import-evidence.json`, `source-import-review.png`. Não comprova a carga integral nem o upload dos arquivos maiores/binários.
- A prova encontrou chaves React repetidas entre biblioteca, importação e equipe: re-renderizações podiam duplicar painéis. Chaves agora incluem o papel do painel; a prova exige exatamente um diálogo e o link da referência carregada. Screenshot inspecionado. Ampliada a largura do diálogo para facilitar a leitura das origens.
- Progresso identificado como importação e cancelamento restrito ao servidor/conta/projeto da tarefa; não cancela uma geração de IA diferente.
- Política **marketing-acervo-v2** identifica o produto pelo diretório da origem, preservando também os sete arquivos de `cade-todo-mundo` encontrados no acervo atual. v1 continua legível e seus hashes não são reescritos. Novo inventário local v2: Sistema Zero `9dc73ba6dc79e57bc1fe5a9a98875a97d1a830bfe35ae9d7cfdc8417922249e6`; Fluxo `942f78c17d5d6075961c12c1aaf5a5e83843f314f060feb27c2926d0b91eb241`. Mesmas contagens/bytes; as provas compartilhadas acima preservam v1. A política v2 ainda precisa da prova de transferência completa. O rascunho de referência Cadê Todo Mundo importado na prova v1 está em um projeto de revisão, não foi ativado como produto nem direção.

## Critérios ainda abertos

- Completar carga em lote e arquivos maiores/binários com progresso/retomada/resultados por origem; conferir mídia real e R2. Classificação alterada entre políticas precisa ser apresentada para revisão, sem sobrescrever referência editada.
- Mapear contexto, calendário, copies, extras, stories, fixados, destaques, ManyChat e registros de produção às entidades editoriais. Preservar P01 e a pendência real de P29; importar P07 vigente.
- Separar projetos/produtos, conferir fontes/dependências, mostrar conflitos/delta e conservar edições feitas no app.
- Reconciliação integral e ativação (L8B), prova visual de amostras importadas, recuperação entre computadores e revisão integrada. L8A/L8B não estão encerrados.
