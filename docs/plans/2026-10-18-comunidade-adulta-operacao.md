# Comunidade adulta: operação técnica

Escopo: ferramentas, cursos gravados, progressão, identidade, comunidade e infraestrutura. Conteúdo, preços e campanhas são decisões posteriores. Não foram criados produtos, ofertas ou dados em produção.

## Identidade e compatibilidade

O aluno adulto é a própria conta autenticada. Não criar criança fictícia nem exigir seleção familiar. O registro `adult_profiles` guarda somente nome público e preferências, com perfil público e voz desligados por padrão. IDs HTTP continuam sendo os IDs reais. Bibliotecas locais usam `adult:<accountId>` e os objetos de nuvem usam `creations/adult/<accountId>`. O Kids conserva seus perfis, chaves, referências e regras.

## Direitos que precisam ser configurados

| Recurso | Contrato |
| --- | --- |
| Curso gravado específico | Oferta entrega `courseRef` igual ao slug adulto publicado |
| Todos os gravados adultos | `all_courses`; não concede vaga em oficina |
| Ferramenta incorporada à aula | Direito da aula liberada e do bloco autoral |
| Estúdio livre | `adult-estudio-completo`, capacidade `studio` e paleta conquistada |
| Pinta / Molda livres | `adult-pinta` / `adult-molda` e capacidade correspondente |
| Pro / Ponte | Capacidade correspondente da jornada; Pro conserva seu runtime próprio |
| Pensa | `adult-pensa`, capacidades `pensa` e `ai`, formação avançada |
| Tutor e construtor | Formação avançada, capacidade `ai`, licença da ferramenta e limites financeiros |
| Voz | Direito avançado, serviço configurado e consentimento do próprio adulto |
| Comunidade / Mostra | Entitlement do espaço/canal adulto; não reutilizar a referência Kids |
| Oficina ao vivo | Vaga e grants da turma/sessão; não inferir por compra de gravado |

As referências de espaços são `adult-clube-dos-criadores` e `adult-mural-dos-criadores`. A Mostra adulta usa o slug `mural-dos-criadores-adulto`. Seus canais e permissões precisam existir no Hub. A equipe deve conferir leitura, interação, aprovação e publicação; visitante do mural Kids não recebe acesso à Mostra adulta.

## Configuração da jornada

No Admin, abrir **Professor → Jornada adulta**. Selecionar cursos gravados adultos publicados, ordenar etapas, escolher marcos de conclusão/publicação e capacidades. A política inicial vazia não libera ferramentas automaticamente. IA/Pensa só podem depender de etapa de curso avançado concluída. XP, compra e capacidade são contratos independentes: comprar uma ferramenta não concede formação avançada. Revisões usam versão otimista e preservam capacidades já conquistadas.

Na autoria do curso, configurar os blocos que acrescentam à paleta livre. A conclusão de gravado adulto concede esses blocos; oficinas não concedem a paleta de gravados. O editor da aula continua autorizando as ferramentas incorporadas pela própria aula, mesmo sem licença livre.

## Venda de gravados

Reutilizar catálogo, checkout, pagamentos, entitlements e matrícula existentes. Antes da liberação comercial, testar uma oferta de homologação com slug adulto: pagamento confirmado, entrega idempotente, matrícula no curso correto, repetição do evento, cancelamento/estorno e revogação. Conferir na sessão real do comprador, incluindo uma conta que também tenha filhos. A compra adulta não deve ampliar o direito Kids; a compra Kids não deve liberar ferramentas adultas.

O painel de curso informa o contrato de entrega, paleta e distinção entre ferramenta da aula e uso livre. Preço, publicação de oferta e cobrança real não fazem parte desta implementação.

## Oficinas e venda de vagas

A infraestrutura existente administra vagas manualmente. A auditoria identificou que vender vagas automaticamente precisa de reserva com prazo, controle de lotação sob concorrência, conciliação entre pedido e vaga, confirmação idempotente, expiração e liberação de reserva, estorno e revogação dos grants. Não anunciar checkout automático de vagas com o fluxo manual atual.

Publicação de oficina valida aluno, conta, curso, público, revisão e assinatura. Uma prova Kids não autoriza publicação adulta. Uma vaga adulta não concede perfis infantis ou acesso ao mural Kids. A Mostra adulta continua dependendo do direito ao seu espaço, que pode compor a oferta da oficina.

## Serviços e implantação

1. Aplicar migrations members **0130–0134** antes das versões novas de members, Hub e gateway. Elas preservam o público Kids nas linhas legadas. Medir locks e custo de índices em cópia representativa antes da produção.
2. Implantar serviços e gateway; conferir contratos adultos com identidade real antes de disponibilizar o app adulto. O BFF verifica suporte adulto antes de gravações de nuvem e de novas execuções pagas de IA.
3. Implantar as duas comunidades e executar smoke Kids e adulto. Os wrappers Kids permanecem compatíveis com o núcleo compartilhado.
4. Configurar jornada, referências de oferta, espaços/canais e permissões. Confirmar a paleta e o acesso de uma conta adulta de homologação.
5. Liberar a oferta gravada depois de verificar compra/entrega/revogação na infraestrutura de homologação.

Configurações relevantes: R2 e buckets existentes; `ADULT_BFF_BASE_URL` no Hub para limpar jogos adultos; runtime Pro, segredo do executor e `ADULT_STUDIO_BUILDER_EXECUTOR_URL` apontando ao callback adulto `/api/internal/studio-builder/execute`; o executor Kids permanece em `STUDIO_BUILDER_EXECUTOR_URL`; serviços/chaves de IA somente quando a formação avançada estiver configurada. Voz continua desligada sem preferência individual e configuração do serviço. Não habilitar IA para compensar jornada vazia.

Após a conciliação com os objetivos novos do Estúdio, `STUDIO_PRO_RUNTIME_URL` e `STUDIO_PRO_RUNTIME_TOKEN` também precisam estar no **Members** quando as aulas usarem objetivos que executam o jogo (`/v1/check`), mesmo em curso iniciante de blocos. Essa verificação é independente de IA e da liberação da formação avançada. Sem executor, a verificação responde indisponibilidade e não grava aprovação. O orçamento de timeout preservado é runtime 140 s, adaptador Members 150 s, gateway 160 s e BFF do aluno 165 s.

A lista `.railway/variables.ts` preserva os nomes das novas configurações adultas do Hub, Members e community. Preservar nomes não cria valores, não habilita IA e não substitui a configuração de homologação. O callback de IA adulto continua separado do executor pedagógico de objetivos.

Limites e orçamento de IA continuam por conta, mesmo usando ambas as plataformas. Execuções, histórico e exclusão são segregados por público. Conservar chaves do cofre durante rotação e permitir liquidação de trabalhos iniciados antes de revogação de acesso.

Em rollback, retirar a interface adulta primeiro e manter schema/objetos adultos e backend compatível. Não reverter members para versão que desconhece público depois de gravar dados adultos. Drenar versões antigas antes da primeira gravação adulta. Não remover colunas ou reverter índices enquanto houver dados adultos. Nunca reinterpretar dados adultos como Kids.

## QA local reproduzível

Usar PostgreSQL descartável, local, porta **55433**. A fixture abaixo aceita exclusivamente `sz_integrated_qa`; aplica históricos reais de members/auth/Hub, cria uma conta sintética com uma criança existente e concede direitos adultos de QA sem IA. Não usa provedores de e-mail, pagamentos ou IA.

Na raiz: `bun --no-env-file packages/members/tests/e2e/adult-parity-stack.mjs`.

Serviços: gateway 43100, auth 43102, members 43104 e Hub 43110. Servir o build standalone adulto em **43107**, com ambiente exclusivamente local: `GATEWAY_URL=http://127.0.0.1:43100`, `APP_PUBLIC_URL=http://127.0.0.1:43107`, emissor `local-qa-auth`, audience `local-qa`, JWKS `http://127.0.0.1:43102/auth/.well-known/jwks.json`, `MEMBER_SHELL_HMAC_SECRET=local-qa-internal-secret-2026-only`. Retirar arquivos `.env*` apenas da cópia standalone de QA; nunca editar os ambientes-fonte.

Para servir cada cópia isolada, executar na raiz `node packages/member-shell/scripts/serve-parity-e2e.mjs community` e, para o Kids, trocar o argumento por `community-kids`. O launcher sanitiza somente a cópia do build e configura portas e credenciais locais. Em `packages/community`, rodar `bun run e2e`. O config recusa host remoto. Credenciais padrão são sintéticas e exclusivas da fixture: `qa-adult@example.invalid` / `Local-QA-adult-2026!`. Podem ser substituídas por `COMMUNITY_PARITY_EMAIL` e `COMMUNITY_PARITY_PASSWORD`; base por `COMMUNITY_PARITY_BASE_URL`, sempre loopback. O teste usa login real, persistência real e galerias reais, sem interceptar rotas do navegador.

Os testes PostgreSQL de ledger/builder e benefícios usam exclusivamente `STUDIO_REVIEW_DATABASE_URL` local com banco `studio_pro_review`; o helper aplica a história de migrations. Não apontar fixtures para ambientes compartilhados.

Sem R2 local configurado, a QA comprova persistência/isolamento do backend e biblioteca local, mas não substitui o teste de upload/download em homologação. Falha do conector de navegador integrado não equivale a teste aprovado; usar o harness Playwright e registrar o resultado efetivo.
