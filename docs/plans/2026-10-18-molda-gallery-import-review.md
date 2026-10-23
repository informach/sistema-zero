# Revisão da importação pela galeria do Molda

Escopo: botão ao lado de Criar novo, carregamento sob demanda, preparação e prévia dos três formatos, confirmação, salvamento nativo, abertura na oficina, cancelamento, permissões, restauração de backups e publicação em staging.

## Achados corrigidos

1. **Cancelamento de operação enfileirada (P1).** Uma importação confirmada podia permanecer na fila depois que sua interface era desmontada e ainda criar um documento. A sessão agora entrega um sinal de cancelamento à fila, que o verifica antes de iniciar a gravação. O teste reproduziu duas criações onde deveria existir apenas a original; após a correção, apenas a original permanece.
2. **Conclusão de sessão anterior liberando uma sessão nova (P1).** O controle de fechamento pertencia à galeria e era compartilhado por janelas sucessivas. A conclusão tardia de uma importação antiga podia liberar o fechamento da janela atual durante a gravação. Cada diálogo agora possui seu próprio controle. Um teste troca as permissões com duas operações pendentes e verifica que a segunda janela permanece aberta enquanto salva. O teste falhou antes da correção e passou depois.
3. **Contratos de CI da comunidade desatualizados (P1 para publicação).** A staging anterior falhou porque `bun test` descobria os cenários do Playwright e o teste da sala esperava uma política de microfone e localização de CSP anteriores à entrada por voz e ao Studio Pro. O Bun agora descobre somente `tests/`, mantendo `e2e/` no Playwright. O teste confere a política real de voz na própria origem e a regra correta de CSP, preservando a restrição de câmera, geolocalização e R2. Nenhum cabeçalho de produção foi alterado.
4. **Contrato visual apontava para um reexport antigo (P1 para publicação).** A primeira execução completa da CI chegou ao último pacote e encontrou um teste de UI que ainda buscava `PensaMissionPanel` no antigo arquivo Kids. Agora o teste verifica a implementação no `member-shell`, o reexport de compatibilidade Kids e o uso pelo cliente compartilhado. A exigência da mesma receita visual continua intacta. A suíte UI foi reproduzida com falha antes da correção e passou integralmente depois: 106 testes e 910 asserções, em 18/10/2026 às 17:39 UTC.
5. **Corrida na abertura do formulário da comunidade infantil (P1 para publicação).** O clique podia chegar ao botão antes do efeito passivo da seleção inicial do canal; esse efeito então fechava o formulário recém-aberto. Registros isolados no Linux mostraram a sequência clique → reset do canal → formulário fechado em três falhas de 400 execuções. A limpeza agora acontece junto da escolha do canal, antes de o novo canal ficar disponível para interação. Um teste com o `Profiler` do React reproduz precisamente esse intervalo: falha antes da correção e passa depois, conferindo também o foco no título. A comparação entre Bun 1.3.11 e 1.4.3 ajudou a investigar o agendamento, mas a correção está no componente; nenhum runtime, prazo ou asserção existente foi relaxado. As mudanças temporárias de diagnóstico permanecem em uma branch separada e não são integradas à staging.
6. **Preparações incompatíveis do banco de testes do Studio (P1 para publicação).** O teste de conta de IA criava tabelas avulsas no banco `studio_pro_review`, sem o histórico usado pelas outras suítes. A primeira migração dos testes seguintes colidia com o schema já criado, bloqueando três suítes. O teste agora usa `openStudioReviewDatabase`, como os demais consumidores desse banco. A reprodução isolada executou o setup antigo seguido do teste de benefícios e confirmou a colisão; após a correção, a suíte completa de membros com PostgreSQL real passou com **261 testes e nenhuma falha** ([diagnóstico Linux](https://github.com/informach/sistema-zero/actions/runs/39155374239)). A proteção que exige um banco local descartável continua no helper. Nenhuma migração ou código de produção foi alterado por esse ajuste.

O contrato de restauração de backups foi atualizado para conferir os novos IDs retornados, inclusive sua correspondência com o documento efetivamente salvo. A verificação visual respeita o token compartilhado de alvo: 40 px com mouse e 44 px para toque, em vez de presumir o mesmo valor em todos os navegadores.

## Evidências locais

Executado em 18/10/2026, antes do commit. Cada comando abaixo terminou com código 0.

Claim: a implementação revisada está validada localmente para publicação. Executed timestamp: 2026-10-18, entre 17:14 e 17:24 UTC. Exit code: 0 nos gates listados. Output summary: importação e regressões verificadas. Warnings: os avisos existentes de lint e a ausência esperada de WebGL no DOM dos testes unitários; os navegadores reais exercitam o renderizador. Errors: nenhuma falha nos gates finais. Verdict: **PASS local**; CI e deploy têm verificação separada.

| Prova | Comando | Resultado |
| --- | --- | --- |
| Suíte completa do Molda | `bun run test` em `packages/molda` | 3.411 testes, nenhuma falha, nas três partes da suíte |
| Tipos | `bun run typecheck` em `packages/molda` | Sem erros |
| Lint do Molda | `bun run check` em `packages/molda` | Sem erros |
| Lint do monorepo | `bun run ci` | Sem erros; 12 avisos e 160 informações já existentes |
| Build do playground | `bunx vite build --config playground/vite.config.ts --outDir ../.cache/gallery-import-build` | Build concluído |
| Contratos da comunidade | `bun test` em `packages/community` | 8 testes, nenhuma falha; cenários do Playwright não são carregados pelo Bun |
| Vocabulário infantil | `bun test tests/copy-vocabulario.test.ts` em `packages/community-kids` | 16 testes, nenhuma falha |

Verificação adicional da corrida do formulário, em 18/10/2026: o teste novo falhou no componente anterior e os cinco testes do arquivo passaram após a correção. A suíte completa Kids passou localmente com **1.425 testes e 8.545 asserções**, sem falhas. `bun run typecheck`, o Biome dos dois arquivos alterados e `git diff --check` também terminaram com código 0.

### Cobertura de navegador

Harness existente: Playwright. Servidor local: `http://127.0.0.1:5198/?nivel=god`, sem autenticação, contexto de navegador isolado dos dados do usuário.

Comando: `PW_REUSE_SERVER=1 bunx playwright test e2e/gallery-model-import.spec.ts e2e/scene-workshop.spec.ts --grep 'gallery|invalid model|criar pelo fluxo|modelar e desfazer|pintar do jeito'`.

Classificação `existing-e2e`: importação GLB com prévia e consentimento, cancelamento e retorno do foco, importação OBJ, importação Blockbench, arquivo inválido sem criação residual, persistência após recarregar, cabeçalho responsivo, criação normal, modelagem/desfazer e pintura. Os cenários novos estão em `e2e/gallery-model-import.spec.ts`; os cenários anteriores permanecem em `e2e/scene-workshop.spec.ts`. Chromium, Firefox e WebKit executam a importação pela galeria. Evidências e logs ficam em `packages/molda/.cache/gallery-review/qa/` e nos logs de revisão em `.cache/`.

Resultado: **22 aprovados e 2 excluídos por condições já existentes no cenário de pintura**. Todas as 15 execuções dos novos cenários de galeria passaram. Viewports: 1280 × 720 e 390 × 844. Browser Evidence: `qa/screenshots/gallery-desktop.png` e `qa/screenshots/gallery-mobile.png` no diretório de artefatos acima. Entrada e retorno final: a galeria do playground; a confirmação também atravessa a oficina antes do recarregamento. Nenhum fluxo novo ficou bloqueado ou somente manual.

### Limites e publicação

`agent-browser` não está instalado; não foi alegada execução manual por essa ferramenta. A prova pública é a automação real do Playwright. O teste Windows do runtime nativo também foi consultado por ter falhado na CI anterior; nesta máquina ele encontra bloqueio local de execução do auxiliar (`EUNKNOWN`). Nenhuma política do Windows foi alterada. A prova de publicação depende dos gates obrigatórios da CI no Windows e nos demais ambientes.

O remoto foi conferido antes da integração. A publicação usa o pipeline oficial de staging e toma como início do intervalo a última publicação completa bem-sucedida (`88981ff91`), para também incluir mudanças da staging anterior que não chegaram ao deploy. O resultado de CI e deploy é informado na entrega, sem dispensar gates.
