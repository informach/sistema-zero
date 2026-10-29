# Moedas no caminho

**Poder do Faísca (1 de 4). Autoria implementada localmente em 29/10/2026.** Contador numérico e
objetivo por quantidade, aplicado aos dois jogos do par: aula 1 no Farol 2D, aula 2 na Ilha 3D. Um
curso, duas aulas, conta como um Poder. Manifestos, jogos, artes 2D e 3D, experiência, quiz com
cenas, roteiros, derivados de voz e caderno disponíveis. Gravação, escuta de voz e publicação ainda
são etapas de produção.

- [Proposta completa](proposta.md): jogo, aulas, experiência, quiz, objetivos, artes e decisões.

A aula 1 ensina o conceito novo: vídeo do cofrinho, a experiência **O contador de moedas** (cena
`coin-counter`) e quatro montagens guiadas por completo no vídeo (o contador, a coleta com o evento
de grupo, o placar e o baú com Se/senão e "maior ou igual"), um quiz de quatro perguntas e a entrega.
A aula 2 é a transferência: o vídeo lembra a regra e a montagem completa da ilha fica no Passo a
passo do projeto; três montagens, um quiz de duas perguntas e a entrega.

## Arquivos de produção

- [Aula 1: Cada moeda conta (2D)](moedas-aula-1.md) · [manifesto](moedas-aula-1.manifesto.json) · [roteiro](moedas-aula-1.roteiro.md).
- [Aula 2: Moedas na ilha (3D)](moedas-aula-2.md) · [manifesto](moedas-aula-2.manifesto.json) · [roteiro](moedas-aula-2.roteiro.md).
- [Passo a passo em PDF](passo-a-passo-do-projeto.pdf) · [versão textual](passo-a-passo.md).
- Projetos portáteis: [entrada 2D](moedas-2d-inicio.szproject.json), [referência 2D](moedas-2d.szproject.json), [entrada 3D](moedas-3d-inicio.szproject.json), [referência 3D](moedas-3d.szproject.json).
- [Organização do curso](modulos.md) · [blocos usados](blocos.json).
- Artes: SVGs do Farol (`packages/studio/src/arte/assets/farol/{moeda,bau-fechado,bau-aberto}.svg`) e [modelos 3D no Blender](../../../design/moedas-no-caminho-blender/README.md).

Os nomes dos arquivos têm o prefixo `moedas-` porque os validadores acham cada aula pelo prefixo
(`qa/caminhos.ts`); o identificador da aula no manifesto continua `aula-1` e `aula-2`.

## Importação e publicação

Curso do seed: `jornada-faisca-poder-1` (adulto: `-adulto`). A `aula-1` reservada recebe a aula 2D;
a aula 3D entra como `aula-2`, criada no Admin dentro do mesmo curso antes da importação. Importe as
duas no modo preservar. ⚠️ Publicar o curso só depois da `aula-2`: o Admin exige apenas a aula
reservada. Para a oferta adulta, projete o vínculo com `manifestoParaDestino` (o curso está em
`COMMON_COURSE_SLUGS`); a fonte, a ajuda e a gravação são comuns.

Os vídeos estão como `plannedVideo`: grave e anexe a mídia real antes de publicar. Anexe o PDF ao
bloco de materiais da parte 2 da aula 1; a versão textual já está no manifesto. Gere a voz do Zappy
no Admin depois de importar. Publicar na comunidade é opcional e não entra nos objetivos.

## Regenerar e conferir

Na raiz do repositório:

```bash
bun docs/aulas-interativas-tecnico/qa/gerar-moedas-quiz-artes.ts
bun docs/aulas-interativas-tecnico/qa/gerar-moedas.ts
bun docs/aulas-interativas-tecnico/recursos/moedas-no-caminho/gerar-caderno.ts
node docs/aulas-interativas-tecnico/recursos/moedas-no-caminho/renderizar-caderno.mjs
bun test docs/aulas-interativas-tecnico/qa/moedas.test.ts
bun test packages/members/tests/integration/moedas-poder-import.test.ts
bun docs/aulas-interativas-tecnico/qa/validar-manifestos.ts
python3 docs/aulas-interativas-tecnico/validar-roteiros.py
```

O render do caderno usa Chrome local (`SZ_CHECK_CHROMIUM` permite outro caminho). `qa/moedas-browser.ts`
roda os objetivos no executor real, por dimensão, cenário e etapa (cenários `correto`, `sem-remover`,
`igual-a-5`, `maior-que-5`, `sem-somar`, `sem-zerar`). `qa/moedas-preview/build.ts` monta a prévia
da experiência e dos dois quizzes com os componentes reais.

[Posto Faísca](../README.md) · [Regras da jornada](../../../jornada-do-criador.md)
