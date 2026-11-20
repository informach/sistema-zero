# Limpeza da frente do Estúdio — 20/11/2026

O código e os relatórios do Estúdio estão em `staging` local/remota, incluindo `bdbdb839a`. A comparação após fetch retornou `0 0`. Isso confirma integração e push, não implantação em produção nem conclusão da missão.

## Removido

- Onze branches locais do Estúdio já integradas, incluindo os backups anteriores à unificação.
- Sete branches remotas integradas: `estudio-correcoes`, `estudio-evolucao`, `estudio-evolucao-conclusao`, `estudio-full-review-20261118`, `estudio-missao-completar-20261118`, `estudio-missao-playwright-164-20261119`, `estudio-missao-storage-v4-20261119`.

A ancestralidade das branches removidas foi conferida contra `staging`. Não foram removidos commits exclusivos. Não há worktree registrada do Estúdio; as worktrees das outras frentes foram preservadas.

## Exclusões bloqueadas pela revisão automática

As tentativas foram rejeitadas com `blocked by policy`, antes da execução. Não houve troca de ferramenta para contornar a decisão. As pastas abaixo continuam no disco; não foi contabilizado espaço liberado por elas.

Pasta antiga, fora da árvore principal:

`C:\Users\tocha\projects\sistema-zero-estudio-evolucao`

Não contém mais `.git` nem registro de worktree. Foram conferidos 17.799 arquivos fora de dependências/caches/builds: o código tem objetos correspondentes no Git (incluindo normalização de CRLF); os 49 arquivos sem correspondência são logs e imagens/índices temporários de PDFs. Nenhum processo ativo dessa pasta foi encontrado na conferência.

Caches sob `C:\Users\tocha\projects\sistema-zero\packages\studio\.cache\`:

- `e2e-dist-5355`
- `e2e-dist-5357`
- `e2e-dist-5358`
- `e2e-dist-5359`
- `e2e-dist-5360`
- `e2e-pro-workspace`
- `banner-undo-results`
- `monaco-pointer-results`
- `course-banner-all-results`

Também permanecem as exclusões anteriormente bloqueadas: `packages/studio/.cache/mission/preview-first-document-red.txt` e `packages/studio/.cache/mission/preview-first-document-green.txt`.

## Preservado por conter rascunhos não integrados

Atualização posterior, a pedido do usuário: as duas referências abaixo foram
[consolidadas no histórico de staging](2026-11-20-studio-draft-integration.md).
O diagnóstico já estava aplicado; o laboratório foi preservado como experimento
rejeitado, sem ativação no produto. A remoção das branches ocorre após confirmar
a ancestralidade e o push. A descrição abaixo registra a situação anterior.

- `estudio-incremental-lab-20261118`: experimentos de carregamento incremental rejeitados (`582aa52b0`).
- `backup-studio-diagnostic-draft-20261119`: snapshot de diagnóstico preservado antes da limpeza anterior (`60c8afa97`).

Essas duas referências não estão integradas e não foram descartadas. Modificações locais de Arquipélago, Molda e aulas de outra frente não foram alteradas.
