# Moedas no caminho

**Poder do Faísca (1 de 4). Autoria implementada localmente em 29/10/2026.** Contador numérico e
objetivo por quantidade, aplicado aos dois jogos do par: aula 1 no Farol 2D, aula 2 na Ilha 3D. Um
curso, duas aulas, conta como um Poder. Manifestos, jogos, artes 2D e 3D, experiência, quiz com
cenas, roteiros, derivados de voz e caderno disponíveis. Gravação, escuta de voz e publicação ainda
são etapas de produção.

- [Proposta completa](proposta.md): jogo, aulas, experiência, quiz, objetivos, artes e decisões.

A aula 1 ensina o conceito novo: vídeo do cofrinho, a experiência **O contador de moedas** (cena
`coin-counter`) e quatro montagens guiadas por completo no vídeo (o contador, a coleta com o evento
de grupo, o placar e o baú com Se/senão e "maior ou igual"), a última delas envia o projeto, e um quiz de quatro perguntas fecha a aula. A aula 2 leva a regra para a ilha 3D: o vídeo lembra a Aula 1 e monta tudo de novo, com três montagens (a última envia) e um quiz de duas perguntas no fim.

## A experiência na moldura nova (08/11/2026)

A experiência da aula 1 segue a proposta "Experiências do Faísca" (aprovada): passar numa moeda é pegar, sair de perto é se afastar e chegar ao baú é ele perguntar; o sumiço é um interruptor e o que o baú pergunta é uma peça que se troca ("Tem pelo menos 5 moedas?" ou "Tem exatamente 5 moedas?"); parado no baú, trocar a peça faz ele responder de novo na hora. Os botões de
gesto de antes saíram, e os nomes das variáveis ficam para a montagem (o vídeo da experiência
continua apresentando a variável, como na Chave do Farol). A instrução, as pistas, os pedidos de
cada descoberta e o Passo a passo falam a língua dessa tela; as falas do Zappy vêm do motor
(`guidance-*.ts` do core), com a ideia e o "No seu jogo" do fim.

**Pendências de produção:** gerar de novo a voz do Zappy no Admin, reimportar a aula 1 (o progresso
em andamento da experiência recomeça; a ordem de deploy é members antes de kids e community) e
anexar o PDF novo do Passo a passo.

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
bloco de materiais da parte 2 da aula 1. O bloco de materiais leva o livro do PDF e os links do Como fazer, sem os passos em texto (desde 22/11/2026: a criança assiste ao vídeo, não lê). Gere a voz do Zappy
no Admin depois de importar. Publicar na comunidade é opcional e não entra nos objetivos.

## Revisão de 23/11/2026: no padrão do Cadê, da Chave do Farol e da Ilha

Com as mesmas regras da Ilha do Farol (o teste `qa/faisca-padrao.test.ts` confere este curso):

- **Estrutura:** O baú, a última construção, monta e envia; a parte só de envio (`entrega`) saiu das duas aulas. O quiz vem por último, como fechamento (`closing`).
- **Falas:** uma ideia por parágrafo, o porquê antes do como, o teste no jogo com "Tá vendo?" e a causa, "É este bloco que…" e cada clique na sua frase. As frases de conferir, verificar e enviar são as comuns (`faisca-comum.ts`). Nenhuma fala espera o "Salvo".
- **Montagem no vídeo:** a Aula 2 (3D) mandava abrir o Passo a passo; agora monta as três construções inteiras no vídeo.
- **Na tela:** cada gesto na sua palavra, nos verbos do palco (ESPEC-ROTEIRO, seção 9). Os tempos das setas são estimativas e se acertam no Verificar plano.
- **Recados na página:** cada parte tem o seu, no formato da referência.
- **Debinha e Dedé:** a Debinha na Aula 1 (quatro perguntas) e o Dedé na Aula 2 (três), com a tabela de substituições no roteiro, o `.edicao.json` e o arquivo de voz de cada personagem.
- **Passo a passo:** refeito na [receita do caderno visual](../../../aulas-interativas-tecnico/recursos/caderno-visual/README.md), com 23 páginas e a capa feita com uma cena do jogo 3D do curso, renderizada no Blender com as peças publicadas. O texto mora em `caderno-conteudo.json`, e o PDF acompanha a aula revisada (o envio na última construção, o quiz no fim, sem "Salvo").

**Pendências de produção:** gerar a voz nova da professora (`.elevenlabs.txt`) e a de cada personagem (`.debinha.elevenlabs.txt`, `.dede.elevenlabs.txt`); gravar com o palco e acertar os tempos das setas no Verificar plano; reimportar as duas aulas (a seção `entrega` saiu das duas), com o Jogo 3D 0.33.0 já no ambiente (os projetos 3D saem com essa versão); se a importação recusar um exemplo salvo do Estúdio por ter mudado, dar a ele um id novo; anexar o PDF novo no Admin.

## Partes longas divididas (24/11/2026)

Antes da gravação, a revisão dos roteiros achou partes de até 1.232 palavras de fala (mais de 8 minutos de voz); a parte mais longa da Ilha tinha cerca de 730. As partes longas foram divididas: a primeira monta a pergunta (o Se só com o então) e testa; a seguinte abre o senão, monta a resposta do não, testa tudo e, se for a última, envia. Cada parte nova tem os seus objetivos, conferidos no executor real nas duas dimensões (`qa/<curso>-browser.ts`, com o cenário `sem-senao`, que a última parte reprova). Os ids dos exemplos que já existiam não mudam: as etapas novas entram no fim da ordem dos ids (`idEtapas` em `qa/poder-gerador.ts`). O caderno acompanha as partes novas. Na mesma revisão, o fim da última montagem de cada aula passou a anunciar as perguntas do quiz, que é a última parte e termina em Concluir aula.

- Aula 1: o baú vira **O baú abre com pelo menos 5** (Parte 7) e **Os avisos do baú** (Parte 8, com o envio); o quiz é a Parte 9.
- Aula 2: **O baú da ilha abre com pelo menos 5** (Parte 4) e **Os avisos do baú da ilha** (Parte 5); o quiz é a Parte 6.
- Etapa nova: `abre` (o baú fechado com poucas moedas, sem cobrar o aviso, e aberto com 5 e com 6).
- Na Aula 2, o Tocar a animação escolhe primeiro o modelo (bau) e depois a animação.

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
