# Ritmo das participações nos vídeos — plano de implementação

> Execução nesta sessão com a skill `executing-plans`; proposta aprovada pela responsável.

**Objetivo:** distribuir reações ligadas à montagem e aos testes, preservando os passos completos.
**Arquitetura:** metadados editoriais com âncoras literais, renderizados nos três documentos de cada aula.
**Tecnologia:** TypeScript, Bun, JSON e Markdown.
**Especificação:** [decisão aprovada](../../plans/2026-10-10-ritmo-avatares-design.md).

## Restrições

- Uma criança por aula, alternada entre aulas; Zappy sem voz dentro dos vídeos.
- Preservar as falas gravadas da Aula 1 e documentar os cortes exatos.
- Não interromper arrastes, esconder campos ou antecipar resultados de experiências.
- Nenhuma mudança nos critérios, projetos, seções, identificadores ou mídia publicada.

## Execução

- [x] Ampliar `qa/avatares-video.test.ts` com cortes múltiplos, conservação da fala e rejeição de ordem inválida; confirmar falha antes da implementação.
- [x] Ampliar `qa/avatares-video.ts` e os tipos dos três geradores para `ParticipacaoAvatar | ParticipacaoAvatar[]`; contar todas as falas e numerar cada entrada.
- [x] Revisar `qa/{corre-dino,nave-contra-asteroides,meu-jeito}.conteudo.json`, priorizando montagens e trechos longos; regenerar os trios com os três geradores existentes.
- [x] Revisar os roteiros e propostas do Cadê e Farol, sincronizar as direções em seus geradores e regenerar manifestos.
- [x] Atualizar a direção pedagógica, a skill espelhada e o inventário de entradas; registrar os cortes exatos da Aula 1.
- [x] Rodar `bun test docs/aulas-interativas/qa`, `python docs/aulas-interativas/validar-roteiros.py`, `bun docs/aulas-interativas/qa/validar-manifestos.ts`, `bun docs/como-fazer/validar.ts` e Biome dos arquivos alterados.
- [x] Conferir preservação dos manifestos fora de `plannedVideo`, commit e push em staging; aguardar CI, conferir staging, promover o PR e verificar produção. Feito: `41a7af50e` entrou em staging e chegou à main pelo PR #197 (`5ba95785e`, 10/10/2026). A mudança é só de documentos; não há serviço a conferir em produção.

Validação local: 204 testes passaram; 37 roteiros (203 clipes), 37 manifestos e 42 tutoriais conferidos. Comparação dos manifestos preserva todo o conteúdo fora de plannedVideo; comparação das fontes preserva todo o conteúdo fora de avatar. Nos roteiros manuais, a fala da professora foi conservada, com apenas a ponte Vamos ver. na Aula 2. A revisão de edição da Aula 1 está em docs/aulas-interativas/edicao-cade-aula-1-reacoes.md.

Achados do review posterior, corrigidos em 10/10/2026: o gerador do Farol monta o plano de cada vídeo na ordem de corte e confere essa ordem no roteiro; os alvos de duração do Farol e do Cadê passaram a contar as falas novas; a regra da celebração chegou ao Farol; as inserções da Aula 2 do Cadê passaram à série R; e a resposta a A1P3-D01 perde "Por isso," na edição. O registro está em docs/aulas-interativas/modulos-desafio-primeiro-jogo.md e docs/aulas-interativas/modulos-cade-todo-mundo.md.
