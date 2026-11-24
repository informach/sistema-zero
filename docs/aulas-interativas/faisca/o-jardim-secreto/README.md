# O Jardim Secreto

**Missão do Faísca. Autoria implementada localmente em 28/10/2026.** Duas aulas, um jardim em 2D e outro em 3D. Manifestos, jogos, artes, roteiros, derivados de voz, quiz e caderno disponíveis. Gravação, escuta de voz e publicação ainda são etapas de produção.

A missão exige os conhecimentos investigados nas experiências e os blocos que a criança completou nos dois Faróis: movimento, limite 2D, coleta, memória, avisos, decisão e edição de posição. O personagem recolhe um regador e faz uma flor florescer somente depois da coleta. Ponto de vista e altura também entram na revisão. Câmera, iluminação, artes, áreas de caminhada 3D e reinício continuam preparados, pois não foram montados pela criança. Não exige Poder nem extra, não introduz um conceito de programação e não emite certificado.

- [Proposta completa, análise pedagógica, aulas, quiz, ajuda e critérios](proposta.md).
- [Review da proposta: problemas encontrados e correções](revisao-proposta.md).
- [Direção de arte: referências dos Faróis e do Cadê Todo Mundo](direcao-de-arte.md).
- [Posto Faísca](../README.md).
- [Contrato da jornada](../../../jornada-do-criador.md).

Cada aula tem cinco partes: a abertura com o jogo pronto, três etapas da missão (a última envia o projeto) e o fim (o Passo a passo do projeto na Aula 1 e a comemoração na Aula 2). O vídeo mostra o que o jogo precisa fazer e nunca monta os blocos (ver a seção da missão do posto, abaixo). Reiniciar a partida preserva os blocos e a posição escolhida. Se o personagem não chega ao alvo, o executor informa que o teste não terminou; isso pede conferir movimento e acesso antes de diagnosticar a regra da flor.

## Arquivos de produção

- [Aula 1: jardim 2D](aula-1.md) · [manifesto](aula-1.manifesto.json) · [roteiro](aula-1.roteiro.md).
- [Aula 2: jardim 3D](aula-2.md) · [manifesto](aula-2.manifesto.json) · [roteiro](aula-2.roteiro.md).
- [Passo a passo em PDF](passo-a-passo-do-projeto.pdf) · [versão textual](passo-a-passo.md).
- Projetos portáteis: [entrada 2D](jardim-2d-inicio.szproject.json), [referência 2D](jardim-2d.szproject.json), [entrada 3D](jardim-3d-inicio.szproject.json), [referência 3D](jardim-3d.szproject.json).
- [Fontes das artes 2D e publicação](../../../design/jardim-secreto/gerar-artes.ts), [modelos 3D no Blender](../../../design/jardim-secreto-blender/README.md) e [revisão da implementação](revisao-implementacao.md).

O vídeo principal apresenta a tarefa e relembra a ideia; a ajuda opcional explica toda a montagem. Não há experiências repetidas dos cursos-base. Os projetos de entrada deixam para o aluno os comandos ensinados; os modelos 3D portáteis contêm as malhas reais, inclusive o clipe `florescer`.

## Importação e publicação

Importe nas aulas **aula-1 e aula-2** já reservadas, no modo preservar. Não recrie o curso nem as aulas: seus UUIDs participam da jornada. Os exemplos de solução ficam privados na autoria. Cada dimensão tem sua própria cadeia de projeto; o 3D não sobrescreve o jardim 2D.

Para a oferta adulta, projete somente o vínculo para `jornada-faisca-missao-adulto` com o adaptador editorial existente. A fonte, a ajuda e a gravação são comuns. Os testes exercitam importação e reimportação nas duas ofertas.

Os vídeos estão como `plannedVideo`: grave e anexe a mídia real antes da publicação. Anexe o PDF ao bloco de materiais da parte 2 da aula 1. O bloco de materiais leva o livro do PDF e os links do Como fazer, sem os passos em texto (desde 22/11/2026: a criança assiste ao vídeo, não lê). Nenhum endereço de mídia foi inventado. Publicar na comunidade é opcional e não entra nos objetivos. A missão não concede certificado nem substitui o Poder exigido para promoção.

## Missão do posto (24/11/2026)

A Helena pediu que o Jardim funcione como uma missão do posto, e não como uma aula que ensina. Montar o jogo é o desafio para subir de posto, e tudo o que ele usa já foi ensinado nos cursos base (A Chave do Farol e A Ilha do Farol), com outro tema. Por isso a revisão de 23/11, que montava tudo no vídeo, foi desfeita nas construções.

| Parte | Aula 1 (2D) | Aula 2 (3D) |
| --- | --- | --- |
| 1. Abertura | o jogo pronto e o que é a missão | o jogo pronto em 3D |
| 2. Etapa | andar e não sair do jardim (Chave do Farol, Aula 1) | andar e recolher o regador (Ilha do Farol, Aulas 1 e 2) |
| 3. Etapa | o regador e a flor que só abre com ele (Chave do Farol, Aulas 2 e 3) | a flor que abre com o regador, uma vez só (Ilha do Farol, Aulas 2 e 3) |
| 4. Etapa e envio | um lugar novo para o regador (Chave do Farol, Aula 3) | um lugar novo no chão (Ilha do Farol, Aula 3) |
| 5. Fim | o Passo a passo do projeto | missão cumprida (só a comemoração) |

- **Etapas:** o vídeo roda o projeto do começo da etapa, para mostrar o que ainda não funciona. As animações da edição mostram o que o jogo precisa fazer, e a professora diz em que aula do curso base aquilo foi ensinado. Nenhum bloco é montado nem enviado no vídeo.
- **Verificação:** o Verificar projeto confere pelo que o jogo faz, então qualquer solução certa passa. Os objetivos de cada etapa somam os das etapas anteriores.
- **Sem dicas e sem quiz:** quem tiver dúvida volta na aula do curso base. O quiz continua em `jardim-quiz.ts`, porque a prévia do Jardim o usa, mas saiu das aulas.
- **Passo a passo:** é um caderno só, com as duas aulas, e chega na última parte da Aula 1, depois do envio. Na Aula 2, a última parte é só a comemoração, e a fala lembra que o caderno está no fim da Aula 1. A página do quiz saiu, e as partes foram renumeradas.
- **Publicação:** anexar o PDF só na Aula 1, no bloco de materiais da última parte, marcado como caderno do aluno para o Zappy ("Passo a passo do projeto para o Zappy"). Decisão de 24/11/2026: o passo a passo do projeto é sempre o caderno e fica sempre disponível para o Zappy. Antes ele ia sem a marca, para o Zappy não ter o caderno desde o começo da aula.
- **Teste:** `qa/missao-padrao.test.ts` confere que nenhum Na tela monta ou envia, que cada etapa diz onde voltar, que o caderno só vem depois do envio e que não há quiz. O Jardim saiu do `faisca-padrao.test.ts`, que vale para os cursos que ensinam montando.
- **Produção:** as vozes, as animações das etapas e a gravação ainda não foram feitas.

## Revisão de 23/11/2026: no padrão do Cadê, da Chave do Farol e da Ilha (substituída pela missão do posto)

Com as mesmas regras da Ilha do Farol (o teste `qa/faisca-padrao.test.ts` confere este curso):

- **Estrutura:** A posição, a última construção, monta e envia nas duas aulas; a parte só de envio (`entrega`) saiu. A Aula 1 termina no envio. Na Aula 2, o quiz vem por último, como fechamento (`closing`).
- **Falas:** uma ideia por parágrafo, o porquê antes do como, o teste no jogo com "Tá vendo?" e a causa, "É este bloco que…" e cada clique na sua frase. As frases de conferir, verificar e enviar são as comuns (`faisca-comum.ts`). Nenhuma fala espera o "Salvo".
- **Montagem no vídeo:** antes as construções ficavam para o Passo a passo; agora cada uma é montada inteira no vídeo, nas duas aulas. A decisão 3D guarda `ganhou` com o Se não ganhou, no molde da Ilha.
- **Na tela:** cada gesto na sua palavra, nos verbos do palco (ESPEC-ROTEIRO, seção 9). Os tempos das setas são estimativas e se acertam no Verificar plano.
- **Recados na página:** cada parte tem o seu, no formato da referência.
- **Debinha e Dedé:** a Debinha na Aula 1 (três perguntas) e o Dedé na Aula 2 (três), com a tabela de substituições no roteiro, o `.edicao.json` e o arquivo de voz de cada personagem.
- **Passo a passo:** refeito na [receita do caderno visual](../../../aulas-interativas-tecnico/recursos/caderno-visual/README.md), com 27 páginas e a capa feita com uma cena do jogo 3D do curso, renderizada no Blender com as peças publicadas. O texto mora em `caderno-conteudo.json`, e o PDF acompanha a aula revisada (o envio na última construção, o quiz no fim, sem "Salvo").

**Pendências de produção:** gerar a voz nova da professora (`.elevenlabs.txt`) e a de cada personagem (`.debinha.elevenlabs.txt`, `.dede.elevenlabs.txt`); gravar com o palco e acertar os tempos das setas no Verificar plano; reimportar as duas aulas (a seção `entrega` saiu das duas), com o Jogo 3D 0.33.0 já no ambiente (os projetos 3D saem com essa versão); se a importação recusar um exemplo salvo do Estúdio por ter mudado, dar a ele um id novo; anexar o PDF novo no Admin.

## Regenerar e conferir

Na raiz do repositório:

```powershell
JARDIM_OUT=docs/design/jardim-secreto-blender/out /tmp/blender-venv/bin/python docs/design/jardim-secreto-blender/build_all.py
bun docs/design/jardim-secreto/gerar-artes.ts
bun docs/aulas-interativas-tecnico/qa/gerar-jardim-quiz-artes.ts
bun docs/aulas-interativas-tecnico/qa/gerar-jardim-secreto.ts
bun docs/aulas-interativas-tecnico/recursos/jardim-secreto/gerar-caderno.ts
node docs/aulas-interativas-tecnico/recursos/jardim-secreto/renderizar-caderno.mjs
bun test docs/aulas-interativas-tecnico/qa/jardim-secreto.test.ts
bun test packages/members/tests/integration/jardim-missao-import.test.ts
```

O navegador de QA usa Chrome local (`SZ_CHECK_CHROMIUM` permite outro caminho). `qa/jardim-browser.ts` roda os objetivos no executor real; aceita dimensão e cenário (`correto`, `sem-memoria`, `sem-decisao`, `sem-movimento`, `renomeada` e, só no 3D, `sem-guarda`: sem o `Se não ganhou`, apenas o objetivo `uma-vez` reprova). `qa/jardim-preview/build.ts` e `verify.mjs` conferem o quiz com os componentes reais em 1280 e 390 pixels.

Identidades reservadas pelo seed: `jornada-faisca-missao` e `jornada-faisca-missao-adulto`. A autoria deve preservar os UUIDs e as duas aulas planejadas; não cadastrar um curso duplicado nem alterar o outline histórico do seed para mudar títulos de apresentação.
