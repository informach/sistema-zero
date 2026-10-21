# Apoio técnico das aulas interativas

As 37 aulas dos cinco cursos têm uma única fonte editorial em [Aulas interativas](../aulas-interativas/README.md). Não há geração separada por público.

- [Diretrizes pedagógicas](DIRETRIZES-PEDAGOGICAS.md): clareza, instrução completa e linguagem comum.
- [Voz ElevenLabs v4](DIRETRIZES-VOZ-ELEVENLABS.md), [formato do roteiro](ESPEC-ROTEIRO.md) e [Dedé/Debinha](AVATARES-NOS-VIDEOS.md).
- [Briefing](BRIEFING.md), [manifesto](ESPEC-MANIFESTO.md), [plataforma](REFERENCIA-PLATAFORMA.md) e [blocos](REFERENCIA-BLOCOS-JOGO-2D.json).
- `qa/`: fontes editoriais, geradores, exportadores e testes.
- `recursos/`: fontes e geradores do Passo a passo do projeto.
- `cenas/`: especificações das experiências. `modulos-*.md` e relatórios datados preservam decisões históricas; os índices atuais estão nas pastas dos cursos.
- [Decisões da unificação](../plans/2026-10-21-unificacao-aulas-plataforma-design.md) e [continuidade](../continuity/2026-10-21-unificacao-aulas-plataforma/README.md).

## Gerar e verificar

Execute da raiz do repositório. Cadê e Farol têm roteiro de produção como fonte da fala. Nave, Dino e Meu Jeito usam `qa/*.conteudo.json`; edite a fonte e regenere, sem corrigir só a saída.

```powershell
bun docs/aulas-interativas-tecnico/qa/gerar-cade-todo-mundo.ts
bun docs/aulas-interativas-tecnico/qa/gerar-desafio-farol.ts
bun docs/aulas-interativas-tecnico/qa/gerar-nave-contra-asteroides.ts
bun docs/aulas-interativas-tecnico/qa/gerar-corre-dino.ts
bun docs/aulas-interativas-tecnico/qa/gerar-meu-jeito.ts
bun docs/aulas-interativas-tecnico/qa/gerar-falas-elevenlabs.ts
bun docs/aulas-interativas-tecnico/qa/gerar-falas-elevenlabs.ts --check
bun docs/aulas-interativas-tecnico/qa/validar-manifestos.ts
python -X utf8 docs/aulas-interativas-tecnico/validar-roteiros.py
bun test docs/aulas-interativas-tecnico/qa
bun docs/como-fazer/validar.ts
bun docs/como-fazer-adulto/validar.ts
```

O exportador `qa/exportar-projetos-finais.ts` atualiza `blocos.json` e `projeto-final.szproject.json` quando o projeto muda. Uma revisão de linguagem preserva esses projetos e os critérios de conclusão.

## Material comum

```powershell
bun docs/aulas-interativas-tecnico/recursos/cade-todo-mundo/gerar-caderno.ts
python docs/aulas-interativas-tecnico/recursos/desafio-farol/gerar-materiais.py
python docs/aulas-interativas-tecnico/recursos/nave-contra-asteroides/gerar-materiais.py
python docs/aulas-interativas-tecnico/recursos/corre-dino/gerar-materiais.py
python docs/aulas-interativas-tecnico/recursos/meu-jeito/gerar-materiais.py
```

As saídas são `docs/aulas-interativas/<curso>/passo-a-passo-do-projeto.pdf`. Requerem Bun, Python/Playwright e Chrome ou Edge. Os pipelines verificam fontes, imagens, cores e limites; revise visualmente os PDFs renderizados após mudanças. Não use os antigos argumentos `--adulto` ou o fluxo de traduções por trecho.

Importar é uma etapa separada: confira curso/aula de destino e preserve anexos existentes. O adaptador comum só altera `courseSlug` entre o curso canônico e seu correspondente adulto, mantendo aula, blocos, partes e critérios. A geração local não publica vídeos nem gera áudio pago.
