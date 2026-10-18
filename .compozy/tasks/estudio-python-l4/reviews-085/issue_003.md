---
status: resolved
file: packages/studio-runtime/src/python-previews.ts
line: 478
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Registro inválido bloqueia progresso da coleta de previews

## Review Comment

collectPythonPreviewGarbage chama readPreviewRecord sem separar corrupção determinística de falha operacional. Um record com checksum válido, mas JSON/schema inválido, rejeita a página inteira antes dos previews expirados seguintes. O cursor permanece na mesma página e cron repete indefinidamente o mesmo registro; dados válidos depois dele não são coletados. Retentar a página é correto para get/body/delete operacional, mas não recupera bytes comprovadamente inválidos.

Reprodução independente: `bun test ./.cache/review085-previews.test.ts -t 'deterministically invalid record'`, cwd Runtime. Armazena record sintético com SHA real de {invalid:true} primeiro na página e preview real válido expirado em seguida. GC rejeita com ZodError; esperado remover somente preview expirado posterior, manter registro inválido e avançar cursor. Suite inicial: exit1/0pass3fail. Port tests, não qualificação R2 real. Trata-se do novo coletor de previews, não reabertura da issue072 sobre outro coletor de inputs.

Classificar falhas determinísticas de integridade/JSON/schema/identidade para skip contabilizado, mantendo registros inválidos fora da exclusão não autorizada. Erros de rede/leitura/storage e delete devem continuar rejeitando sem checkpoint para retry.

## Triage

- Decision: `VALID`
- Notes: Correção revalidada: readPreviewRecord distingue PythonPreviewRecordError/PythonFileVerificationError determinísticos de falha upstream; GC soma failed/continua sem excluir registro inválido, e checkpoint só após deletes. Probe original agora remove preview expirado posterior e avança cursor. Negativas próprias adicionais get/body/delete operacional preservam record e checkpoint/rejeitam como upstream. Suite própria9/24, permanente18/138, Core4/37 e Biome7 exit0. Sem qualificação R2 real ou alteração de produção pelo revisor.
