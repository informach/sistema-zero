# LG04 — Pinta, Estúdio, conta e Mural

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Execução nesta sessão, com checkpoints de evidência; não despachar subagentes.

**Goal:** completar o percurso criar material regional no Pinta → importar e editar no Estúdio → guardar na conta → reabrir em outro aparelho → publicar, atualizar e jogar no Mural.

**Architecture:** promover os leitores e a autoridade local regional já existentes, completar o produtor/transporte do protocolo `studio-sealed-v1` e ligar a ponte pública do Pinta à admissão integral do PNG 5. O BFF confere os bytes e cria objetos imutáveis; o Members mantém geração, CAS, cota, autorização e promoção atômica. Publicação e reabertura usam o mesmo documento admitido, sem reconstruir o material pela biblioteca do autor.

**Tech Stack:** TypeScript/Bun, IndexedDB, Next/member-shell, Elysia/Members, PostgreSQL/Drizzle e R2 compatível com S3; runtimes existentes do Estúdio.

**Spec:** seção LG04 de [plano gradual](2026-11-23-plano-de-liberacao-gradual.md), autorizada na conversa de 24/11/2026. Conteúdos e publicação gradual de aulas são conduzidos pela dona em outra sessão.

## Base e restrições

- Checkout isolado `sistema-zero-lg04-20261124`, branch `feat/lg04-pinta-estudio-conta-mural-20261124`, base main `3d5ec2b242147fedf1867a496e8b6397826fe285`.
- Staging observada: `fe72efb63ff6c32fec22f2174db0f3258957171c`. Preservar o trabalho concorrente e o checkout original com alterações locais.
- Sem novas flags de produto; capacidades declaradas devem corresponder à validação efetiva. Sem ampliação de permissões, tetos ou catálogos para fazer os testes passarem.
- Formato de projeto 2/3, Pinta nativo 8/nuvem 7. Autorregras/projeções nativo 9/nuvem 8 ficam na LG05. A promoção da distribuição Python continua na LG08.
- Todo programa, bloco, nome, ID e material deve sobreviver à migração. PNG regional permanece com os bytes originais e marcador verificado; não converter o mundo em imagem achatada para contornar o bloqueio.
- Respeitar os limites existentes: 128 partes, 40 MiB comprimidos por projeto, 128 MiB de JSON e orçamentos cumulativos de materiais, pixels, metadados e índices.
- Preservar a cerca contra escritor antigo, divergências locais, histórico, salvamento de saída, conflitos, lápides e isolamento por conta/perfil/público.
- Cursos gravados conservam seus contratos. Bloco legado de aula não passa a admitir automaticamente um formato que não preserva: conferir a recusa e o documento original separadamente.
- Não editar `packages/molda-cenarios*`, `packages/studio/src/python/blocks/areas.ts` ou `packages/studio/src/python/extensions/raylib/commonCatalog.ts`.
- Uma tarefa pesada local por vez, por `node C:/Users/tocha/backup-pinta-codex-20261122/pesado.mjs <rótulo> -- <comando>`. `git add` sempre escopado.
- O envio de teste ao professor autorizado na LG02 não autoriza outros recados ou posts. Preparar o projeto concreto antes de solicitar eventual publicação real de teste que notifique outras pessoas.

## Diagnóstico e escolha

O leitor `resolveStudioCloudDocument` já reconhece o envelope selado, mas `buildStudioCloudSnapshot` produz partes v1 e recusa referências regionais. `canReadStudioSealedStorage` admite apenas materiais legados. O Members tem tickets, geração e cerca do escritor selado; falta a integração do BFF e do cliente. A admissão PNG 5, biblioteca regional, autoridade local física 5 e players já existem em composição privada.

Alternativas consideradas:

1. **Completar as portas existentes:** mantém uma autoridade por projeto, mesma fila e mesmos limites. Exige conferir migração local, bytes selados e publicação; é a escolha da LG04.
2. **Manter material achatado no envelope legado:** simplifica o envio, mas não preserva mundo, colisões e edição regional. Não atende ao percurso aprovado.
3. **Criar outra nuvem/biblioteca regional:** separa a implementação inicial, mas duplica reconciliação, histórico e conflitos. Não adotada.

## Fluxo e contratos

1. Pinta captura a revisão confirmada do mapa e suas dependências no namespace capturado; exporta PNG 5 bounded com ID de origem e SHA.
2. Biblioteca pessoal e projeto admitem o conteúdo completo antes de guardar. A autoridade física 5 protege o regional e preserva edições concorrentes do predecessor 4.
3. Produtor monta manifesto `sz-studio-parts` v2, `assets: []` no programa, hashes distintos na ordem autoral e requisitos derivados dos materiais.
4. Cliente lê cabeça autoritativa e reserva com base/generation exatas; envia partes faltantes e manifesto por PUT condicional para staging do nonce.
5. BFF captura gzip limitado, confere hashes/bytes, estrutura, ID, programa, linguagem e todos os materiais; deriva requisitos pelo conteúdo, inclusive PNG com metadados sem marcador. Sela os mesmos bytes por criação condicional.
6. Members recebe somente prova interna HMAC ligada ao ticket e promove uma revisão atômica. Repetir confirmação perdida devolve o recibo original; não cria outra revisão.
7. Leitura confere recibo e manifesto, resolve partes e restaura integralmente. Cliente incompatível recebe recusa antes de URLs/escrita. Conflito mantém as duas versões; exclusão usa a mesma geração.
8. Publicação usa snapshot admitido, retira vínculos privados da biblioteca e conserva o PNG necessário ao jogo. Atualizar preserva o mesmo post/link. Leitura pública não consulta a conta do autor.

Linguagem e material são capacidades distintas. O armazenamento deve preservar documentos JavaScript/Python conhecidos sem trocar a linguagem durante autorização. Executar/publicar Python continua exigindo as capacidades do catálogo autorizado, sem promover a distribuição da LG08 por esta entrega.

## Tarefa 1 — produtor e leitor selados

**Arquivos:** `packages/core/src/creations/studio-sealed-storage.ts`, `studio-sealed-writer.ts`; `packages/member-shell/src/lib/studio-cloud.ts`, `creations-cloud.ts`, `studio-cloud-transport.ts`; novo `studio-sealed-cloud.ts`; testes `packages/member-shell/tests/studio-cloud-transport.test.ts`, `studio-sealed-cloud.test.ts`, `packages/community-kids/tests/studio-cloud.test.ts`.

- [x] Rodar a base dos contratos de nuvem/armazenamento e registrar saída: 9 testes/45 expectativas, zero falhas (`.cache/lg04/baseline-cloud.log`).
- [x] Reproduzir o bloqueio com `regionalSceneMaterial()` de `packages/studio/src/testing/pintaRegionalMaterialFixture.ts`: o snapshot válido deve conservar o material e usar envelope v2; a base atual rejeita antes de produzir. Reprodução `studio-regional-cloud.test.ts`: uma falha esperada em `assertLegacyStudioProjectMaterials` (`.cache/lg04/regional-cloud-red.log`).
- [ ] Implementar manifesto v2 e requisitos derivados, conservando deduplicação e ordem dos materiais. Recusar material inválido, formato futuro e identidade divergente.
- [ ] Integrar cabeça/reserva/ticket/commit/delete à fila existente. ACK só avança a marca do snapshot enviado; falha não reporta salvo. Base/generation antiga usa a resolução de conflito, sem sobrescrever o jogo aberto.
- [ ] Provar leitura antiga, partes reaproveitadas, corrompimento, perda de ACK e alternância de perfil.

Prova inicial:

```ts
const asset = await regionalSceneMaterial()
const project = { id: 'regional-project', name: 'Vila', kind: 'classic', formatVersion: 2, updatedAt: 0, assets: [asset] }
const snapshot = await buildStudioCloudSnapshot(project)
expect(JSON.parse(snapshot.json).version).toBe(2)
const [part] = snapshot.parts ?? []
if (!part) throw new Error('O material regional não pode desaparecer do snapshot.')
expect(JSON.parse(await part.text())).toEqual(asset)
```

Comandos: `bun --no-env-file test packages/member-shell/tests/studio-cloud-transport.test.ts packages/core/src/creations/studio-sealed-storage.test.ts`; depois incluir `studio-sealed-cloud.test.ts` e `packages/community-kids/tests/studio-cloud.test.ts`.

## Tarefa 2 — BFF e prova dos bytes

**Arquivos:** novo `packages/member-shell/src/server/studio-sealed-proof.ts`, novo `src/routes/studio-sealed-writes.ts`; integração em `src/routes/creations.ts`, `src/server/clients.ts`, `src/lib/types.ts`; rotas Next de criações em Kids/Community e adaptadores internos correspondentes; `packages/members/src/interfaces/http/routes/studio-sealed-writes.routes.ts` e contratos de autorização necessários.

- [ ] Usar sessão verificada, `x-sz-viewer`, audiência explícita e HMAC já existentes; recusar suporte somente leitura e ator incompatível.
- [ ] Assinar somente staging por nonce. Conferir plano autoritativo e partes legadas/seladas do mesmo item; nenhuma chave livre vem do navegador.
- [ ] Implementar captura, validação integral, orçamento cumulativo e selagem condicional com os helpers existentes de R2/gzip. Recusar troca de bytes, metadados ocultos, raiz diferente e CRC inválido.
- [ ] Autorizar a linguagem e o tipo do documento real nas duas pontas, sem usar autorização JavaScript para um documento Python.
- [ ] Exercitar PostgreSQL/MinIO reais: CAS, duas abas, permissão revogada, replay de PUT/ACK, corrupção, cota e ABA. Conferir a leitura e limpeza dos objetos vivos/reaproveitados.

Interfaces da prova: entrada `StudioSealedTicket` e storage `{open, create}`; saída `StudioSealedCommitProof`. Nenhum recibo do navegador substitui os bytes relidos pelo BFF.

## Tarefa 3 — autoridade local e compatibilidade

**Arquivos:** `packages/studio/src/state/projectStorageRuntime.ts`, `persistence.ts`, `projectStorageRead.ts`, `retainedProjectStore.ts`, `retainedProjectEditor.ts`, `retainedProjectDrafts.ts`; `src/project-migrations/localRegionalAuthority.ts`; `src/state/editableProjectValidation.ts`, `pintaRegionalProjectRefresh.ts`; testes existentes de retenção, persistência e recuperação.

- [ ] Promover a capacidade regional da composição privada para os projetos pessoais elegíveis, mantendo validação integral; namespace não concede permissão remota.
- [ ] Criar/restaurar regional diretamente na autoridade 5 e adotar bases 4 coerentes por CAS. Não escrever referência regional na partição legada para facilitar a migração.
- [ ] Conservar Classic/Pro e documentos conhecidos, incluindo blocos, arquivos, miniatura, histórico e storage do jogo. Aplicações pendentes e registros incompatíveis ficam recuperáveis.
- [ ] Provar predecessor antigo, edição offline, duas abas, falha de transação/quota, saída/recarregamento e exclusão. Leitura incompatível não esvazia um projeto.

Comandos focados: `bun --no-env-file test packages/studio/src/state/retainedProjectStore.test.ts packages/studio/src/state/pintaRegionalProjectRefresh.test.ts`; ampliar apenas para as suítes de persistência/retomada tocadas e E2E de saída.

## Tarefa 4 — ponte pública Pinta/Estúdio

**Arquivos:** `packages/pinta/src/export/studioLibrary.ts`, `regionStudioPayload.ts`, `regionImage.ts`, capturador regional existente; `packages/member-shell/src/components/creator/use-studio-creation-libraries.ts`, `save-pinta-studio-bundle.ts`, `pinta-client.tsx`; `packages/studio/src/asset-library/personalRegional.ts`, `personal.ts`, `personalSync.ts` e consumidores de renderização/capa.

- [ ] Capturar mapa e dependências da revisão confirmada, emitir o PNG original com mundo bounded e gravar a biblioteca pessoal admitida.
- [ ] Usar a mesma porta em Trazer do Pinta, Usar no Estúdio e atualizar desenhos já levados. Abrir um desenho não o importa automaticamente.
- [ ] Preservar nome/ID e origem durante cancelamento e troca de perfil. Sem dependências completas, recusar antes de gravar.
- [ ] Conservar leitura e exportação antigas; não abrir nativo 9, projeções ou regras novas.
- [ ] Conferir mapa com origem negativa, regiões vazias, frente/colisões e dependências, sem materializar `rows × cols`.

Provas: testes existentes `studioLibrary`, `regionImageWorld`, `personalRegional` e `pinta-regions-studio-library`, mais regressões da ponte pública com PNG real.

## Tarefa 5 — publicação, atualização e jogadores

**Arquivos:** `packages/member-shell/src/server/studio-publication.ts`, `studio-publication-snapshot.ts` e rotas de publicação existentes; players/preview do Studio e `studio-runtime` onde a admissão exigir; testes `studio-python-publish`, publicação Classic/Pro e E2E regional existente.

- [ ] Admitir o mesmo documento integral na publicação e no player, preservando o material executável e removendo os vínculos privados da biblioteca.
- [ ] Provar primeira publicação, atualização do mesmo post/link, reabertura sem biblioteca original e recusa de repetição sem mudança.
- [ ] Preservar aprovação, licenças, autorização por produto/Jornada e capacidades de runtime. Não ativar o catálogo Python da LG08.
- [ ] Conferir separadamente os blocos de aula legados: recusa explícita, sem perder desenho, checkpoint ou projeto.

## Tarefa 6 — qualificação e entrega

- [ ] Executar a jornada em navegador com dois contextos/aparelhos e perfil de teste; validar snapshot/cenário, criação, edição, conta, reabertura, jogo e atualização.
- [ ] Validar desconexão, conflito, falha de confirmação e recuperação, usando as provas automáticas reais e sem perder os originais.
- [ ] Guardas de aulas: `bun test docs/aulas-interativas-tecnico/qa`, `protected-lessons.spec.ts` e `ilha-do-farol-browser.ts` pelos comandos oficiais encontrados no repositório.
- [ ] Conferências de geração: `check:validation-profile` no runtime, `check:region-phaser` no Pinta, `check:pro-engine-copies` e `check:scene3d-runtime` no Studio; tipos/lint dos pacotes tocados e builds dos hosts.
- [ ] Revisar o diff final, executar o CI obrigatório e integrar as correções também em staging, preservando os commits concorrentes.
- [ ] Registrar recibo de QA, fontes, limitações e forma de retorno no plano gradual. Publicação real de teste que notifique pessoas exige autorização específica para o projeto preparado.
- [ ] Promover somente depois das provas completas; verificar os serviços e o percurso após a entrega. Não promover conteúdos da outra sessão.

## Acompanhamento

- O link frio do Pinta também foi reproduzido: a galeria vazia ficava pronta antes do aviso de sincronização porque o inventário era lido antes de reservar a operação. A fila passa a anunciar e agrupar essa leitura desde o início, inclusive seu encerramento em caso de falha. Oito provas regionais/57 expectativas e 81 provas do espelho/459 expectativas aprovadas. As rodadas sobre 7f32ca388/623b9af00 foram canceladas antes de implantação para qualificar essa correção adicional na própria candidata.
- O aceite em contexto vazio confirmou o limite local da biblioteca pessoal e uma lacuna na interface: um cenário já presente só mostrava o selo, sem permitir trazer a versão editada. Acrescentada a ação explícita “Atualizar cenário”, sem duplicar o material ou mudar os blocos/nome/ID; reprodução vermelha e 56 testes/360 expectativas aprovados depois. A suíte de projetos fechou em 276 aprovados/6.881 expectativas, zero falhas. A biblioteca pessoal conserva seu contrato local; a reabertura/jogador continuam usando o PNG integral do documento da conta.
- Qualificação adicional: a integração 2a0c99e44 concluiu os 13 jobs e a implantação dos seis hosts afetados. O aceite real encontrou mais três pontos: captura do perfil antes da admissão assíncrona, navegação direta para o jogo criado e concorrência entre abertura fria e descida da galeria. As correções preservam a autoridade local e estão acompanhadas de reprodução vermelha/verde; 30 provas de navegador, 14 provas do construtor e duas provas reais da restauração concorrente aprovadas. A nova candidata exige CI e implantação próprios. Publicação de QA continua aguardando a autorização específica, sem post enviado.
- 24/11: plano e desenho derivados do escopo aprovado; checkout original preservado; dependências instaladas com lockfile congelado.
- Em andamento: base e reprodução mínima do produtor; inspeção da integração autoritativa e compatibilidade local.
- Primeiro bloco do produtor: reprodução vermelha → verde com PNG real, captura imutável e marcador divergente; 60 testes/267 expectativas aprovados, Biome dos três arquivos aprovado e typecheck completo de member-shell aprovado. O transporte e as provas do BFF ainda não estão ligados; isso não é aceite da jornada LG04.
- Implementação em qualificação: produtor, leitor, transporte selado, prova dos bytes no BFF, autorização da linguagem no Members, autoridade local 5, biblioteca pública, importação, atualização e compilação Classic/Pro ligados. Ainda sem integração ou implantação desta candidata.
- A primeira prova com PostgreSQL/MinIO e os serviços reais passou em 18 expectativas: confirmação perdida, dois escritores, leitura antiga recusada, corrupção sem promoção e exclusão durante o primeiro envio. A preparação do banco foi depois isolada no processo do Members; repetir a prova sobre essa organização final antes do aceite.
- Navegadores: 15 cenários passaram em Chromium, Chrome e Edge, incluindo exportação nativa 8 e execução regional Classic/Pro. Repetir após a correção adicional da conversão Classic → Pro com o material já importado.
- A regressão completa encontrou incompatibilidades novas na admissão de imagens antigas e no salvamento de saída de perfil. A reprodução focada confirmou a correção do acervo v2/v3, dos exemplos Python e da gravação no perfil anterior. A fixture da leitura leve agora representa também a partição de metadados real e confere a consulta à autoridade 5. Suíte isolada de persistência: 73 testes aprovados, zero falhas. A rodada completa final continua pendente.
- Compatibilidade de PNG: a leitura de metadados antigos conserva as dimensões preexistentes das folhas de sprites, sem rasterização, mantendo CRC e limites de bytes/descompressão. Os PNGs regionais continuam sujeitos aos limites completos de dimensão, pixels, índices e metadados. As aulas legadas conservam sua recusa explícita de importação regional.
- Revisões concorrentes conferidas novamente: main `3d5ec2b242147fedf1867a496e8b6397826fe285`; staging `b0d6beb2839a678760c742992c40883980b9ead3`. Os conteúdos da outra sessão continuam fora da candidata de produção.
- Rodada posterior: tipos dos seis pacotes e quatro conferências de geração aprovados. Core 3.311, member-shell 2.785 e runtime 440 testes aprovados, sem falhas; os condicionais permanecem discriminados no [registro da qualificação](../qa/2026-11-24-lg04-pinta-estudio-conta-mural.md). Prova SQL repetida em banco exclusivo novo: cinco aprovados/63 expectativas. BFF/Gateway/MinIO: uma prova/18 expectativas.
- O preparo pela interface infantil encontrou uma recusa anterior no commit/cancelamento causal do Pinta: presença de stream vazio era tratada como corpo inválido. Reprodução com duas falhas; correção confirma zero bytes pelo leitor limitado e mantém a recusa de conteúdo. As 25 provas das rotas passaram. O cenário próprio de QA em homologação aguarda essa implantação para repetir o percurso completo.
- O teste de confirmação de exclusão da biblioteca passou pela interface com revisão concorrente. Acrescentada ao CI a compilação regional Pro na imagem real, com rede desabilitada e conferência do PNG original. Essa prova de imagem e o aceite hospedado ainda estão pendentes.
- Suíte oficial completa do Estúdio aprovada: 1.006 arquivos em 182 processos, zero falhas, 783 segundos. A primeira rodada de CI aprovou a compilação regional Pro real, a imagem/objetivos existentes, o plano Railway e a prova de dez mil blocos; o CI completo ainda está em andamento.
- A qualificação adicional de staging apontou os SDKs 3D derivados das dependências compartilhadas como desatualizados. Reprodução local com Bun 1.3.11 confirmou a recusa. Regenerados os dois carregadores e o contrato do contêiner, sem ampliar os tetos; os carregadores continuam com os mesmos três imports Three e dependências licenciadas. Conferência SDK e 112 testes 3D/1.013 expectativas aprovados, dois TODOs preexistentes; contrato canônico do compilador: dois testes/sete expectativas. Novo perfil da imagem `98ec9667f1a3b893503d9427317dda4b1fb3c0cbfa665ad9c11c8837df05a8a3`; a imagem deve ser qualificada novamente nesse perfil.
- A candidata 6606 passou nos 13 jobs obrigatórios, no plano Railway e na prova de dez mil blocos. A integração 6a0fde4 passou também na implantação normal de staging, preservando o currículo concorrente. A imagem a65cc06c passou nas cinco suítes reais, nas provas adicionais Python e nas guardas de aulas; os dois executores de staging estão prontos com o perfil 98ec9667 e as chamadas autenticadas responderam 200.
- O aceite infantil hospedado confirmou o salvamento causal do cenário Pinta na conta e a importação regional pela biblioteca do Estúdio. Encontrou também uma condição legada no botão “Jogar meu mapa”, anterior ao adaptador regional. Reprodução nos três navegadores falhou antes da correção; os 18 cenários passaram depois. Acrescentada a entrada pelo botão ao CI obrigatório. A correção exige novo commit, CI e implantação antes da entrega; produção e publicação de teste continuam pendentes.
- A preparação real do resumo identificou sobrescrita da edição manual pela resposta tardia da consulta/IA. Duas regressões reproduziram a perda; a correção conserva título e resumo editados e evita o rascunho automático desnecessário. Os 19 testes da janela de publicação passaram, incluindo o envio do texto manual e a atualização do post. O projeto de QA tem título, resumo e capa preparados; solicitada autorização específica para publicar, atualizar o mesmo post e removê-lo em homologação. Nenhum post foi enviado enquanto a resposta está pendente.
- Ampliação da ponte regional: 30 cenários aprovados em Chrome, Edge, Chromium, Firefox e WebKit. A fixture passou a usar o pipeline Tailwind real do Pinta e conferir que o canvas acompanha a janela, sem crescer com o mapa de 10.000 × 10.000 células. A falha inicial do Firefox era da página de provas sem os estilos, sem alteração necessária no pintor do produto. Não equivale a teste em um segundo aparelho físico. As duas correções de produto estão no commit 425ea9ffc e na integração 2a0c99e44; os CIs alcançaram 12 jobs aprovados, com o job geral ainda em andamento. O ajuste adicional é de QA e deve ser commitado após sua checagem de tipos.
