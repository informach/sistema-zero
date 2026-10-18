---
status: resolved
file: packages/studio/scripts/turtle/derive.py
line: 35
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Configuração local contaminava a derivação pinada

## Review Comment

Executar integralmente o módulo oficial para obter defaults/assinaturas também executava `readconfig(_CFG)`. Esse hook lê `turtle.cfg` do diretório de trabalho, inclusive sob `python -I`. Assim os quatro hashes de vendor podiam permanecer corretos enquanto uma configuração local alterava o artefato e a API gerados.

Reprodução sem escrever artefatos de produto: executar a receita somente até antes de `OUTPUT.mkdir`, em memória, resulta em width 0.5 e SHA `4e722b59b330d2e9f1e7cbc1e6e11588434e807fe1089d2ffaf709c235e45121`. Em cwd de cache contendo `width = 321` e `height = 222`, a versão original resultava em width 321 e SHA `67f0d7619936423012099a2db3e012ce98cd26e610e437fccc6fe56822533aba`. Repor `_CFG` após import não corrigiria defaults já capturados nas definições.

A correção executa a AST pinada excluindo exatamente o único hook de configuração, com guarda estrutural da quantidade removida. Revalidação independente em ambos os cwd reproduziu width 0.5 e o mesmo SHA `4e722b59…`, que também é o SHA do arquivo gerado existente. Nenhuma implementação foi modificada pelo revisor.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador e revalidado. Configuração de reprodução preservada em `.cache/studio-python-turtle/review001-cfg-77rijgrj/turtle.cfg`; somente o prefixo da receita foi executado em memória.
