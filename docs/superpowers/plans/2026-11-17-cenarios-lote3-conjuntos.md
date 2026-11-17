# Lote 3.6 — Conjuntos reutilizáveis e vivos — Implementation Plan

> Executar com `executing-plans`, sem delegação ou aprovação intermediária. Staging conferida e limpa em `237dc9794`; partes 3.1–3.5 fechadas. Somente o lote 3 está ativo.

**Goal:** salvar composições nomeadas na biblioteca, colocá-las e transformá-las como unidades, editar sua definição na oficina existente e atualizar as cópias atuais sem alterar versões históricas.

**Architecture:** definições versionadas e imutáveis, fixadas no documento; montagens com identidade e transformação próprias; expansão pura para os objetos/grupos usados pelo motor. A edição usa a mesma oficina, fila e comandos. Atualização viva produz lotes autorais nas cabeças afetadas, com conferência de revisão e orçamento, em uma transação do espaço. Nenhuma resolução mutável de catálogo durante replay.

**Tech Stack:** TypeScript/Zod, React e Three existentes; Members/Drizzle/Postgres, gateway/BFF e protocolo de blobs existentes.

## Contratos e decisões

- Conteúdo da definição reaproveita o fragmento de objetos/pastas. Separar os esquemas elementares de objetos do documento para que documento → conjunto → fragmento não forme uma dependência circular de esquemas. Reexportar os contratos públicos atuais, sem duas versões de um mesmo esquema.
- A biblioteca guarda conjunto, revisões, nome/pasta/etiquetas e miniatura. O cenário fixa a definição efetiva (biblioteca, conjunto, revisão e conteúdo) e guarda suas montagens. Não consultar a cabeça do catálogo para abrir uma revisão antiga.
- Montagem é uma entidade de autoria com nome, pasta, camada, cadeado, visibilidade, propriedades, posição, giro e tamanho uniforme. Preservar as proporções por eixo das peças internas; não introduzir cisalhamento para simular uma transformação que o documento não representa.
- A expansão resolve os apoios dentro da definição em seu espaço original e depois aplica a transformação da montagem. Isso conserva a composição e seus contatos como um corpo, inclusive em giros fora do Y. As relações originais permanecem na definição. Não salvar milhares de clones editáveis com uma segunda transformação que possa divergir da montagem.
- As peças expandidas pertencem à montagem: picking e seleção retornam sua raiz. Mover, girar, dimensionar, duplicar e apagar operam na montagem; editar as partes abre a definição ou uma desvinculação explícita. Não editar silenciosamente um clone desconectado.
- Uma composição pode conter outras composições ao capturar a seleção; o conteúdo salvo é sua expansão fixada naquele instante. Não criar dependências recursivas de catálogo ou permitir ciclos. Conservar pastas internas e remapear IDs de apoios.
- Limitar conteúdo por definição, definições fixadas, montagens e expansão pelo orçamento global, incluindo 20.000 objetos e 8 MiB. Recusar integralmente uma edição da definição se qualquer cabeça afetada ultrapassar limites.
- Apoios externos são resolvidos na captura, usando alturas reais. Colocar uma montagem usa a base da composição como âncora; não reassentar cada peça isoladamente e deformar a praça. O lote 4 deverá reassentar a montagem pelo apoio de sua base após mudar o terreno.
- Definições e arquivos continuam dentro do mesmo espaço e das licenças existentes. O GC protege arquivos nas definições e revisões, cenários, lotes e inversos. Apagar o catálogo não invalida as cenas que já fixaram seu conteúdo.
- Atualização viva mantém a identidade/transformação de cada montagem. As cabeças recebem comandos com nova definição fixada; versões anteriores dos cenários permanecem iguais. A transação confere a versão esperada da definição, as revisões dos cenários, os arquivos confirmados e o orçamento antes de gravar tudo. Não usar atualizações parciais fora de uma transação.
- Miniatura pertence à revisão da definição fotografada. Respostas atrasadas não podem associar retrato à revisão errada. Reutilizar reserva/envio/confirmação de imagens, sem binários ou URLs temporários dentro do documento.
- Edição da definição deve usar um cenário de rascunho real, vinculado ao conjunto e guardado pela mesma fila/histórico dos cenários. Um mundo interno por biblioteca pode hospedá-los, identificado por fonte e ausente da lista normal de jogos. Não criar um segundo motor de edição nem um histórico paralelo de comandos.
- O rascunho é persistente e compartilhado com CAS de revisão. Seus gestos não disparam publicações em todos os jogos. A ação explícita Atualizar cópias publica o rascunho salvo, conferindo tanto a revisão do catálogo quanto a do rascunho na transação. A interface deve distinguir rascunho guardado de versão publicada.
- Registrar na cabeça do conjunto o cenário vinculado e a revisão desse cenário que foi publicada. Publicação direta por agente só pode substituir um rascunho limpo; não apagar alterações pendentes de outra pessoa. Quando limpa, atualizar a fonte editável junto com a publicação. Quando publica o rascunho, conservar seu documento e apontar a revisão publicada. Reabertura e undo usam o histórico existente.
- O pivô da definição permanece estável entre versões. Normalizar o conteúdo para uma âncora local fixa ao preparar o cenário de edição; ao publicar, não recentralizar automaticamente pelo novo bounding box. Acrescentar uma flor numa borda não deve deslocar todas as outras peças de cada cópia.

## 1. Núcleo e representação

- [x] Extrair os esquemas elementares sem mudar sua validação e rodar a regressão existente. `entidades-schema.ts` e fragmento básico sem dependência circular; contratos públicos reexportados.
- [x] Definir conteúdo fixado, montagem, expansão limitada, identidade dos filhos e consulta de seleção/volume.
- [x] Implementar intenções de montar, transformar, duplicar, desvincular, remover e atualizar definição; inversão, clipboard e restauração coerentes.
- [x] Testar proporções, giros XYZ, contato/apoios internos, remapeamento, cadeados, limites, referências malformadas e preservação da origem/histórico.

## 2. Persistência e atualização viva

- [x] Acrescentar domínio/portas, tabelas de conjuntos/revisões/usos e índices. Gerar DDL com o script do projeto; não editar SQL gerado.
- [x] Serviço e repositório conferem espaço/licenças/arquivos, conflito de versão e limites. Atualizar cabeças afetadas atomicamente, com os mesmos lotes/histórico.
- [x] Conservar snapshots antigos e arquivos necessários; conferir remoção de biblioteca/conjunto, exclusão de cenário e liberação final.
- [x] Rotas Members/gateway/BFF e hosts HTTP/memória com o mesmo contrato. Provar SQL real, concorrência e recusas entre espaços.

## 3. Biblioteca, oficina e motor

- [x] Salvar seleção com nome e miniatura, listar/buscar/organizar conjuntos na biblioteca e gaveta existentes.
- [x] Colocar cópias, selecionar raiz, mover/girar/dimensionar/duplicar/apagar e editar definição pela oficina existente; sem outro editor ou armazenamento.
- [x] Mostrar revisão e estado de atualização, aplicar undo/redo e restaurar após reabrir. Cancelar resposta atrasada ou edição de outra versão.
- [x] Ajustar renderização, picking, árvore, camadas e volumes às montagens; retirar recursos sem destruir conteúdo compartilhado.

## 4. Verificação e revisão

- [x] Ensaio de composição com GLBs reais, apoio por contato e pastas internas: colocar/mover/girar/duplicar/reabrir, conferindo proporções e relações.
- [x] Alterar definição usada por dois cenários; conferir atualização das cabeças, revisão antiga intacta, conflito, undo/redo, limite recusado e arquivos preservados.
- [x] Conferir teclado/toque, claro/escuro, 390/1.024/1.440 px, miniaturas e recursos em ciclos.
- [x] Regressões, tipagem, build, revisão local, relatório/evidências e commit/push. Só depois marcar 3.6 e seguir a 3.7. Lote 3 continua aberto até 3.8.

## Registro intermediário — não fecha a parte 3.6

- Núcleo em implementação: `conjuntos-schema.ts`, `conjuntos.ts`, comandos `conjunto.definir/remover/atualizar` e `montagem.definir/atualizar/remover/duplicar/desvincular`. Definição fixada e imutável; expansão de leitura sem clones autorais; tamanho uniforme e giros XYZ. Inversão granular e clipboard conservam cópias vivas; captura para uma nova definição fixa a expansão, sem catálogo recursivo.
- A validação confere orçamento expandido, referências, IDs, raízes, camadas e cadeados. `arquivos-referenciados.ts` inclui snapshots e procedência do espaço; serviço, transação e host local conferem a origem. A coleta SQL usa os mesmos caminhos estruturais de cabeças, comandos, inversos e restaurações, centralizados em `cenarios-arquivos-json.ts`.
- Verificações até aqui: núcleo 148 testes/3.907 asserções; teste independente do motor compara 25 composições XYZ com matrizes Three, 400 asserções. Oficina 53/355; Postgres 24/186. O teste de arquivos de conjuntos falhou com o repositório anterior (apagava os três arquivos ainda necessários) e passou com a correção. Logs privados `output/cenarios-reforma/conjuntos-*`.
- Ainda não há catálogo de conjuntos, atualização transacional entre cenários, edição visual de definição, miniaturas ou integração das montagens com palco/seleção. Não apresentar esses contratos como ferramenta concluída nem marcar 3.6.

Atualização intermediária posterior: migrações geradas `0158_fluffy_maggott.sql` (catálogo/revisões/usos) e `0159_wise_lady_bullseye.sql` (operações idempotentes e FK de versão nos usos), ambas ainda locais. `ConjuntosNoPostgres` usa os mesmos hooks de transação e gravação de lotes, extraídos sem alterar seu comportamento. O primeiro teste real de publicação em dois cenários passou: versões antigas intactas, transformações preservadas, repetição idempotente, bloqueio/conflito/cota/expansão recusados integralmente e exclusão do catálogo sem invalidar snapshots. Esse ensaio usa o repositório; endpoints e interface ainda faltam. O double de testes foi ampliado para a porta nova. Não é fechamento de 3.6.

### Próxima sequência de arquivos

1. `members/domain/cenarios/cenarios.ts`, porta `cenarios-repository.port.ts`, `schema.ts` e DDL gerada: catálogo, revisões imutáveis e usos atuais. Corpo JSONB com tamanho limitado e contado na cota; imagens no protocolo de blobs existente. Revisões e miniaturas protegem seus arquivos.
2. `cenarios.repository.ts`: extrair a gravação de lote sob a trava existente para reutilização na atualização viva. Prevalidar todas as cabeças, gravar definição e lotes em uma transação do espaço, conferir versões/conflitos e manter o índice de usos. Nenhuma alteração de cenário histórico.
3. Serviço/rotas/hosts/BFF e testes SQL/HTTP: espaço, origem e papel dos arquivos, exclusão, conflito e orçamento recusados sem parcialidade. Definições já fixadas continuam disponíveis ao remover catálogo.
4. Motor e oficina: conservar documento autoral separado da projeção expandida; picking retorna raiz, gizmo e painel operam na montagem. Ajustar árvore/clipboard/aparência/espalhamento à consulta correta. Ocupação do pincel deve incluir volumes das montagens; seu resultado continua gravando no documento autoral real.
5. Biblioteca/gaveta e edição da definição reaproveitam as telas existentes, com nome, miniatura da revisão correta, confirmação de atualização e tratamento de resposta atrasada. Só após os ensaios fechar 3.6.

### Rascunho persistente — checkpoint adicional, parte 3.6 ainda aberta

- Migração gerada `0160_flaky_marvel_zombies.sql`: vínculo único entre conjunto e cenário de edição, revisão da fonte publicada e mundo interno por biblioteca. Sem conversão de dados existentes; as colunas novas são opcionais. Na implantação final, aplicar antes do backend que as consulta. O cenário reutiliza fila, CAS, inversos e fotografias do histórico existente.
- Abrir a edição prepara uma única fonte mesmo sob concorrência. O mundo interno não aparece como jogo nem consome o teto de mundos; bibliotecas de recursos autorizadas continuam acessíveis à mesma oficina. O serviço impede apagar/duplicar a fonte pelos atalhos de cenários comuns.
- Publicação confere revisão do catálogo e do rascunho. Edição direta recusa rascunho pendente; quando limpo, sincroniza sua fonte dentro da transação. Publicar o rascunho mantém seu documento e marca a revisão publicada. Undo posterior modifica o rascunho, sem republicar cópias automaticamente.
- Validação recusa água/terreno/caminhos/marcadores não representados no conteúdo e uma montagem do próprio conjunto. A revisão encontrou uma saída antecipada que pulava essa conferência quando não havia montagens: teste vermelho reproduziu a aceitação indevida, e a conferência foi movida antes da saída.
- Teste vermelho também reproduziu resposta de repetição incluindo indevidamente a fonte entre as cópias atualizadas. O lote da fonte agora usa chave própria, mantendo a resposta idempotente da publicação.
- Evidências locais: núcleo 151 testes/3.922 asserções; Members 43/170; Postgres real 32/290. Incluem publicação nas duas cenas, rejeições sem parcialidade, undo/reabertura, fonte preservada em falha adiada até o commit, exclusão de biblioteca e arquivo protegido somente no histórico do rascunho. Logs privados `output/cenarios-reforma/conjuntos-fonte-*`.
- Permanecem pendentes as rotas/serviço do catálogo e miniaturas, hosts, biblioteca/gaveta, integração das montagens com o motor e ensaios visuais. Este registro não fecha a parte 3.6 nem o lote 3.

Atualização posterior: serviço/rotas/gateway/BFF e miniaturas transacionais estão no checkpoint `a0e593698`. Hosts HTTP/memória também foram conectados e verificados: oficina 58 testes/395 asserções, tipagem/build e regressões de clipboard e pincel em quatro configurações de tela. Ver `docs/plans/2026-11-16-cenarios-reforma/revisao-lote3-conjuntos-edicao-http.md`. Não fechar 3.6: ainda faltam seus controles visuais, fotografia e integração das montagens ao palco/seleção/organização/pincel.

Atualização seguinte: hosts publicados em `36b8a1293`. Projeção de leitura separada, raiz selecionável, painel de transformação, organização, duplicação, separação/undo e ocupação do pincel passaram nos testes de núcleo/motor/oficina e no navegador com GLB real (quatro configurações, toque emulado). Núcleo 155/3.954, motor 45/1.665, oficina 59/406, Postgres 33/300; tipagem dos três pacotes e build aprovados. Evidências e pendências no [checkpoint do palco](../../plans/2026-11-16-cenarios-reforma/revisao-lote3-conjuntos-palco.md). A parte 3.6 permanece aberta. Próxima implementação: biblioteca/gaveta e contexto de edição/publicação da definição, na oficina existente, com fotografia isolada e cancelamento. Ainda conferir alças nativas, cancelamento de gesto/recusa, prévia de apoios externos e regressões finais antes de fechar.

### Biblioteca e publicação pela oficina — revisão de 17/11

A parte interna 3.6 foi implementada, testada e revisada no escopo descrito acima. Relatório: [biblioteca, fonte e fotografias](../../plans/2026-11-16-cenarios-reforma/revisao-lote3-conjuntos-biblioteca.md). Abrir, criar composição pela seleção, colocar, organizar, editar fonte, publicar e remover catálogo foram exercitados nos quatro layouts. A revisão corrigiu prévia recusada, cancelamento do ponteiro, atualização durante arraste, apoios externos e fotografia de operação repetida após outra publicação.

Núcleo 155/3.954, motor 45/2.322, oficina 60/415, Members 48/217, BFF/endereço 28/155, gateway 5/285 e Postgres 33/300 aprovados. Tipagem de núcleo/motor/oficina e build conferidos. As verificações globais de Members e member-shell ainda apresentam erros fora deste recorte, listados no relatório; devem passar antes do fechamento do lote 3. Não afirmar aprovação global ou implantação.

O lote 3 continua aberto. Próxima parte interna: 3.7, retratos das versões e eficiência. Depois 3.8, Testar com avatar e medição de percursos. Lotes 4–10, revisão completa e implantação/validação finais permanecem pendentes.
