# Identidade infantil — Implementation Plan

> **For agentic workers:** Use `executing-plans` nesta sessão. A direção nome completo/apelido e a execução das pendências já foram autorizadas. Checkpoints são atualizações de progresso. Não criar commits com alterações paralelas.

**Goal:** Separar nome completo privado e apelido público, impedir nomes privados nos metadados sociais e emitir novos certificados com identidade confirmada.

**Architecture:** Auth é a autoridade da identidade. Views de família distinguem `fullName` de `name` de exibição; claims e lotes públicos carregam somente apelido. Members resolve o nome privado do certificado por S2S autenticado; Hub projeta nomes atuais por lote sem confiar em snapshots históricos.

**Tech Stack:** Bun/TypeScript, Elysia, Drizzle/PostgreSQL, JWT/Jose, Next/React, UI existente.

**Spec:** `docs/plans/2026-11-19-identidade-infantil-nome-apelido-design.md`.

## Global Constraints

- Preservar todas as alterações locais de comércio e Studio/Molda.
- Não inventar nome completo/apelido nem migrar dado antigo para apelido.
- Não mudar idade recomendada para bloqueio, nem ligar consentimento de voz das crianças.
- Não reescrever certificados emitidos; não reduzir acesso comprado ou presenteado.
- Não publicar outras features como efeito colateral de configuração de voz/oferta.
- Gerar schema migrations pelo script do pacote, nunca editar SQL/snapshot gerado.
- Preservar estilo visual e controles da plataforma.

## Task 1 — Configuração de presente e voz

**Files:** `packages/catalog/scripts/catalog-seed-definitions.ts`; evidências em `.cache/aula7-pendencias-20261119/`; guia/decisões em `docs/aulas-interativas/pais/transformando-o-vilao-em-aliado/fontes.md`.

- [x] Consultar oferta por slug em cada ambiente, aplicar `content.maxProfiles = 1` por PATCH autenticado e reler; conferir preço/prazo/itens iguais.
- [x] Conferir flag de produção `VOICE_INPUT_ENABLED=true` e existência da chave, sem exibir segredos.
- [x] Testar transcrição com áudio sintético sem dados de criança e credencial de produção. Confirmar também guardas de sessão/consentimento nos testes da rota. Em 19/11: principal e reserva passaram dentro do Kids em produção e staging após troca da chave; 44 testes de voz passaram, incluindo as guardas da rota.
- [x] Acrescentar `maxProfiles: 1` à definição de seed para futuras criações.

## Task 2 — Auth: persistência, propriedade e confirmação

**Files:** `packages/auth/src/domain/profile/profile.aggregate.ts`, `profile-details.ts`; `application/profiles/{create,update}-profile.service.ts`; `application/mappers/profile-view.ts`; `infrastructure/persistence/drizzle/{schema.ts,profile.repository.ts,migrations/}`; `interfaces/http/{dtos.ts,routes/profiles.routes.ts,routes/internal.routes.ts}`.

**Interfaces:** `ProfileAggregate.displayName`, `.publicNickname`, `.identityConfirmedAt`; view `{name: displayName, fullName, publicNickname, identityConfirmed}`. Edição dos dois campos pelo dono confirma a identidade; edição parcial não inventa confirmação.

- [ ] Acrescentar regressões: nome privado diferente do apelido; legado genérico e sem confirmação; criança não altera identidade; conta alheia recusada.
- [ ] Acrescentar campos nulos ao snapshot/schema; manter nome completo no campo existente. Persistir sob os locks atuais de perfil/conta.
- [ ] Atualizar create/update/view e DTOs. Novas telas exigem os dois campos; requisições antigas sem apelido permanecem não confirmadas durante rollout.
- [ ] Acrescentar S2S de identidade para certificado com `{accountId,profileId}` e retorno `{fullName,confirmed}` somente para perfil ativo próprio. Lotes sociais retornam apelido explícito e identificação genérica no legado.
- [ ] Gerar migration e confirmar nova geração sem mudanças. Testar Auth completo e banco isolado.

## Task 3 — Claims e interfaces da família

**Files:** Auth `domain/ports/token-issuer.port.ts`, `infrastructure/security/jose-token-issuer.ts`, `application/{tokens,refresh,study-access,profiles}/`; Gateway `application/auth/claims-user-resolver.ts`; member-shell `lib/{act.ts,types.ts}`, `server/clients.ts`, `routes/index.ts`; Kids `components/kids/profile-management.tsx`, `app/pais/_components/profile-editor.tsx`, Família e orientações de perfil legado.

**Interfaces:** `pfl.nickname?: string` é a identidade de exibição nova; `pfl.name` é mantido como alias de exibição para leitores compatíveis. Leitor novo não usa claim antiga `name` como reserva.

- [ ] Testar token com nome privado antigo e sem nickname: a exibição/headers devem ser genéricos. Testar apelido com espaços preservado integralmente.
- [ ] Emitir apelido nas sessões e renovação; nunca nome privado em JWT infantil. Adaptar parsers/session/header.
- [ ] Cadastro/edição de responsável mostram “Nome completo da criança” e “Apelido público”, com finalidade clara. A grade e as demais telas usam alias; edição exibe o nome privado no campo próprio.
- [ ] Orientar responsável de perfil antigo a confirmar os dados sem travar cursos. Preservar nascimento, avatar e consentimentos existentes.
- [ ] Testar criação/edição, legado, sessão antiga e aparência nos componentes reais.

## Task 4 — Certificados

**Files:** Auth rota interna; Members `domain/ports/auth-gateway.port.ts`, `infrastructure/gateways/auth-http.gateway.ts`, `interfaces/http/routes/members.routes.ts`, `composition-root.ts`; contratos/UX de certificado em member-shell.

**Interfaces:** `AuthGateway.getCertificateIdentity(accountId, profileId)` lê a identidade privada confirmada. A emissão Kids em sessão de perfil usa esse retorno; dados de corpo/JWT não determinam o nome.

- [ ] Regressão HTTP: apelido “Fada Azul” e nome “Maria Silva Santos” emitem “Maria Silva Santos”; corpo forjado não muda destinatário/nome.
- [ ] Sem confirmação retorna `409 PROFILE_IDENTITY_REQUIRED`; Auth indisponível retorna erro retentável, sem emitir certificado com apelido.
- [ ] Preservar replay de certificado já emitido e fluxos adulto/pais. UI explica como o responsável completa o cadastro.

## Task 5 — Identidade social atual

**Files:** Members lote de identidades públicas; Hub `domain/ports/members-gateway.port.ts`, adapter HTTP, novo projetor de autores, `application/{threads,showcase,mappers}/`; member-shell `lib/hub-redact.ts` e rotas/leitores públicos.

**Interfaces:** lote público `{id, publicNickname, publicProfileEnabled}` nunca contém nome completo. Projeção usa apelido atual; ausência/falha é genérica. O link público respeita a autorização atual.

- [ ] Regressões com snapshots contendo nome privado: feed, comentário e jogador público devolvem apelido atual ou genérico.
- [ ] Resolver por lote para evitar N+1, preservando identidades de conta adulta/equipe. Não confiar em nome histórico como reserva.
- [ ] Cobrir publicações novas e antigas, alteração de apelido, perfil privado e erro de upstream; atualizar testes de redação/enriquecimento.

## Task 6 — Aula 7 e verificação final

**Files:** fontes/roteiro/TXT/manifesto/README da aula; operação de identidade e evidências.

- [ ] Ajustar passo a passo para o bloco autenticado e cadastro com dois campos; distinguir apelido compartilhado de nome completo privado.
- [ ] Gerar derivados com os scripts do curso e executar validadores. Atualizar apostila se o conteúdo correspondente mudar, renderizando-a antes de concluir.
- [ ] Testes completos de Auth/Hub/Gateway e contratos relevantes de Members/member-shell/Kids; Biome apenas nos arquivos da tarefa; typechecks/builds apropriados.
- [ ] Verificar migrations em PostgreSQL isolado. Revisar diff, privacidade das respostas e ausência de alterações paralelas incluídas por engano.
- [ ] Registrar o que está publicado/configurado e o que permanece implementação local; credencial presente/flag ligada não substituem teste de transcrição.
