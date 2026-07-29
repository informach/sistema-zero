# Fechamento das correções — áreas de comportamento

**Data:** 2026-07-19, America/Sao_Paulo  
**Escopo:** núcleo do Estúdio, cinco extensões oficiais, migração, geração,
runtime, World Composer, documentação e cobertura da divisão de comportamento.

## Resultado

Os dez achados da auditoria foram corrigidos. Projetos novos continuam vazios e
a criança escolhe quais Áreas do projeto criar. As áreas de comportamento são
agora independentes: **Ao iniciar**, **Quando acontecer — Eventos** e
**Enquanto estiver rodando — Loops**. Blocos legados permanecem apenas para
migração transparente e não aparecem nas paletas oficiais.

## Correções da revisão final de 20/07/2026

A revisão final da divisão em três áreas fechou quatro inconsistências
adicionais:

- callbacks dos loops do motor deixaram de conceder contexto sintático para
  `break` e `continue`; somente `for`, `while`, `repeat` e os demais laços da
  linguagem concedem esse contexto;
- imports, funções e classes passaram a obedecer na IR ao mesmo contrato físico
  do Blockly: são declarações diretas de **Ao iniciar** e não podem ser
  aninhadas;
- o sanitizador passou a aceitar a versão 2 conhecida das áreas para que o
  normalizador faça a migração v2 → v3 preservando IDs e layout; versões futuras
  continuam rejeitadas;
- o E2E de lifecycle agora executa de verdade início, evento e loop cancelável
  no iframe e prova o reinício do preview. A validação também passou a reconhecer
  o identificador, o tempo e o delta declarados pelo próprio loop de animação.

Evidência da revisão final:

| Verificação | Resultado |
|---|---|
| Testes focados de contratos, IR e migração | **67 pass, 0 fail**, 7.043 expectativas |
| E2E completo de lifecycle | **4 pass** em Chromium |
| Biome nos nove arquivos de código envolvidos | **PASS** |
| `git diff --check` | **PASS** |

Os gates globais foram executados, mas o worktree contém alterações paralelas
fora deste review: a suíte terminou com **4.332 pass e 16 fail**, e o typecheck
encontrou dois erros em `programmingPipeline.test.ts` e
`semanticDiagnostics.test.ts`. O `bun run check` aponta sete violações de
formatação/importação em seis arquivos de alterações paralelas:
`programming-accessibility.spec.ts`, `semanticDiagnostics.test.ts`,
`semanticDiagnostics.ts`, `css.ts`, `html.ts` e `canvasContexts.ts`. Nenhum
deles foi alterado pelas correções desta revisão final.

## Revisão complementar de 20/07/2026

Uma nova varredura exaustiva encontrou treze comandos persistentes que ainda
usavam o placement genérico e podiam ser encaixados dentro de laços:

- Jogo 2D Avançado: criar personagem, pontos de batalha, golpe especial,
  adicionar aliado, ensinar golpe, ensinar cura, moedas iniciais e iniciar
  gerador;
- Jogo 3D Avançado: adicionar luz, definir luz ambiente, definir névoa, iniciar
  gerador e iniciar cronômetro.

Todos agora usam o contrato `resource-creator`, que permite a preparação em
**Ao iniciar** e reações pontuais em **Quando acontecer**, mas bloqueia
`loop-body` em qualquer profundidade. Um contrato explícito bloco → statement
protege também IR importada: laços nativos das extensões e laços sintáticos são
rejeitados pelo `SZIRV2Schema`. Os manuais e tooltips afetados foram atualizados,
com versões `game-2d-advanced@0.43.3` e `game-3d-advanced@0.8.3` após a
atualização visual posterior dos runtimes.

Evidência daquela rodada da revisão complementar:

| Verificação | Resultado |
|---|---|
| `bun run test` | **4.317 pass, 0 fail**, 293 arquivos |
| `bun run typecheck` | **PASS** |
| `bun run check` | **PASS**, 681 arquivos |
| E2E lifecycle + segurança do preview | **5 pass** em Chromium |
| `git diff --check` | **PASS** |

## Revisão de consistência de 20/07/2026

A conferência final entre catálogo, persistência, IR, gerador, parser e runtime
também fechou estes drifts residuais:

- os cinco tipos novos de Jogo 2D (`sz_g2d_damage_sprite`,
  `sz_g2d_invincible_for`, `sz_g2d_sprite_is_invincible`,
  `sz_g2d_draw_sprite_health_bar` e `sz_g2d_draw_boss_health_bar`) pertencem à
  allowlist de persistência; os dois blocos de desenho recebem sombras válidas
  para contexto e sprite durante a migração;
- `g2d:setHealth` e `g2d:setStageDescription` são comandos exclusivos de
  **Ao iniciar** também na validação da IR;
- os três starters persistentes que faltavam passaram a usar
  `resource-creator` no Blockly e no contrato recursivo da IR;
- Jogo 2D e Jogo 2D Avançado incorporam um `ProjectRunContext` descartável. O
  gerador associa listeners DOM ao `AbortSignal` e registra o cancelamento de
  RAFs genéricos; cada reinício descarta a execução anterior antes de repetir a
  factory. Os schedulers e recursos específicos continuam pertencendo a cada
  motor;
- o parser remove somente a infraestrutura exata gerada pelo Estúdio e preserva
  handles escritos pela criança no round-trip;
- o E2E de copiar/colar espera confirmação de colagem, crescimento do workspace
  e conclusão do autosave, eliminando dependência de atrasos arbitrários;
- prompts de missão, contrato de extensões e este relatório foram alinhados aos
  três momentos de comportamento.

A evidência fresca desta revisão está registrada ao fim do documento.

## Fechamento por achado

| Achado | Estado | Correção |
|---|---|---|
| F-01 — travas de contexto | Corrigido | Um contrato canônico de `placement` é materializado em todas as definições e consumido pelo verificador de conexões, incluindo toda a subárvore que será encaixada. |
| F-02 — blocos legados visíveis | Corrigido | Wrappers e boots antigos continuam registrados para abrir projetos antigos, mas são marcados como ocultos e filtrados das paletas oficiais. |
| F-03 — drift Blockly × IR | Corrigido | A classificação usa o contrato registrado; `eventHandler` é evento no Blockly e no IR. A cobertura exaustiva percorre todo o catálogo oficial. |
| F-04 — migração parcial | Corrigido | A migração ocorre por área, preserva IDs, entende estados parcialmente organizados e usa marcador de versão para não reorganizar rascunhos intencionais. |
| F-05 — exclusão apaga filhos | Corrigido | Excluir uma Área do projeto solta o conteúdo como rascunho antes da exclusão; desfazer reconecta área e conteúdo no mesmo grupo. |
| F-06 — IR sintaticamente impossível | Corrigido | A validação recursiva rejeita eventos/loops aninhados e comandos dependentes de função, laço, evento, classe ou contexto assíncrono quando usados fora do lugar. |
| F-07 — Composer antigo | Corrigido | O World Composer procura a área compatível pelo contrato, nunca cria uma área automaticamente e orienta a criança a criar **Ao iniciar** quando necessário. |
| F-08 — lifecycle implícito | Corrigido | Todas as extensões oficiais declaram contrato obrigatório; o gerador resolve o contrato sem `switch` por motor. Nos dois runtimes que repetem a factory em memória, o `ProjectRunContext` descarta listeners e RAFs genéricos no restart; cadência, pausa e recursos de domínio permanecem sob responsabilidade do motor. |
| F-09 — documentação defasada | Corrigido | CLAUDE, contrato de extensões, manifests, resumos e contextos de IA foram atualizados para as cinco áreas opcionais, boot automático e três momentos de comportamento. |
| F-10 — cobertura insuficiente | Corrigido | Foram adicionados testes exaustivos de catálogo/IR, migração, rascunho, unicidade, exclusão/undo, Composer, runtime e E2E Chromium dos fluxos críticos. |

## Garantias implementadas

- Áreas de evento e loop não podem ser aninhadas em comandos, funções ou entre
  si; comandos como `break`, `return`, `await`, `super` e valores do evento são
  validados no contexto completo.
- Duplicar uma área preserva seu conteúdo como rascunho. A guarda espera a
  desserialização terminar antes de remover a duplicata, evitando perda durante
  colagem/importação.
- Projetos antigos com a moldura única ou migração incompleta são separados de
  modo determinístico. Projetos já marcados como atuais conservam blocos soltos
  e mostram diagnóstico visual claro.
- O código da criança contém somente as três fases. Boot, reinício e descarte do
  motor são responsabilidade do contrato interno da extensão.
- O layout continua com as Áreas do projeto em duas linhas e nenhuma área é
  inserida automaticamente em projeto novo.

## Evidência fresca

| Verificação | Resultado |
|---|---|
| Testes focados de lifecycle (10 arquivos) | **59 pass, 0 fail, 5.396 expectativas** |
| Guard atual do runtime Jogo 2D Avançado | **6 pass, 0 fail** |
| Typecheck | **PASS** — `tsc --noEmit` |
| Build do playground | **PASS** — 1.419 módulos transformados |
| E2E Chromium das correções | **3 pass** — exclusão/undo, ausência do legado e World Composer |
| Diff | **PASS** — `git diff --check` sem erros |

## Estado histórico dos gates globais no primeiro fechamento

Na primeira verificação, o worktree recebeu alterações paralelas e os gates
globais abaixo ainda não puderam ser apresentados como verdes. Este registro é
mantido como histórico; a revisão complementar acima substitui esse estado com
uma execução integral verde.

- `bun run check` encontra quatro erros de formatação/importação exclusivamente
  em `canvas.ts`, `canvasAudit.test.ts` e `canvasPipeline.test.ts`, arquivos de
  uma alteração paralela de Canvas que não foram reformatados por esta revisão.
- A última suíte integral observou **4.122 pass e 1 fail**. O único guard falhou
  contra uma versão de `game-2d-advanced` que foi substituída durante a própria
  execução; o arquivo atual passou isoladamente com **6/6**. Uma execução
  anterior também mostrou drifts transitórios de Canvas que desapareceram no
  rerun, confirmando o worktree em movimento.
- O comando E2E global ficou sem iniciar a saída do Playwright por mais de nove
  minutos e deixou um servidor Vite órfão na porta 5195. O processo órfão foi
  encerrado e o spec específico passou novamente, **3/3**, em 12,7 s.

Essas ocorrências não alteram o resultado dos testes focados nem foram mascaradas
com mudanças nos arquivos paralelos.
