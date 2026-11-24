# Patrulha Espacial

Cadastro editorial do **Curso da trilha 3D do Construtor**. Esta versão contém a autoria completa das cinco aulas reservadas e seus projetos progressivos. Mídias, cadastro no Admin e publicação continuam como etapas de produção; estes arquivos não afirmam que o curso já foi publicado.

## Identidade e configuração

| Campo | Valor para cadastro |
|---|---|
| Título | **Patrulha Espacial** |
| Público Kids | `kids`; slug `jornada-construtor-base-3d` |
| Público adulto | `adult`; slug `jornada-construtor-base-3d-adulto` |
| Modalidade | Curso gravado, com atividades e projeto no Estúdio |
| Posto | Construtor(a), segundo posto da Jornada |
| Papel na tela | Curso da trilha 3D |
| Dimensão / ferramenta | Tag 3D; Programação + extensão Jogo 3D, em blocos |
| Ordem pedagógica | Faísca concluído → Nave Contra Asteroides → Patrulha Espacial |
| Aulas reservadas | `aula-1`, `aula-2`, `aula-3`, `aula-4`, `aula-5` |
| Projeto contínuo | `construtor-patrulha-espacial` |
| Estado editorial | Autoria pronta para revisão, gravação e cadastro como rascunho |

O título não leva “3D”; a dimensão aparece na tag, conforme a [Jornada do Criador](../../../jornada-do-criador.md). Os dois slugs seguem a [regra de público do seed](../../../../packages/members/src/application/creator-journey/creator-journey-seed.ts). Os slugs das cinco aulas vêm do [cadastro reservado pelo seed](../../../../packages/members/src/infrastructure/persistence/drizzle/creator-journey-seed.repository.ts).

Reconciliar os UUIDs existentes do curso, do módulo e das aulas em cada público. Não criar um curso de mesmo título para substituir outro, nem apagar as cinco aulas reservadas. A proposta usa **um módulo**, renomeando o módulo provisório “Plano de produção” e preservando sua identidade. A ordem das aulas permanece de 1 a 5. Este documento não inventa UUIDs nem altera a política publicada da Jornada.

## Textos de apresentação

### Kids

**Descrição curta:** Leve sua nave para uma rota com profundidade: faça os lasers saírem dela, acerte asteroides, conte pontos e proteja suas três vidas.

**Descrição longa:** Depois de Nave Contra Asteroides, construa a Patrulha Espacial usando os blocos de Programação e Jogo 3D. Primeiro, jogue uma versão pronta. Depois, investigue as direções e o contato no espaço e monte as regras da sua patrulha em pequenas partes: disparos, surgimento de asteroides, limites, acertos, pontos e vidas. A abertura e as telas finais já estão preparadas; você vai construir as condições que decidem quando a partida termina. Cada aula traz montagens, testes e um envio do projeto. Consulte o Passo a passo quando precisar e, se quiser, compartilhe a patrulha no Mural ao terminar.

### Comunidade adulta

**Descrição curta:** Reconstrua o tiro espacial em três dimensões, integrando grupos, intervalos, contato, pontos, vidas e condições de resultado.

**Descrição longa:** A partir da nave construída em duas dimensões, programe uma patrulha com profundidade usando Programação e Jogo 3D. Investigue os eixos e o contato entre objetos, monte a origem e o percurso dos disparos, crie asteroides em intervalos e programe retirada, pontuação e dano. A cena, a câmera, os modelos, a abertura e as telas finais fornecem o apoio inicial. A autoria se concentra nas regras da partida e nos testes que mostram quando elas funcionam. O percurso termina com vitória, derrota e reinício conferidos, um projeto completo e publicação opcional no Mural.

As duas versões usam a mesma sequência de aprendizagem e os mesmos projetos. O master integral da professora serve à edição adulta. Na edição Kids, Debinha aparece nas aulas 1, 3 e 5 e Dedé nas aulas 2 e 4, substituindo os parágrafos completos indicados nos índices de edição. A troca de voz não retira instruções da montagem.

## Pré-requisitos e continuidade na Jornada

O aluno chega com o **Faísca concluído** e com **Nave Contra Asteroides**, curso da trilha 2D do Construtor, concluído antes desta base 3D. Conhece os acontecimentos, condições, estados simples e a nave 2D; não se presume que tenha feito um Poder específico do Faísca. A montagem dos blocos 3D é integral, mesmo quando a ideia já foi vivenciada em 2D.

O par Nave + Patrulha abre missão, Poderes e extras do Construtor conforme a política vigente. A promoção também exige a missão nas duas dimensões e dois Poderes distintos aplicados. Concluir esta base, isoladamente, não é uma promessa de promoção. Publicar no Mural é opcional. Essas regras pertencem à [Jornada](../../../jornada-do-criador.md), não aos critérios de uma parte desta aula.

**Certificado:** esta autoria não cria certificado, regra de emissão ou promessa de certificado para a Patrulha. Preservar a configuração vigente ao reconciliar o cadastro dos dois públicos. O encerramento reconhece o jogo concluído e apresenta o Mural opcional; não contém uma tela fictícia de certificado.

## Módulo 1 · Sua patrulha em três dimensões

**Resumo do módulo:** Leve a lógica da nave para uma rota com profundidade. Faça cada disparo nascer no lugar da nave, programe a chegada dos asteroides, reconheça os contatos e reúna pontos, vidas e decisões de resultado em uma partida completa. Cada aula termina com uma versão testada e enviada; a última inclui uma revisão e o convite opcional para compartilhar.

| Ordem / slug | Aula | Resumo para o cadastro | Conquista entregue |
|---|---|---|---|
| 1 · `aula-1` | [Da tela ao espaço](patrulha-espacial-aula-1.md) | Jogue a Patrulha, conheça o caderno, retome os três eixos na Ilha e construa o disparo em partes. | Laser nasce no X da nave, segue pelo Z negativo e termina o caminho. |
| 2 · `aula-2` | [Asteroides na rota](patrulha-espacial-aula-2.md) | Use um intervalo, monte a receita fornecida dos lugares de entrada e faça as pedras se aproximarem. | Asteroides surgem a cada 1,5 segundo, percorrem a faixa e são retirados depois de passar. |
| 3 · `aula-3` | [Acertar no espaço](patrulha-espacial-aula-3.md) | Investigue contato real na Ilha, programe a retirada do par e ligue o contador ao placar. | Cada asteroide acertado vale um único ponto; o placar mostra a contagem atual. |
| 4 · `aula-4` | [Três chances na patrulha](patrulha-espacial-aula-4.md) | Dê três vidas à nave, programe a batida e retire apenas a pedra envolvida. | Batida válida tira uma vida; desviar conserva a nave; passar pela rota não tira vida. |
| 5 · `aula-5` | [Uma patrulha completa](patrulha-espacial-aula-5.md) | Construa as condições de derrota e vitória, aplique os avisos fornecidos e confira uma nova partida. | Jogo completo com resultado único, reinício integral e envio final. |

O detalhamento das 25 partes está em [mapa-de-aulas.md](mapa-de-aulas.md). Há **18 montagens**, **19 projetos progressivos**, **duas experiências existentes da Ilha**, **dois quizzes** e **um envio ao fim da construção de cada aula**. O material aparece uma vez, na segunda parte da primeira aula. As partes de contador e soma, antes do mostrador, usam conferência de blocos e não prometem um efeito que ainda não aparece.

## Fronteira entre apoio e autoria

| Já vem preparado | O aluno constrói e testa |
|---|---|
| Cena, céu, câmera e alvo de enquadramento | Origem do disparo, leitura do X da nave e sentido do tiro |
| Nave, molde de laser e molde de asteroide em GLB | Cópias nos grupos e relógio de surgimento |
| Movimento lateral, altura fixa e limite X da nave | Receita lateral fornecida para as entradas e velocidades dos grupos |
| Grupos vazios, transporte das cópias e percurso dos pares | Limites para retirar tiros e asteroides |
| Guarda técnica `alvoAtivo` dentro do percurso dos pares | Contato do par, retirada dos objetos e consumo do alvo |
| Abertura, `estado = inicio`, Enter e telas finais com botão nativo | Guardas de `jogando` nos novos acontecimentos; contador, placar, vida e dano |
| Reinício nativo completo | Condições → mudança de estado → Fim de jogo, com derrota antes de vitória |

As velocidades começam em zero. O projeto inicial não contém disparos, relógio de surgimento, pontos, vida nem chamadas de resultado. A criança experimenta conquistas pequenas: cópia parada, lugar de origem, movimento, retirada, contato, contagem e resultado.

Na última montagem, quatro mensagens de “projeto inicial” recebem os **avisos fixos fornecidos da versão pronta**. Isso é acabamento fornecido; não é uma tarefa de construir telas ou uma escolha de regras. O [projeto final](projeto-final.szproject.json) permanece o jogo aprovado.

## Modelos e aparência

Os três assets são a **nave, o meteoro e o laser já existentes na galeria Patrulha Espacial**, preservados como GLBs embutidos no projeto. Cada um é carregado por um bloco nativo `sz_g3d_create_model_file`, que gera `SZGame3D.createModelFile`. Não há uma pilha de blocos de formas usada para desenhar essas artes. O objeto vazio que orienta a câmera é apoio de enquadramento, não uma quarta arte.

A origem é [__gen_patrulhaEspacial.ts, revisão 9ca0696](https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/packages/studio/src/official-extensions/game-3d/__gen_patrulhaEspacial.ts). As artes definitivas e suas variações serão produzidas por Helena no Blender. Esta edição usa os modelos provisórios e não exige que o aluno escolha entre variações 3D inexistentes. A futura personalização fica restrita à aparência e deve conservar regras, posições e dimensões de contato aprovadas.

## Capa, caderno e arquivos

- [Capa do curso](capa.jpg): composição a partir dos modelos reais do projeto, para revisão editorial.
- **Passo a passo do projeto:** [PDF produzido a partir dos passos e blocos reais desta autoria](passo-a-passo-do-projeto.pdf), apresentado como livro na Aula 1, Parte 2. A fonte textual está em [passo-a-passo.md](passo-a-passo.md); anexar o PDF definitivo no bloco nativo de materiais quando o pacote de produção for cadastrado.
- [Projeto inicial](projeto-inicial.szproject.json), [projeto final](projeto-final.szproject.json) e [etapas intermediárias](projetos/): importáveis no Estúdio.
- [Blocos do curso](blocos.json): IDs oficiais liberados nas aulas; inclui apoios já presentes e blocos ensinados. O inventário não significa que todos os blocos preparados serão reconstruídos pelo aluno.
- [Fonte estruturada da autoria](curso-autoria.json) e [configuração reproduzível](../../../aulas-interativas-tecnico/qa/construtor-3d.ts): falas, passos, testes, experiências, quizzes e critérios.
- Cada aula tem `.roteiro.md`, master integral `.elevenlabs.txt`, intervenções de personagem e `.edicao.json`. Áudios e vídeos ainda serão produzidos; nenhum arquivo TXT é apresentado como áudio gravado.

## Duração estimada para produção

Estimativas editoriais, ainda sem vídeos gravados. A fala mestre contém aproximadamente **7.300 palavras**, sem contar as tags de interpretação e antes de eventuais cortes de edição. A faixa de narração usa 110–140 palavras por minuto; os vídeos também precisam do tempo dos gestos e da observação do jogo. O tempo de estudo inclui construir, experimentar, repetir testes e enviar, e não é um limite para o aluno.

| Aula | Partes / vídeos | Fala estimada | Estudo com montagem e testes |
|---|---:|---:|---:|
| 1 | 7 / 7 | 13–17 min | 35–55 min |
| 2 | 4 / 4 | 10–13 min | 30–45 min |
| 3 | 6 / 5 | 11–14 min | 40–60 min |
| 4 | 3 / 3 | 8–10 min | 25–40 min |
| 5 | 5 / 4 | 12–16 min | 45–65 min |
| **Total** | **25 / 23** | **54–70 min de fala** | **175–265 min de estudo** |

Ajustar a duração de catálogo depois da edição. As partes curtas permitem distribuir cada aula em mais de uma sessão. O trecho de vitória pode cortar a repetição da partida na edição, preservando o teste real do resultado e sem alterar valores do projeto.

## Verificação e limites do pacote

Os 19 projetos e seus critérios estruturais foram conferidos com os contratos oficiais. O [relatório funcional da progressão](qa-runtime-progressao.json) registra as 19 etapas e 84 objetivos de execução: GLBs carregados, conquistas graduais, contatos, contagem, dano, prioridades e reinícios. Usa runtime oficial, Three.js, GLTFLoader e Canvas2D reais, com desenho WebGL substituído no adaptador de teste. O [relatório das experiências](qa-experiencias.json) registra as ações oficiais que fecham as cinco metas das duas bancadas.

Esses testes não substituem a revisão visual no Estúdio, a resolução dos alvos do Na tela no Verificar plano nem a revisão das mídias gravadas. Os manifestos e os roteiros preservam as identidades reservadas; reconciliar versões publicadas, UUIDs, capas e anexos no Admin é uma etapa posterior, com os artefatos concretos deste pacote.
