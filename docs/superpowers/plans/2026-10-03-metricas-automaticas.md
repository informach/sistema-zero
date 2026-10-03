# Coleta automática do funil

**Objetivo:** iniciar as métricas próprias sem pedir autorização na entrada, preservando a associação entre navegação, lead e compra solicitada pelo usuário.

**Decisão aprovada:** pedido explícito na conversa de 03/10/2026. Esta alteração técnica não declara consentimento do visitante nem estabelece uma conclusão jurídica. A avaliação jurídica foi reservada pelo usuário para depois.

**Arquitetura:** uma regra compartilhada de preferência entre navegador e servidor: ausência de preferência inicia coleta; `sz_metrics=rejected` impede coleta. O cookie existente continua compatível. Não gravar `accepted` automaticamente. O controle Privacidade abre somente por iniciativa do visitante e permite desativar, reativar e fechar. Capturas operacionais usam preferência desativada.

**Stack:** Astro, TypeScript, PostgreSQL/Drizzle, Bun tests, Playwright com Node.

**Restrições:** preservar alterações da sessão do Desafio; não mudar perguntas, preços ou pagamentos; não copiar campos digitados para eventos; manter autenticação, assinatura, limites, retenção e revogação. Sem deploy ou alteração de banco remoto.

## Execução nesta sessão

- [ ] Reproduzir em `tests/integration/analytics.test.ts` a criação/ingestão sem cookie de preferência e o vínculo do contato. Demonstrar que a preferência `rejected` ainda bloqueia criação, ingestão e vínculo.
- [ ] Criar `src/analytics/preference.ts` com a regra `choice !== 'rejected'`, usá-la em `identity.ts`, `handlers.ts` e `consent.ts`. Abrir o painel de preferência apenas no botão Privacidade; nunca criar um aceite implícito.
- [ ] Atualizar `components/Analytics.astro`, textos de metodologia do painel e seções de métricas das políticas Kids/Pro para descrever a coleta automática e a associação com dados enviados. Registrar a mudança na documentação operacional.
- [ ] Evitar coleta operacional no worker; adaptar os scripts de smoke, painel e performance. Testar uma visita automática seguida do envio real do pré-checkout e verificar o vínculo no PostgreSQL.
- [ ] Executar suíte com PostgreSQL local, typecheck, lint e build isolada; smoke/integrado/performance no navegador. Preservar o dev server da outra sessão.

## Critérios de aceitação

- Na primeira visita, aviso oculto, identificação assinada criada, eventos enviados e nenhum cookie `accepted` fabricado.
- Pré-checkout mantém nome/e-mail/telefone no lead; os eventos anteriores se ligam ao lead por ID sem copiar esses campos para telemetria.
- Desativação impede novos eventos nas abas e remove a identificação/dados analíticos; recusa anterior segue respeitada após reload. Reativação é explícita.
- Um único comportamento em todos os funis, incluindo o quiz novo do Desafio.
