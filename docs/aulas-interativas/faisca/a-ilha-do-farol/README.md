# A Ilha do Farol

Curso do posto **Faísca**, depois de **A Chave do Farol**. Três aulas em blocos com a extensão **Jogo 3D**, sem certificado. As artes 3D são feitas no Blender ([scripts e contrato](../../../design/ilha-do-farol-blender/README.md)), fiéis à Chave do Farol em 2D e com as mesmas variações da personalização: 8 personagens, 4 faróis, 4 barcos, 3 chaves e 4 cenários. Os projetos nos manifestos levam referências compactas da biblioteca. O arquivo importável leva as 24 malhas completas, para abrir sem depender da versão dessa biblioteca. Uma falha nas referências interrompe a preparação e mostra uma nova tentativa.

| Aula | Conceito novo e investigação | Construção no Estúdio |
| --- | --- | --- |
| [Uma ilha com profundidade](ilha-aula-1.roteiro.md) | Ponto de vista: revelar a chave sem mover os objetos | Movimento nas quatro direções, parada e reinício |
| [A chave está ao seu alcance](ilha-aula-2.roteiro.md) | X/Z no chão, Y na altura; contato em três dimensões | Posição da chave, coleta, memória e aviso |
| [A luz volta ao farol](ilha-aula-3.roteiro.md) | Revisão e aplicação dos conceitos, sem repetir experiências do 2D | Resposta sem chave, vitória com chave (o farol acende com a animação do modelo), personalização com as variações e teste completo |

Cada aula tem manifesto, roteiro de produção, fala integral para ElevenLabs e índice de edição. A fonte editorial é [ilha-do-farol-conteudo.ts](../../../aulas-interativas-tecnico/qa/ilha-do-farol-conteudo.ts). Não editar somente os derivados. Nesta versão a professora grava o master inteiro, sem substituições por Dedé/Debinha.

- [Passo a passo em PDF](passo-a-passo-do-projeto.pdf) e [versão em texto](passo-a-passo.md).
- [Projeto final importável no Estúdio](ilha-do-farol.szproject.json).
- [Proposta e decisões pedagógicas](proposta.md).
- [Módulo, descrição do curso e ordem das aulas](modulos.md).
- [Mapa técnico e comandos de verificação](../../../aulas-interativas-tecnico/modulos-a-ilha-do-farol.md).
- [Reintegração dos arquivos do Molda](reintegracao-molda.md) (histórico: as artes passaram para o Blender).
- [Revisão da implementação e evidências](revisao-implementacao.md).

## Produção e publicação

Implementação e autoria locais: experiências, quiz, objetivos, projetos progressivos, manifestos, roteiros, textos de voz e PDF. O jogo usa teclado (setas/WASD e R); as experiências também têm botões, sliders e campos numéricos. O navegador precisa oferecer WebGL.

Ainda dependem de produção: geração e escuta das vozes, gravação dos vídeos, anexação do PDF no Admin e publicação. `plannedVideo` é um molde de produção, não um vídeo publicado. O manifesto já contém os passos como material de texto para consulta; o PDF é anexado na publicação. Não houve importação remota nem implantação nesta tarefa.

O caderno é anexado uma única vez, em `materiais`, na parte 2 da primeira aula. As demais aulas remetem a ele. Seu PDF segue o mesmo template visual do Cadê Todo Mundo e da Chave do Farol, com capa ilustrada, índice, experiências, passos numerados, esquemas com as cores reais dos blocos, testes, entrega e ajuda. O encerramento oferece publicação opcional no Mural, sem transformá-la em requisito de conclusão.

Usar o curso reservado **`jornada-faisca-base-3d`**; na oferta adulta, **`jornada-faisca-base-3d-adulto`**. A projeção de destino conserva os IDs internos e a cadeia do projeto. Conferir os cursos existentes por slug antes de importar; não recriar o curso nem reiniciar progresso. O currículo aponta para esta autoria, mantendo o hash do outline original do seed. Os títulos e a montagem completos vêm destes manifestos. Havendo aulas provisórias no Admin, reconciliar sua identidade antes da publicação.

Um ensaio com iniciantes ainda é necessário para avaliar compreensão, legibilidade e tempo de exploração. Os testes de software conferem funcionamento, não comprovam aprendizagem.

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
estourava os 7 s com o jogo certo. Agora o toque vai até 600 ms quando o alvo está longe (ainda
limitado à metade da distância que falta), a regra sem chave leva o prazo máximo (7,5 s) e os
retângulos do robô são os mesmos `walkArea` do jogo.
