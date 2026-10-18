---
status: resolved
file: packages/studio-runtime/src/python-inspection-job.ts
line: 44
severity: high
author: claude-code
provider_ref:
---

# Issue 001: ID do sandbox excede o limite obrigatório do SDK

## Review Comment

`createOwnedSandbox` concatena `python-inspect-` ao jobId SHA256 hexadecimal de 64 caracteres, produzindo um ID de 79 caracteres. O SDK instalado `@cloudflare/sandbox@0.10.3` executa `sanitizeSandboxId` imediatamente dentro de `getSandbox` e rejeita qualquer ID maior que 63. Assim, toda primeira criação falha antes de alcançar o namespace de contêineres. Como a flag sandboxCreated é gravada antes do factory e destroyOwned reconstrói o mesmo endereço, a recuperação também repete o erro, mantendo cleanup pendente e alarmes de retry.

Reprodução independente: `bun test ./.cache/review080-sdk-name.test.ts`, cwd packages/studio-runtime, exit1/0pass1fail. Importa a classe concreta e o getSandbox real do SDK instalado; apenas as portas cloudflare:workers/containers são substituídas, sem substituir validação do SDK. Resultado: SandboxSecurityError, `Sandbox ID must be 1-63 characters long.` Nenhum getContainer foi chamado. O erro ocorre para qualquer jobId canônico, não apenas para um input particular.

Derivar um endereço determinístico compatível com o limite de 63 caracteres, preservando resistência a colisões e a mesma identidade em criação e recuperação/cleanup. Acrescentar regressão que atravesse a validação real do SDK. O controlador ainda não está wired/configurado: este achado bloqueia sua futura integração, sem alegar falha remota Cloudflare já observada.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou a causa e substituiu o nome por studioPythonInspectionSandboxId: RFC4648 base32 lowercase do SHA256 inteiro (52 caracteres) mais prefixo py-inspect- (11), total63. Criação e recuperação usam o mesmo helper, sem truncamento dos bits. Revalidação independente da mesma prova com classe e SDK reais: exit0/1pass/2assertions; getContainer foi alcançado com ID aceito. Core python-inspection-job.test.ts: exit0/3pass/28assertions, incluindo vetores independentes, último bit, input inválido, escopo/detachment e constraints. Biome3arquivos:exit0. Ainda não é prova SDK/RPC/container deste novo controlador nem integração de rotas.
