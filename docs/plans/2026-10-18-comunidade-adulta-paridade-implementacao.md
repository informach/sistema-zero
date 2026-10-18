# Implementação da paridade técnica adulta

## Contrato

Implementação em lotes com review entre lotes e full review final. Preservar identidade, acesso, progressão, persistência e publicação Kids. Fora de escopo: produção pedagógica, preço e campanha.

Branch: `feat/adult-community-parity-20261018`. Base `61a106ec0`, igual a `origin/staging` após fetch, comparação `0 0` e merge fast-forward em 18/10/2026.

Adulto usa conta ativa como aluno (`learnerId = accountId = session.id`); criança usa perfil como aluno e conta do responsável como titular. Sem perfil infantil artificial nem seletor familiar no adulto.

## Lotes

| Lote | Escopo | Estado |
| --- | --- | --- |
| 0 | Remoto, baseline e identidade | Revisado |
| 1 | Gamificação adulta visível, recompensas e progresso | Revisado; QA visual integrada pendente |
| 2 | Nuvem, rascunhos e hosts de criação | Revisado; Pro livre continua no lote 6 |
| 3 | Política adulta, capacidades, missões, ranking e liga | Revisado; QA visual integrada pendente |
| 4 | Moedas, avatar e espaço pessoal | Revisado; QA visual integrada pendente |
| 5 | Mostra, publicação, jogar, remix, perfil e desafios | Revisado; QA integrada no lote 7 |
| 6 | Tutoriais, Admin, Pensa/voz/IA condicionais e operação | Implementado e revisado |
| 7 | Full review e regressão integrada | Concluído; pendências operacionais registradas |

## Revisão por lote

Revisar diff e contratos; lint, typecheck e testes relevantes; identidade adulta sem perfil e identidade Kids por perfil; negativos de autorização, concorrência e repetição de mutações. Extrações conservam contratos Kids e compilação dos dois aplicativos. Registrar falhas e correções. Não declarar paridade completa antes da verificação integrada.

## Evidência

### Lotes 0 e 1

- Baseline: CI e typecheck adulto sem erros; Kids **1.420 passaram, 0 falharam**; member-shell **1.440 passaram, 0 falharam**.
- Sessão adulta rejeita perfil/capacidade Kids. Testes com JWTs reais conservam fluxo Kids de revogação e entrega do aparelho.
- Progresso adulto mostra XP, saldo, conquistas, sequência, protetores e pausa. Conclusão de aula aplica totais autoritativos, sem somar recompensa repetida. Respostas antigas canceladas; indisponibilidade conserva último estado.
- Badges extraídos sem mudança da apresentação Kids. Breakpoint da navegação corrigido para telas intermediárias.
- Verificação: adulto typecheck exit 0; member-shell **1.447 passaram, 0 falharam**; lint sem erros. Typecheck ampliado achou fixture nova sem `sessionId`; corrigida e verificada no lote 2.

### Lote 2

- Transporte, reconciliação, rascunhos e hosts Estúdio/Pinta/Molda extraídos para member-shell. Caminhos Kids permanecem como reexports, com contratos e namespaces preservados.
- Biblioteca local adulta usa `adult:<accountId>`; requisições levam identidade real da conta. Player adulto coordena rascunho na conta antes de concluir; respeita `LESSON_DRAFTS_ENABLED` e suporte somente leitura.
- Migração gerada **0130_oval_trish_tilby.sql**: público nas criações, padrão Kids nos registros existentes, unicidade por usuário/público/ferramenta/item. Chaves R2 Kids preservadas; adulto usa `creations/adult/<accountId>/...`.
- Licenças livres adultas próprias: `adult-estudio-completo`, `adult-pinta`, `adult-molda`, `adult-pensa`. Rascunho de aula autorizado pela aula. Cache de posse inclui público; revogação invalida ambos.
- Protocolo adulto confirmado antes de mutações: members antigo que ignora query não recebe reserva, commit ou exclusão. Upload adulto não assina chave Kids.
- Purga inclui objetos adultos; galeria de entrega e critério de envio em dia resolvem público do curso. IA de descrição pode ser retirada do adapter, preservando default Kids.
- **227 testes de nuvem passaram** e **52 testes de hosts/foco passaram**. Suíte completa Kids apontou três guardas textuais no caminho antigo; corrigidos para inspecionar a implementação extraída, mantendo exigências. Nova execução completa: **1.422 passaram, 0 falharam**.
- Backend apontou fixtures com curso adulto e query legada Kids. Fixtures agora declaram contexto; cobertura positiva e negativa dos dois públicos. Fake de revogação declara público do curso.
- Postgres real isolado, porta **55433**, banco **sz_adult_qa**: **14 testes passaram**, incluindo migração sobre registro legado, concorrência, cotas e exclusão isolada.
- Backend unitário/integração **1.310 passaram, 0 falharam**; member-shell **1.450 passaram, 0 falharam**. Typechecks members, member-shell, community e community-kids: **exit 0**.

### Lote 3

- Política adulta versionada e editável no Admin, com cursos gravados adultos, marcos de conclusão/publicação e capacidades independentes de XP e licença. IA/Pensa exigem curso avançado em etapa já concluída. Nenhuma política ou oferta comercial foi inventada para os dados reais.
- Migração gerada **0131_adult_journey_policy.sql**; capacidades conquistadas são persistidas e preservadas em alterações futuras. Escrita otimista e gravação protegida por versão/cerca de exclusão da conta.
- Hosts adultos Estúdio, Pinta e Molda consultam capacidades, licença e paleta; suporte somente leitura e backend sem contrato adulto falham sem permitir escrita. Runtime Pro de aula compartilhado conserva autorização pela própria aula.
- Missões exibidas e resgatadas pelo mesmo conjunto elegível; ranking e liga adultos com paginação. Kids conserva identidade e política próprias.
- Review corrigiu fixtures antigas que esperavam missões sem conteúdo e paleta adulta somente por publicação. Backend **1.314 passaram, 0 falharam**; testes dirigidos gamificação/paleta **81 passaram**.
- Postgres real: **3 testes / 12 asserts** de concorrência da política, versão obsoleta, grants idempotentes, exclusão e isolamento dos marcos. O helper de banco esparso não roda sobre a view de uma instalação integral (ordem de colunas); verificado no banco de fixtures dedicado. Histórico integral de migrações executado separadamente, sem esse helper.
- Gateway: **42 testes passaram**, incluindo leitura ativa e edição restrita à equipe. Typechecks members, community e Admin: **exit 0**.
- Revisão de riscos: Kids mantém dados, chaves e regras; licenças adultas não derivam das infantis. Configuração operacional da política e produtos ainda será necessária antes de liberar a venda.

### Lote 4

- Configurador de avatar, renderer 3D, inventário/loja e editor do espaço pessoal extraídos para member-shell. Kids conserva seus componentes de apresentação por provider; adulto recebe ícones e navegação próprios. Carregamento 3D continua client-only e fora das páginas comuns.
- Rotas adultas de avatar, snapshot, compra, quarto e montagem expostas com contratos compartilhados e público adulto. Fotos 3D adultas usam namespace R2 separado `avatar3d-adult`, preservando `avatar3d` Kids. Assets 3D iguais, servidos na própria origem de cada app.
- Testes dirigidos Kids: **48 passaram / 564 asserts**. Serviços/catálogos e isolamento adulto: **31 passaram / 716 asserts**. Compra repetida não cobra de novo; saldo e posse adulta não alteram Kids, inclusive na mesma conta.
- Typechecks member-shell, community e community-kids: **exit 0**. Kids revelou duas tipagens incorretas na fixture nova do Pinta; corrigidas sem modificar o contrato e teste positivo passou.
- Suíte Kids completa: **1.422 passaram / 1 falhou**. Causa: guarda textual tratava erros de autoria da política exclusivamente adulta como texto Kids. Arquivo adulto excluído com motivo específico, mantendo varredura dos componentes compartilhados. Guarda corrigida: **16 passaram / 97 asserts**; suíte integral será repetida no review final.
- Review corrigiu atualizações de progresso após refresh RSC sem desmontar editores e protegeu upload multipart do snapshot no guard próprio, sem cópia pelo proxy.

### Lote 5

- Hub aceita publicação adulta somente na parede adulta configurada, com curso/projeto/destino do mesmo público, conta adulta sem contexto Kids, licença e capacidades para criação livre. Kids mantém visitantes, canal curado e allowlist existentes.
- Mostra adulta, jogar anônimo, remix privado, filtro por desafio/mais jogados e páginas de perfil conectados. Remix usa namespace local adulto explícito e não muda o original. Share das aulas adultas é opt-in do host gravado; aulas ao vivo e prévias conservam default desligado.
- Perfil adulto é uma preferência da própria conta: privado por padrão, nome escolhido, opt-in revogável, sem criar identidade infantil. Ranking/liga usam nomes públicos adultos; BFF redige snapshots antigos quando o opt-in deixa de existir.
- Migração gerada **0132_useful_jigsaw.sql** acrescenta somente três tabelas adultas (perfil e desafios). Review rejeitou alteração da chave primária Kids por quebrar o `ON CONFLICT(month_key)` do backend anterior durante rollout; tabelas Kids ficaram intactas. Tentativas locais de geração foram descartadas antes de aplicação. Histórico integral até 0132 aplicado no Postgres local isolado.
- Admin de desafios recebe público explícito e reinicia estado ao trocar plataforma. Serviços e repositórios segregam temas/meses; default sem query continua Kids.
- Publicação, marcos de jogadas, recados de moderação e limpeza R2 respeitam público. `ADULT_BFF_BASE_URL` controla limpeza adulta; nunca há fallback de limpeza adulta para Kids. Publicações de vitrine não recebem prêmio de contribuição genérica duplicado.
- Review encontrou chamadas autenticadas adultas que passavam pelo gateway sem validar identidade local. Gate aplicado no transporte adulto para cobrir também APIs sem página. Consulta do jogo público usa transporte explicitamente anônimo, preservando compartilhamento Kids.
- Verificação recente: services members **1.317 passaram / 0 falharam**; Hub publicação **43 passaram**; moderação/roteamento R2 **23 passaram / 104 asserts**; perfil/desafios **14 passaram / 72 asserts**; BFF identidade/privacidade **39 passaram / 130 asserts** (antes de dois testes adicionais de gateway/jogo público).
- Postgres: **5 passaram / 21 asserts** (política + perfil/desafios), incluindo SQL Kids legado após a migração adulta. Fixture original de desafio precisava também da migração 0046 (remoção de suggested_kit). Matcher assíncrono de rejeição do Bun pendurou a transação no teste; captura explícita comprovou `ForbiddenError`, sem mudança da implementação produtiva, e passou.
- Handshakes adultos adicionados ao ranking/liga/missões/perfil público; backends antigos não liberam os dados. Ranking privado fica anônimo, com chaves estáveis para linhas empatadas. Remix consulta o público do jogo original. Missões consultam acesso real à mostra por RPC HMAC; tarefa indisponível some, mas conclusão anterior continua resgatável.
- Review final dos serviços deste lote: members **1.319 passaram / 0 falharam** e Hub **153 passaram / 0 falharam**. Typechecks members/Hub passaram nesse checkpoint. Uma execução integrada encontrou erro de tipagem no trabalho paralelo do Molda, preservado; verificações serão repetidas após o lote 6.
- Suíte Kids voltou a detectar guarda textual no caminho antigo do controle de jogo. Guarda agora lê a implementação extraída e conserva as exigências de contraste; **21 testes passaram**. Nova suíte integral ainda é obrigatória no lote 7.

### Lote 6 (em andamento)

- Estúdio Pro livre extraído para member-shell e exposto no adulto com licença/política/paleta próprias. Namespace adulto preservado na biblioteca e na reconciliação; HTTP conserva o ID real. CSP/COEP apenas na rota Pro e nos scripts de workers, sem afrouxar os vídeos do restante do app.
- Pensa usa a conta adulta diretamente. Contratos de ator e metadados aceitam público opcional, com default Kids preservado. Endpoints adultos próprios, autorização em profundidade, projetos/equipes/convites/arte/entregas/recompensas segregados; workers conservam público do agregado. Controles Kids continuam nos wrappers antigos.
- Tutoriais adultos reusam serviço, repositório e renderer, com tabelas/rotas adultas independentes. Admin acompanha a plataforma selecionada e remonta formulários ao trocar de público. Migração gerada **0133_adult_tutorial_library.sql** somente acrescenta tabelas.
- IA adulta exige capacidade avançada e licença própria no BFF e no members. Histórico do tutor usa identidade de projeto opaca por público. Execuções pagas e builder recebem público com default Kids; fences adultos não mudam a PK Kids. Migração gerada **0134_adult_ai_execution_isolation.sql** acrescenta isolamento e índice de busca adulta. Limites financeiros continuam por conta, impedindo multiplicar orçamento ao alternar aplicativos.
- Voz adulta depende de opt-in do próprio adulto, relido em cada pedido, e capacidade avançada. Sem consentimento parental artificial. Transcrição conserva limites de áudio, concorrência, origem e suporte sem escrita; narração relê a fonte autorizada.
- Publicação de oficina agora assina e verifica o público do curso, além de aluno, revisão e playId. Não exige licença livre para o projeto autorizado da oficina. Assinaturas Kids anteriores continuam válidas no Kids e não autorizam a Mostra adulta.
- Admin explicita o contrato técnico do curso, paleta, licença livre e referência de oferta. Cursos gravados usam a infraestrutura existente; vagas ao vivo permanecem manuais até implementação específica de reserva/pagamento/estorno, sem prometer automação inexistente.
- Verificações dirigidas: extrações Kids Pensa/Pro **8 passaram / 36 asserts**; Admin tutoriais **8 passaram / 32 asserts**; regras adultas/tutoriais/provas de oficina **22 passaram / 147 asserts**.
- Postgres real: fluxo Pensa adulto completo passou (**1 teste / 9 asserts**), incluindo persistência na conta, negativa de acesso Kids/convite cruzado, namespace R2 e ledger adulto. Suíte nativa ampliada: **24 passaram / 1 falhou por ambiente**; manutenção preflight precisa de `pg_dump`, ausente do pacote PostgreSQL embarcado. Não é erro da migração. Revisar/registrar a limitação e repetir os fluxos atingidos após alterações finais.
- Typecheck member-shell passou após os ajustes iniciais. Typecheck members apontou uma projeção SQL de worker sem a coluna nova `audience`; projeção corrigida, repetição pendente.
- Conexão do navegador integrado falhou antes da execução por metadado obrigatório ausente do ambiente. Harness Playwright existente será usado para a QA local; nenhum site ou dado remoto foi alterado.


### Lote 7 (em andamento)

- Review centralizou a identidade HTTP adulta em `resolveAdultLearnerId`: conta própria e nenhuma claim Kids, inclusive área dos pais. Aplicado à biblioteca, perfil, jornada, tutoriais e consultas com público adulto. Fixtures antigas passaram a usar identidade adulta real; negativo de perfil Kids agora exige 403, além do positivo de ausência de currículo infantil na conta.
- Review de atualização gradual acrescentou probe somente leitura antes de reservar/acionar IA adulta e antes de mutações do builder. Backend antigo não recebe a mutação. Testes confirmam que Kids conserva a requisição original e histórico adulto usa identificador opaco estável.
- Executor de trabalhos avançados escolhe explicitamente o BFF do público; `ADULT_STUDIO_BUILDER_EXECUTOR_URL` separado, sem fallback Kids. Disponibilidade adulta depende do executor adulto. Workers preservam a identidade no banco e na entrega.
- Suíte completa Kids: **1.423 passaram / 0 falharam / 8.541 asserts**. Prompts adultos foram separados em módulo exclusivo; texto do sistema Kids permanece intacto. A guarda continua lendo os componentes compartilhados.
- Checkpoint de revisão: members **1.324 passaram / 0 falharam**, member-shell **1.460 / 0**, Hub **153 / 0**, configuração gateway **42 / 0**. Ajustes posteriores do executor têm **7 testes dirigidos / 0 falhas**; suíte final será repetida ao encerrar.
- PostgreSQL real com histórico completo: ledger/builder **22 passaram / 111 asserts**, incluindo público, cotas por conta e fences de exclusão. Benefícios de oficinas **1 passou / 7 asserts**, preservando vagas Kids antigas e impedindo perfis infantis concedidos por vaga adulta. Builder repetido após separar executor: **13 passaram / 75 asserts**.
- Compra simulada por webhook assinado: gravado adulto, entrega repetida com mesmo/outro delivery-id, licença adulta, nenhuma capacidade avançada concedida por compra, cancelamento e preservação do acesso Kids: **1 passou / 13 asserts**. Provedor de pagamento e checkout reais continuam dependentes de homologação.
- Build de produção adulto passou. Build Kids em andamento. Os primeiros builds adultos revelaram diretiva cliente fora do início de um arquivo e tipagem de retorno de erro; ambos corrigidos na origem e build repetido com sucesso.
- Browser Chromium com auth/members/Hub/gateway e Postgres reais: **3 fluxos passaram** (login sem seleção familiar, progresso/ferramentas/IA bloqueada, preferências públicas revogáveis e galerias compartilhadas). Teste de criar/retomar projeto em revisão. Conta sintética possui também criança real, provando entrada adulta direta. Harness usa login e requisições reais, sem interceptação de rotas.
- Artefato standalone Windows tinha symlinks de diretório emitidos como links de arquivo pelo tracing. Launcher de QA corrige somente links internos da cópia descartável; fonte e ambiente de produção não são alterados. Launcher também remove ambientes somente da cópia e desliga provedores externos.
- Os **182 assets** atuais do avatar adulto são idênticos byte a byte aos Kids, sem arquivos extras. Código e catálogo são compartilhados; cada app serve os assets na própria origem.
- CI raiz encontrou formatação em trabalho concorrente de TUI/scripts fora do escopo. Dois arquivos próprios também precisavam formatar; corrigidos. Verificação de arquivos próprios será registrada separadamente; não alterar trabalho concorrente para mascarar o estado global.
- Guia operacional e comandos locais em `2026-10-18-comunidade-adulta-operacao.md`. Nenhum pagamento, e-mail, publicação, alteração ou implantação remota executado.


### Fechamento do full review

Relatório final: `2026-10-18-comunidade-adulta-full-review.md`. Builds adulto/Kids e typechecks passaram. CI integral **exit 0**, 9.297 arquivos, mesmos 12 avisos/159 informações do baseline, sem erros. Suíte final Kids **1.423 / 0**; member-shell **1.460 / 0**; members **1.326 / 0**; Admin **614 / 0**; Hub **153 / 0**; gateway **42 / 0**. Browser integrado **6 / 0**, incluindo área parental Kids e negativa com token parental real, projeto adulto retomado e avatar desenhado. Browser Kids **16 / 0**, com espera pelo player pronto corrigida no harness, preservando as exigências. Pensa nativo selecionado **24 / 0 / 167 asserts**; manutenção completa permanece sem validação por ausência de `pg_dump`/`pg_restore`.

Review de reaproveitamento: 84 shims Kids, 17.012 linhas deslocadas para implementação compartilhada, 182 assets idênticos. Sem componentes do app Kids importados pelo adulto. Pendências externas são configuração de produto/jornada/espaços, implantação e homologação de pagamento/R2; não são apresentadas como recursos já publicados. Venda automática de vagas ao vivo requer integração específica; gravados reaproveitam a entrega existente.


## Implantação

Migrations de members antes do backend e aplicativo adulto. Protocolo Kids sem query permanece Kids. Adulto exige confirmação do contexto antes de escrever, inclusive durante rollback. Não reverter coluna/índice enquanto houver criações adultas. DDL e reconstrução de índices exigem medir lock em cópia representativa antes de produção.

Nenhuma migração, publicação, implantação ou alteração de dados remotos executada. Postgres e logs de QA em `.cache`, fora do produto.

## Conciliação remota e publicação

A rodada posterior integrou `origin/staging` em `88981ff91`, corrigiu o isolamento de curso adulto contra perfil Kids no serviço central e validou novamente os três builds, Members e os navegadores. O usuário autorizou commit e push de todas as alterações locais, incluindo recortes do Molda. Relatório e evidências atualizados: [conciliação e full review](2026-10-18-comunidade-adulta-conciliacao-full-review.md).
