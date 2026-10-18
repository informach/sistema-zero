---
status: resolved
file: packages/studio-runtime/src/python-input-gc.ts
line: 96
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: GC avança cursor após exclusão não confirmada

## Review Comment

O catch por entrada também captura a rejeição de bucket.delete, incrementa failed e continua até salvar page.cursor. Assim uma falha transitória de exclusão confirma progresso além dos arquivos que não foram removidos. O cursor dessa página deixa de permitir a repetição imediata prometida pelo contrato de checkpoint após delete; o input só será revisitado quando o sweep inteiro voltar ao início ou pelo lifecycle de um dia.

Prova independente `.cache/review072-input-gc.test.ts` usa o GC/store reais com porta R2 controlada. Uma página truncada contém admission válido e expirado, mas delete rejeita com R2 delete unavailable. collectPythonInputGarbage resolve e cursor.save recebe next mesmo com o blob presente. Esperado zero saves, recebido um. O mesmo recorte confirma que abort durante delete já impede checkpoint corretamente. Baseline permanente 9 pass/41 verificações permanece verde; recorte independente completo tem 5 pass, 2 fail, 21 verificações, exit1 (o segundo defeito está em issue002).

Separar falha de metadata inválida da falha transitória de I/O/exclusão. Não confirmar um cursor que pula exclusões ainda não confirmadas, ou persistir explicitamente a unidade de retry antes de avançar. Preservar limite da página/prazo, idempotência das exclusões e progresso diante de metadata comprovadamente inválida.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e separou falha operacional de corrupção determinística via PythonFileVerificationError. Revalidação independente mantém zero saves e rejeita a página após falhas de get/body/delete; metadata com identidade/revisão inválidas não deleta bytes e permite progresso seguro. Abort de delete e body tardio também não confirmam cursor. Combinado final `bun test tests/python-input-gc.test.ts tests/python-inputs.test.ts tests/python-file-stream.test.ts tests/python-inspection.test.ts ./.cache/review072-input-gc.test.ts`: exit0, 40 pass, 0 fail, 1182 verificações. Core input/identity/recipe: exit0, 8 pass, 86 verificações. Biome fresh dos oito arquivos exit0. Nenhuma produção alterada pelo revisor; sem R2 real/heavy ou qualificação de scheduled/API/Cloudflare.
