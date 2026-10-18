---
status: resolved
file: packages/members/src/application/studio/free-studio-access.service.ts
line: 38
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Gate de criação bloqueia retomada de projeto Pro elegível

## Review Comment

`AuthorizeFreeRuntimeService.execute` reusa o mesmo `FreeStudioAccessService.execute` da descoberta/criação. Esse serviço exige pelo menos um bloco curricular ainda conhecido no catálogo JavaScript antes de devolver qualquer direito, inclusive para analisar/executar um projeto Pro existente. O gate atual de retomada em `/estudio/pro/[id]`, porém, usa `resolveStudioProAccess`: perfil selecionado, produto da conta e recompensa Pro do nível; ele não exige a paleta da lista de criação.

Reprodução independente `.cache/studio-python-l0/review052-pro-resume.ts`,exit0: conta com Estúdio Completo ativo, perfil God e paleta congelada contendo somente ID antigo retirado do catálogo. `resolveStudioProAccess` permite abrir o Pro existente, mas o novo serviço recusa um candidato Python Pro aprovado com `AccessDeniedError: Conclua um curso para liberar a criação no Estúdio Completo.` O template/release/lock do candidato são válidos. O mesmo excesso de gate impede a análise contextual desse documento. A retomada passa a depender de uma condição de criação que o fluxo Pro atual não exige.

Preservar separadamente os gates existentes: descoberta/criação e projetos Classic exigem paleta conhecida; retomada Pro exige produto/perfil e recompensa Pro atual, sem paleta. O propósito deve ser decidido internamente pelo servidor; não aceitar bypass enviado no corpo HTTP. Template, release, extensões, requirements/lock, impersonação e conta/perfil continuam validados. Acrescentar negativas de produto e nível Pro revogados e garantir que a descoberta/criação permaneça bloqueada no mesmo cenário.

## Triage

- Decision: `FIXED`
- Notes: Reprodução comparou o resolvedor atual real com o novo serviço/policy reais, usando portas de dados controladas. Root confirmou o requisito de preservar o gate atual de retomada. O propósito `creation`/`existing-pro` agora é interno ao serviço; somente Pro com recompensa Pro efetiva retorna antes de consultar a paleta. Descoberta e Classic conservam o gate de criação. Nenhuma fonte de produção alterada pelo revisor.

## Revalidation

- `bun .cache/studio-python-l0/review052-pro-revalidate.ts` —exit0. O mesmo perfil/produto/paleta desconhecida da reprodução agora analisa e executa o Pro aprovado, sem ler paleta. Descoberta e Classic continuam recusados; perda de produto ou recompensa Pro, suporte, template/extensão não aprovados e requirements incompatível continuam recusados. Requirements em edição permanece analisável; release revogada recusa análise e execução. O schema HTTP estrito rejeita `purpose` injetado e o projeto integral permanece igual.
- `bun test tests/unit/studio-free-runtime.test.ts tests/integration/studio-free-runtime.test.ts`, em Members —11pass/0fail/83expect,exit0. Inclui regressão permanente de retomada e HTTP real com contas/perfis distintos, revogação de produto e suporte.
- `bun test tests/studio-free-runtime-route.test.ts`, em Shell —2pass/0fail/15expect,exit0. BFF mantém recusas/no-store e limites de transporte.
- `.cache/studio-python-l0/review052-free.ts` —exit0:24 combinações de paridade da criação com `studioGate` atual (oito níveis e paleta vazia/desconhecida/conhecida), portas conta/perfil Kids, concessão congelada, ausência de produto apesar de master, equipe/suporte, HTTP200/403/400 e fence403. `.cache/studio-python-l0/review052-bff.test.ts` —1pass/0fail/20expect; gateway independente `review052-gateway.ts` —exit0, rotas literais/activeJWT/limite2MB. Avisos de tokens marketing/helpdesk ausentes pertencem à configuração local do gateway.
- Nenhum outro achado concreto confirmado no backend deste recorte. Sem UI, navegador,TSC,SQL ou qualificação de autenticação/desempenho nesta revisão. A UI de criação ainda não faz parte deste052.
