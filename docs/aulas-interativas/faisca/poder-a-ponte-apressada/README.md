# A ponte apressada

**Poder do Faísca (3 de 4). Autoria implementada localmente em 29/10/2026.** Relógio e estado
temporário, aplicado aos dois jogos do par: aula 1 no Farol 2D, aula 2 na Ilha 3D. A alavanca baixa
uma ponte levadiça, e 4 segundos depois ela sobe sozinha; com a ponte baixada, o personagem
atravessa até a pedra do sino, no meio de um laguinho. Um curso, duas aulas, conta como um Poder.
Manifestos, jogos, artes 2D e 3D, experiência, quiz com cenas, roteiros, derivados de voz e caderno
disponíveis. Gravação, escuta de voz e publicação ainda são etapas de produção.

- [Proposta completa](proposta.md): jogo, aulas, experiência, quiz, objetivos, artes e decisões.

A aula 1 ensina o conceito novo: vídeo do botão do semáforo, a experiência **A ponte apressada**
(cena `timed-bridge`, com o tempo andando um segundo por clique) e três montagens guiadas por
completo no vídeo (a alavanca baixa a ponte, a ponte sobe sozinha com o "depois de 4 segundos" e a
travessia com Se e senão), um quiz de quatro perguntas e a entrega. A aula 2 é a transferência: o
vídeo lembra a regra e a montagem completa da ilha fica no Passo a passo do projeto; duas montagens,
um quiz de duas perguntas e a entrega.

Nenhum bloco novo: o tempo usa o "depois de N segundos" de Programação → Repetições
(`sz_js_set_timeout_seconds`), que é do iniciante e igual nos dois jogos.

## Arquivos de produção

- [Aula 1: Aberta por um tempo (2D)](ponte-aula-1.md) · [manifesto](ponte-aula-1.manifesto.json) · [roteiro](ponte-aula-1.roteiro.md).
- [Aula 2: A ponte da ilha (3D)](ponte-aula-2.md) · [manifesto](ponte-aula-2.manifesto.json) · [roteiro](ponte-aula-2.roteiro.md).
- [Passo a passo em PDF](passo-a-passo-do-projeto.pdf) · [versão textual](passo-a-passo.md).
- Projetos portáteis: [entrada 2D](ponte-2d-inicio.szproject.json), [referência 2D](ponte-2d.szproject.json), [entrada 3D](ponte-3d-inicio.szproject.json), [referência 3D](ponte-3d.szproject.json).
- [Organização do curso](modulos.md) · [blocos usados](blocos.json).
- Artes: SVGs do Farol (`packages/studio/src/arte/assets/farol/{laguinho,alavanca-cima,alavanca-baixo,ponte-levantada,ponte-baixada,pedra-do-sino,pedra-do-sino-tocando}.svg`) e [modelos 3D no Blender](../../../design/a-ponte-apressada-blender/README.md).

Os nomes dos arquivos têm o prefixo `ponte-` porque os validadores acham cada aula pelo prefixo
(`qa/caminhos.ts`); o identificador da aula no manifesto continua `aula-1` e `aula-2`.

## Importação e publicação

Curso do seed: `jornada-faisca-poder-3` (adulto: `-adulto`). A `aula-1` reservada recebe a aula 2D;
a aula 3D entra como `aula-2`, criada no Admin dentro do mesmo curso antes da importação. Importe as
duas no modo preservar. ⚠️ Publicar o curso só depois da `aula-2`: o Admin exige apenas a aula
reservada. Para a oferta adulta, projete o vínculo com `manifestoParaDestino` (o curso está em
`COMMON_COURSE_SLUGS`); a fonte, a ajuda e a gravação são comuns.

⚠️ O título do curso no currículo passou a ser "A ponte apressada", mas o seed reaproveita o curso
que já existe e não muda o nome dele: troque o título de `jornada-faisca-poder-3` (e do `-adulto`)
para **A ponte apressada** no Admin, antes de publicar.

Os vídeos estão como `plannedVideo`: grave e anexe a mídia real antes de publicar. Anexe o PDF ao
bloco de materiais da parte 2 da aula 1; a versão textual já está no manifesto. Gere a voz do Zappy
no Admin depois de importar. Publicar na comunidade é opcional e não entra nos objetivos.

⚠️ Ordem dos serviços: a cena `timed-bridge`, as cenas do quiz (`ponte-a-tempo`, `ponte-atrasado`,
`ponte-de-novo`) e o teto novo de retângulos de chão da ida 3D (`MAX_WALKABLE_RECTS`, 32) precisam
do members, do kids, do admin e do studio-runtime já com esta versão antes de importar.

## Regenerar e conferir

Na raiz do repositório:

```bash
bun docs/aulas-interativas-tecnico/qa/gerar-ponte-quiz-artes.ts
bun docs/aulas-interativas-tecnico/qa/gerar-ponte.ts
bun docs/aulas-interativas-tecnico/recursos/a-ponte-apressada/gerar-caderno.ts
node docs/aulas-interativas-tecnico/recursos/a-ponte-apressada/renderizar-caderno.mjs
bun test docs/aulas-interativas-tecnico/qa/ponte.test.ts
bun test packages/members/tests/integration/ponte-poder-import.test.ts
bun docs/aulas-interativas-tecnico/qa/validar-manifestos.ts
python3 docs/aulas-interativas-tecnico/validar-roteiros.py
```

O render do caderno usa Chrome local (`SZ_CHECK_CHROMIUM` permite outro caminho).
`qa/ponte-browser.ts` roda os objetivos no executor real, por dimensão, cenário e etapa (cenários
`correto`, `sem-tempo`, `fora`, `rapido`, `so-imagem`, `sem-se`, `invertida`; rode um de cada vez,
porque vários navegadores juntos estouram o tempo do robô). `qa/ponte-preview/build.ts` monta a
prévia da experiência e dos dois quizzes com os componentes reais.

[Posto Faísca](../README.md) · [Regras da jornada](../../../jornada-do-criador.md)
