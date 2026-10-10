# Acesso infantil por aparelho — Implementation Plan

> **For agentic workers:** usar `executing-plans` para executar as tarefas nesta sessão, com verificações e registro de progresso.

**Goal:** permitir que crianças voltem ao próprio perfil sem senha ou e-mail dos pais, com autorização individual por perfil e navegador.

**Architecture:** Auth mantém os códigos, aparelhos, autorizações e contexto das sessões; Gateway verifica as permissões em toda chamada. O member-shell integra cookies e validação, e o Kids separa a gestão adulta da navegação infantil. Os perfis e o progresso existentes são preservados.

**Tech Stack:** Bun, TypeScript, Elysia, Drizzle/PostgreSQL, jose, Next.js, React e componentes/tokens existentes.

**Spec:** `docs/plans/2026-10-10-acesso-infantil-design.md` (aprovada para implementação em 10/10/2026).

## Global Constraints

- Autorização por perfil e navegador; cada irmão e cada aparelho têm validade e revogação próprias.
- Código aleatório de 10 caracteres, uso único, validade de 10 minutos; autenticação persistente em cookie HttpOnly, Secure em produção, sem credenciais nos logs.
- Prazos: somente hoje, 7, 30 ou 90 dias; nenhuma renovação automática do prazo concedido.
- Criança sem e-mail ou senha própria; login adulto por senha ou OTP chega à área dos pais.
- Sessões antigas sem contexto Kids não ganham autorizações implícitas.
- Revogação vale na próxima requisição protegida, inclusive arquivos e tokens ainda não expirados.
- Troca de perfil não amplia permissões, não transforma perfil arquivado em conta, não mistura salvamentos entre irmãos.
- Preservar mudanças locais preexistentes em Core/learning e Pinta. Não incluir essas mudanças na entrega.
- Gerar migrations pelo script Drizzle; nenhuma alteração em migrations já publicadas.
- Interface usa a identidade atual; copy curta, estados claros, teclado e celular contemplados.

## 1. Contratos, persistência e regras de autorização

Files: `packages/core/src/security/kids-session.ts`; `packages/auth/src/domain/ports/study-access-repository.port.ts`; `packages/auth/src/application/study-access/*`; schema, repositório e migrations em `packages/auth/src/infrastructure/persistence/drizzle/`.

Interfaces: `KidsSessionClaim` discrimina responsável/aluno; `StudyAccessRepository` armazena código, navegador e autorização. Segredos chegam ao banco somente como hash. O resgate transacional associa o código a um único navegador e permite recuperar o resultado da mesma tentativa nesse navegador.

- [x] Escrever testes de prazo, normalização, autorização por irmão, expiração, revogação e resgate concorrente.
- [x] Implementar política e repositório com transação/lock para consumo e troca de sessão.
- [x] Gerar migration aditiva e conferir journal/snapshot com `bun run db:generate` e `bun run check:migrations` em Auth.
- [x] Rodar testes de unidade e de banco real; não considerar testes de banco pulados como evidência de atomicidade.

Exemplo de invariante a testar:

```ts
expect(normalizeStudyCode('abcde fghjk')).toBe('ABCDEFGHJK')
// Autorizar André não permite entrar como Débora no mesmo navegador.
await expect(service.enter({ deviceToken, profileId: debora.id })).rejects.toThrow()
```

## 2. Sessões, emissão e borda de segurança

Files: Auth token-issuer/refresh-token ports; auth-token.service; jose-token-issuer; refresh/login/OTP services; study-access routes; composition-root. Gateway jwt.strategy, context policy, composition-root e configuração versionada.

Interfaces: JWT `kids` identifica tipo e família da sessão; aluno inclui autorização e aparelho. O refresh conserva esse contexto. Validação de sessão consulta o estado canônico no Auth; Gateway e BFF falham fechados quando o acesso deixa de valer.

- [x] Testar refresh de aluno após revogar/arquivar, tentativa de seleção antiga e acesso a gestão/finanças.
- [x] Propagar contexto na emissão e na rotação; preservar login dos outros produtos.
- [x] Criar rotas de listar/criar/renovar/encerrar acessos, resgatar código, reconhecer navegador, entrar e validar sessão.
- [x] Aplicar limite de tentativas, ownership, autenticação adulta recente e retorno sem segredos persistidos.
- [x] Rodar `bun run typecheck` e `bun test` em Auth e Gateway.

## 3. BFF, navegação e cookies

Files: `packages/member-shell/src/server/session.ts`, gateway/client/routes; `packages/community-kids/src/server/parent-gate.ts`, proxy e shims API.

Interfaces: cookie de navegador separado dos cookies da sessão ativa; validação estrita usada também por uploads/downloads. Entrada infantil encerra o contexto adulto; menu de pais exige autenticação adulta própria.

- [x] Testar cookie persistente independente do refresh, saída, múltiplas abas e destinos internos.
- [x] Integrar APIs sem introduzir banco no app Kids; usar Auth como fonte de verdade.
- [x] Conferir proteção de rotas diretas, preservação do perfil de salvamento e recuperação de resposta perdida.

## 4. Interface e onboarding

Files: login e formulários; nova área `/pais`; `/perfis` somente crianças; componentes de aparelhos/autorizações; user-menu; guide.ts; child-guide e eventos.

- [x] Implementar as seis telas e estados descritos na especificação usando componentes existentes.
- [x] Preservar gestão de perfis, compras, atendimento e indicação na área dos pais.
- [x] Atualizar tutorial adulto com base na autorização real; manter versão/progresso do tutorial infantil.
- [x] Testar componentes e fluxos: primeiro acesso, retorno, irmãos, código inválido, aparelho novo, vencimento e renovação.
- [ ] Conferir em navegador real no computador e celular, foco/teclado, zoom e mensagens de erro. **Pendente de navegador disponível; casos de servidor e componentes passaram.**

## 5. Ajuda e mensagens

Files: `docs/como-fazer/como-fazer.json`, ajuda pública de login, referência da plataforma e templates de primeiro acesso.

- [x] Atualizar tutorial de troca de perfil e acrescentar entrada, retorno e recuperação. Os dois guias do responsável (preparar; renovar ou encerrar) entraram na revisão de conteúdo.
- [x] Revisar mensagens de compra/ativação/OTP para o novo destino adulto. Os avisos do Members (resumo semanal, Desafio não iniciado e vencimento) e o dunning do Funil ainda levavam à área da criança; corrigidos na revisão de conteúdo.
- [x] Identificar prints e trechos de vídeo afetados, preservar IDs e mídias por ambiente. Lista por passo em `docs/como-fazer/PRINTS-A-REFAZER-2026-10-06.md`, seção de 10/10/2026.
- [x] Preparar publicação coerente com o novo código; não publicar instruções incompatíveis com a versão ainda ativa. A ordem foi refeita na revisão de conteúdo: o deploy do Messaging semeia os templates sozinho e o staging publica tudo junto.
- [x] Preparar o aviso às famílias atuais (`kids-access-transition`, e-mail e WhatsApp).
- [ ] Decidir o envio do aviso de transição: destinatários e horário são decisão da dona. Não há script de envio.
- [ ] Publicar os sete tutoriais em staging e produção depois do Kids novo e refazer as 23 capturas.

## 6. Revisão e entrega

- [x] Revisar o diff completo deste trabalho e corrigir achados.
- [x] Rodar testes e typechecks de todos os pacotes alterados, Biome e checagens de migration.
- [ ] Verificar retorno independente no navegador, autorização específica por irmão, revogação imediata e bloqueio da área adulta. **Pendente de navegador disponível; casos de servidor e componentes passaram.**
- [x] Registrar evidências, conteúdo efetivamente publicado e qualquer mídia que dependa de gravação humana.

## Progresso

- Proposta aprovada; especificação preservada em arquivo versionável.
- Levantamento confirmou os caminhos antigos de troca de perfil e fallback do refresh; ambos entram no escopo de segurança.
- Alterações preexistentes em Core/learning e Pinta permanecem preservadas.

## Evidências de implementação e revisão

- Auth: 244 testes aprovados, com PostgreSQL real dedicado. Inclui 14 casos de autorização/aparelho e contrato HTTP real; resgate concorrente, prazos, revogação, renovação, esquecimento do aparelho e separação de sessões. Login de responsável por senha e por OTP antes da definição de senha exercitados pela borda HTTP.
- Gateway: 229 testes aprovados; validação canônica do JWT, público correto, bloqueio de caminhos antigos e preservação do perfil público/Mural.
- Kids: suíte completa com 1.178 testes aprovados; após ampliar a orientação de retorno, 57 testes relacionados aprovados.
- Member-shell: 1.102 testes aprovados; cookies, BFF, proxy, transições e prova de sessão das chamadas S2S incluídos.
- Members: 1.339 testes aprovados e 49 de banco pulados nessa suíte (não usados como evidência de atomicidade). Mais 22 testes HTTP aprovados depois de acrescentar a autorização das miniaturas.
- Referrals: 145 testes aprovados. Messaging: 137. Funnel: 20 testes de primeiro acesso aprovados.
- Typechecks dos nove pacotes alterados, validação de migration, Biome e validação dos 45 tutoriais de então executados. Build de produção do Kids aprovado; logs locais em `.tmp/kids-*.log`.
- Revisão corrigiu: pedidos de OTP Kids antes da senha; permissões do Mural/perfil público; proteção S2S contra troca de identidade em outra aba; API sem cookie refresh; retomada de link; erros escondidos atrás de modais; remoção do antigo portão; parte das instruções e dos templates antigos (o restante foi para a revisão de conteúdo, abaixo).
- Navegador integrado indisponível (lista vazia); inspeção visual manual, capturas e validação em staging/produção seguem pendentes. Não houve publicação, envio de mensagens ou deploy nesta implementação.

Ordem de publicação e lista de mídias afetadas: [relatório de QA](../../qa/2026-10-10-acesso-infantil.md).

## Full review solicitado após a implementação

Concluído em 10/10/2026. O [relatório detalhado](../../../.audits/architectural-analysis-2026-10-10-acesso-infantil.md) registra reprodução e correção dos achados: seleção de perfil pelo suporte, retenção e recuperação do aparelho, distinção entre serviço indisponível e sessão encerrada, retorno pelo histórico, recuperação do formulário e confirmação de acesso remoto.

Verificação final: 4.405 testes aprovados, zero falhas, 49 testes de banco de Members pulados. Auth incluiu PostgreSQL real dedicado; typechecks dos nove pacotes, Biome de 140 arquivos, migration, tutoriais e build de produção do Kids aprovados. Quantidades e limitações atualizadas no relatório de QA. A conferência visual em navegador continua pendente porque nenhum navegador integrado está disponível. Não houve publicação nem deploy.

## Revisão de conteúdo (10/10/2026)

Recorte: Como Fazer, templates, links dos e-mails, Funil, Referrals e documentos de publicação. Corrigido:

- Aviso de transição `kids-access-transition` no seed (e-mail e WhatsApp, link `/login/responsavel`), sem chamador.
- Conta nova nasce sem perfil: as mensagens mandam clicar em **Adicionar criança** (ou escolher o perfil existente) antes de **Acesso nos aparelhos**; o mesmo vale para a orientação do Desafio no Funil.
- Links para o responsável: resumo semanal, Desafio não iniciado e vencimento em 7 e 3 dias (Members) e cobrança recusada (Funil) vão a `/pais`.
- Funil e Referrals caem na chave antiga (`welcome`/`new-access`) quando o Messaging responde 404 `TEMPLATE_NOT_FOUND`; o Referrals libera o claim do welcome quando o envio é recusado (4xx) e mantém o claim em 5xx. Testes de contrato conferem as chaves contra o seed.
- Como Fazer: 47 tutoriais, com os guias do responsável, os avisos exatos da entrada, a armadilha do **Sair** e os rótulos decididos em 10/10/2026.
- Publicação: matriz de versões misturadas e ordem de produção no [relatório de QA](../../qa/2026-10-10-acesso-infantil.md).

Pendências: conferência visual em navegador, publicação dos tutoriais, capturas e a decisão sobre o envio do aviso de transição.
