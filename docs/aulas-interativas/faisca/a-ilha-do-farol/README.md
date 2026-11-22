# A Ilha do Farol

Curso do posto **Faísca**, depois de **A Chave do Farol**. Três aulas em blocos com a extensão **Jogo 3D**, sem certificado. As artes 3D são feitas no Blender ([scripts e contrato](../../../design/ilha-do-farol-blender/README.md)), fiéis à Chave do Farol em 2D e com as mesmas variações da personalização: 8 personagens, 4 faróis, 4 barcos, 3 chaves e 4 cenários. Os projetos nos manifestos levam referências compactas da biblioteca. O arquivo importável leva as 24 malhas completas, para abrir sem depender da versão dessa biblioteca. Uma falha nas referências interrompe a preparação e mostra uma nova tentativa.

| Aula | Conceito novo e investigação | Construção no Estúdio |
| --- | --- | --- |
| [Uma ilha com profundidade](ilha-aula-1.roteiro.md) | Ponto de vista: revelar a chave sem mover os objetos | Movimento nas quatro direções, parada e reinício |
| [A chave está ao seu alcance](ilha-aula-2.roteiro.md) | X/Z no chão, Y na altura; contato em três dimensões | Posição da chave, coleta, memória e aviso |
| [A luz volta ao farol](ilha-aula-3.roteiro.md) | Revisão e aplicação dos conceitos, sem repetir experiências do 2D | Resposta sem chave, vitória com chave (o farol acende com a animação do modelo), a luz que acende uma vez só (guarda `Se não ganhou`), personalização com as variações e teste completo |

Cada aula tem manifesto, roteiro de produção, fala integral para ElevenLabs e índice de edição. A fonte editorial é [ilha-do-farol-conteudo.ts](../../../aulas-interativas-tecnico/qa/ilha-do-farol-conteudo.ts). Não editar somente os derivados. A professora grava o master inteiro; na edição kids, a Debinha (aulas 1 e 3) e o Dedé (aula 2) dizem as frases das tabelas de substituição do roteiro, com a voz dos arquivos `.debinha.elevenlabs.txt` e `.dede.elevenlabs.txt` (ver abaixo, 22/11/2026).

- [Passo a passo em PDF](passo-a-passo-do-projeto.pdf) e [versão em texto](passo-a-passo.md).
- [Projeto final importável no Estúdio](ilha-do-farol.szproject.json).
- [Proposta e decisões pedagógicas](proposta.md).
- [Módulo, descrição do curso e ordem das aulas](modulos.md).
- [Mapa técnico e comandos de verificação](../../../aulas-interativas-tecnico/modulos-a-ilha-do-farol.md).
- [Reintegração dos arquivos do Molda](reintegracao-molda.md) (histórico: as artes passaram para o Blender).
- [Revisão da implementação e evidências](revisao-implementacao.md).

## Produção e publicação

### Números dos blocos — 08/11/2026

Todos os projetos da Ilha usam **inteiros ou no máximo uma casa decimal** nos blocos,
desde a entrada da primeira aula até o jogo final e as variações de aparência. Os tamanhos e
posições são escolhas didáticas explícitas em `ilha-do-farol-projeto.ts`; não copiar para os
blocos os centros precisos calculados pelo Blender. A biblioteca continua com sua precisão
original. A posição da chave que a criança altera permanece inteira: de (-2; 1; -3) para
(-3; 1; -2).

| Objeto | Tamanho | Posição inicial (x; y; z) |
| --- | --- | --- |
| Cenário | 140 | 0; 33,6; 0 |
| Farol | 5,3 | 5,2; 2,7; 0,1 |
| Barco | 3,1 | 13; 1,1; 4,5 |
| Pedra | 4,5 | -2; 1,2; -0,5 |
| Personagem | 1,6 | -6,5; 0,8; 0,8 |
| Chave | 1,2 | -2; 1; -3 |

O barco chega a (6,6; 1,1; 4,5). As três áreas permitidas de caminhada já tinham no máximo
uma casa decimal. Nas gravações e capturas, usar os exemplos regenerados, inclusive os blocos
de preparação que aparecem ao fundo. A sequência das aulas e as instruções de movimento e de
posição da chave continuam iguais. O esquema de personalização do PDF usa os mesmos tamanhos
do projeto. Os sólidos usados pelo verificador também foram alinhados.

### Publicação

Implementação e autoria locais: experiências, quiz, objetivos, projetos progressivos, manifestos, roteiros, textos de voz e PDF. O jogo usa teclado (setas/WASD e R). As experiências seguem a moldura das telas livres desde 08/11/2026 (proposta "Experiências do Faísca", aprovada): a câmera é um controle com três lugares (Frente, Lado, Cima), cada número tem − e + na cor do eixo, o contato mostra o resultado do encontro na cena o tempo todo e o personagem anda com as setas (que seguem a câmera). A porta com o não (aula 3) acontece na ilha 3D do jogo do curso (cenário `ilha`), e não mais no mapa 2D da Chave do Farol. O navegador precisa oferecer WebGL.

**Pendências de produção desta mudança (08/11/2026):** gerar de novo a voz do Zappy no Admin (as falas das experiências mudaram, com a ideia e o "No seu jogo" de cada uma), reimportar as três aulas (o progresso em andamento da experiência recomeça; a ordem de deploy é members antes de kids e community) e conferir se algum vídeo já gravado mostra a cena antiga da aula 3 (o mapa 2D com a tabela).

Ainda dependem de produção: geração e escuta das vozes, gravação dos vídeos, anexação do PDF no Admin e publicação. `plannedVideo` é um molde de produção, não um vídeo publicado. O bloco de materiais leva o livro do PDF e os links do Como Fazer, sem os passos em texto (desde 22/11/2026: criança assiste ao vídeo, não lê); o PDF é anexado na publicação. Não houve importação remota nem implantação nesta tarefa.

O caderno é anexado uma única vez, em `materiais`, na parte 2 da primeira aula. As demais aulas remetem a ele. Desde 20/11/2026 o PDF segue a [receita do Passo a passo](../../../aulas-interativas-tecnico/recursos/caderno-visual/README.md) (capa, abertura com o índice das aulas, uma folha por parte com o cabeçalho da cena, passos numerados, esquemas com as cores dos blocos do Estúdio, galerias das escolhas, publicação no Mural e ajuda). O texto mora em `recursos/ilha-farol/caderno-conteudo.json`, e a arte da capa é a ilha do jogo, renderizada com as peças do curso por `docs/design/ilha-do-farol-blender/capa.py`. O encerramento oferece publicação opcional no Mural, sem transformá-la em requisito.

Usar o curso reservado **`jornada-faisca-base-3d`**; na oferta adulta, **`jornada-faisca-base-3d-adulto`**. A projeção de destino conserva os IDs internos e a cadeia do projeto. Conferir os cursos existentes por slug antes de importar; não recriar o curso nem reiniciar progresso. O currículo aponta para esta autoria, mantendo o hash do outline original do seed. Os títulos e a montagem completos vêm destes manifestos. Havendo aulas provisórias no Admin, reconciliar sua identidade antes da publicação.

Um ensaio com iniciantes ainda é necessário para avaliar compreensão, legibilidade e tempo de exploração. Os testes de software conferem funcionamento, não comprovam aprendizagem.

## Revisão de 20/11/2026: falas, gravação automática e Passo a passo

No molde do Cadê Todo Mundo? e de A Chave do Farol:

- **Falas:** uma ideia por parágrafo, o porquê antes do como, a retomada "Tá vendo?" com a causa,
  "É este bloco que…" e cada clique na sua frase. Nenhuma fala espera o "Salvo". A abertura
  guarda as mudanças da Helena ("Oi!" e "Explore a ilha. Quando terminar, clique em Próxima
  parte.").
- **Estrutura:** o envio fecha a última construção de cada aula, como no Farol. Aula 1 com quatro
  partes (a entrega e o fecho entraram no movimento), Aula 2 com seis (o fecho entrou no aviso) e
  Aula 3 com oito, mais a revisão; o fecho da Aula 3 continua com o Compartilhar.
- **Na tela:** cada gesto na sua palavra, nos verbos do palco (ESPEC-ROTEIRO, seção 9). O jogo é
  de teclado: `[rodar de novo]` dá o foco ao jogo no Estúdio, e `[tocar jogo]` no jogo pronto. Os
  caminhos das setas contam a velocidade 4 e os sólidos (a pedra fecha a linha do começo) e se
  acertam no Verificar plano. Para os nomes repetidos da paleta e dos blocos 3D (Encostar dentro
  de Encostar, dois Se, o encontro novo igual ao que já existe), o palco ganhou o caminho de
  categorias, `abaixo de` e o nome que segue pelos blocos encaixados.
- **Recados na página:** cada parte tem o seu, como no Farol.
- **Passo a passo:** refeito na receita do caderno visual, com 29 páginas.

**Pendências de produção:** gerar a voz nova (os três `.elevenlabs.txt`), gravar com o palco e
acertar os tempos das setas no Verificar plano, reimportar as três aulas (a Aula 1 perdeu as seções
`entrega` e `fecho`, e a Aula 2 a `fecho`) e anexar o PDF novo no Admin.

## Debinha e Dedé: 22/11/2026

A Ilha não tinha falas dos personagens. Agora tem, como o Cadê e a Chave do Farol: a Debinha nas
aulas 1 e 3 e o Dedé na aula 2, doze frases ao todo. O campo `kids` de cada parte em
`ilha-do-farol-conteudo.ts` marca a frase, e o gerador escreve a tabela de substituições no
roteiro, o `.edicao.json` e o arquivo de voz do personagem.

| Aula | Personagem | Frases |
| --- | --- | --- |
| 1 | Debinha | a pedra que esconde (abertura), a câmera e a chave (experiência), onde vai o bloco que faz andar |
| 2 | Dedé | o y no 3D e o encostar (experiências), a chave que some para sempre?, como ver que o jogo guardou a chave |
| 3 | Debinha | onde vai o aviso de que falta a chave, quem joga vai saber que deu certo?, o não na pergunta (experiência), por que a luz acendeu de novo, como mostrar o jogo para alguém |

As perguntas das experiências e a do aviso da vitória já estavam na fala da professora e só
ganharam a marcação. As outras seis são novas, no molde das que já foram gravadas na Chave do
Farol e no Cadê, e a resposta seguinte começa pelo que foi pedido. Como a voz da Ilha ainda não foi
gerada, nada gravado muda; todas as deixas do Na tela continuam na fala.

**Pendência de produção:** gerar no ElevenLabs a voz de cada personagem com o arquivo dele, junto
com a voz nova da professora, e o vídeo dos personagens para a montagem kids.

## Faísca: revisão de 27/10/2026

O projeto usa somente blocos iniciantes, sem listas, estruturas de objetos de Programação,
leitura genérica de propriedades ou JavaScript cru. Movimento, áreas permitidas, animações de
caminhada e encontro direto são comandos do Jogo 3D. As regras de coleta, `temChave`, aviso e
`se/senão` continuam no programa da criança. A câmera enquadra toda a área jogável ao mudar o
tamanho da prévia. O teste `farois-basicos.test.ts` cobre todas as etapas dos dois Faróis e a
conversão do código para blocos, sem exceções de `allowBlocks`.

Esta versão usa Jogo 3D 0.32.0. Atualizar o aplicativo no staging antes de importar os manifestos
regenerados: eles usam os novos comandos. O arquivo final é portátil quanto às artes; os comandos
continuam dependendo da versão correspondente da extensão.

## Câmera do jogador e chegada do barco — 28/10/2026

O `frameScene` passou a dar a vista ao jogador, sem bloco novo: começa mais perto (sem se afastar
só porque a prévia é estreita) e mirando o chão; a rodinha do mouse ou dois dedos aproximam e
afastam; arrastar gira em volta; duplo clique volta ao começo. A vista acompanha de leve o
personagem (um terço do caminho; de perto, inteira), e as setas andam em relação à câmera, então
"para cima" continua sendo "para longe" depois de girar. Na aula 1, girar mostra a chave
aparecendo ou sumindo atrás das pedras.

O barco sai de x 13, na beira da vista, e vem até o farol (antes saía de 8,5: andava 1,9 e quase
não se via). O critério da vitória confere que ele saiu do lugar (x < 12,5) meio segundo depois.


## Nomes dos blocos e o robô da regra sem chave — 28/10/2026

Os nomes dos blocos do Jogo 3D usados no curso passaram a dizer o que fazem, na ordem em que a
criança pensa (só o texto mudou; campos e projetos salvos continuam iguais):

| Antes | Agora |
|---|---|
| Enquadrar a cena … | Mostrar a cena … inteira: largura … altura … profundidade … |
| Andar com … usando WASD/setas, velocidade … | Fazer … andar com as setas (ou WASD), velocidade … |
| Animações de …: parado …, andando … | Animar …: parado toca …, andando toca … |
| Aproximar … de x y z (rapidez …) | Levar … até x y z aos poucos (rapidez …) |
| Posição do objeto … em x y z | Colocar o objeto … em x y z |
| Escrever no canto … da tela | Escrever na tela … (a opção do meio é "⊕ no centro") |
| Recomeçar o jogo | Reiniciar o jogo (o mesmo nome do Jogo 2D) |

"Mostrar a cena inteira" não começa com "Câmera" de propósito: o "Câmera da cena …: modo" é outro
bloco (seis modos presos a um objeto) e os dois se confundiriam.

No jogo a chave não tem prazo: `temChave` guarda a coleta e o farol só confere a variável quando o
personagem encosta nele. O prazo é do robô do "Verificar projeto", que aperta as setas no lugar da
criança. Medido no Chromium sem placa de vídeo, cada toque custava ~300 ms de leitura e durava no
máximo 200 ms: o trecho mais longo do curso (começo → farol, 11 unidades, regra `sem-chave-em-jogo`)
estourava os 7 s com o jogo certo. Agora o robô segura a seta nos trechos longos e acompanha a
posição, soltando antes do ponto (o fim do trecho vai em toques curtos), espera os modelos
chegarem e os quadros voltarem a fluir antes do primeiro passo, a regra sem chave leva o prazo
máximo (7,5 s) e os retângulos do robô são os mesmos `walkArea` do jogo
(`docs/qa/2026-10-27-navegacao-3d-hospedada.md`).
