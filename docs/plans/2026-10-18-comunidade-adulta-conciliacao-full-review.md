# Conciliação remota e full review da comunidade adulta

Data: 18/10/2026. Estado: review e verificação local concluídos; liberado para commit e integração em staging. Este relatório complementa o review anterior com o código remoto dos objetivos do Estúdio, o executor de jogos e a configuração de implantação. O resultado desta rodada substitui a matriz de verificação anterior.

## Conciliação e preservação

- Base local anterior: `660e91ecb`. Remoto integrado: `origin/staging` em `88981ff91`, com 13 commits adicionais e alterações em 69 arquivos.
- Merge da conciliação: `31a294421`, preservando os dois históricos. A revisão não executou deploy, pagamento ou alteração de dados remotos. O usuário autorizou commit, merge em staging local e push após a validação.
- Backup do histórico: `backup/adult-parity-before-reconcile-20261018`. Backup do trabalho não commitado, incluindo arquivos novos: `refs/backups/adult-parity-worktree-20261018`, objeto `07779dc8e55bf50ee75c2cd24cd4c5d379be768b`.
- Conferência após a restauração: **271 arquivos locais rastreados e 401 arquivos novos**, nenhum ausente. **665 arquivos permaneceram iguais** ao snapshot local, normalizando somente finais de linha. Os outros sete são os pontos onde o código remoto e a implementação adulta precisaram ser combinados.
- Três conflitos explícitos: construtor da progressão de seções, composição de serviços e factory de integração. A resolução manteve o executor remoto e a consulta do público do curso, nessa ordem, nos dois pontos de construção. Os quatro merges automáticos restantes também foram revisados.
- O trabalho paralelo de pintura/recortes do Molda foi preservado e incluído após a autorização expressa para publicar tudo. Não foram restauradas a antiga auto-correção do bloco Estúdio, notas de atividade ou a trava removida `STUDIO_GATE_NOT_PASSED`.

## Achados e correções

| Prioridade | Achado | Correção e evidência |
| --- | --- | --- |
| Alta | Sem `audience` explícito na URL, um perfil infantil conseguia ler curso/aula adulta e executar objetivos com a matrícula da conta responsável. A guarda da vitrine não protegia essa entrada. | Regra no `CheckAccessService`, antes de oficinas ao vivo e do bypass de equipe: curso adulto exige aluno igual à conta. Reprodução HTTP retornou 200 antes e 403 depois. Testes cobrem aluno infantil, bypass de equipe, recompensas adultas e acesso infantil legítimo. Dois fixtures que simulavam irmãos em cursos adultos foram corrigidos para cursos Kids, mantendo todas as exigências de isolamento. |
| Alta | Os construtores locais e remotos acrescentavam dependências diferentes na mesma posição. Escolher um lado perderia a execução dos objetivos ou a separação de rascunhos adultos. | Ambas as dependências foram mantidas na composição real e nos testes. Duas provas HTTP exercitam executor, público da recompensa e deduplicação de XP, uma por público. As provas existentes de rascunhos também passaram. |
| Alta | O seletor de deploy do CI encaminhava mudanças no Molda/Pensa somente ao Kids. O adulto poderia continuar servindo versões antigas das ferramentas compartilhadas. | CI inclui as duas comunidades. O watch da comunidade adulta inclui Pensa; o watch do Members inclui Estúdio, acompanhando seu avaliador no servidor. Três testes protegem o encadeamento CI + configuração Railway. |
| Alta | Os nomes das novas configurações adultas ainda não estavam no inventário de preservação do Railway. Configurar esses serviços sem atualizar o inventário poderia gerar divergência no plano. | Inventário do Hub, Members e community atualizado com configurações adultas de limpeza, callback, runtime e serviços opcionais. Somente nomes, sem valores; configuração remota e habilitação de IA continuam operacionais. Typecheck do SDK fixado passou. |
| Média | O teste de renderização do avatar acrescentado depois do build anterior tratava o elemento retornado pelo Playwright como canvas sem estreitar seu tipo. Isso reprovava o build completo. | Verificação explícita de `HTMLCanvasElement` e do contexto 2D, preservando a leitura real dos pixels. Typecheck e build adulto repetidos com sucesso. Nenhum teste foi excluído do build. |
| Baixa | Um teste de conformidade do Molda ainda procurava a lista de rotas diretamente no arquivo Kids que virou reexport. | O teste confere o reexport Kids e a presença de `/molda` na lista compartilhada. Todas as demais exigências de rota, navegação e implantação permanecem. Suíte oficial do Molda passou nos três lotes. |

Os timeouts iniciais de dois testes de tipos do Estúdio foram investigados separadamente: os arquivos dos testes e os runtimes correspondentes não mudaram na conciliação. A máquina chegou a 0,7 GB de RAM livre durante execuções concorrentes. A reprodução isolada passou com os limites originais, em aproximadamente 2,7 s e 2,6 s. O CI já determina executar o Estúdio depois dos demais pacotes, com CPU disponível; a repetição integral segue essa ordem. Nenhuma asserção ou timeout foi alterado para esconder a falha.

A execução final completa do Estúdio passou em **9.124 testes**, incluindo os quatro testes com Chromium real, sem skips. Os recortes do Molda passaram no Chromium, Firefox e WebKit. Houve uma falha inicial transitória no WebKit; a execução isolada e a repetição dos dez cenários passaram sem mudar asserções ou tolerâncias. Um launcher Bun também teve timeout de inicialização; o servidor foi iniciado separadamente e sua prontidão foi confirmada antes da repetição.

No Windows, a primeira tentativa de rebuild com os servidores standalone ainda ativos encontrou bloqueio de DLL/pasta (`EPERM`/`EBUSY`). Os servidores próprios de QA foram encerrados e o rebuild repetido. Isso não foi classificado como falha de tipagem nem corrigido por alterar fontes ou ignorar verificações.

## Contratos revisados

- **Identidade:** adulto é a conta autenticada; perfis Kids e sessão parental permanecem separados. Nada cria criança fictícia ou exige seleção familiar no adulto.
- **Reuso:** os hosts de ferramentas, armazenamento local, BFF, player, avatar e ambiente pessoal continuam compartilhados em `member-shell`, com composição por aplicativo. O adulto não importa componentes do aplicativo Kids.
- **Nuvem e banco:** público em índices, chaves, queries, caches, históricos e fences. Migrations adultas 0130–0134 preservadas; esta conciliação não criou novas migrations.
- **Objetivos:** regras e gabaritos permanecem no servidor. Estrutura e execução são combinadas; executor indisponível não grava aprovação. As recompensas continuam autoritativas e idempotentes por público.
- **Timeouts:** runtime 140 s, adaptador Members 150 s, gateway 160 s, BFF aluno 165 s. O endpoint de autoria mantém autorização de equipe. Testes usam o registro real do gateway.
- **Runtime:** conferência pedagógica de jogos é independente de IA. Cursos de blocos podem utilizá-la desde o início. Fingerprint do runtime remoto passou na verificação de geração.
- **IA:** política avançada, licenças, orçamento por conta, histórico por público, preferência de voz e callback adulto sem fallback Kids permanecem preservados.
- **Comunidade e comércio:** perfil público revogável, Mostra segregada, entrega por webhook, cancelamento e preservação de direitos Kids continuam cobertos pelas suítes.

## Evidências desta rodada

Os comandos completos, diretórios, horários UTC e códigos de saída são registrados nos pares `.cache/adult-reconcile-<nome>.json` e `.log`. As falhas iniciais permanecem registradas; as execuções finais têm nomes próprios.

| Verificação | Comando e pacote | Conclusão UTC | Exit | Resultado |
| --- | --- | --- | --- | --- |
| CI raiz | `.: bun run ci` | 16:11:57 | 0 | 9.320 arquivos, 0 erros; 12 avisos e 160 informações |
| Build adulto | `packages/community: bun run build` | 16:11:23 | 0 | PASS |
| Build Kids | `packages/community-kids: bun run build` | 16:12:05 | 0 | PASS |
| Build Admin | `packages/admin: bun run build` | 16:11:00 | 0 | PASS |
| Tipos Members | `packages/members: bun run typecheck` | 16:11:39 | 0 | PASS |
| Tipos member-shell | `packages/member-shell: bun run typecheck` | 15:44:11 | 0 | PASS |
| Tipos Admin | `packages/admin: bun run typecheck` | 15:48:00 | 0 | PASS |
| Tipos runtime | `packages/studio-runtime: bun run typecheck` | 15:48:22 | 0 | PASS |
| Tipos SDK Railway | `.railway: npm run typecheck` | 15:52:19 | 0 | PASS |
| Members unitário/integração | `packages/members: bun test tests/unit tests/integration` | 16:06:05 | 0 | 1.347 passaram, 0 falharam |
| Kids | `packages/community-kids: bun test tests` | 15:44:51 | 0 | 1.424 passaram, 0 falharam |
| member-shell | `packages/member-shell: bun test` | 15:41:44 | 0 | 1.460 passaram, 0 falharam |
| Core | `packages/core: bun test tests src` | 15:41:27 | 0 | 1.211 passaram, 0 falharam |
| Admin | `packages/admin: bun test tests` | 15:42:59 | 0 | 627 passaram, 0 falharam |
| Hub | `packages/hub: bun test tests/unit tests/integration` | 15:42:30 | 0 | 153 passaram, 0 falharam |
| Gateway real | `packages/api-gateway: bun test tests/unit/config.test.ts` | 15:48:29 | 0 | 42 passaram, 0 falharam |
| Estúdio completo com Chromium | `packages/studio: bun run test` | 16:01:49 | 0 | 9.124 passaram, 0 falharam, 0 skips |
| Molda oficial em três lotes | `packages/molda: bun run test` | 15:51:22 | 0 | 3.404 passaram, 0 falharam |
| Pinta | `packages/pinta: bun run test` | 15:55:01 | 0 | 1.537 passaram, 0 falharam |
| Pensa UI | `packages/pensa: bun run test` | 15:52:48 | 0 | 20 passaram, 0 falharam |
| Studio ledger/builder/oficinas PostgreSQL | `packages/members: bun test tests/db/studio-ai-usage.test.ts tests/db/studio-builder.test.ts tests/db/adult-live-benefits.test.ts` | 15:43:09 | 0 | 23 passaram, 0 falharam |
| Jornada/perfil/desafios PostgreSQL | `packages/members: bun test tests/db/adult-community.repository.test.ts tests/db/adult-journey.repository.test.ts` | 15:43:10 | 0 | 5 passaram, 0 falharam |
| Pensa banco/migrações, escopo selecionado | `packages/members: bun test tests/db/pensa-native-adult.test.ts tests/db/pensa-native-checkpoint-quota.test.ts tests/db/pensa-native-finance.test.ts tests/db/pensa-native-funnel.test.ts tests/db/pensa-native-migration.test.ts tests/db/pensa-native-project.test.ts tests/db/pensa-native-revision.test.ts tests/unit/pensa-functional-migration.test.ts` | 15:44:17 | 0 | 24 passaram, 0 falharam |
| Runtime | `packages/studio-runtime: bun test` | 15:42:04 | 0 | 76 passaram, 0 falharam |
| Fingerprint runtime | `packages/studio-runtime: bun run check:validation-profile` | 15:42:31 | 0 | PASS |
| Gates infraestrutura/release | `.: bun test scripts/ci/railway-config.test.ts scripts/release/start.test.ts scripts/release/schema-a.test.ts scripts/release/production-workflow.test.ts` | 16:14:15 | 0 | 27 passaram, 4 skips previstos, 0 falharam |
| Browser integrado adulto/Kids | `packages/community: bun run e2e` | 16:12:57 | 0 | 7 passaram, 0 falharam |
| Browser Kids mobile/player | `packages/community-kids: bun run e2e:smoke` | 16:13:09 | 0 | 16 passaram, 0 falharam |
| Browser Molda Chromium/Firefox/WebKit | `packages/molda: bun run e2e e2e/pixel-cutouts.spec.ts e2e/paint-simple.spec.ts --trace=on` | 16:08:47 | 0 | 10 passaram, 0 falharam |

Os horários são de 18/10/2026, em UTC. Builds finais: Node 24.15.0 e heap de 4 GB; testes: Bun 1.3.11.

### Prova pública do isolamento infantil

O teste usa login parental real, autoriza um dispositivo sintético por `/auth/kids/grants`, entra pelo `/auth/kids/enter` e utiliza o JWT infantil emitido pelo Auth. O pedido ao curso adulto comprado pela conta, sem query de público, devolveu **200 no backend anterior** e **403 depois da correção**, passando pelo gateway e PostgreSQL reais. Os sete cenários finais passaram com o backend reiniciado. A tentativa com token legado foi recusada pelo gateway e não foi usada como prova da correção.

### Browser e cobertura automatizada

Suporte: Playwright existente; comandos canônicos `community: bun run e2e`, `community-kids: bun run e2e:smoke` e o subconjunto Molda de pintura/recortes. Os fluxos têm cobertura automatizada, com contas e projetos sintéticos, sem interceptar rotas para simular sucesso.

- Adulto em `http://127.0.0.1:43107`: login sem seleção familiar, progresso, ferramentas básicas e IA bloqueada; preferência pública persistida/revogada; galerias; criar/recarregar/retomar projeto de blocos somente no namespace adulto; avatar WebGL e ambiente pessoal.
- Kids em `http://127.0.0.1:43108`: login parental, criança existente, token parental recusado no recurso adulto; dispositivo infantil autorizado e JWT real recusado no curso adulto.
- Player Kids: moldura, proporção, rotação, teclado, direcional, diagonal, pad próprio e entrada/saída de tela cheia.
- Molda em `http://127.0.0.1:43999`: pintura, folha responsiva, paleta, borracha, recorte em 3D/folha, repintura e undo; recortes nos três motores de navegador.

Artefatos visuais: avatar em `packages/community/.cache/playwright-results/`, recortes em `packages/molda/.cache/pintura-pixels-vazados.png`, traces locais das reproduções e logs dos comandos. Desktop, telas estreitas, celular em pé/deitado e tablet seguem os viewports definidos nos specs. Integrações remotas dependentes de credenciais permanecem para homologação, conforme os limites abaixo.

## Limites e operação

- Nenhum cenário com R2, checkout, pagamento, cobrança de IA ou Cloudflare foi executado contra infraestrutura remota. Homologação real continua necessária antes da venda.
- A manutenção completa do Pensa exige `pg_dump` e `pg_restore`, ausentes nesta máquina. Os oito arquivos selecionados de banco/migração/concorrência passaram; o preflight de backup/restauração não é classificado como aprovado.
- Quatro testes operacionais de workflow de produção têm skip previsto pelo harness local; não foram apresentados como passagens.
- O plano IaC remoto continua dependente da CLI/autenticação e de configuração do ambiente. Typecheck do SDK e testes de seleção/segurança de release são provas locais, não um plano aprovado para aplicar.
- Publicação de conteúdo, ofertas, jornada e espaços; implantação por ondas; configuração e homologação de integrações continuam descritas no [guia de operação](2026-10-18-comunidade-adulta-operacao.md). Venda automática de vagas ao vivo permanece fora da entrega local.
