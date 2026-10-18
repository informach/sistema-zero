# Integração Pro Python — execução L5

Continuação da proposta aprovada e da implementação L0–L8. Não requer nova aprovação. Entrega final continua incluindo revisão integral, correções, commit e merge em staging local; sem push ou deploy.

## Superfície compartilhada

Extrair a composição atual do Pro para `ProWorkspace`, com editor e preview fornecidos por linguagem. Reutilizar árvore, abas, busca, navegação, preferências, atalhos, revisão das operações e histórico. O wrapper JavaScript continua sendo dono de WebContainer/TypeScript; o Python usa CPython e seu serviço de linguagem. Nenhum carregamento de WebContainer/TS ocorre por causa do wrapper Python.

O contrato de linguagem do workspace contém consultas sobre a árvore capturada, sincronização dos buffers e navegação; não exige a instância concreta do serviço TypeScript. Manter validações de identidade/hash/versão antes de aplicar qualquer resultado. Edições recusadas por cotas voltam ao conteúdo aceito no mesmo histórico Monaco. A primeira aba Python usa o entrypoint configurado, respeitando preferências restauradas e ações já feitas pelo aluno.

## Análise e formatação

Usar Pyright 1.1.414 aprovado em L0, por adapter autenticado do host. Sessões temporárias, snapshots incrementais com versões, cancelamento e respostas vinculadas à geração. Apenas fontes `.py`/`.pyi` entram no processo. Nenhum asset, arquivo de configuração autoral, executável, segredo ou hook é materializado. Configuração e stubs pertencem à release aprovada. Limites de bytes/arquivos/linhas/requisições/fila e TTL são aplicados antes da criação do processo. O processo Linux recebe filesystem e UID próprios, rede desabilitada, limites de memória/CPU/PIDs e nenhum segredo.

Completion, hover, signature help, símbolos, definição, referências e renomeação usam respostas do servidor e intervalos UTF-16 validados contra a fonte capturada. Diagnósticos identificam seu provedor e a revisão do arquivo. Desconexão mostra indisponibilidade e retry, preservando editar/salvar/exportar/executar. Não devolver resultados antigos após reconexão ou troca A→B→A.

O Pyright fixado anuncia renomeação de símbolos, mas não `workspace/willRenameFiles`; não inventar esse suporte. Operações de arquivo precisam de planejamento de imports por AST/resolução ou recusa explícita antes de qualquer mudança quando não for possível comprovar as referências. Esse comportamento deve ser qualificado com pacotes, imports relativos, aliases, pastas e nomes sombreados. Referência primária: [servidor Pyright 1.1.414](https://raw.githubusercontent.com/microsoft/pyright/1.1.414/packages/pyright-internal/src/languageServerBase.ts).

Formatação explícita usa o módulo WASM oficial Ruff em worker, versão fixada e configuração controlada. Nenhuma formatação ao mudar de modo; preservar strings, comentários e semântica. [Ruff formatter](https://docs.astral.sh/ruff/formatter/), [módulo WASM](https://github.com/astral-sh/ruff/blob/main/crates/ruff_wasm/README.md).

## Execução, materiais e assistência

Preview Python compartilha o controlador qualificado. Console/REPL executam Python real na sessão vigente; não oferecer shell ou `pip` fictício. Arquivos gerados ficam efêmeros e só entram no projeto por ação explícita validada. Turtle pertence à extensão/runtime, sem `pip install turtle`; dependências futuras exigem release/lock/exportação compatíveis.

Pinta fornece imagens com caminhos portáveis na mesma biblioteca. Exemplos Python usam APIs oficiais e somente extensões instaladas. Não oferecer modelos 3D/Molda no Turtle. Assistência Zappy captura linguagem/runtime/extensões/diagnósticos e seleção por fonte exata; finalizar sua integração comum no lote correspondente.

## Provas e sequência

1. Extração da superfície Pro e regressão JavaScript: unidades de workspace/operações, navegação real, histórico e build/chunking.
2. Adapter, gateway isolado e cliente versionado: testes hostis, cancelamento, recuperação, cotas, concorrência e ausência de execução de hooks.
3. Providers Monaco/Ruff e UI Python: completion/hover/signatures/diagnósticos/definições/referências/renomeação/formatação em arquivos abertos e fechados, mudanças concorrentes e múltiplas instâncias.
4. Integração completa Pro: arquivos/pastas, entrypoint, operações revisáveis, Undo/Redo/recuperação, observador, preferências e responsividade; Console/REPL e Pinta.
5. Review independente de cada recorte, correções e repetição das provas pertinentes. Continuar L6–L8 e gates de jogos, Mural, exportação e desempenho conjunto; não encerrar com a superfície parcial.
