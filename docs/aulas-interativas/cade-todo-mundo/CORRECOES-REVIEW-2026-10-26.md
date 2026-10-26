# Correções do full review — 26/10/2026

Os nove achados do [full review](../../../.audits/architectural-analysis-2026-10-26-cade-todo-mundo.md) foram corrigidos localmente. Também foram corrigidas a observação documental sobre “Próxima parte” e as duas divergências editoriais do encerramento do Farol identificadas na bateria abrangente.

## Correções por achado

| Achado | Correção | Evidência |
| --- | --- | --- |
| R1 — Identidade das falas | Cada etapa usa seu próprio slot `garden:<id>`; catálogo, overrides e editor compartilham essa identidade. A instrução geral conserva seu slot. | Renderizar novamente o editor não produz escrita no conteúdo; pronúncias de duas etapas permanecem independentes. |
| R2 — Reinício antecipado | A orientação considera o estado atual. Quando a busca foi zerada e ainda faltam comparações, o Zappy pede um novo achado antes de orientar vazio ou repetição. | Reinício em quatro pontos da descoberta seguido apenas das instruções leva à conclusão. Cenário confirmado também no navegador. |
| R3 — Toque em esconderijo invisível | O motor não atualiza o escolhido nem executa outra reação; a legenda explica o toque sem efeito. | Arbusto → pedras → lugar do coelho mantém pedras como escolhido. |
| R4 — Autoria dos objetivos | O editor mostra e permite editar checkpoints, momento, expectativa e seletor. Remover um passo remove sua observação e renumera as seguintes; o comportamento é informado na interface. O resumo descreve as verificações intermediárias. | A regra real `mensagem-tres-achados` continua válida após remover o primeiro passo. Adicionar, editar o momento e remover verificações também foi testado. |
| R5 — Quiz misto | Validação compartilhada exige cena em todas as perguntas e uma única alternativa correta por previsão. Admin oferece seleção de cena. Importação e publicação rejeitam configuração mista; os players mostram erro explícito para conteúdo incompatível, sem apagar silenciosamente as demonstrações. | Testes de manifesto, autoria e importação para quiz misto e múltiplas corretas. |
| R6 — Retomada | O rascunho guarda respostas, posição e seleção por aluno, aula, bloco e conteúdo. A prévia preserva seu próprio rascunho no contexto autoral. Feedback é conferido novamente e a aprovação continua dependendo do servidor. | Remontagem, isolamento entre perfis, invalidação por mudança de conteúdo e conclusão após retomar no navegador. |
| R7 — Contraste | O rótulo “Escolhido” usa a cor semântica de texto; bordas e fundos mantêm o destaque visual. | 36 combinações de duas peles, seis paletas e três componentes, sem falhas de contraste nos elementos verificados. |
| R8 — Encerramento | A fala apresenta publicação como convite e explica que é possível concluir diretamente. Exportações de voz foram atualizadas. | Verificação dos derivados com `--check` e testes editoriais. |
| R9 — Prévia sem nota | O ensaio normaliza a nota para validar a estrutura e conserva a ausência de gate ao corrigir. Não tenta submeter pelo fluxo do aluno. | Seleção, demonstração e avanço funcionam sem `passingScore`. |

## Documentação e sincronização

- `ESPEC-MANIFESTO.md` documenta os slots de voz por etapa, os pré-requisitos da orientação, o modo de demonstração, a retomada e a edição das verificações intermediárias.
- `ESPEC-ROTEIRO.md` usa “Próxima parte” também para adultos.
- Roteiro e derivados da aula 2 do Cadê deixam explícita a publicação opcional.
- No Farol, foram alinhados o título do encerramento, o recado da página e o convite falado à publicação opcional já presente no manifesto. O gerador e os derivados foram sincronizados. Não houve reformulação das outras experiências desse curso.
- O PDF do Cadê já apresentava corretamente a publicação opcional e não precisou ser alterado nesta correção.

## Verificação final

| Verificação | Resultado |
| --- | --- |
| Core learning e QA editorial | **1.380 testes passaram**, zero falhas; 93 arquivos |
| Editores, importação e novas regressões | **49 testes passaram**, zero falhas; sete arquivos |
| API de quiz | **14 testes passaram**, zero falhas |
| Fluxo principal no navegador | **45 verificações passaram**, sem erros registrados; larguras 320, 390, 768 e 1.280 px |
| Cenários negativos da revisão no navegador | Reinício antecipado, toque repetido e retomada passaram; quiz concluído após retomar |
| Contraste | **36 combinações**, zero falhas nos componentes verificados |
| TypeScript | Admin e Community Kids concluíram com código 0 |
| Biome | **19 arquivos** conferidos, sem erros ou avisos |
| Exportações de voz | `gerar-falas-elevenlabs.ts --check` passou |
| Editorial do Farol após ajuste final do título | **26 testes passaram**, zero falhas; subconjunto da bateria editorial |
| Whitespace dos arquivos selecionados | `git diff --check` passou |

Testes de regressão duráveis:

- [garden.test.ts](../../../packages/core/src/learning/scene/garden.test.ts): orientação após reiniciar e repetição em esconderijos invisíveis.
- [voz.test.ts](../../../packages/core/src/learning/scene/voz.test.ts): identidade e pronúncia independentes.
- [cade-guided-regressions.test.tsx](../../../packages/admin/tests/cade-guided-regressions.test.tsx): componentes reais de autoria, checkpoints, contratos do quiz, prévia e rascunhos.

Logs locais de execução: `.cache/cade-fix-full-final.log`, `packages/admin/.cache/cade-fix-admin-final.log`, `.cache/cade-fix-api.log`, `packages/studio/.cache/cade-fix-main-ui.log`, `packages/studio/.cache/cade-fix-ui.log`, `packages/studio/.cache/cade-fix-palettes.log`, `.cache/cade-fix-admin-types-final.log`, `.cache/cade-fix-kids-types.log`, `.cache/cade-fix-voices.log` e `.cache/cade-fix-farol-final.log`.

## Limites

As verificações de navegador usam componentes e CSS reais em uma montagem local, sem sessão autenticada de produção. A checagem da pele adulta cobre os componentes compartilhados e seu CSS, não uma jornada adulta implantada completa. Os testes de API verificam o fluxo de correção separadamente.

Não houve geração paga de áudio, edição de vídeo, importação em ambiente remoto ou deploy. Esses passos de produção continuam distintos das correções de código e conteúdo. As alterações simultâneas da Jornada do Criador foram preservadas.
