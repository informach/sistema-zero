---
status: resolved
file: packages/members/src/application/submit-studio-project/submit-studio-project.service.ts
line: 179
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Fase inicial da submissão ignora retirada e prazo

## Review Comment

SubmitStudioProjectService recebe options.signal, mas antes de entrar no helper de inspeção Python aguarda diretamente findLessonWithContent, requireById, assertLessonUnlocked, sections.assertBlock e bindings.find. Não há check inicial nem lifetime da operação abrangendo essas esperas. O deadline45s do inspector começa somente depois delas, e o signal5s de persistência começa depois do grading. Assim uma leitura de contexto que não coopera com AbortSignal pode manter a promise de submissão pendente após a retirada do dono, fora do orçamento anunciado gateway55/BFF60; um pedido já retirado também inicia a primeira leitura.

Reprodução independente `bun test ./.cache/review092-initial-abort.test.ts`, cwd packages/members, Bun isolado, serviço real obtido via buildApp, somente porta courses.findLessonWithContent controlada. Primeiro caso segura a leitura inicial; depois de owner.abort e30ms execute permanece pendente, só termina quando finally libera a leitura. Segundo caso entra com signal já abortado e observa reads1, esperado0. Exit1/0pass2fail/3asserts. Não há SQL, SDK, browser ou transporte gateway nesta prova; nenhum processo/porta fica ativo. O payload traz discriminante Python, embora a falha anteceda qualquer validação específica ou dispatch do compilador.

Criar lifetime da operação desde a entrada, combinando retirada do request com teto coerente do orçamento. Usar awaitWithSignal nas leituras iniciais e checks antes de dispatch/efeitos, além das fences já existentes durante inspeção e antes de mirror/upsert. Consultas puras podem terminar em segundo plano sem continuar a operação retirada; não prometer cancelamento físico do DB. Preservar comportamento JavaScript/Pinta e manter deadlines de inspeção/cleanup dentro do orçamento total.

## Triage

- Decision: `VALID`
- Notes: VALID/resolved após revalidação independente. Lifetime50s desde entrada combina requestsignal; owned awaitWithSignal cerca leituras iniciais/fresh e mirror/upsert com check pré-dispatch; inspector recebe mesmo signal e persistence5s o combina. Originais próprios2casos passam sem enfraquecer gates; permanentes copiados do revisor também passam. Próprios+permanentes+HTTP/gallery19pass/128asserts, extensão ownports mirror/upsert2pass/16asserts, JSactivity21/63 e JSHTTP42/151, todosexit0. Porta mirror/upsert que ignora cancelamento pode concluir fisicamente depois, mas não inicia fase subsequente/award; nenhum claim SQLcancelreal. Biome13 exit0 com1warning opcionalchain no teste (não issue). ProxyEngine e galleryBFFsignal permanecem pendentes conhecidos; não qualificação cancelamentoE2E. Detalhes em _verification.
