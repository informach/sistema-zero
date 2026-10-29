# O baú dos símbolos

**Poder do Faísca (4 de 4). Autoria implementada localmente em 29/10/2026.** Estado que registra
uma ordem, aplicado aos dois jogos do par: aula 1 no Farol 2D, aula 2 na Ilha 3D. Três pedras com
símbolos (o sol, a lua e a estrela) abrem um baú quando tocadas na ordem certa; um símbolo fora da
vez recomeça a tentativa. O jogo guarda o passo da sequência numa variável, `passo`. Um curso, duas
aulas, conta como um Poder. Manifestos, jogos, artes 2D e 3D, experiência, quiz com cenas,
roteiros, derivados de voz e caderno disponíveis. Gravação, escuta de voz e publicação ainda são
etapas de produção.

- [Proposta completa](proposta.md): jogo, aulas, experiência, quiz, objetivos, artes e decisões.

A aula 1 ensina o conceito novo: vídeo da senha do cadeado, a experiência **A ordem dos símbolos**
(cena `symbol-sequence`, com o passo à vista e o modo "só contando" para comparar) e três montagens
guiadas por completo no vídeo (o sol começa, a lua pergunta a vez com Se e senão e a estrela abre o
baú), um quiz de quatro perguntas e a entrega. A aula 2 é a transferência: o vídeo lembra a regra e
a montagem completa da ilha fica no Passo a passo do projeto; duas montagens, um quiz de duas
perguntas e a entrega.

Nenhum bloco novo: a ordem usa uma variável de número e a comparação `=` de Programação
(`sz_val_compare`, que já vem dentro do Se), iguais nos dois jogos. O baú é o das Moedas.

## Arquivos de produção

- [Aula 1: Na ordem certa (2D)](simbolos-aula-1.md) · [manifesto](simbolos-aula-1.manifesto.json) · [roteiro](simbolos-aula-1.roteiro.md).
- [Aula 2: Os símbolos da ilha (3D)](simbolos-aula-2.md) · [manifesto](simbolos-aula-2.manifesto.json) · [roteiro](simbolos-aula-2.roteiro.md).
- [Passo a passo em PDF](passo-a-passo-do-projeto.pdf) · [versão textual](passo-a-passo.md).
- Projetos portáteis: [entrada 2D](simbolos-2d-inicio.szproject.json), [referência 2D](simbolos-2d.szproject.json), [entrada 3D](simbolos-3d-inicio.szproject.json), [referência 3D](simbolos-3d.szproject.json).
- [Organização do curso](modulos.md) · [blocos usados](blocos.json).
- Artes: SVGs do Farol (`packages/studio/src/arte/assets/farol/{pedra-sol,pedra-sol-acesa,pedra-lua,pedra-lua-acesa,pedra-estrela,pedra-estrela-acesa,placa-da-ordem}.svg`, com o baú das Moedas) e [modelos 3D no Blender](../../../design/o-bau-dos-simbolos-blender/README.md).

Os nomes dos arquivos têm o prefixo `simbolos-` porque os validadores acham cada aula pelo prefixo
(`qa/caminhos.ts`); o identificador da aula no manifesto continua `aula-1` e `aula-2`.

## Importação e publicação

Curso do seed: `jornada-faisca-poder-4` (adulto: `-adulto`). A `aula-1` reservada recebe a aula 2D;
a aula 3D entra como `aula-2`, criada no Admin dentro do mesmo curso antes da importação. Importe as
duas no modo preservar. ⚠️ Publicar o curso só depois da `aula-2`: o Admin exige apenas a aula
reservada. Para a oferta adulta, projete o vínculo com `manifestoParaDestino` (o curso está em
`COMMON_COURSE_SLUGS`); a fonte, a ajuda e a gravação são comuns.

⚠️ O título do curso no currículo é "A sequência dos símbolos", e o seed reaproveita o curso que já
existe sem mudar o nome dele: troque o título de `jornada-faisca-poder-4` (e do `-adulto`) para
**O baú dos símbolos** no Admin, antes de publicar.

Os vídeos estão como `plannedVideo`: grave e anexe a mídia real antes de publicar. Anexe o PDF ao
bloco de materiais da parte 2 da aula 1; a versão textual já está no manifesto. Gere a voz do Zappy
no Admin depois de importar. Publicar na comunidade é opcional e não entra nos objetivos.

⚠️ Ordem dos serviços: a cena `symbol-sequence` e as cenas do quiz (`simbolos-ordem`,
`simbolos-fora`, `simbolos-recomeca`) precisam do members, do kids e do admin já com esta versão
antes de importar.

## Regenerar e conferir

Na raiz do repositório:

```bash
bun docs/aulas-interativas-tecnico/qa/gerar-simbolos-quiz-artes.ts
bun docs/aulas-interativas-tecnico/qa/gerar-simbolos.ts
bun docs/aulas-interativas-tecnico/recursos/o-bau-dos-simbolos/gerar-caderno.ts
node docs/aulas-interativas-tecnico/recursos/o-bau-dos-simbolos/renderizar-caderno.mjs
bun test docs/aulas-interativas-tecnico/qa/simbolos.test.ts
bun test packages/members/tests/integration/simbolos-poder-import.test.ts
bun docs/aulas-interativas-tecnico/qa/validar-manifestos.ts
python3 docs/aulas-interativas-tecnico/validar-roteiros.py
```

O render do caderno usa Chrome local (`SZ_CHECK_CHROMIUM` permite outro caminho).
`qa/simbolos-browser.ts` roda os objetivos no executor real, por dimensão, cenário e etapa
(cenários `correto`, `lua-sem-se`, `estrela-sem-se`, `nao-volta`, `invertida`, `passo-errado`;
rode um de cada vez, porque vários navegadores juntos estouram o tempo do robô).
`qa/simbolos-preview/build.ts` monta a prévia da experiência e dos dois quizzes com os componentes
reais.

[Posto Faísca](../README.md) · [Regras da jornada](../../../jornada-do-criador.md)
