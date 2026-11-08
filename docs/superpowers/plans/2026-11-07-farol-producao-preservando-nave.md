# Farol em produção com preservação da Nave — Implementation Plan

> Execução nesta sessão, seguindo `executing-plans`, sem agentes adicionais. A autorização é a solicitação da usuária de 07/11/2026; evidências privadas ficam em `.cache/farol-production-migration-20261107`.

**Goal:** Publicar A Chave do Farol no Kids produção sob `desafio-primeiro-jogo`, preservar o curso anterior e os direitos dos compradores em Nave Contra Asteroides e bloquear as aulas 3/4 do Farol com `coming_soon`.

**Architecture:** Preparar mídia com as funções canônicas de promoção do Admin. Aplicar a troca de identidades comerciais e a publicação por repositórios canônicos dentro de uma transação Members; a política Kids usa seu protocolo de captura, preservação e publicação versionada. Os IDs do curso antigo, suas aulas e dados de alunos não mudam. Código de acesso independente alinhado em staging/main; conteúdo da migração somente em produção Kids.

**Tech Stack:** Bun, TypeScript, PostgreSQL/Drizzle, Railway, Vimeo e R2 existentes.

**Spec:** Pedido da usuária nesta conversa; `docs/aulas-interativas/faisca/desafio-primeiro-jogo/modulos.md`, `blocos.json`, quatro manifestos atuais, e curso Kids staging já conferido. `docs/operations/publicar-cursos.md` rege as cópias de mídia. `packages/members/CLAUDE.md` rege autoria e preservação da jornada.

## Restrições

- Produção antigo: curso `ce4a64d2-10f5-430c-8b03-16583a2f2d31`; preservar ID, aulas, blocos, entregas, progresso, certificados e conquistas.
- Modelo Nave vazio: `90258c95-3810-5bc2-a7d6-5bae92376fe3`; arquivar/renomear, sem exclusão em cascata, somente após conferir ausência de uso.
- Origem Farol staging: `37f72f8c-163e-49e9-86c7-9f1653e6b0f2`; não modificar seu conteúdo durante a preparação.
- O novo Farol recebe slug exato `desafio-primeiro-jogo`; produtos/ofertas existentes continuam concedendo esse slug.
- Preservar concessões originais e criar o direito correspondente à Nave sem reiniciar validade; null continua vitalício e status revogado/vencido não reativa.
- Só titulares anteriores recebem o direito adicional. Preservar origem e referência comercial, com idempotência e proteção contra alteração concorrente.
- Farol recebe todo o conteúdo de staging, todos os vídeos/capas, PDF privado, áudios e fontes atuais do Zappy. Aulas `dia-3` e `certificado` recebem `coming_soon` antes do commit.
- Não publicar conteúdo adulto. Não enviar mensagens. Não commitar dados de alunos, snapshots ou logs privados.

## 1. Inventário e plano fechado

- [x] Salvar inventários completos somente de leitura dos dois ambientes (`inventory.ts`).
- [x] Identificar 14 direitos existentes em produção, todos vitalícios; catálogo comercial aponta ao slug, não ao UUID.
- [x] Confirmar Farol e Nave na política curricular: trocar somente base2d do Faísca e do Construtor, mantendo os outros cursos e regras.
- [x] Capturar provas de ausência de uso do modelo vazio e inventário/hash dos fatos do curso antigo.

## 2. Acesso independente para Nave

Arquivos: `packages/members/src/domain/entitlement/independent-course-access.ts`, seus testes unitários e `tests/integration/journey-course-access.test.ts`, documentação Members.

- [x] Testar concessão Nave ativa vitalícia e finita sem requisitos do Construtor; prazo vencido/revogação e ausência de concessão não abrem acesso; assinatura sem compra mantém progressão.
- [x] Incluir somente `nave-contra-asteroides` no conjunto de cursos com promessa de acesso independente.
- [x] Rodar testes focados de acesso independente, jornada e bloqueio em breve, com caminhos iniciados em `./`; typecheck Members e Biome aprovados.
- [x] Publicar o ajuste nas branches alinhadas e verificar implantação do Members antes da mudança de conteúdo.

## 3. Preparar recursos sem mudar cursos públicos

Arquivos privados: `.cache/farol-production-migration-20261107/media-admin.ts`, `prepare-media.ts`, estado por tarefa e plano selado.

- [x] Usar `courseTransferTasks`, `createCourseTransferService`, `courseTransferProof`, `promotedCourseSource`, `planCoursePublicationMedia`, `executeCoursePublicationMedia` e `publicationMediaProof` existentes.
- [x] Copiar arquivos/Vimeo para os espaços de produção, conferir as capas ativas e esperar processamento sem repetir criação incerta. Foram 36 transferências e 123 tarefas de mídia; 19 players reproduzidos em Full HD no domínio Kids produção. Capas ativas conferidas por comparação visual/pixels (o Vimeo recomprime as cópias, portanto o SHA do JPEG não é idêntico).
- [x] Revalidar objetos, vídeos, perfil de mídia e captura staging. Preparar o plano com `missingKidsTarget` e `planCourseSync` para o destino que será liberado pela troca atômica.

### Ensaio e achados resolvidos

- Banco local exclusivo `kids_journey_farol_migration_20261107`, conteúdo real e alunos sintéticos: migração e verificador independentes passaram.
- Casos vitalício, 30 dias, vencido e revogado preservaram origem, situação e prazo; 30 dias não reiniciaram. Histórico do curso anterior preservado integralmente.
- Ensaio adicional com perfil que já conquistou o Posto Construtor: posto, capacidades e todos os cursos anteriormente conquistados preservados. O operador confere essas invariantes para cada perfil existente antes e depois da publicação da política.
- A preservação canônica pode materializar um direito pedagógico já adquirido sobre o modelo antigo vazio. Esse registro é conservado; nenhum progresso de aula é criado no modelo arquivado.
- O ensaio detectou que a autoria recusava `coming_soon` na aula de certificado. Corrigida a validação, com bloqueio explícito da primeira emissão no servidor, inclusive para equipe; certificados já emitidos continuam disponíveis. 39 testes de certificado, manifesto e aula em breve passaram.
- Validação final local do Members: 2.123 testes aprovados, dois testes condicionais ignorados e nenhuma falha; checagem de tipos e formatação aprovadas. A regra de autoria de certificado foi coberta nas duas ordens de inserção dos blocos.
- Conferência do novo curso: 4 aulas, 28 blocos liberados ao concluir, apenas o aviso nas aulas 3/4, conteúdo e rascunhos completos conservados para autoria.
- Verificação final executa em transação somente de leitura; compara produtos/ofertas, conteúdo adulto, documentos de aula, direitos, histórico e acesso real dos perfis pela aplicação.
- Código no PR #250, com CI do PR integralmente aprovado. Staging publicado no commit `daf13984eb9ba406b27fe2029d8ca87ee1d029a2`: Members `7b0fa967-f188-420b-8dec-a90c15e34d28`; Auth confirmado saudável no mesmo commit. Workflow explícito `42413997506` concluído com sucesso.
- O GitHub exigiu também os checks de uma execução anterior de push cancelada pelo dispatch explícito. Execução `42413958018` retomada depois do deploy de staging, sem mudar as proteções do repositório.
- A repetição passou integralmente. PR #250 integrado em `7a51ee41cc367db2ff47319858fb52d68f0172d5`; diferença de conteúdo entre `main` e `staging` vazia. Deploy de produção `42423393368` aprovado: Members `f40540d7-b473-4e00-8b66-8d496e42ca8c` e Auth `a056d49d-11ad-4590-aad2-10b6c5c84e16`. Consulta direta do runtime confirmou as duas proteções e o commit implantado.
- A revalidação final detectou mudança de metadados do Vimeo nos dez vídeos oficiais após a preparação inicial. Conteúdo, duração, dimensões e transcrições permaneceram idênticos às cópias anteriores; versões de destino intactas. As dez transferências foram renovadas pelo copiador canônico, com histórico local preservado, sem alterar as regras de verificação.

## 4. Migração atômica

Arquivos privados: operador de aplicação e verificação. Reutilizar `DrizzleContentAdminRepository`, `executeCourseSync`, `DrizzleLessonDraftRepository`, `DrizzleEntitlementRepository` e `DrizzleKidsJourneyRepository`.

- [x] Validar recibos, hashes, versões, ambiente, identidade e concorrência antes de escrever.
- [x] Preservar os fatos dos alunos; resolver modelo vazio; renomear o curso antigo para Nave sem mudar suas aulas.
- [x] Criar Farol com executor canônico de promoção e mídia preparada, sem copiar alunos de staging.
- [x] Publicar blocos `coming_soon` nas aulas 3 e certificado antes do commit, preservando o conteúdo completo para equipe.
- [x] Conceder Nave aos titulares anteriores com datas/status originais, mantendo o acesso Farol já ligado ao slug comercial.
- [x] Alterar só as duas referências de base2d usando preparação/captura/publicação canônicas da política Kids, preservando direitos pedagógicos já conquistados.
- [x] Reler e validar todas as invariantes dentro da transação; qualquer falha desfaz a troca inteira.

## 5. Conferência final

- [x] Comparar o Farol publicado com staging, normalizando IDs/mídia e permitindo somente os dois blocos em breve.
- [x] Conferir nomes, módulos, blocos concedidos, capa, anexos, fontes do Zappy e reprodução no domínio Kids produção.
- [x] Confirmar originalidade e preservação dos IDs e fatos do curso Nave; direitos anteriores mantêm validade e não foram duplicados por repetição.
- [x] Confirmar os dois cursos na jornada e as ofertas resolvendo o novo Farol.
- [x] Verificar aula 3/4 na autorização e resposta da aplicação para aluno comum: apenas aviso, sem material nem conclusão disponíveis; equipe continua podendo editar.
- [x] Revisar o conjunto, corrigir achados e registrar relatório com evidências e limitações reais.

## Resultado verificado em produção

- Migração concluída em 07/11/2026; verificação independente às 23:16:42 UTC (20:16:42 de Brasília), em transação somente de leitura.
- Farol publicado: `221030fe-3d26-52a2-a315-20ef63b60b10`, slug `desafio-primeiro-jogo`. Aulas 1/2 disponíveis; aulas 3/4 com conteúdo completo para autoria e apenas `coming_soon` na resposta do aluno. Documentos publicados e rascunhos conferidos.
- Nave preservada no Posto Construtor: mesmo ID, dez aulas originais, fatos e histórico idênticos. Modelo vazio anterior arquivado, sem apagar dados.
- 14 concessões originais intactas e 14 concessões correspondentes à Nave com a mesma origem, status e validade. Acesso aos dois cursos conferido pelo serviço real da aplicação nos 12 perfis que correspondem aos titulares com concessões ativas. A publicação da política preservou a jornada dos 13 perfis existentes.
- Política Kids versão 3; apenas as duas referências curriculares planejadas mudaram. Produtos e duas ofertas do Desafio mantidos; hash do conteúdo adulto inalterado.
- 28 blocos de conclusão iguais ao Docs. Conhecimento do Zappy conferido; nenhuma resposta de pesquisa expõe conteúdo das aulas futuras.
- 19 players reproduzidos em Full HD no domínio Kids de produção; 19 capas personalizadas ativas, com correspondência visual/pixels. PDF e demais objetos validados pelo fluxo de promoção.
- Ensaio repetido com o plano de mídia definitivo: vitalício, 30 dias sem reinício, vencido, revogado e perfil com Posto Construtor passaram.
- Evidências privadas: `receipt.json`, `verification.json`, `local-test-receipt.json`, `local-verification.json`, `media-proof.json`, `playback.json` e `covers-pixels.json` no diretório privado indicado no início. Nenhum dado de aluno foi commitado.
- Restam somente os vídeos oficiais das aulas 3/4, a serem fornecidos posteriormente conforme combinado; seus bloqueios continuam ativos em produção.
