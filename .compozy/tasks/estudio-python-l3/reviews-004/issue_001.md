---
status: resolved
file: packages/studio-runtime/src/python-distributions.ts
line: 107
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Aprovações mudam durante a inicialização assíncrona

## Review Comment

createPythonDistributionServer percorre options.approvedDeployments com await dentro do laço. verifyStudioPythonDeployment captura cada descritor individualmente antes de verificar seus hashes, mas os próximos descritores e a própria lista continuam vivos até a próxima iteração. O callback options.status também só é capturado depois dos awaits. Isso permite que uma mudança da configuração de origem altere silenciosamente a lista aprovada da instância que já está sendo criada.

Reprodução independente: preparar duas releases válidas A e B e seus objetos de armazenamento; iniciar createPythonDistributionServer com approvals = [A]; imediatamente executar approvals.push(B), antes de aguardar a criação. A rota de frame.html da release B respondeu HTTP 200. B não fazia parte da configuração no início da chamada. O mesmo intervalo permite alterar um descritor ainda não visitado. O teste chamado "server configuration captures the approved descriptors" não exerce essa mutação entre awaits.

A configuração pertence ao host, portanto esta reprodução não demonstra que conteúdo de aluno possa aprovar uma release. O defeito é a captura parcial da configuração estática de segurança, enquanto o status operacional já tem um mecanismo separado e explícito para atualização. Capturar a lista inteira, os descritores completos e a referência do callback antes do primeiro await. Uma opção é iniciar a validação síncrona/cópia de todos os descritores antes de aguardar as verificações de digest; copiar apenas o array não protege os objetos ainda não lidos. Adicionar um teste que mude a lista e um descritor posterior imediatamente após iniciar a criação e confirme que a instância usa somente a configuração capturada.

## Triage

- Decision: `VALID`
- Notes: Reprodução via Bun/stdin, usando o serviço real e armazenamento local em memória, retornou {case: "approval appended after call", status: 200}. Nenhuma fonte foi alterada pela revisão.

- Resolution: A lista é copiada e todos os verificadores fazem parse/cópia síncronos antes do await de Promise.all; a referência status também é capturada previamente. A reprodução original agora retorna 404 para a release acrescentada depois da chamada. O teste de regressão confirmou também a preservação do descritor posterior e do callback original.
- Verification: bun test tests/python-distributions.test.ts: 8 testes, 60 verificações, nenhuma falha. Reprodução independente via Bun/stdin confirmou a eliminação do sintoma original; Biome dos dois arquivos e git diff --check passaram. Nenhuma fonte foi modificada pela revisão.
