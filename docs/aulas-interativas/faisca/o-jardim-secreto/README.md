# O Jardim Secreto

**Missão do Faísca. Autoria implementada localmente em 28/10/2026.** Duas aulas, um jardim em 2D e outro em 3D. Manifestos, jogos, artes, roteiros, derivados de voz, quiz e caderno disponíveis. Gravação, escuta de voz e publicação ainda são etapas de produção.

A missão exige os conhecimentos investigados nas experiências e os blocos que a criança completou nos dois Faróis: movimento, limite 2D, coleta, memória, avisos, decisão e edição de posição. O personagem recolhe um regador e faz uma flor florescer somente depois da coleta. Ponto de vista e altura também entram na revisão. Câmera, iluminação, artes, áreas de caminhada 3D e reinício continuam preparados, pois não foram montados pela criança. Não exige Poder nem extra, não introduz um conceito de programação e não emite certificado.

- [Proposta completa, análise pedagógica, aulas, quiz, ajuda e critérios](proposta.md).
- [Review da proposta: problemas encontrados e correções](revisao-proposta.md).
- [Direção de arte: referências dos Faróis e do Cadê Todo Mundo](direcao-de-arte.md).
- [Posto Faísca](../README.md).
- [Contrato da jornada](../../../jornada-do-criador.md).

As montagens estão distribuídas em oito partes na aula 2D e sete na 3D, com objetivos por etapa e uma entrega por aula. O quiz cobre memória, escolha de teste, ponto de vista e altura. Reiniciar a partida preserva os blocos e a posição escolhida. Se o personagem não chega ao alvo, o executor informa que o teste não terminou; isso pede conferir movimento e acesso antes de diagnosticar a regra da flor.

## Arquivos de produção

- [Aula 1: jardim 2D](aula-1.md) · [manifesto](aula-1.manifesto.json) · [roteiro](aula-1.roteiro.md).
- [Aula 2: jardim 3D](aula-2.md) · [manifesto](aula-2.manifesto.json) · [roteiro](aula-2.roteiro.md).
- [Passo a passo em PDF](passo-a-passo-do-projeto.pdf) · [versão textual](passo-a-passo.md).
- Projetos portáteis: [entrada 2D](jardim-2d-inicio.szproject.json), [referência 2D](jardim-2d.szproject.json), [entrada 3D](jardim-3d-inicio.szproject.json), [referência 3D](jardim-3d.szproject.json).
- [Fontes das artes](../../../design/jardim-secreto/gerar-artes.ts) e [revisão da implementação](revisao-implementacao.md).

O vídeo principal apresenta a tarefa e relembra a ideia; a ajuda opcional explica toda a montagem. Não há experiências repetidas dos cursos-base. Os projetos de entrada deixam para o aluno os comandos ensinados; os modelos 3D portáteis contêm as malhas reais, inclusive o clipe `florescer`.

## Importação e publicação

Importe nas aulas **aula-1 e aula-2** já reservadas, no modo preservar. Não recrie o curso nem as aulas: seus UUIDs participam da jornada. Os exemplos de solução ficam privados na autoria. Cada dimensão tem sua própria cadeia de projeto; o 3D não sobrescreve o jardim 2D.

Para a oferta adulta, projete somente o vínculo para `jornada-faisca-missao-adulto` com o adaptador editorial existente. A fonte, a ajuda e a gravação são comuns. Os testes exercitam importação e reimportação nas duas ofertas.

Os vídeos estão como `plannedVideo`: grave e anexe a mídia real antes da publicação. Anexe o PDF ao bloco de materiais da parte 2 da aula 1; a versão textual já está incluída no manifesto. Nenhum endereço de mídia foi inventado. Publicar na comunidade é opcional e não entra nos objetivos. A missão não concede certificado nem substitui o Poder exigido para promoção.

## Regenerar e conferir

Na raiz do repositório:

```powershell
bun docs/design/jardim-secreto/gerar-artes.ts
bun docs/aulas-interativas-tecnico/qa/gerar-jardim-quiz-artes.ts
bun docs/aulas-interativas-tecnico/qa/gerar-jardim-secreto.ts
bun docs/aulas-interativas-tecnico/recursos/jardim-secreto/gerar-caderno.ts
node docs/aulas-interativas-tecnico/recursos/jardim-secreto/renderizar-caderno.mjs
bun test docs/aulas-interativas-tecnico/qa/jardim-secreto.test.ts
bun test packages/members/tests/integration/jardim-missao-import.test.ts
```

O navegador de QA usa Chrome local (`SZ_CHECK_CHROMIUM` permite outro caminho). `qa/jardim-browser.ts` roda os objetivos no executor real; aceita dimensão e cenário (`correto`, `sem-memoria`, `sem-decisao`, `sem-movimento`, `renomeada`). `qa/jardim-preview/build.ts` e `verify.mjs` conferem o quiz com os componentes reais em 1280 e 390 pixels.

Identidades reservadas pelo seed: `jornada-faisca-missao` e `jornada-faisca-missao-adulto`. A autoria deve preservar os UUIDs e as duas aulas planejadas; não cadastrar um curso duplicado nem alterar o outline histórico do seed para mudar títulos de apresentação.
