# Correções do full review da Aula 7 — 19/11/2026

Escopo: cinco achados registrados em `.audits/aula7-full-review-2026-11-19`.

## Alterações

- BUG-002: todo autor Kids passa pela identidade pública atual, inclusive perfil com UUID igual ao da conta. Perfis têm precedência; equipe é confirmada pelo diretório interno do Auth. Conta comum, perfil arquivado ou falha de identidade não recuperam o nome do snapshot.
- BUG-003: sessão infantil é classificada pelos headers autenticados na fronteira e passa `profileSession` ao emissor. O primeiro certificado exige nome completo confirmado; reemissão conserva o registro imutável.
- BUG-004: oficinas projetam apelidos inteiros atuais em participantes, mensagens antigas e autorização de mídia. A consulta ao Auth é em lote, fora da transação. UUIDs de colegas continuam redigidos. Turmas adultas e professoras preservam suas regras. O Arquipélago recebe o apelido inteiro.
- BUG-005: checkout informa mensal, anual ou `a cada N meses`, conforme a recorrência real.
- BUG-001: o conjunto já publicado e estas correções serão preservados em commits próprios para staging e main, sem integrar o trabalho paralelo do Studio. O journal de produção precisa incluir também migrations anteriores já aplicadas, que ainda faltavam no seu repositório.

## Regressões e verificação

As quatro reproduções da revisão falharam antes da correção e passaram depois. Os testes permanentes estão nos pacotes, incluindo legado com UUID igual, nome confirmado e replay, identidade pública de equipe, mensagens antigas, mudança de apelido, indisponibilidade de Auth, projeção após liberar trava e periodicidades 1/3/6/12 meses.

- Members: 2.244 aprovados, dois ignorados, zero falhas na rodada final de testes unitários/integração.
- Hub: 188 aprovados, 53 ignorados, zero falhas.
- Member-shell: 2.544 aprovados, zero falhas.
- Community: 118 aprovados, zero falhas.
- Produção isolada: 44 testes direcionados aprovados, zero falhas.
- Kids: checagem de tipos aprovada; suíte completa e builds registrados na evidência local.
- Biome: 19 arquivos da correção conferidos, sem ajustes pendentes.

A árvore principal de staging tinha erros de tipos no trabalho paralelo `studio/src/ir/symbolNames.ts` (`ReadonlySet`), além do limite padrão de memória do compilador. Não foram suprimidos erros nem incluídas mudanças do Studio neste escopo. As validações isoladas da entrega e seus limites ficam registradas no relatório de publicação.

Evidências de comandos, logs, manifestos explícitos de arquivos e verificação de releases ficam em `.cache/aula7-pendencias-20261119` (ignoradas pelo Git). Não há nova migration para os quatro ajustes funcionais, nova cobrança nem alteração de cadastro real nesta revisão.
