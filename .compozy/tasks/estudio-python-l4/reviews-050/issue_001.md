---
status: resolved
file: packages/members/src/application/live/live-workspace.service.ts
line: 409
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Lease residual impede a análise de um leitor autorizado

## Review Comment

`runtimeContext` define `author` apenas pelo escritor, dispositivo e prazo da lease. Quando esses campos ainda coincidem, até `analyze` passa obrigatoriamente por `assertWriter`, sem o caminho de leitura. Uma revogação de escrita pode coexistir com direito legítimo de leitura e uma lease ainda não expirada. Nessa situação o mesmo documento que `get()` permite visualizar não pode ser analisado para desenhar os blocos; curiosamente a análise volta a funcionar quando a lease residual expira.

Reprodução independente `.cache/studio-python-l0/review050-readonly-lease.ts`, executada com `bun`: serviço real e fakes de repositório, Python Classic, aluno proprietário na biblioteca, grant revogado e sem assinatura de continuação. `workspace.get()` retorna `readOnly=true`; `analyze` recusa com `LiveAccessError` enquanto resta lease. Avançar31s, sem mudar ator/documento/contexto, faz `analyze` aceitar com `capabilities=[]`. O workspace permanece intacto.

A mesma causa aparece na assistência: `.cache/studio-python-l0/review050-teacher-ended.ts`, executada com `bun`, inicia sala, admite criança, aceita ajuda, associa dispositivo da professora e encerra o encontro antes do prazo da lease. `get()` explícito permite leitura pela professora designada, mas `analyze` recusa com **LiveConflictError** de presença/supervisão. Portanto um fallback limitado a `LiveAccessError`/`LiveNotFoundError` não cobre todos os leitores legítimos.

Separar o direito de análise/leitura da classificação de autoria. Para `analyze`, comprovar leitura pelo caminho existente; só conceder capacidades de autora após a validação de escrita realmente passar. A recusa de execução/REPL, o fence, epoch, revisão, proprietário/conta, vínculo e curadoria devem permanecer obrigatórios. Não transformar recusa arbitrária em permissão: o fallback precisa comprovar independentemente o direito de leitura, inclusive no caso da professora após encerrar a sala.

## Triage

- Decision: `FIXED`
- Notes: `analyze` comprova leitura independentemente da lease residual, pelo acesso existente ou por `readOnlyAllowed`. A classificação autora somente permanece após `assertWriter` passar; recusas de acesso, inexistência ou conflito de supervisão retiram autoria. As demais operações continuam exigindo `assertWriter` sem fallback. Nenhuma fonte de produção foi alterada pelo revisor.

## Revalidation

- `bun .cache/studio-python-l0/review050-revalidate.ts` — exit0,35 verificações independentes. Classic/Pro: dono lê na biblioteca logo após revogação, antes e após expirar lease, sem capacidades; executar/REPL continuam recusados. Conta/ator alheio, professora em contexto biblioteca, aula explícita revogada, epoch e revisão incorretos são recusados. Professora com ajuda aceita conserva análise após encerramento da sala sem execução/REPL; vínculo adulterado, biblioteca omitida e retirada da professora da turma são recusados. Registros persistidos integrais permanecem iguais.
- `bun test tests/unit/studio-live-runtime.test.ts tests/integration/studio-live-runtime.test.ts`, em Members —12pass/0fail/87expect,exit0. Inclui negativas permanentes das duas reproduções originais.
- `bun test tests/live-studio-runtime-hook.test.tsx`, em Shell —10pass/0fail/46expect,exit0. Observador não despacha execute/REPL; expiração, autoria pendente e respostas tardias continuam cercadas.
- Revalidação adicional de048 com observação: `bun test --tsconfig-override .cache/studio-python-l0/review048.tsconfig.json ./.cache/studio-python-l0/review051-poll-observe.test.tsx` —1pass/0fail/15expect,exit0. Poll revoga antes de esperar fila/aplicar documento; resposta atrasada não restaura autora; após aplicação ordenada nasce ambiente de análise com capacidades vazias; poll idêntico preserva o mesmo parser/sinal, projeto integral preservado. Harness usa componente/hook/factory/transporte reais e substitui editor/journal/HTTP para controlar ordem.
- Biomecheck nos seis arquivos do escopo: exit0,sem alterações. O harness com tsconfig externo emite aviso interno `directory mismatch` do Bun. Rodadas preparatórias do harness falharam por expectativas/fixture do teste (esperar parser antes de liberar fila, gerar dispositivo novo em cada poll e acessar `files` inexistente no Pro); corrigidas somente na cache. Sem navegador,TSC,SQL ou qualificação de autenticação/desempenho nesta revisão.
