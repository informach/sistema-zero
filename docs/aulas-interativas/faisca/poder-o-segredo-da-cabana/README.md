# O segredo da cabana

**Poder do Faísca (2 de 4). Autoria implementada localmente em 29/10/2026.** Juntar duas
informações com **e**, aplicado aos dois jogos do par: aula 1 no Farol 2D, aula 2 na Ilha 3D. Uma
segunda porta, a cabana do faroleiro, só abre com a chave **e** o emblema. Um curso, duas aulas,
conta como um Poder. Manifestos, jogos, artes 2D e 3D, experiência, quiz com cenas, roteiros,
derivados de voz e caderno disponíveis. Gravação, escuta de voz e publicação ainda são etapas de
produção.

- [Proposta completa](proposta.md): jogo, aulas, experiência, quiz, objetivos, artes e decisões.

A aula 1 ensina o conceito novo: vídeo da bicicleta e do capacete, a experiência **A porta com duas
peças** (cena `two-pieces`) e duas montagens guiadas por completo no vídeo (guardar o emblema, como
a chave do Farol, e a pergunta da cabana com o bloco **e**), um quiz de quatro perguntas e a
entrega. A aula 2 é a transferência: o vídeo lembra a regra e a montagem completa da ilha fica no
Passo a passo do projeto; duas montagens, um quiz de duas perguntas e a entrega.

Nenhum bloco novo: a pergunta usa o bloco **e / ou** (`sz_val_logic`, Programação → Lógica e Se),
que já é do iniciante nos dois jogos.

## Arquivos de produção

- [Aula 1: Duas peças para abrir (2D)](cabana-aula-1.md) · [manifesto](cabana-aula-1.manifesto.json) · [roteiro](cabana-aula-1.roteiro.md).
- [Aula 2: Duas peças na ilha (3D)](cabana-aula-2.md) · [manifesto](cabana-aula-2.manifesto.json) · [roteiro](cabana-aula-2.roteiro.md).
- [Passo a passo em PDF](passo-a-passo-do-projeto.pdf) · [versão textual](passo-a-passo.md).
- Projetos portáteis: [entrada 2D](cabana-2d-inicio.szproject.json), [referência 2D](cabana-2d.szproject.json), [entrada 3D](cabana-3d-inicio.szproject.json), [referência 3D](cabana-3d.szproject.json).
- [Organização do curso](modulos.md) · [blocos usados](blocos.json).
- Artes: SVGs do Farol (`packages/studio/src/arte/assets/farol/{emblema,cabana-fechada,cabana-aberta}.svg`) e [modelos 3D no Blender](../../../design/o-segredo-da-cabana-blender/README.md).

Os nomes dos arquivos têm o prefixo `cabana-` porque os validadores acham cada aula pelo prefixo
(`qa/caminhos.ts`); o identificador da aula no manifesto continua `aula-1` e `aula-2`.

## Importação e publicação

Curso do seed: `jornada-faisca-poder-2` (adulto: `-adulto`). A `aula-1` reservada recebe a aula 2D;
a aula 3D entra como `aula-2`, criada no Admin dentro do mesmo curso antes da importação. Importe as
duas no modo preservar. ⚠️ Publicar o curso só depois da `aula-2`: o Admin exige apenas a aula
reservada. Para a oferta adulta, projete o vínculo com `manifestoParaDestino` (o curso está em
`COMMON_COURSE_SLUGS`); a fonte, a ajuda e a gravação são comuns.

⚠️ O título do curso no currículo passou a ser "O segredo da cabana", mas o seed reaproveita o curso
que já existe e não muda o nome dele: troque o título de `jornada-faisca-poder-2` (e do `-adulto`)
para **O segredo da cabana** no Admin, antes de publicar.

Os vídeos estão como `plannedVideo`: grave e anexe a mídia real antes de publicar. Anexe o PDF ao
bloco de materiais da parte 2 da aula 1; a versão textual já está no manifesto. Gere a voz do Zappy
no Admin depois de importar. Publicar na comunidade é opcional e não entra nos objetivos.

⚠️ Ordem dos serviços: a cena `two-pieces` e as cenas do quiz (`cabana-so-chave`, `cabana-ou`,
`cabana-ordem`) precisam do members, do kids e do admin já com esta versão antes de importar.

## Regenerar e conferir

Na raiz do repositório:

```bash
bun docs/aulas-interativas-tecnico/qa/gerar-cabana-quiz-artes.ts
bun docs/aulas-interativas-tecnico/qa/gerar-cabana.ts
bun docs/aulas-interativas-tecnico/recursos/o-segredo-da-cabana/gerar-caderno.ts
node docs/aulas-interativas-tecnico/recursos/o-segredo-da-cabana/renderizar-caderno.mjs
bun test docs/aulas-interativas-tecnico/qa/cabana.test.ts
bun test packages/members/tests/integration/cabana-poder-import.test.ts
bun docs/aulas-interativas-tecnico/qa/validar-manifestos.ts
python3 docs/aulas-interativas-tecnico/validar-roteiros.py
```

O render do caderno usa Chrome local (`SZ_CHECK_CHROMIUM` permite outro caminho).
`qa/cabana-browser.ts` roda os objetivos no executor real, por dimensão, cenário e etapa (cenários
`correto`, `ou`, `so-chave`, `so-emblema`, `sempre-aberta`, `invertida`, `sem-guardar`; rode um de
cada vez, porque vários navegadores juntos estouram o tempo do robô). `qa/cabana-preview/build.ts`
monta a prévia da experiência e dos dois quizzes com os componentes reais.

[Posto Faísca](../README.md) · [Regras da jornada](../../../jornada-do-criador.md)
