# Artes personalizadas do Farol — Implementation Plan

> Execução nesta sessão com a skill `executing-plans`, conforme pedido de implementação do usuário.

**Goal:** usar o pack fornecido em todas as apresentações locais de A Chave do Farol.

**Architecture:** os SVGs originais ficam versionados no Estúdio; um gerador produz os módulos portáveis de arte. Uma composição compartilhada define palco, posições e áreas de contato para projetos, cenas e caderno. Os manifestos e materiais são regenerados a partir dessas fontes.

**Tech Stack:** TypeScript, Bun, React/SVG, Canvas, Python/Playwright.

**Spec:** pedido do usuário em 03/10/2026: substituir as artes pelo conteúdo de `C:/Users/tocha/Downloads/pack-game-farol`, atualizar projetos iniciais e manifestos e adotar palco 480 × 360.

## Restrições

- Preservar os SVGs fornecidos e os nomes dos sprites/blocos ensinados.
- Usar o cenário limpo; o cenário composto serve como referência, sem duplicar personagens.
- Preservar a progressão das aulas: movimento, chave e condição da porta.
- Preservar alterações preexistentes de outras tarefas. `.git` está somente para leitura nesta sessão.

## Execução

- [x] Versionar os sete SVGs em `packages/studio/src/arte/assets/farol/`; gerar `farol-assets.generated.ts` e o fundo Canvas a partir do cenário limpo.
- [x] Compartilhar palco, posições e hitboxes em `farol-assets.ts`; atualizar `docs/aulas-interativas/qa/desafio-farol-projeto.ts`, o gerador dos manifestos e os testes de jogo real.
- [x] Atualizar `scene-lighthouse-key.tsx`, figuras genéricas e o gerador do caderno com a mesma composição.
- [x] Regenerar manifestos, PDF e imagens do funil, mantendo proporções; conferir o jogo no navegador e o PDF renderizado.
- [x] Executar testes relevantes, tipos, verificações e builds dos consumidores; registrar evidências e instruções de regeneração.

## Evidência final

- Estúdio: 8.725 testes passaram. Member-shell: 1.042. Community: 5. Community Kids: 1.170. Funil: 461, com um teste PostgreSQL ignorado por falta da configuração opcional. QA dos projetos e manifestos: 21.
- Tipos: Estúdio, member-shell, Community, Community Kids e funil sem erros.
- Builds: Community, Community Kids e funil concluídos. Build do funil isolado em `tmp/farol-funnel-build`.
- Biome: sem erros nos pacotes; dois avisos preexistentes no Estúdio e quatro no CSS do funil. `git diff --check` sem erros de whitespace.
- Navegador: movimento por teclado, porta sem chave, coleta, vitória, parada do barco e reinício; proporção do jogo conferida também em coluna de 360 px.
- Oferta conferida em 1440 e 390 px com a fixture local do catálogo: imagens carregadas e sem overflow. A fixture não foi usada no servidor habitual.
- PDF: 15 páginas renderizadas e revisadas; fontes, cores dos blocos, imagens e limites passaram no verificador.
- Os sete SVGs foram comparados byte a byte com a pasta fornecida. Comparação Canvas × SVG original em 480 × 360 e 560 × 300: diferença média inferior a 0,02 por canal (escala 0–255).
- [Fontes, comandos e limites da atualização](../../aulas-interativas/recursos/desafio-farol/README.md). [Jogo concluído](../../aulas-interativas/recursos/desafio-farol/evidencias/jogo-personalizado.png). Nenhum manifesto foi importado no catálogo, PDF remoto substituído ou projeto de aluno alterado.
