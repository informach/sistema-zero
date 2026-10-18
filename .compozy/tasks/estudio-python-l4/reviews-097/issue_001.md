---
status: resolved
file: packages/members/src/application/learning/section-progression.service.ts
line: 564
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Análise somente leitura autorizava progresso na sala

## Review Comment

O consumidor de objetivos Python da seção chama runtimeContext com operation analyze. Essa operação genérica permite leitores legítimos, incluindo outro aparelho sem a licença de escrita, e devolve author:false. O consumidor conferia vínculo/curso/aula/owner, mas não conferia author; assim, o mesmo leitor podia enviar um projeto próprio para inspeção e registrar progresso como se fosse o escritor admitido nesta geração da sala. Um device incorreto passava, embora epoch/revisão ainda coincidissem. A autorização para analisar fonte não é autorização para concluir o objetivo live.

Reprodução pré-fix do implementador no transcript desta sessão, chunk f64b1e: `bun test tests/integration/python-section-project.test.ts --test-name-pattern 'live Python Pro'`, exit1, caso device expected409/received200. Não existe log pré-fix arquivado em disco e não se atribui um. O caso grant expected409/received403 era expectativa incorreta do teste, não outra falha do produto. A versão sem a checagem também foi lida durante095; o recorte097 confirma o requisito de autoria do consumidor com serviços live reais.

Exigir live.author no consumidor de progressão antes de usar binding/configuration, incluindo cada autorização fresca durante/depois da inspeção e antes de persistir. Preservar runtimeContext analyze e o serviço genérico de análise somente leitura: retirar esse direito do LSP seria uma regressão. Acrescentar testes de outro device e licença vencida antes/durante inspeção, com nenhum dispatch/resultado persistido após perda.

## Triage

- Decision: `VALID`
- Notes: Resolvido após revalidação independente. !live.author no guard do consumidor é conferido em cada callback fresco; serviço analyze genérico permanece intacto. Final31/183 exit0 inclui nove variantes live (valid/device/epoch/revision/block/session/grant/lease-before/lease-during), generic live runtime, JS legado e probes extras de licença vencida. As duas variantes lease permanentes foram lidas; expiração exata aos30000ms impede progresso antes/durante a inspeção, com inspeções0/1 e nenhuma evidência gravada. Na mesma condição readonly analyze continua capabilities[] e workspace imutável. Biome2fresh clean; YAML/meta1/1/0 conferidos. Provas usam repo in-memory e transporte compilador controlado; não qualificam CPython/SDK/TCP/browser. Não duplica095/096 nem muda regras genéricas de análise readonly anteriores.
