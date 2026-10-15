# Apoio técnico das aulas interativas

Fontes de autoria, regras, geradores, verificações e histórico dos cinco cursos. Os arquivos de uso diário estão em [Aulas interativas](../aulas-interativas/README.md).

- [Diretrizes pedagógicas](DIRETRIZES-PEDAGOGICAS.md): regras de autoria e revisão.
- [Briefing](BRIEFING.md), [especificação de roteiro](ESPEC-ROTEIRO.md) e [especificação de manifesto](ESPEC-MANIFESTO.md).
- [Referência da plataforma](REFERENCIA-PLATAFORMA.md) e [referência dos blocos](REFERENCIA-BLOCOS-JOGO-2D.json).
- `qa/`: fontes editoriais, projetos de referência, geradores e testes.
- `recursos/`: fontes editáveis e geradores dos Mapas da Aventura.
- `cenas/`: especificações e relatórios das experiências.
- `modulos-*.md`: histórico completo de decisões e implantação de cada curso. As fichas resumidas ficam em `../aulas-interativas/<curso>/modulos.md`.
- [Histórico da organização anterior](historico-organizacao.md).

## Gerar e verificar

Execute da raiz do repositório:

```powershell
bun docs/aulas-interativas-tecnico/qa/validar-manifestos.ts
python -X utf8 docs/aulas-interativas-tecnico/validar-roteiros.py
bun test docs/aulas-interativas-tecnico/qa
bun docs/aulas-interativas-tecnico/qa/exportar-projetos-finais.ts
```

Os geradores `qa/gerar-*.ts` gravam as aulas diretamente na pasta de cada curso. Os geradores de materiais em `recursos/` gravam `mapa-da-aventura.pdf` nessa mesma pasta. Arquivos intermediários e capturas continuam em `tmp/` ou `output/artes/`.

O exportador dos projetos finais usa a última etapa de cada jogo e atualiza `projeto-final.szproject.json` e `blocos.json`. A lista de blocos inclui os tipos usados durante a montagem, mesmo quando uma peça é retirada antes do jogo final. O projeto de O Jogo do Meu Jeito usa as artes de demonstração.

Ao criar um novo curso, registre seu prefixo em `qa/caminhos.ts`. Os validadores e testes que percorrem todas as aulas usam esse catálogo; os nomes e identificadores dos 37 trios existentes foram preservados na organização por curso.
