# Full review — Pensa, Zappy e Estúdio Pro

Revisão das correções da auditoria de 15/10/2026, seguida de integração local com `staging`. A revisão abrange os contratos compartilhados, composição dos hosts, autorização, modalidade de autoria, contexto do tutor, créditos, retomada de pedidos e continuidade das missões.

## Achados da revisão

| Achado | Correção e verificação |
|---|---|
| O planejamento Pro ainda restringia dimensões conforme a extensão de blocos, mesmo com autorização Pro | O contexto permite 2D/3D no Pro autorizado sem consultar a paleta. Regressão reproduzida e corrigida em `pensa-journey-context.test.ts`, incluindo validação de uma proposta 3D sem blocos. O clássico mantém a regra das extensões. |
| Notas acima do limite geravam mensagem genérica de indisponibilidade no Conversar | Erro próprio de limite de resumo, reconhecido pela interface. A criança recebe orientação para resumir as notas; a pergunta permanece e nenhum pedido é enviado. Regressão reproduzida e corrigida em `ZappyPanel.test.tsx`. |
| O guia de transição afirmava que todo script convertido ficava em `public/script.js` | Guia e prompt agora orientam a conferir `index.html`, distinguindo scripts globais em `public/` de módulos em `src/converted/`. Conferido contra o conversor e seus casos de teste existentes. |
| A interface não explicava que reenviar uma tentativa conserva também as notas originais | Texto e ação de novo pedido mencionam código e notas. O teste de retomada confirma que retry conserva o pedido e que a ação explícita cria outro pedido com as notas atuais, preservando idempotência. |

Os dois testes de regressão falharam pelo motivo esperado antes das correções e passaram depois. As reproduções históricas da primeira auditoria foram arquivadas como `.txt` para não serem descobertas como testes ativos que esperam os defeitos antigos.

## Verificação antes da integração

- Studio: 40 testes de conversa, créditos e contexto; todos passaram.
- member-shell: 387 testes em 38 arquivos; todos passaram.
- Kids: 179 testes em 25 arquivos; todos passaram.
- Pensa: 134 testes em 16 arquivos; todos passaram.
- Core: 14 testes; todos passaram.
- Biome: 67 arquivos, sem erros. `git diff --check` no escopo: sem erros.

Os logs brutos permanecem locais nesta pasta e em `../fixes/`; relatórios e manifestos compõem a evidência versionada. Os resultados anteriores completos e os limites do ambiente estão em [correções da auditoria](../fixes/report.md).

## Integração local

A verificação do resultado integrado será registrada antes de atualizar `staging`. As alterações preexistentes de Molda, marketing e outros trabalhos no checkout original não fazem parte deste commit. Nenhum push ou deploy foi solicitado.
