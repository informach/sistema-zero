# Limpeza da frente do Estúdio — 20/11/2026

O código e os relatórios do Estúdio estão em `staging` local/remota, incluindo `bdbdb839a`. A comparação após fetch retornou `0 0`. Isso confirma integração e push, não implantação em produção nem conclusão da missão.

## Removido

- Onze branches locais do Estúdio já integradas, incluindo os backups anteriores à unificação.
- Sete branches remotas integradas: `estudio-correcoes`, `estudio-evolucao`, `estudio-evolucao-conclusao`, `estudio-full-review-20261118`, `estudio-missao-completar-20261118`, `estudio-missao-playwright-164-20261119`, `estudio-missao-storage-v4-20261119`.

A ancestralidade das branches removidas foi conferida contra `staging`. Não foram removidos commits exclusivos. Não há worktree registrada do Estúdio; as worktrees das outras frentes foram preservadas.

## Exclusões finalizadas em 20/11/2026

As tentativas anteriores haviam sido rejeitadas pela revisão automática com `blocked by policy`, antes da execução. Após o pedido explícito do usuário para finalizar esta limpeza, foi feita uma nova auditoria e as exclusões abaixo foram executadas e verificadas. Conferência final: `2026-11-20T06:47:57-03:00`.

Pasta antiga removida, fora da árvore principal:

`C:\Users\tocha\projects\sistema-zero-estudio-evolucao`

Antes da exclusão, a pasta não continha `.git` nem registro de worktree e não tinha processos ativos. Foram reconferidos 17.799 arquivos fora de dependências/caches/builds: 17.750 têm objetos correspondentes no histórico alcançável de `origin/staging`, incluindo normalização de CRLF; os 49 restantes eram logs e imagens/índices temporários de PDFs.

Caches removidos sob `C:\Users\tocha\projects\sistema-zero\packages\studio\.cache\`:

- `e2e-dist-5355`
- `e2e-dist-5357`
- `e2e-dist-5358`
- `e2e-dist-5359`
- `e2e-dist-5360`
- `e2e-pro-workspace`
- `banner-undo-results`
- `monaco-pointer-results`
- `course-banner-all-results`

Também foram removidos `packages/studio/.cache/mission/preview-first-document-red.txt` e `packages/studio/.cache/mission/preview-first-document-green.txt`.

Os 12 alvos estão ausentes. O inventário anterior à exclusão somava 3,389,714,347 bytes lógicos (3.16 GiB). A variação observada do espaço livre durante a exclusão foi de 2,108,600,320 bytes (1.96 GiB); essa medição é separada da limpeza geral do disco realizada antes.

## Rascunhos consolidados no histórico

Atualização posterior, a pedido do usuário: as duas referências abaixo foram
[consolidadas no histórico de staging](2026-11-20-studio-draft-integration.md).
O diagnóstico já estava aplicado; o laboratório foi preservado como experimento
rejeitado, sem ativação no produto. A remoção das branches ocorre após confirmar
a ancestralidade e o push. A descrição abaixo registra a situação anterior.

- `estudio-incremental-lab-20261118`: experimentos de carregamento incremental rejeitados (`582aa52b0`).
- `backup-studio-diagnostic-draft-20261119`: snapshot de diagnóstico preservado antes da limpeza anterior (`60c8afa97`).

Os dois commits estão preservados em `origin/staging`; as branches locais foram removidas pela frente de integração após consolidá-los no histórico. Esta limpeza ficou restrita aos 12 alvos de arquivos e pastas listados acima.

## Verificação final

- 12/12 alvos de exclusão ausentes.
- As oito worktrees registradas continuam presentes. Houve avanços simultâneos de referências e alterações locais de outras frentes; esta limpeza não alterou referências Git.
- Os dois commits de rascunho foram confirmados como ancestrais de `origin/staging`: `582aa52b08978dd7375df044b8f3bb9bb21392ff` e `60c8afa9702357aa4e814eee4884c8b5a311b1fa`.
- Os 109 arquivos com alterações locais já existentes continuam presentes. A comparação SHA-256 registrou 9 alterações simultâneas, detalhadas no relatório; nenhum arquivo de código foi escrito pela limpeza.
- `staging...origin/staging` na conferência final: `0	13`; `bdbdb839a` continua alcançável em `origin/staging`.
- Evidências locais: `C:\Users\tocha\disk-cleanup-20261120\studio-followup\` (`audit.json`, `deletion-result.json`, `verification.json` e `verificacao.txt`).
