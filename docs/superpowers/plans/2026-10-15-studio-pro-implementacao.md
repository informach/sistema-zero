# Implementação do Estúdio Pro

> Execução autorizada em 15/10/2026. Implementar em lotes, sem nova aprovação entre lotes. Este registro distingue código entregue de validação ainda pendente.

**Escopo aprovado:** [proposta completa](../../../.audits/studio-pro-proposta-v2-2026-10-15.md) e [matriz GameDev](../../../.audits/studio-gamedev-aproveitamento-v2-2026-10-15.md). Os critérios de aceite dessas duas referências continuam obrigatórios. Este documento é o acompanhamento da execução, não uma redução de escopo.

**Arquitetura:** documento do projeto como fonte persistida; reconciliação explícita com o sistema de arquivos; linguagem por projeto; capacidades por modo; serviços de IA no servidor; runtime e publicação isolados. Preservar stores por instância, contratos de persistência, orçamentos de bundles e assets existentes.

## Lotes e estado

**Estado consolidado:** implementação e review local dos lotes 0–9 concluídos; implementação commitada e integração local validada. Leia a [revisão final](../../../.audits/studio-pro-full-review-2026-10-15.md) e a [revisão do lote 9](../../../.audits/studio-pro-lote9-review-2026-10-15.md). Os checkboxes abaixo representam o aceite integral original, incluindo host autenticado, provedor/infraestrutura e hardware de referência; por isso não são convertidos em aceite de produção com base somente nas provas locais. O registro cronológico abaixo preserva estados anteriores, substituídos pela consolidação final.

- [ ] 0 — Contratos de capacidades, revisão, assets e kits; baseline do host; spike de linguagem; licenças.
- [ ] 1 — Terminal bidirecional, conflitos/flush/cancelamento e build confiável.
- [ ] 2 — Linguagem TS/JS por projeto, dependências e arquivos fechados.
- [ ] 3 — Zappy por modo em contexto, prompt, resposta, histórico e sugestões.
- [ ] 4 — Assets, migração preservando original e integrações do host.
- [ ] 5 — Uso real, reservas/limites e conexão OpenRouter do responsável.
- [ ] 6A — Jogos Canvas/Phaser: puzzle, arcade e plataforma.
- [ ] 6B — Jogos Three: exploração/ação, assets, animação e lifecycle.
- [ ] 7 — Construção assistida: revisões, ferramentas, validação, diff e desfazer.
- [ ] 8 — Cobertura GameDev ampliada, touch e pipelines de assets.
- [ ] 9 — Publicação/exportação, operação, performance e estabilização.

## Primeira fatia: contrato de modos e Zappy (R01)

1. Criar `packages/studio/src/studio/tutorMode.ts`, exportação leve `./tutor-mode`, testes das capacidades, instruções incompatíveis e mensagens por modo.
2. Em `studio/tutor.ts`, enviar código somente no Pro e remover contexto de blocos no Pro; adaptar testes de privacidade para projetos Pro reais.
3. Em `member-shell/src/server/zappy-ai.ts`, separar prompt Pro antes de consultar catálogo de blocos; limitar e selecionar arquivos relevantes; filtrar memória/conhecimento incompatíveis; validar também sugestões e usar fallbacks por modo.
4. Em `member-shell/src/server/zappy-safety.ts`, corrigir limite de palavra de `insta` preservando proteção de identificadores sociais.
5. Em `member-shell/src/routes/studio-zappy.ts`, validar envelope Pro, usar a política em todos os caminhos e impedir código clássico forjado.
6. Em `studio/src/components/tutor/ZappyPanel.tsx`, alinhar perguntas iniciais com o tipo do projeto.
7. Executar testes de tutor, painel e rota, typecheck dos pacotes afetados e a reprodução preservada em `.audits`.

## Próximas fatias de integridade (R02–R04)

1. Fechar descoberta de PostCSS no runtime com configuração inline; proteger dependências e configuração confiável de escrita pelo usuário de execução. Testar com arquivo PostCSS malicioso benigno e build real.
2. Introduzir reconciliação de três vias entre base, editor e filesystem. Operações de adicionar/alterar/excluir aplicadas atomicamente ao store correto; conflitos preservados e apresentados. Testar renomeações, exclusões, concorrência e troca de projeto.
3. Integrar watcher limitado e serializado em `useWebContainerSync.ts`, ignorando dependências/artefatos/segredos; drenar operações antes de salvar/exportar. Testar instalação real e reabertura.
4. Implementar serviço de linguagem em worker com fontes fechadas e declarações das dependências instaladas; respeitar tsconfig e versão do TypeScript. Verificar imports Three/Phaser/mitt, subpaths, erro real, remoção e duas instâncias.

## Evidências e limites

- Baseline de auditoria preservado em `.audits/studio-pro-lab-evidence-2026-10-15.json` e `.audits/studio-zappy-mode-evidence-2026-10-15.json`.
- Testes antigos da auditoria não contam como verificação desta implementação.
- Não declarar métricas de produção com base no playground; medir host real quando disponível.
- Não publicar assets externos sem procedência/licença verificada; reaproveitar lógica e padrões independentemente da redistribuição dos arquivos originais.
- Nenhum deploy, migração de produção ou alteração de cobrança real é necessário para implementar e revisar localmente.

## Registro de execução

- Lote 8: implementação e revisão local registradas em [revisão detalhada](../../../.audits/studio-pro-lote8-review-2026-10-15.md). Três novos kits (arena em grade e táticos Phaser/Three), total 14 modelos/9 kits, regras puras, exports independentes, drivers, curadoria por tarefa, metadados e guia de materiais, helper de áudio. Provas e limites explicitados no relatório. Segue lote 9: capacidades/preflight, publicação/player/rollback, operação e estabilização, revisão geral e integração Git local. Critérios transversais ainda não homologados não fecham os checkboxes globais.

- 15/10/2026: iniciado. Workspace tinha somente artefatos de auditoria e documentos de marketing não rastreados; preservados. Documentação oficial de WebContainer, Monaco e Vite consultada para os contratos de watcher, workers e configuração PostCSS.
- Primeira fatia implementada: política leve por tipo do projeto; prompt Pro separado do catálogo/IR de blocos; normal/Ponte sem envio de código; memória, referências e sugestões filtradas; contingências por modo; falso positivo `install` corrigido. Encontrado e corrigido também o bloqueio da rota Pro pela lista de modos clássicos. Verificação: 69 testes do servidor e 38 de tutor/painel passaram; typecheck do member-shell passou após corrigir o contrato do ranqueamento de arquivos.
- Build confiável: PostCSS inline, configuração Vite explícita com loader native, ambiente sem descoberta de `.env`, dependências da imagem sem permissão de escrita. 16 testes passaram, incluindo compilação real de CSS+TS diante de um `postcss.config.cjs` que lançaria erro. **Imagem Docker ainda não construída/testada.**
- Integridade Pro: reconciliação de três vias, cópias persistidas de conflitos, watcher com fila por instância, aplicação atômica e flush antes de salvar/exportar/sair/handoff. Testes com filesystem real: 12 casos passaram; regressão de persistência/terminal/preview: 116 casos passaram; 4 testes específicos do limite de snapshot passaram. Happy DOM registra avisos esperados de iframe desabilitado nos testes existentes do preview.
- Navegador real no playground compilado: `npm install mitt@3.0.1` concluiu e `mitt` apareceu no package.json do editor; `echo ... > src/terminal-created.ts` apareceu na árvore. Sair e reabrir preservou manifesto, lock e arquivo. Refresh durante comando em voo e assets binários ainda exigem trabalho; não considerar o lote 1 encerrado.

## Fatia de implementação entregue — terminal, linguagem e Zappy

### Comportamento implementado

- Reconciliação serializada editor ↔ filesystem, incluindo arquivos novos, rename, exclusão, package.json e lock. Conflitos preservam uma cópia explícita do terminal; dados ignorados dentro de pastas não são apagados. Operações tardias não atravessam a identidade do projeto.
- Save, saída, exportação de fonte/JSON e handoff aguardam a fila. Há aviso de saída enquanto uma alteração observada está pendente. Isso **não garante** salvar escrita que o browser interrompeu antes de emitir um evento.
- Posse do WebContainer só é liberada após a montagem pendente terminar. Retry após estado ocupado, StrictMode e troca de projeto cobertos por testes. O sinal e o pedido de montagem do terminal usam também a identidade do store: IDs iguais em instâncias distintas não autorizam o uso do filesystem alheio.
- Excluir o último arquivo mantém um projeto Pro vazio persistível; a validação de build continua exigindo entrada compilável.
- Worker TypeScript 5.9.3 por instância, independente dos defaults JS do modo clássico. Fontes fechadas, tsconfig/jsconfig/extends/paths, exports/subpaths e declarações realmente instaladas entram no serviço. Atualização e remoção de pacote invalidam resolução; erro real permanece. Pacote instalado sem declarações recebe diagnóstico distinto de pacote inexistente, sem `declare module '*'`.
- Índice de dependências lê manifests/declarações e inventaria nomes de JS, com cancelamento e tetos. O limite por declaração foi corrigido a partir do Phaser real (6.211.003 caracteres); o catálogo JSON de ~47 MB não é carregado. Falha/versão TS divergente aparece na UI.
- Autocomplete, hover, formatação e definição entre arquivos integrados ao Monaco. Os arquivos `.mts`/`.cts` recebem linguagem TypeScript. Workers e listeners são descartados por instância; falha de linguagem permite nova tentativa.
- Zappy normal/Ponte usa blocos; Pro usa arquivos/terminal. Contexto, conhecimento, memória, contingências, referências e sugestões respeitam o modo. Histórico persiste o modo de origem sem migração SQL; orientação incompatível fica identificada como conversa anterior.
- Contexto Pro prioriza arquivo ativo, diagnósticos e pergunta. Envia observações limitadas de instalação/pacotes e revisão, preserva privacidade e orçamento do prompt. Essas observações não são apresentadas como prova de build ou jogabilidade.
- Referências Pro só apontam a arquivos/linhas enviados ao modelo; são persistidas e navegam no editor. Referência a arquivo removido fica indisponível; uma revisão diferente mostra aviso de linhas possivelmente alteradas.
- Host Kids prepara a reconciliação da nuvem antes de abrir um link direto Pro, trata falha de chunk/leitura com retry e reaproveita adapters Pinta/Molda. O editor reutilizável remonta sua sessão ao trocar perfil/projeto, evitando renderizar o documento anterior sob a nova identidade. A montagem e os bytes de assets ainda pertencem ao lote 4.

### Verificação local

- Studio: **183 testes, 485 asserções**, cobrindo persistência, árvore, reconciliação real em disco, lifecycle/posse, terminal, serviço TS, editor e Zappy.
- BFF/loader: **76 testes, 328 asserções**, incluindo transporte real pelo schema da rota do contexto Pro e referências de arquivos; chamadas do provedor substituídas por respostas controladas, sem consumo de IA paga.
- Runtime: **16 testes, 57 asserções**; inclui compilação Node/Vite real com CSS e configuração PostCSS executável do projeto ignorada.
- Guarda de bundle: **1 teste, 27 asserções**, build de produção; nenhum teto foi ampliado.
- Persistência/HTTP do histórico: **13 testes, 28 asserções**, incluindo preservação de modo/revisão/referências pelo DTO. Sincronização Kids: **44 testes, 192 asserções**.
- Navegador, playground compilado: Three + tipos, addon GLTFLoader, Phaser 3.90.0 e mitt 3.0.1 reconhecidos juntos; erro TS2322 deliberado continuou marcado. Hover mostrou `THREE.Mesh<...>`, autocomplete mostrou membros reais e definição abriu um arquivo fechado na linha correta.
- Remoção real de mitt restaurou TS2307. Reinstalação real retirou o diagnóstico em **1.276 ms após o npm terminar**, nesta única amostra local. Não é p95, benchmark de hardware de referência nem evidência do host autenticado.
- Typechecks de Studio, member-shell, members e community-kids passaram. O build do playground foi repetido com os arquivos finais do Studio; após recarregar, o projeto persistido abriu sem marcadores TS nem erros/avisos no console do navegador. Biome dos arquivos desta tarefa e `git diff --check` passaram. A imagem Docker e os testes autenticados Kids ainda não foram executados.

### O que continua pendente no escopo aprovado

Os checkboxes dos lotes permanecem abertos deliberadamente: esta fatia não encerra todos os critérios de cada lote. Não foram entregues ainda o manifesto/montagem binária completo, conversão preservando o original, conta OpenRouter do responsável e ledger de custo, kits GameDev novos, construtor por revisões, nem publicação Pro imutável. Também faltam baseline do host/dispositivo, avaliação semântica ampliada do tutor e ensaios longos de desempenho/estabilidade. As bibliotecas e os jogos atuais continuam disponíveis; isso não equivale à nova cobertura GameDev.

Próximo lote de implementação: contrato de assets vinculado a `Project.assets`, materialização local/export/remoto e conversão que preserva o original, antes de ampliar kits e ferramentas de construção. Não duplicar binários na árvore de texto nem elevar os limites atuais sem medição. Depois, seguir os lotes 5–9 e a matriz completa R01–R14.

### Workspace compartilhado

Durante a execução apareceram os pacotes não rastreados `marketing-desktop` e `marketing-production`, além de alterações adicionais no lockfile, pertencentes a outro trabalho. Um comando de Biome com seleção ampla também formatou arquivos desses pacotes; isso foi comunicado. Os comandos seguintes usam somente caminhos explícitos dos pacotes desta tarefa. Não reverter o lockfile inteiro: a alteração desta tarefa é a fixação de TypeScript 5.9.3 no Studio; preservar as entradas concorrentes de marketing.


## Revisão em andamento — materiais, Pensa e runtime compilado

- Pinta/Molda usam os adapters compartilhados no Pro. A presença de bibliotecas npm não depende de extensão de blocos para aceitar materiais 3D. Pensa reutiliza o contrato de sessão: confirmação da revisão salva antes de concluir, controle de concorrência do progresso, guia sem referências de blocos no Pro e biblioteca de equipe isolada por perfil. A abertura direta Pro também reconcilia restaurações pendentes do Pensa.
- Materiais passam a ter caminhos persistentes opcionais e procedência/licença. Uma projeção derivada produz arquivos binários e manifesto com hash; não duplica base64 na árvore textual. Exportação inclui os bytes e créditos. O mesmo coordenador do filesystem materializa os assets antes do preview e preserva cópias de conflitos. Ainda falta encerrar a revisão de concorrência e de arquivos binários novos do terminal.
- Conversão salva uma cópia integral em Blocos antes de alterar o projeto ativo e recusa edições concorrentes. O Pro mantém a identidade ativa porque Pensa vincula a tarefa ao ID determinístico; a cópia original recebe novo ID, referenciado em `proMeta.origin`. A persistência aguarda a hidratação dos blocos. A migração das dependências CDN para npm e os casos de aviso de exportação ainda estão em revisão; não considerar a conversão encerrada.
- A revisão rejeitou a tentativa de embutir recursos substituindo `fetch` e propriedades de imagem. Esse código foi removido. O runtime agora entrega um artefato estático com manifesto publicado após os arquivos, hashes verificados, URL aleatória, expiração e CSP/CORS/COEP na origem. Usa R2 privado e mantém o limite de 2,5 MB para a saída. O editor conserva a última compilação válida diante de erro posterior.
- Novo teste real de navegador compila Three.js e carrega PNG, JSON e glTF com buffer externo em iframe opaco. Encontrou falta de COEP no runtime; correção aplicada e teste passou (Chromium). Rede externa e acesso ao documento pai permanecem bloqueados. Teste usa armazenamento em memória por contrato, não uma implantação R2.
- Runtime: 20 testes, 86 asserções passaram; typecheck passou. Imagem Docker construída e smoke executado com `--network none`: uid 1000, dependências sem escrita, CSS/TS compilados, quatro arquivos e asset binário preservado. Studio e member-shell passaram no typecheck após a mudança de contrato (antes dos últimos arquivos de teste). Kids: 15 testes de rota/Pensa; Admin: três testes de autoria passaram.
- Infraestrutura externa não foi criada nem publicada. Para ativar o runtime novo, o deploy deve provisionar o binding R2 e lifecycle documentados no README. Publicação permanente, rollback, conta OpenRouter e lotes GameDev/IA continuam pendentes. Este registro não substitui o full review final nem autoriza marcar todos os lotes como concluídos.


### Revisão complementar da mesma fatia

- Conversão agora gera módulos npm em `src/converted`, preserva fontes TS, mantém a ordem das extensões antes do programa e não inclui importmap CDN nem registro PWA do export clássico. Build real Node/Vite de projeto com Three e extra TS passou. Nomes inválidos, colisões, falha de transpile e eventos HTML que não podem ser migrados com segurança impedem a promoção e mantêm o original.
- Corrigida a raiz de um erro anterior de exportação: o transpiler devolvia código `throw` para erros e o export interpretava isso como sucesso. O preview mantém seu erro visível; export/conversão pedem erro estruturado e não ocultam a perda. 27 testes de conversão/build/export/transpile passaram (112 asserções).
- Promoção não troca o documento recém-aberto se houver mudança de projeto durante o save. Erros de backup permanecem visíveis no diálogo. Três testes de persistência da promoção passaram (11 asserções).
- Novos arquivos de imagem/áudio/GLB/HDR do terminal em `public/` entram em `Project.assets` com o caminho preservado. Arquivos não persistíveis bloqueiam o save em vez de mostrar confirmação enganosa. A revisão de retries corrigiu duplicação de cópias após gravação parcial. 16 testes de assets/fila/lifecycle passaram (76 asserções).
- Teste de navegador ampliado: módulos npm, PNG e SVG sem extensão, JSON, glTF com buffer externo e GLB real carregaram em iframe opaco; rede externa e acesso ao parent bloqueados. O MIME dos assets sem extensão é derivado no empacotador, com validação no manifesto.
- Limitação de ambiente observada: Wrangler 4.120.1 recusa desenvolvimento local com Containers no Windows e recomenda WSL. Portanto não houve teste integrado do SDK + Durable Object + R2 sob Wrangler. A imagem Docker foi construída e seu smoke sem rede passou; armazenamento e HTTP têm testes por contrato e navegador. O empacotador foi alterado após esse smoke para incluir MIME, exigindo rebuild/smoke final.
- Restam a prova no host autenticado e em outro perfil/dispositivo, a revisão semântica completa da conversão, metadados 3D e os lotes 5–9. Nenhum checkbox global foi encerrado por esses testes parciais.


## Lote 5 — conexão opcional e consumo real (revisão local)

- OpenRouter do responsável por OAuth PKCE S256, estado de uso único vinculado à sessão adulta, credencial AES-GCM versionada e privada. Criança, perfil ativo e sessão de suporte não gerenciam a conexão. Escolha de fonte explícita, sem fallback silencioso para a franquia.
- Ledger de execuções e tentativas, reservas concorrentes por família, limites diários/mensais, permissão de envio de uso único e custo confirmado separado de resultado incerto. Reparos consomem uma interação e registram todas as inferências. Resposta rejeitada antes da geração devolve a interação; resposta válida de custo zero mantém o consumo.
- Transporte Pro/Zappy mantém cancelamento durante leitura, limita corpo e tempo, não repete inferência após erro de rede e fixa a chave/fonte da reserva. Consulta posterior da geração usa fila persistente com lease, backoff e até oito verificações; incerteza não desaparece como custo zero.
- Painel do responsável e relatório administrativo distinguem confirmado, incerto e reservado. Contratos de crédito informam a fonte selecionada ao Zappy. Revalidação dos limites adultos antes de cada tentativa.
- Migrações geradas 0116–0119, verificadas em PostgreSQL 16 descartável. Testes mais recentes de conta/ledger/serviço/HTTP: **13 testes, 54 asserções, zero falhas**; incluem exclusão da conta, concorrência, separação de perfis e reconciliação. Transporte/reconciliação/OAuth: **14 testes, 74 asserções**. Painel adulto: **3 testes, 8 asserções**; Zappy: **26 testes, 47 asserções**; gateway: **35 testes, 158 asserções**.
- Suíte Members (antes dos últimos pequenos ajustes): **1407 passaram, 326 ignorados, zero falhas**; testes PostgreSQL executados separadamente. Admin/gateway passaram no typecheck. Um fixture de sessão sem accountId foi corrigido; nova verificação dos consumidores está em execução.
- Operação, configuração, limites, migração e rollback descritos em `packages/members/docs/studio-ai.md`. Nenhuma credencial real foi conectada, nenhuma geração paga foi feita e nenhum cron/deploy externo foi ativado. A validação real do provedor continua distinta dos testes controlados.

## Revisão adicional do filesystem e runtime

- Corrigido tratamento de ENOENT do WebContainer que só informa a mensagem; a limpeza usa a raiz real do projeto. Falha de montagem deixou de causar ciclo de retry no preview, e processos tardios são encerrados pelo proprietário. Journal de sincronização avança para a observação do disco antes de writes, prevenindo cópias duplicadas após falha parcial.
- Navegador real: PNG de 68 bytes criado no terminal entrou em Project.assets e no manifesto e permaneceu após reload. **45 testes/168 asserções** e **26 testes/108 asserções** cobrem FS/integração/conversão.
- Runtime recusa caminhos não canônicos, colisões e metadados inconsistentes. Imagem reconstruída após MIME; smoke sem rede passou: uid 1000, quatro arquivos, 2250 bytes, dependências protegidas. Persistem os limites ambientais do Wrangler Containers no Windows e a ausência de prova autenticada entre perfis/dispositivos.

## Lotes 6A/6B — kits novos, revisão em curso

- Catálogo leve e fontes assíncronas por engine. Todos os consumidores de criação estão sendo migrados ao mesmo contrato assíncrono, com tratamento de falha de chunk.
- Cinco kits: puzzle Canvas, arcade Phaser, plataforma Phaser, exploração Three e ação Three. Fontes editáveis, configurações, controles semânticos teclado/toque/gamepad, estados de partida, pausa, reinício, som opt-in e descarte. Modelos Three opcionais usam cache de promises e clones com propriedade explícita dos recursos.
- Phaser 3.90.0 incluído nas dependências confiáveis do runtime; sem CDN. Referências GameDev adaptadas independentemente com formas procedurais; nenhum asset de terceiros redistribuído.
- **83 testes/440 asserções** de catálogo/conversão/exportação/persistência passaram. Os **cinco kits passaram typecheck próprio, build Node/Vite e empacotamento dentro do teto atual**. **Cinco playtests Chromium** passaram em iframe isolado: iniciar, interação, pausa, reinício e viewport estreita, sem exceções de página.
- Esses playtests ainda não provam vitória/derrota de todos os jogos, uso de modelos animados, estabilidade longa ou orçamento de performance em hardware de referência. Essas verificações e o review de cada kit seguem em andamento. Lotes 7–9 e a cobertura ampliada do lote 8 permanecem obrigatórios.
- A checagem global de community-kids passou a apontar erros de tipos em alterações concorrentes de `molda/useScenePaint.ts`; esse trabalho separado não foi alterado nem incluído na revisão do Studio.


### Review dos kits e progresso local

- Corrigidos render contínuo durante pausa, descarte do Phaser enquanto adormecido (destroy é efetivado no próximo tick) e listeners de scene destroy, além de skeletons dos clones animados. Canvas e Three agendam frames somente enquanto jogam ou quando precisam redesenhar. Controles apresentados respeitam as ações de cada kit.
- Curadoria GameDev limitada ao kit de origem integra o contexto Pro do Zappy; o modo normal não recebe esse material técnico. IDs desconhecidos são descartados; a origem do kit não é tratada como prova do código atual. **87 testes/402 asserções** do BFF/transporte/conta passaram.
- Novo protocolo de progresso Pro usa MessageChannel iniciado pelo iframe, origem e WindowProxy conferidos, token por documento e revisão de boot. O host compartilha o repositório existente de gameStorage com escopo de perfil capturado e confirmação estrita. Não envia dados com targetOrigin curinga, não expõe o armazenamento do app e não confirma escrita que falhou. Quotas são comuns ao modo clássico; as APIs clássicas mantêm comportamento anterior.
- Kits guardam recorde e vitórias neste aparelho, por projeto/perfil. Não prometem checkpoint da partida inteira nem sincronização entre dispositivos. Export standalone usa o armazenamento da própria URL. Falha de gravação é indicada separadamente da partida.
- **45 testes/141 asserções** cobrem protocolo, rejeição de origem/revisão/instância, falhas de persistência, namespaces e regressão de preview/armazenamento clássico. **Cinco playtests Chromium** passaram com gravação e recarga real do iframe por MessageChannel, pausa sem RAF contínuo, reinício, viewport estreita e descarte sem frames restantes. O backend desse playtest é em memória; a implementação IndexedDB tem testes separados e requer a prova final no host.
- Puzzle: regras puras testadas para duas linhas simultâneas, giro na parede, bloqueio após derrota e vinte reinícios. Kits + regras + contratos: **13 testes/155 asserções**, com typecheck/build/empacotamento dos cinco kits.
- Capturas reais dos kits em `.cache/studio-kit-screenshots` foram inspecionadas. Atribuições MIT das duas referências 2D seguem no projeto exportado. Não houve redistribuição dos assets externos.
- Members completo após os ajustes: **1410 passaram, 326 ignorados, zero falhas, 10861 asserções**. Admin e member-shell passaram typecheck antes da ponte de progresso; Studio está em nova checagem. Ainda faltam a prova de clips/modelos, objetivos completos por kit, medição no host/hardware de referência e o soak.

## Próxima fatia: construtor por revisões (lote 7)

- Manter uma única interface Zappy, com ação explícita de construir no Pro. Capturar documento/base e materiais por hash, sem enviar credenciais nem binários no prompt.
- Introduzir revisão de trabalho separada, patches atômicos com hashes anteriores e CAS da revisão-base. Aplicar/desfazer passam pela fila do mesmo store e nunca substituem edições concorrentes.
- Job durável por conta/perfil/projeto, fases e lease; limites totais de tempo/custo/tentativas, cancelamento e replay sem nova inferência automática. Resultado de transporte ambíguo permanece explícito. Reusar o ledger e a infraestrutura privada existente.
- Ferramentas estruturadas e limitadas para arquivos/dependências, diagnóstico/build e playtest/captura. Configuração e comandos de build vêm do sistema; instalação fora das capacidades remotas precisa ser identificada, não ignorada.
- Mostrar plano, diff, evidências e custo antes de aplicar. Publicação segue explícita. Não marcar sucesso só porque o modelo produziu código ou Vite compilou.

## Revisão complementar — conversão, dependências e modelos animados

- Corrigida a conversão que transformava scripts globais em módulos: scripts clássicos permanecem em `public/`, com funções globais, `this`, `document.currentScript`, eventos HTML e ordem preservados. Só módulos existentes vão para `src/converted`; imports inline/absolutos são ajustados. Usos mistos global/módulo e imports dinâmicos globais exigem migração explícita antes da promoção, preservando o original. **17 testes/63 asserções** e **dois testes Chromium** passaram, incluindo dependência do bootstrap Three. Este registro substitui a descrição anterior de conversão de todos os scripts em módulos.
- Todos os **dez modelos** passaram por build Vite/empacotamento, e os modelos TS por `tsc` real. React recebeu as declarações npm ausentes. Runtime agora valida as dependências efetivas do projeto, independente do template de origem, e rejeita bibliotecas/versões fora do catálogo. Faixas exigem lock completo; versões e integridades transitivas são comparadas com a imagem. **21 testes/82 asserções** de build/handler e, depois, **nove testes/41 asserções** do contrato de dependências passaram. A imagem precisa ser reconstruída após Phaser e tipos React.
- A checagem do Worker é separada dos fixtures de navegador: o código de produção continua verificado sem DOM, e os testes que importam modelos do Studio incluem os tipos do navegador. O comando `bun run typecheck` executa ambos.
- **Um teste Chromium real de GLB com skeleton/clip** confirmou altura normalizada, base no chão, duas animações independentes, geometria compartilhada, uma única requisição e descarte único. Corrigido descarte de clone inválido e repetido. Manifesto derivado agora inclui clips, durações obtidas dos timestamps binários quando suportados, eixo/unidade e bounds locais declarados; estes não são apresentados como bounds mundiais/animados. A medição real para enquadramento continua no loader Three. Não duplica os bytes nem metadados potencialmente obsoletos em `Project.assets`.
- A pergunta do usuário sobre kits foi esclarecida: são cópias editáveis selecionadas em Novo projeto → Profissional, com orientações curadas para Zappy. O construtor com diff/aplicar/desfazer ainda pertence ao lote 7; não foi apresentado como entregue.

## Review funcional 6A/6B e início do lote 7

- Rodada conjunta final dos cinco objetivos: **5 playtests Chromium passaram em 1,7 minuto**, com vitória por entrada de teclado, derrota nos três jogos que possuem essa condição e reinício. O controlador fornece somente observações de estado e descarte; os testes não alteram score/posição nem invocam uma vitória artificial. O puzzle ainda usa aleatoriedade normal; seed determinística está pendente.
- Perfil econômico por kit reduz efeitos/custo de renderização sem alterar física ou objetivo. **5 testes de interface passaram**, incluindo pausa, armazenamento/reload, viewport estreita e recuperação real de contexto WebGL nos jogos Three.
- Medição corrigida para iframe de **1024 × 640**, um minuto por perfil, vinte reinícios: **5 ensaios passaram** nos critérios de coleta e contagem estável de recursos. Ambiente: Windows, Chromium 148, DPR 1, 12 processadores lógicos; Three usou **SwiftShader**, não a RTX 3050 da máquina. Os 3D tiveram p95 de frame próximo de 33,4 ms. Isso não comprova a meta de 20 ms em GPU/hardware de referência. Máximos dos jogos com derrota incluem intervalos de reinício do driver; não interpretá-los como custo de um frame. Os números não incluem o editor carregado, e houve trabalho leve de desenvolvimento concorrente. JSONs em `packages/studio/.cache/studio-kit-performance`.
- Review funcional de 6A/6B encerrado nesta fatia; desempenho no host/GPU, estabilidade longa e integrações autenticadas continuam como critérios transversais do lote 9. Os checkboxes globais continuam abertos até esses critérios serem comprovados.
- Lote 7 em implementação: revisões por hash de código, layout, configuração e materiais; patches atômicos e inversos; CAS depois de flush/hashing, preservando edições concorrentes. Jobs no Members com isolamento conta/perfil/projeto, lease, prazo total, retenção limitada, cancelamento e consulta ao ledger autoritativo. **4 testes PostgreSQL/21 asserções** passaram antes da última ampliação de contexto; nova rodada obrigatória após essa ampliação. Geração interrompida não ganha nova permissão automaticamente.
- Verificador remoto TypeScript real em preparação: leitura limitada à revisão/dependências, sem executar plugins/configuração do projeto. **3 testes/12 asserções passaram**: tipos instalados, TS2322 em arquivo fechado, biblioteca não declarada e configuração externa/plugin rejeitados. Ainda não está ligado ao pipeline remoto nem à interface do construtor.
- Permanecem os lotes 7, 8, 9, full review, commit e merge local em staging. Nenhum push/deploy autorizado ou realizado.

## Lote 7 — integração e revisão em andamento

- Pipeline ligado de ponta a ponta: rota autenticada, estado durável, chamadas limitadas pelo ledger, ferramentas de leitura/busca/dependências, proposta em revisão separada, TypeScript/Vite, playtest Chromium isolado e captura vinculada ao artefato. Uma chamada HTTP executa no máximo uma etapa persistida. O painel Zappy carrega Construir apenas no Pro, com plano, custo confirmado/incerto, evidências, comparação, aplicar e desfazer.
- Review corrigiu perfil A→B→A durante captura/aplicação, edição concorrente durante hashing, expiração que era revertida por checkpoint tardio e falha de fechamento do ledger escondendo cancelamento já persistido. Retenção física de sete dias ligada ao cron existente, em lotes de 100; expiração de jobs abandonados não depende de retorno da UI. Nenhuma migração adicional foi necessária para esses ajustes.
- Dependências: o modelo altera o manifesto; o sistema prepara o lock com versões/integridades do grafo instalado, sem registry ou scripts no runtime. Lock não é escrito pelo modelo. Prova fora do monorepo passou `npm ci --ignore-scripts` e `npm ls --all`, sem alteração do lock. O aluno recebe instrução de instalar no terminal após aplicar. Bibliotecas fora do catálogo seguem explicitamente locais.
- Evidências desta rodada: **12 testes/40 asserções** de revisão/store/flush; **5 testes/15 asserções** de UI (StrictMode, recuperação, cancelamento e aplicação); **17 testes/99 asserções** de BFF/ferramentas/orquestração/reconciliação; **6 testes PostgreSQL/28 asserções** de durabilidade; **14 testes/55 asserções** de handler e TypeScript real; **2 testes/12 asserções** do lock, incluindo instalação independente. Números têm sobreposição com rodadas anteriores e não devem ser somados como casos exclusivos.
- Typecheck completo do Studio passou nesta frente após integração do painel. Members lint passou e suíte geral repetida: **1410 passaram, 334 ignorados, zero falhas, 10861 asserções**; PostgreSQL executado separadamente. Typechecks restantes, teste Chromium da revisão, rebuild/smoke da imagem e review final do lote seguem em andamento. O primeiro browser da comparação encontrou fixture sem o CSS do host; corrigida a importação do CSS real, repetição pendente. Não declarar lote 7 encerrado ainda.
- Canvas: handoff final recebido; arquivos estabilizados e liberados, typecheck completo e incremental aprovados pela sessão responsável, 53 testes dedicados. Integração principal já verificou seis kits em 12 playtests e Docker limitado. Evidências e limites em `2026-10-15-studio-canvas-coordenacao.md` e `.audits/studio-pro-canvas-implementacao-2026-10-15.md`.

### Encerramento da revisão funcional do lote 7

- Chromium identificou erro real no descarte do DiffEditor do wrapper React: modelos eram destruídos antes de serem desvinculados do widget. A comparação agora possui seu editor/modelos diretamente, usando a mesma configuração Monaco do Studio, e descarta na ordem correta. Repetição passou: comparação real, aplicar/desfazer, três fechamentos/reaberturas, viewport 360 px, zero erros de página e **zero modelos de revisão depois de cada fechamento / dois durante uso**. Captura inspecionada em `.cache/playwright-results` do Studio. O fixture controla somente o adapter de servidor, não o store, CAS ou Monaco.
- Typechecks completos/incrementais de Studio, member-shell, Members e runtime passaram após os ajustes. Biome dos arquivos da fatia e `git diff --check` passaram. A seleção Construir foi testada no painel real: ausente no clássico, carregada apenas depois da escolha no Pro.
- Imagem Docker reconstruída (`sha256:7b7913f3ab4a5a5c71231893cb8088ae4803510ca0ea32ea0df33f5a702082fc`). Smoke real com uid 1000, sem rede, 1 CPU/1 GB: Puzzle 14.306 ms/65.177 bytes; Canvas Survival 29.884 ms/111.926 bytes; exploração Three 31.788 ms/649.683 bytes. Inclui TypeScript, Vite, empacotamento, objetivo por entrada e captura. Relatório de tipos diferencia explicitamente projetos HTML/CSS sem fontes e checkJs ligado/desligado. Lock incompleto é recusado antes do build.
- Revisão funcional do lote 7 encerrada; os critérios transversais do lote 9 continuam abertos. Não houve inferência paga/OpenRouter real nem prova integrada Cloudflare DO/R2/SDK no Windows; testes de transporte e limites usam respostas controladas, PostgreSQL é real e o runtime Docker é real. Os checkboxes globais continuam condicionados à matriz final, sem confundir essas provas com homologação externa.
- Próximo: lote 8, três famílias restantes (arena em grade, tático 2D e tático 3D), curadoria por tarefa e pipelines de materiais. Depois lote 9, revisão geral e commit/merge local autorizado.


## Encerramento integrado dos lotes 8–9 e full review

- Lote 8 entregue: 14 modelos/9 kits, arena em grade e táticos 2D/3D, regras puras, materiais/áudio, drivers e curadoria adaptada. Ver relatório do lote 8.
- Lote 9 entregue: preflight anterior ao custo, envelopes completos, capacidades/flags M1/M2/M3, identidade do verificador, publicação permanente por revisão/CAS, histórico/rollback/desativação, player isolado com progresso/áudio/controles, retenção e limpeza. Ver relatório do lote 9.
- Adendo Canvas e Zappy Pro A01–A06 liberados pela sessão responsável e integrados. Persistência de rascunhos/inversas/recibos, retomada, exclusão com outbox, assistência unificada e preview da candidata revisados. A07 continua posterior por delimitação explícita do adendo.
- Revisão ampla corrigiu importações que ampliavam o bundle inicial, expectativas antigas de armazenamento e isolamento dos mocks/compilação do fixture browser. Tetos de bundle e produto preservados.
- Suíte completa Studio final: **9.041 testes passaram, zero falhas, 137.628 asserções em 590 arquivos (218,41 s)**. Execução sequencial com timeout local padrão de 15 s, sem mudar limites nos arquivos de teste; a rodada concorrente anterior havia excedido os 5 s padrão em dois testes existentes.
- Soak Canvas Survival: 30 minutos reais, 60 reinícios, 30 amostras, DOM/canvas estáveis e zero erros de página. Evidências finais das demais baterias em `.audits/studio-pro-final-evidence-2026-10-15.json`.
- Homologações externas permanecem explícitas: Cloudflare real, OpenRouter/BYOK pago, Pinta/Molda/Pensa autenticados entre perfis/aparelhos, editor no host e hardware físico de referência. As flags dos novos kits permanecem fechadas por padrão. Não houve push/deploy/migração de produção.


## Fechamento Git e verificação da integração

- Implementação commitada em `b94714927c3ccf01987f06ed7d3099356168b194`, branch `feat/studio-pro-completo`. Seleção restrita a Studio e integrações próprias; lock raiz inclui apenas a fixação de TypeScript desta frente.
- Merge local sobre `fa6a83faf4d05e98f4a0f8995a49ee90867fb29f` em `staging`, na worktree liberada pela sessão Molda. Preservados os avanços existentes de Pensa/Molda. Os dois conflitos foram combinados: sessão Pensa compartilhada e ledger/funil na composição Members.
- Pós-combinação: 67 testes Kids/Pensa, 32 galeria/bundle Studio, 35 gateway e 22 créditos Members; todos passaram. Typechecks de Studio, Kids, Members e Admin passaram. Instalação congelada sem mudar lock, fontes/locks gerados, licença/bibliotecas TS, fingerprint da imagem e diff check aprovados.
- Relatório final e JSON de evidências atualizados no mesmo merge. Não houve push, deploy ou migração externa. Homologações externas continuam pendentes e os gates M1/M2/M3 permanecem restritos por padrão, conforme a revisão final.
