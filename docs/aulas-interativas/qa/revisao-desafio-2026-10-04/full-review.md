# Full review da implementação do Farol

**Data:** 04/10/2026. **Escopo:** implementação local da proposta pedagógica aprovada, incluindo código, roteiros, manifestos, critérios, quiz, caderno e integrações do player/servidor. As alterações de marketing e do funil ficaram fora do escopo.

**Situação atual:** os dois achados P2 foram corrigidos localmente em 04/10/2026, após autorização do responsável. A mesma bateria ampliada agora passa com **2.447 testes e zero falhas**. Veja a [verificação das correções](#verificação-das-correções).

**Parecer original:** dois ajustes necessários, ambos P2. Não encontrei um bloqueio no percurso programático da experiência de memória nem na execução da montagem intermediária do Dia 3. A validação anterior ficou incompleta: não incluía o teste do contrato HTTP que falhou. Os achados e resultados abaixo conservam o diagnóstico anterior à correção.

## Achados

### 1. [P2, corrigido] As quatro ações novas faltavam no contrato HTTP de autoria

**Local:** `packages/core/src/learning/scene/actions.ts:140–143`, em conjunto com `packages/members/src/interfaces/http/learning.dtos.ts:33–60`.

O domínio e o player reconhecem `remember-collection`, `collect-key`, `leave-key` e `restart-collection`, mas `SceneActionSchema` não declarava nenhuma delas. Um bloco de `collect-and-remember` com qualquer uma dessas ações em `activity.setup.actions` era recusado com **422** pela rota de teste que usa esse schema. A incompatibilidade era do contrato tipado; as rotas atuais de importação e rascunho não usam diretamente esse schema. Portanto, a reprodução não demonstrava bloqueio da gravação real no Admin.

**Reprodução:**

```powershell
bun test packages/members/tests/unit/learning-dto-acoes-das-cenas.test.ts
```

O teste existente falha em `learning-dto-acoes-das-cenas.test.ts:116`, no primeiro `collect-key`: o domínio aceita a ação, mas o validador HTTP retorna falso. Um diagnóstico separado percorreu as quatro ações em uma rota Elysia com o schema real; todas retornaram 422.

**Limite do impacto:** o manifesto atual do Farol não configura essas ações no estado inicial. Testei seu bloco real, enviei o percurso completo pela rota de progresso e confirmei as quatro descobertas e a aprovação pela rota de tentativas. Portanto, este achado não significa que os cliques da criança sejam recusados durante a aula: o transporte das ações do aluno segue outro contrato.

**Correção sugerida:** acrescentar as quatro variantes em `SceneActionSchema`, incluindo `enabled: boolean` em `remember-collection`. Rodar o teste existente, que também verifica se a normalização HTTP preserva o conteúdo das ações.

### 2. [P2, corrigido] A devolutiva não identificava a velocidade que impedia concluir a comparação

**Local:** `docs/aulas-interativas/qa/desafio-farol-criterios.ts:40–49`. Apresentação do resultado: `packages/member-shell/src/components/studio/section-project-check.tsx`.

O novo exercício pede alterar a velocidade de 3 para 1, comparar e voltar para 3. Se a criança esquecer apenas essa última alteração, o personagem continua andando e respeitando as bordas, mas o critério `andar` reprova porque exige `SPEED: 3`. O único pedido marcado como pendente é:

> Dentro de A cada quadro, mova personagem antes de conferir a borda.

Esse encaixe já está correto. A devolutiva não menciona a velocidade e, por isso, não indica a alteração necessária para avançar. O mesmo pedido é reutilizado nos Dias 2 e 3 pelos critérios cumulativos.

**Reprodução:** partir de um projeto correto, alterar somente `g2d:topDown.speed` para 1, reconstruir `blocksState` e chamar `evaluateStudioSectionProject(movimento, projeto)`. Resultado observado: `direcional=true`, `andar=false`, `borda=true`, com o texto acima. A exigência de 3 já existia; a nova atividade passa a orientar explicitamente a criança a usar 1 durante a construção, tornando esse estado parte do percurso previsto.

**Correção sugerida:** explicitar no pedido a velocidade esperada nesta etapa, por exemplo: “Dentro de A cada quadro, mova personagem com velocidade 3, antes de conferir a borda.” Preservar a orientação de que 1 é um valor válido para experimentar; voltar a 3 é a referência escolhida para continuar este curso.

## Conferência da proposta

| Parte | Resultado da revisão |
| --- | --- |
| Identidades e geração | Cinco aulas, onze seções e dez vídeos. Identificadores anteriores preservados; regenerar mantém os manifestos idênticos. |
| Experiência de memória | Mesmo desaparecimento e aviso nos dois modos; variável diferente. Trocar a regra não concede descoberta. Afastamento e reinício dependem da coleta real na partida. O percurso do manifesto salva e conclui no servidor. |
| Experiência da porta | O destaque vem da tentativa; mudar a chave limpa a seleção. Mantidos os dois objetivos e a ausência de pergunta final no curso. |
| Montagem intermediária | `sem-chave` e `decisao` apontam para o mesmo bloco de projeto. A etapa intermediária não exige envio. O programa com então vazio passa nos dez critérios intermediários, falha na entrega final e executa sem erros ou vitória antecipada. |
| Critérios cumulativos | Regressões de movimento fora do quadro, perda do movimento, memória inicialmente verdadeira e coleta sem atribuição são recusadas. Os critérios continuam sendo verificações estruturais; os testes jogados seguem necessários. |
| Roteiros e quiz | Tarefa, caminhos de montagem, testes e saída coerentes. A pergunta de memória recebeu novo identificador; as demais perguntas e o certificado foram preservados. |
| Caderno | Fontes incluem comparação de velocidade, memória, etapa sem chave e teste integrado. PDF de 19 páginas; páginas 13 e 16 reconferidas visualmente nesta revisão. |
| Projeto e progresso | Projetos iniciais, cadeia, jogo pronto e bloco de certificado preservados. Testes existentes de progressão, retomada e envio passaram. O percurso completo em contas reais continua sem ensaio. |

## Evidência executada nesta revisão

| Conjunto | Resultado |
| --- | --- |
| Core de aprendizagem e QA dos cursos | 817 passaram; zero falhas; 61 arquivos. |
| Member-shell: cenas, Estúdio e estado das seções | 478 passaram; zero falhas; 40 arquivos. |
| Members: toda a suíte unitária e de integração | 1.151 passaram; **uma falha**; 116 arquivos. Falha descrita no achado 1. |
| Diagnósticos adicionais | Quatro cenários: percurso real da memória via HTTP, rejeição das quatro ações na autoria, devolutiva de velocidade e execução da etapa com então vazio. Os diagnósticos dos defeitos confirmam o comportamento atual; não significam correção. |
| Manifestos e roteiros | 34 manifestos válidos, zero avisos; cinco roteiros do Farol e dez vídeos coerentes. |
| TypeScript | Core, member-shell e members sem erros. |
| Preservação e diff | Geração determinística, projetos e identidades preservados; sem erros de whitespace no escopo. |

Total das três suítes, sem somar novamente os subconjuntos executados antes: **2.446 testes passaram e um falhou**.

Logs locais: `tmp/farol-qa/full-review-core-qa.log`, `full-review-member-shell.log` e `full-review-members-expanded.log`. Diagnósticos adicionais: `tmp/farol-qa/full-review-http.test.ts` e `full-review-criteria.test.ts`.

## Verificação das correções

- `SceneActionSchema` agora declara as quatro ações novas. `remember-collection` exige `enabled` booleano. O teste existente de conformidade passou; a rota tipada dos diagnósticos devolveu HTTP 200 e preservou o conteúdo de todas as ações, incluindo `enabled: true` e `enabled: false`.
- O critério `andar` agora orienta: “Dentro de A cada quadro, mova personagem com velocidade 3, antes de conferir a borda.” Os manifestos dos Dias 1, 2 e 3 foram regenerados a partir da fonte comum, incluindo os dois critérios de seção do Dia 3. O diagnóstico confirmou que velocidade 1 apresenta essa orientação e que voltar somente o valor para 3 aprova a etapa.
- Repetida a mesma bateria: **817** testes do core/QA, **478** do member-shell e **1.152** do members; **2.447 aprovados, zero falhas**, em 217 arquivos. Os quatro diagnósticos adicionais também passaram, agora conferindo as correções e os percursos preservados.
- TypeScript do members e Biome dos dois arquivos de implementação alterados passaram. Os 34 manifestos são válidos; a geração continua determinística e preserva identidades, projetos, cadeia, jogo pronto e certificado.

Logs das correções: `tmp/farol-qa/fix-review-members.log`, `fix-review-core-qa.log`, `fix-review-member-shell.log`, `fix-review-diagnostics-after.log` e `fix-review-manifests.log`. Os diagnósticos posteriores estão em `fix-review-http.test.ts` e `fix-review-criteria.test.ts` nessa pasta; os diagnósticos originais conservam a reprodução dos defeitos anteriores.

## Limites e pendências

O navegador da sessão continuou indisponível: a descoberta retornou `[]`. A revisão de componentes, a renderização estática, o motor real e as rotas em memória não substituem conferir teclado, toque, tela estreita, autosave e navegação no player autenticado. Não atribuo aprovação visual/interativa a essas verificações.

Continuam pendentes as novas gravações, a reconciliação da mídia e do PDF no Admin, a atualização remota e o ensaio com crianças. A clareza das instruções e a coerência da sequência foram revisadas; aprendizagem efetiva não foi comprovada por estes testes técnicos.
