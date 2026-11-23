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
baú), a última delas envia o projeto, e um quiz de quatro perguntas fecha a aula. A aula 2 leva a regra para a ilha 3D: o vídeo lembra a Aula 1 e monta tudo de novo, com três (o sol, a lua e a estrela) montagens (a última envia) e um quiz de duas perguntas no fim.

Nenhum bloco novo: a ordem usa uma variável de número e a comparação `=` de Programação
(`sz_val_compare`, que já vem dentro do Se), iguais nos dois jogos. O baú é o das Moedas.

## A experiência na moldura nova (08/11/2026)

A experiência da aula 1 segue a proposta "Experiências do Faísca" (aprovada): o personagem anda até as pedras e chegar numa pedra é tocar o símbolo; como o baú decide é uma peça que se troca ("a ordem dos símbolos" ou "só quantos foram tocados"); o caderninho diz "Em que passo da placa?". Os botões de
gesto de antes saíram, e os nomes das variáveis ficam para a montagem (o vídeo da experiência
continua apresentando a variável, como na Chave do Farol). A instrução, as pistas, os pedidos de
cada descoberta e o Passo a passo falam a língua dessa tela; as falas do Zappy vêm do motor
(`guidance-*.ts` do core), com a ideia e o "No seu jogo" do fim.

**Pendências de produção:** gerar de novo a voz do Zappy no Admin, reimportar a aula 1 (o progresso
em andamento da experiência recomeça; a ordem de deploy é members antes de kids e community) e
anexar o PDF novo do Passo a passo.

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
bloco de materiais da parte 2 da aula 1. O bloco de materiais leva o livro do PDF e os links do Como fazer, sem os passos em texto (desde 22/11/2026: a criança assiste ao vídeo, não lê). Gere a voz do Zappy
no Admin depois de importar. Publicar na comunidade é opcional e não entra nos objetivos.

⚠️ Ordem dos serviços: a cena `symbol-sequence` e as cenas do quiz (`simbolos-ordem`,
`simbolos-fora`, `simbolos-recomeca`) precisam do members, do kids e do admin já com esta versão
antes de importar.

## Revisão de 23/11/2026: no padrão do Cadê, da Chave do Farol e da Ilha

Com as mesmas regras da Ilha do Farol (o teste `qa/faisca-padrao.test.ts` confere este curso):

- **Estrutura:** A estrela, a última construção, monta e envia; a parte só de envio (`entrega`) saiu das duas aulas. O quiz vem por último, como fechamento (`closing`). A Aula 2 ganhou a parte do sol, separada da lua, para ter as mesmas três montagens da Aula 1 sem um vídeo de dez minutos.
- **Falas:** uma ideia por parágrafo, o porquê antes do como, o teste no jogo com "Tá vendo?" e a causa, "É este bloco que…" e cada clique na sua frase. As frases de conferir, verificar e enviar são as comuns (`faisca-comum.ts`). Nenhuma fala espera o "Salvo".
- **Montagem no vídeo:** a Aula 2 (3D) mandava abrir o Passo a passo; agora monta o sol, a lua e a estrela inteiros no vídeo.
- **Na tela:** cada gesto na sua palavra, nos verbos do palco (ESPEC-ROTEIRO, seção 9). Os tempos das setas são estimativas e se acertam no Verificar plano.
- **Recados na página:** cada parte tem o seu, no formato da referência.
- **Debinha e Dedé:** a Debinha na Aula 1 (quatro perguntas) e o Dedé na Aula 2 (três), com a tabela de substituições no roteiro, o `.edicao.json` e o arquivo de voz de cada personagem.
- **Passo a passo:** refeito na [receita do caderno visual](../../../aulas-interativas-tecnico/recursos/caderno-visual/README.md), com 27 páginas e a capa feita com uma cena do jogo 3D do curso, renderizada no Blender com as peças publicadas. O texto mora em `caderno-conteudo.json`, e o PDF acompanha a aula revisada (o envio na última construção, o quiz no fim, sem "Salvo").

**Pendências de produção:** gerar a voz nova da professora (`.elevenlabs.txt`) e a de cada personagem (`.debinha.elevenlabs.txt`, `.dede.elevenlabs.txt`); gravar com o palco e acertar os tempos das setas no Verificar plano; reimportar as duas aulas (a seção `entrega` saiu das duas, e a Aula 2 ganhou a seção `sol`), com o Jogo 3D 0.33.0 já no ambiente (os projetos 3D saem com essa versão); se a importação recusar um exemplo salvo do Estúdio por ter mudado, dar a ele um id novo; anexar o PDF novo no Admin.

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
