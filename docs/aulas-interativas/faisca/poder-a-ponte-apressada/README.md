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
travessia com Se e senão), a última delas envia o projeto, e um quiz de quatro perguntas fecha a aula. A aula 2 leva a regra para a ilha 3D: o vídeo lembra a Aula 1 e monta tudo de novo, com duas montagens (a última envia) e um quiz de duas perguntas no fim.

Nenhum bloco novo: o tempo usa o "depois de N segundos" de Programação → Repetições
(`sz_js_set_timeout_seconds`), que é do iniciante e igual nos dois jogos.

## A experiência na moldura nova (08/11/2026)

A experiência da aula 1 segue a proposta "Experiências do Faísca" (aprovada): o personagem anda até a alavanca e até a ponte (a água não deixa passar), o relógio do jogo anda sozinho (um segundo por segundo, e o relógio da partida começa no primeiro passo) e onde ele começa é uma peça que se troca ("quando puxa a alavanca" ou "quando a partida começa"); o caderninho diz "A ponte está aberta?". Os botões de
gesto de antes saíram, e os nomes das variáveis ficam para a montagem (o vídeo da experiência
continua apresentando a variável, como na Chave do Farol). A instrução, as pistas, os pedidos de
cada descoberta e o Passo a passo falam a língua dessa tela; as falas do Zappy vêm do motor
(`guidance-*.ts` do core), com a ideia e o "No seu jogo" do fim.

**Pendências de produção:** gerar de novo a voz do Zappy no Admin, reimportar a aula 1 (o progresso
em andamento da experiência recomeça; a ordem de deploy é members antes de kids e community) e
anexar o PDF novo do Passo a passo.

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
bloco de materiais da parte 2 da aula 1. O bloco de materiais leva o livro do PDF e os links do Como fazer, sem os passos em texto (desde 22/11/2026: a criança assiste ao vídeo, não lê). Gere a voz do Zappy
no Admin depois de importar. Publicar na comunidade é opcional e não entra nos objetivos.

⚠️ Ordem dos serviços: a cena `timed-bridge`, as cenas do quiz (`ponte-a-tempo`, `ponte-atrasado`,
`ponte-de-novo`) e o teto novo de retângulos de chão da ida 3D (`MAX_WALKABLE_RECTS`, 32) precisam
do members, do kids, do admin e do studio-runtime já com esta versão antes de importar.

## Revisão de 23/11/2026: no padrão do Cadê, da Chave do Farol e da Ilha

Com as mesmas regras da Ilha do Farol (o teste `qa/faisca-padrao.test.ts` confere este curso):

- **Estrutura:** A travessia, a última construção, monta e envia; a parte só de envio (`entrega`) saiu das duas aulas. O quiz vem por último, como fechamento (`closing`).
- **Falas:** uma ideia por parágrafo, o porquê antes do como, o teste no jogo com "Tá vendo?" e a causa, "É este bloco que…" e cada clique na sua frase. As frases de conferir, verificar e enviar são as comuns (`faisca-comum.ts`). Nenhuma fala espera o "Salvo".
- **Montagem no vídeo:** a Aula 2 (3D) mandava abrir o Passo a passo; agora monta a alavanca e a travessia inteiras no vídeo. A pedra fica em y 1,4 na fala; o projeto de referência guarda 1,42, e os objetivos medem o comportamento.
- **Na tela:** cada gesto na sua palavra, nos verbos do palco (ESPEC-ROTEIRO, seção 9). Os tempos das setas são estimativas e se acertam no Verificar plano.
- **Recados na página:** cada parte tem o seu, no formato da referência.
- **Debinha e Dedé:** a Debinha na Aula 1 (quatro perguntas) e o Dedé na Aula 2 (três), com a tabela de substituições no roteiro, o `.edicao.json` e o arquivo de voz de cada personagem.
- **Passo a passo:** refeito na [receita do caderno visual](../../../aulas-interativas-tecnico/recursos/caderno-visual/README.md), com 23 páginas e a capa feita com uma cena do jogo 3D do curso, renderizada no Blender com as peças publicadas. O texto mora em `caderno-conteudo.json`, e o PDF acompanha a aula revisada (o envio na última construção, o quiz no fim, sem "Salvo").

**Pendências de produção:** gerar a voz nova da professora (`.elevenlabs.txt`) e a de cada personagem (`.debinha.elevenlabs.txt`, `.dede.elevenlabs.txt`); gravar com o palco e acertar os tempos das setas no Verificar plano; reimportar as duas aulas (a seção `entrega` saiu das duas), com o Jogo 3D 0.33.0 já no ambiente (os projetos 3D saem com essa versão); se a importação recusar um exemplo salvo do Estúdio por ter mudado, dar a ele um id novo; anexar o PDF novo no Admin.

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
