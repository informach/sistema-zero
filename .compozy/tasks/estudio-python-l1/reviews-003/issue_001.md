---
status: resolved
file: packages/member-shell/src/components/studio/studio-block.tsx
line: 755
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Guard da aula diverge da comparação versionada do servidor

## Review Comment

Depois de introduzir fingerprint v2, o servidor considera versões distintas incomparáveis para não exigir reenvio apenas pela migração. O StudioBlock ainda usava igualdade literal para avanço e aviso. Isso bloquearia uma entrega v1 após guardar o documento migrado, apesar da regra do servidor. Compartilhar a comparação de versões, preservando o bloqueio quando salvar falha ou falta o hash atual.

## Triage

- Decision: `VALID`
- Notes: compareContentFingerprints retorna equal/different/incomparable e é usada no servidor e StudioBlock. Guard ainda exige saved, módulo e hash de disco presente. Deduplicação e backups mantêm igualdade estrita: incomparável não significa conteúdo igual. Revisor reavaliou sem novos achados. Core 35 testes/147 verificações; Members HTTP 13/38; BFF 47/190. Biome aplicado posteriormente em 12 arquivos, sete formatados.
