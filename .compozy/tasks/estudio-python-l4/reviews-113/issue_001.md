---
status: resolved
file: packages/studio/src/export/pythonSourceMetadata.ts
line: 42
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Requisitos com variante de caixa geram configuração vazia

## Review Comment

A decisão de gerar pyproject.toml usa apenas sourceFiles['requirements.txt']. Um projeto portátil válido pode conter REQUIREMENTS.TXT no lugar do nome lowercase; o contrato rejeita duplicatas por caixa, mas aceita esse único arquivo. Se ele contém requisitos externos enquanto o lock capturado ainda corresponde ao arquivo vazio anterior, o exportador trata requisitos como ausentes, gera dependencies = [] e não retorna o aviso de revisão nativa. No Windows, o comando documentado pip -r requirements.txt lê justamente o arquivo uppercase não vazio. A configuração e os avisos gerados contradizem os requisitos autorais preservados.

Reprodução independente com projeto Pro refinado real: remover requirements.txt vazio da fixture, adicionar REQUIREMENTS.TXT com future-package==1.2.3 e exportar. A fonte uppercase permanece exata, leitura real Windows pelo caminho lowercase retorna o mesmo conteúdo, mas pyproject.toml é criado com dependencies = [] e warnings = []. Comando `bun test ./.cache/review113-desktop-metadata.test.ts` em packages/studio: exit1, 2pass/1fail/14asserts, falha esperada na ausência da configuração fabricada. Os outros probes cobrem colisões case/ancestrais e bytes BOM/CRLF/Unicode mais diretórios vazios no ZIP real. O ensaio inicial tinha duas fixtures inválidas (duplicata case e diretórios pais ausentes); foram corrigidas antes desta reprodução, sem alteração do produto.

Identificar os requisitos autorais por nome root case-insensitive antes de decidir ausência/vazio e comparar SHA desses mesmos bytes; arquivo não vazio ou hash divergente deve impedir configuração zero-dependências e emitir revisão nativa. Preservar o nome e os bytes autorais. Não é certificação de execução nativa nem achado de interpretação pip/browser lock.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou o lookup exato em sourceFiles e a aceitação de um único REQUIREMENTS.TXT pelo contrato portátil. A ausência inferida e o hash vazio contradizem os bytes autorais que pip lê no Windows. Corrigir a descoberta do arquivo root por caixa e usar o mesmo nome preservado nas instruções; adicionar regressão permanente, sem alterar os requisitos, o lock ou fontes autorais. Verificação fresca antes de resolver.

### Independent revalidation

Lookup root agora usa comparação case-insensitive e compara SHA dos bytes do arquivo realmente encontrado; instruções pip preservam o nome autoral REQUIREMENTS.TXT. `bun test ./.cache/review113-desktop-metadata.test.ts ./src/export/__tests__/pythonSource.test.ts ./src/export/__tests__/sourceExport.test.ts` em packages/studio: exit0,16pass/0fail/106asserts. Probe causal original e permanente passam; requisitos externos deixam pyproject ausente e emitem aviso. Os controles de colisões, ZIP, bytes e JS permanecem verdes. Nenhuma fonte de produção/teste permanente alterada pelo revisor. Escopo da issue resolvido, não qualifica analyzer arbitrário, Pinta restante, VS Code ou performance.

- Status de fechamento: resolved após unit independente16/106 e TSC fresh Studio67552 exit0 confirmado por leitura de .cache/studio-python-l0/l7-desktop-metadata-typecheck-2.log.
