# Revisão do curso para pais: plano de execução

**Objetivo:** melhorar acolhimento, clareza e continuidade das cinco aulas, com todos os tópicos dos slides e a voz conversada da Vivi.

**Arquitetura:** os arquivos `.roteiro.md` são a fonte das falas; o exportador existente produz `.elevenlabs.txt` e `.edicao.json`. Propostas, manifestos e apostila acompanham a mesma versão, sem mudar IDs nem critérios de conclusão.

**Ferramentas:** Markdown, JSON, exportador Bun, validador Python e gerador HTML/PDF existente.

**Direção aprovada:** `docs/plans/2026-11-20-revisao-curso-pais-frustracoes-design.md`.

Execução nesta sessão, sem delegação. Revisão editorial com os validadores e testes existentes; não criar testes que apenas congelem a redação.

## Restrições

- Preservar cinco aulas, 12 clipes, IDs, critérios, apostila opcional, certificado e ausência de oferta.
- Conservar cada tópico da matriz de cobertura dos slides em `fontes.md`.
- Fala contínua e conversada, com direção de voz por segmento e notas de tela ancoradas em trechos reais.
- Não gerar voz nem publicar no Admin nesta entrega.

## Tarefas

- [x] Reescrever as 12 partes nos cinco `.roteiro.md` em `docs/aulas-interativas/pais/como-ajudar-seu-filho-autista-nas-frustracoes/`, conferindo cada tópico dos slides e reescrevendo o **Na tela** depois da fala.
- [x] Alinhar os cinco resumos `.md`, os cinco `.manifesto.json`, `modulos.md`, `README.md` e `fontes.md`. Atualizar `docs/aulas-interativas-tecnico/recursos/como-ajudar-seu-filho-autista-nas-frustracoes/caderno-conteudo.json` com as mesmas explicações e exemplos.
- [x] Gerar e conferir os derivados com `bun docs/aulas-interativas-tecnico/qa/gerar-falas-elevenlabs.ts como-ajudar-seu-filho-autista-nas-frustracoes` e o mesmo comando com `--check`. Gerar a apostila com `bun docs/aulas-interativas-tecnico/recursos/como-ajudar-seu-filho-autista-nas-frustracoes/gerar-caderno.ts` e inspecionar todas as páginas renderizadas.
- [x] Executar `python -X utf8 docs/aulas-interativas-tecnico/validar-roteiros.py como-ajudar-seu-filho-autista-nas-frustracoes`, `bun test docs/aulas-interativas-tecnico/qa/curso-para-pais.test.ts`, `bun docs/aulas-interativas-tecnico/qa/validar-manifestos.ts` e validadores Como Fazer; conferir o diff e registrar evidência, limitações e estado de produção no README do curso.

## Resultado de 20/11/2026

As quatro tarefas foram executadas. Cobertura: 20 tópicos dos slides; cinco aulas e 12 clipes com estrutura preservada. Verificação: 32 testes dos cursos para pais sem falhas, exportador em modo `--check` sem divergências, validador de roteiros sem erros, 51 manifestos das crianças válidos e os dois lotes Como Fazer válidos, com sugestões preexistentes. PDF com dez páginas renderizadas e inspecionadas; nenhum bloco de texto fora dos limites. A evidência resumida e o estado de produção estão no README do curso. Geração e escuta de voz, edição e publicação não fazem parte desta revisão local.
