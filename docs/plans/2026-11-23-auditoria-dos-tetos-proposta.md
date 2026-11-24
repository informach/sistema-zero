# Auditoria dos tetos (proposta)

23/11/2026. Página da proposta: o artifact "Auditoria dos Tetos". Este arquivo é a cópia no
repositório.

Esta auditoria responde, com números medidos em aparelhos de verdade, à pergunta da Helena: uma
criança dedicada consegue fazer um jogo grande e bem acabado, em 2D e em 3D, com personagens,
modelos e cenários detalhados que ela mesma fez no Pinta e no Molda, e esse jogo chega inteiro até
quem vai jogar?

**Em uma frase:** montamos os maiores jogos e as artes mais detalhadas que uma criança faria,
levamos cada um pelo caminho inteiro (criar, guardar, abrir em outro aparelho, entregar, publicar
e jogar), medimos no notebook comum e no tablet, e consertamos o que travar, com uma regra já
decidida para cada tipo de teto.

## O que você recebe no fim

- Um veredito por tipo de jogo (aventura 2D, plataforma 2D, exploração 3D, plataforma 3D, Python
  2D, Python 3D e Pro): se dá para fazer, em que tamanho, em que aparelho e a partir de que posto
  da Jornada.
- Os consertos do caminho: nenhum corte em silêncio, recados que dizem o que fazer e as saídas
  aceitando o que o editor deixa criar.
- Os jogos e as artes de referência guardados como prova permanente, para nenhuma mudança futura
  encolher o que a criança consegue fazer sem alguém perceber.
- Uma página com todos os tetos da plataforma, o motivo de cada um e o recado que a criança vê.

## Os próximos passos

1. **A Helena aprova a proposta** (ou diz o que mudar). Nada começa antes disso.
2. **Lote 1:** os sete jogos grandes, as artes detalhadas do Pinta, do Molda e dos Cenários, e a
   página de medida no staging. A Helena não precisa fazer nada nessa fase.
3. **A Helena mede no notebook e no tablet:** abre a página de medida, aperta Começar e espera,
   cerca de 20 minutos em cada aparelho. Os números vão sozinhos para o armazenamento.
4. **Lote 2:** o relatório. Para cada tipo de jogo: se dá para fazer, em que tamanho, em que
   aparelho e o que trava.
5. **Lotes 3 a 6:** os consertos. Primeiro os recados dos tetos e o fim dos cortes em silêncio;
   depois a entrega da aula e o Mural aceitando jogo grande; depois os tetos que a medida mandar
   subir.
6. **A Helena mede de novo** nos mesmos aparelhos, para confirmar que o jogo grande passa o
   caminho inteiro.

Se faltar alguma ferramenta de detalhe no Pinta ou no Molda, ela chega numa proposta de tela
separada, com as fotos do app, para a Helena aprovar.

## O que o levantamento de hoje já mostrou

Os quatro inventários de 23/11 (Pinta; Molda e Cenários; jogos do Estúdio; conta e publicação)
leram mais de 250 tetos no código.

**1. Os editores deixam fazer bastante, e o aperto está nas saídas.** O Estúdio aceita até 128
materiais e 24 MB num jogo (33 milhões de caracteres), e a conta guarda até 40 MB comprimidos. A
entrega da aula e o "Verificar" aceitam 1,5 milhão de caracteres com as imagens dentro, o que dá
menos de duas imagens grandes. O Mural e o /jogar aceitam 6 MB, e o Pro hospedado 2,5 MB. O jogo E
da galeria tem 20 MB: abre no editor e cabe na conta, mas não seria publicado. Já existe um caminho
que aceita projeto grande: a entrega a partir da galeria manda o projeto em partes, até 40 MB.

**2. A arte detalhada aperta na passagem para o jogo.**
- Pinta: personagem até 128 px, 12 animações de 24 quadros, 4 camadas e 64 cores. Cada desenho
  chega ao Estúdio como um PNG de até 800 mil caracteres, com a folha de animações inteira dentro.
  O mapa vai ao Estúdio em até 2,1 milhões de caracteres, e o maior mapa que o Pinta deixa fazer
  tem 11,2 milhões. O cenário vetorial tem no máximo 500 formas, e as peças só podem ter 16, 32 ou
  48 px.
- Molda: o modelo vai até 20 mil triângulos e 128 peças no editor; no jogo, até 48 malhas e cerca
  de 5 MB por modelo.
- Cenários: o editor aceita 20 mil objetos, e o Estúdio leva cerca de 1.300 (a cena viaja num
  arquivo de 1 MB). O mundo de 2 km só existe nos jogos em JavaScript.

**3. Onze tetos cortam em silêncio ou dizem a coisa errada.** A lista está em "O que a criança vê
quando chega num teto". O pior: no Jogo 3D, o objeto que passa de 300 simplesmente não nasce.

**4. Faltam medidas no aparelho que importa.** Nenhuma medida foi feita num notebook comum nem num
tablet de verdade. O editor dos Cenários num mundo de 2 km nunca foi medido. O Reino Zero Ultra
(7.297 blocos) não tem quadros por segundo medidos. As medidas de hoje vêm de placa de vídeo
dedicada ou de processador emulado.

## Os jogos de referência

São sete jogos, um para cada jeito de criar que a plataforma oferece, no tamanho do maior projeto
que uma criança dedicada faria em alguns meses. Cada um parte de um jogo grande que já existe e
cresce até o tamanho-alvo só com blocos e recursos que existem, como foi feito no jogo D. Ficam só
para a equipe, na galeria, como os jogos D e E.

| Jogo | Feito com | Parte de | Tamanho-alvo |
|---|---|---|---|
| Aventura 2D | Blocos | Jogo D (Mundo das Portas) | Mundo de 256 × 192 peças de 32 px em 8 camadas, 8 regiões, 12 cavernas e casas ligadas por 30 portas, 1.500 objetos no mapa com até 300 vivos, 12 inimigos e um chefe, 40 sons e 6 músicas, salvar o progresso, cerca de 4 mil blocos |
| Plataforma 2D | Blocos | Reino Zero Ultra | 12 fases em 3 mundos, 3 chefes, fundo em 4 camadas, 24 tipos de inimigo, 60 sons, cerca de 9 mil blocos |
| Exploração 3D | Blocos | Jogo E e o mundo de 2 km | Mundo de 2 km com 16 regiões, 5 mil objetos, 20 construções e um rio, herói do Molda com esqueleto, 10 personagens, 8 missões, salvar o progresso |
| Plataforma 3D | Blocos | Uma cópia dos jogos 3D dos cursos (Ilha do Farol e Poderes) | 8 fases de até 250 objetos, 30 modelos do Molda, chefe com esqueleto, moedas e pontos de volta |
| Aventura em Python | Pygame-ce | A maior das trilogias Clear Code | 20 arquivos, 6 mapas do Pinta de 128 × 128, 60 personagens animados, 30 sons, salvar o progresso |
| 3D em Python | Raylib 3D | Os exemplos Raylib 3D e o `cenario.py` | Cenário do Molda no maior tamanho que o Python lê, 10 modelos com esqueleto, câmera em terceira pessoa |
| Jogo Pro | JavaScript com Vite | Os kits do Pro | 60 arquivos, 20 MB de materiais, 3 fases |

## As artes de referência

Cada pacote tem o tamanho de uma arte caprichada de um jogo independente pequeno, e os jogos de
referência usam essas artes.

**Pinta (2D)**
- Herói em pixel art de 64 px, com 8 animações (parado, andar, correr, pular, cair, atacar, levar
  dano e vitória) de 8 a 12 quadros, 4 camadas e 48 cores extras.
- O mesmo herói em 128 px, para jogos com a câmera perto.
- 12 inimigos de 32 a 64 px com 4 animações cada e um chefe de 128 px com 6 animações.
- Um conjunto de 256 peças de 32 px, com 12 peças animadas (água, lava e tochas) e terreno
  automático.
- O mapa da aventura 2D: 256 × 192 peças, 8 camadas, 1.500 objetos e 30 desenhos ligados por portas.
- Um fundo em 4 camadas de 512 px para o efeito de profundidade e uma ilustração vetorial de
  960 × 540 com o máximo de formas que o Pinta deixa.

**Molda (3D)**
- Herói com esqueleto, perto de 20 mil triângulos, pintado em 1024 px, com 8 movimentos.
- 6 personagens e 3 chefes com esqueleto.
- 30 objetos de cenário (árvores, pedras, casas e ponte) entre 2 e 8 mil triângulos.
- Um castelo de 128 peças, o máximo do editor.

**Cenários (3D)**
- O mundo de 2 km da exploração 3D: relevo esculpido, 8 tintas de chão, rio e trilhas, 16
  regiões, 5 mil objetos espalhados (florestas e pedras) e 20 construções, com os moldes do pacote
  do Molda.

**Como as artes são feitas.** Cada pacote é gerado por script, no formato da própria ferramenta e
no tamanho-alvo, para os números serem exatos e repetíveis. Uma peça de cada pacote (o herói do
Pinta, o herói do Molda e uma região do mundo) é montada pela tela da ferramenta, gesto a gesto,
por automação, para provar que a tela chega naquele detalhe e medir a resposta de cada gesto.

**As ferramentas de detalhe.** A auditoria compara o que o Pinta, o Molda e os Cenários oferecem
para fazer detalhe com as ferramentas que artistas de jogos pequenos usam: Aseprite para pixel art,
LDtk e Tiled para mapas e Blockbench para modelos 3D de jogo. A ferramenta que faltar vai numa
proposta de tela própria, com as fotos do app, para a Helena aprovar como sempre.

## O caminho inteiro

Cada jogo e cada arte percorrem os onze passos, na ordem em que a criança vive.

| # | Passo | Passa quando |
|---|---|---|
| 1 | Criar na ferramenta | A ferramenta deixa chegar ao tamanho-alvo sem recusar e sem cortar nada. |
| 2 | Editar com o projeto grande aberto | Os gestos respondem dentro dos números do editor. |
| 3 | Guardar e recarregar a página | Recarregar logo depois de mexer não perde nada. |
| 4 | Guardar na conta e abrir em outro aparelho | O outro aparelho abre o projeto inteiro, igual ao primeiro. |
| 5 | Levar a arte ao Estúdio | A arte chega ao jogo inteira (animações, camadas, objetos e peças), sem redução escondida. |
| 6 | Rodar o jogo | O jogo roda dentro dos números do aparelho. |
| 7 | Salvar o progresso dentro do jogo e voltar | O que o jogo guardou volta inteiro depois de fechar e abrir. |
| 8 | Entregar na aula e Verificar | A entrega e o Verificar aceitam o projeto, e a equipe abre o mesmo jogo. |
| 9 | Publicar no Mural | O post sai com a capa e o jogo completo. |
| 10 | Jogar no /jogar | Quem abre o link joga o mesmo jogo, no computador e no tablet. |
| 11 | Fazer a minha versão e baixar o projeto | A cópia e o arquivo baixado abrem iguais ao original. |

## Os aparelhos e os números

| Aparelho | Papel na auditoria |
|---|---|
| Notebook comum (vídeo integrado, 8 GB de memória; o notebook da casa serve) | É o aceite: os números abaixo valem para ele. |
| Computador com placa de vídeo | Referência alta, a mesma das medidas de hoje. |
| Tablet médio (iPad de entrada ou Android com 4 GB) | Abre, joga e salva com os números do tablet. |
| Celular | Só confere que abre, joga e salva. Não segura nenhum lote. |
| CI (processador 4 vezes mais lento e placa emulada) | Alarme de piora a cada mudança. Nunca vale como aceite. |

| O que se mede | No notebook comum | No tablet |
|---|---|---|
| Jogo 2D rodando | Mediana de 55 quadros por segundo ou mais; 95% dos quadros em até 25 ms; nenhum quadro acima de 100 ms ao passar por uma porta ou trocar de fase | Mediana de 50 ou mais |
| Jogo 3D rodando | Mediana de 30 ou mais; 95% dos quadros em até 45 ms; ao entrar numa região, até 3 quadros acima de 100 ms e nenhum acima de 200 ms; até 100 desenhos e 400 mil triângulos por quadro; até 96 MB de texturas e 350 MB de memória (os números da página de medida dos mundos) | Mediana de 24 ou mais |
| Estúdio com o jogo aberto | Abrir em até 10 s; arrastar, editar ou mostrar um bloco: 95% em até 100 ms; do Rodar ao primeiro quadro em até 5 s | Abrir em até 20 s |
| Pinta | Abrir em até 3 s; traço: 95% em até 50 ms; guardar em até 1 s | Traço: 95% em até 80 ms |
| Molda | Abrir em até 5 s; girar a vista a 30 quadros por segundo; gesto de ferramenta: 95% em até 100 ms | Girar a vista a 24 |
| Cenários | Abrir em até 10 s; girar a vista a 30; pincel: 95% em até 100 ms | Girar a vista a 24 |
| Conta | Jogo de 20 MB guardado em até 2 minutos numa conexão de 10 Mbps, e inteiro no outro aparelho | Igual |
| /jogar | Jogo de 20 MB começa em até 20 s numa conexão de 10 Mbps, com o progresso à vista | Igual |

**A medida.** A página de medida dos mundos grandes, que a frente dos 2 km pôs no staging em 23/11
(`/estudio/medida-mundos`, só a equipe), cresce para medir os sete jogos e os editores. Ela já grava
cada medida no armazenamento privado, com o aparelho e a versão do app. A Helena abre a página no
notebook e no tablet, aperta Começar e espera: cerca de 20 minutos por aparelho, uma vez depois do
lote 1 e outra no fim.

## Como cada teto é decidido

Cada teto que um jogo ou uma arte tocar recebe uma destas quatro classes, e a classe já diz o que
acontece com ele.

1. **Saída menor que o editor.** A saída passa a aceitar o que o editor deixa criar. Nenhum teto
   de editor desce para caber numa saída.
2. **Protege o aparelho.** Fica onde a medida no notebook comum mandar. Sobe se o jogo de
   referência passar nos números com folga, e nunca desce para os projetos que já existem.
3. **Resolve com carga por partes.** Onde o mundo pode carregar por regiões (cenário 3D e mapa do
   Pinta), o teto do arquivo inteiro dá lugar ao teto do pedaço carregado.
4. **Formato que segura o detalhe.** Sobe se a arte de referência precisar e o editor continuar
   respondendo nos números com a arte aberta.

Dois tipos de teto ficam fora, e o relatório diz isso de cada um: os tetos de posto da Jornada,
que são decisões pedagógicas (o veredito diz a partir de que posto cada jogo fica possível), e os
tetos de segurança contra arquivo malicioso (tamanho de importação e profundidade do arquivo), que
a auditoria só confere se ficam acima do que o editor deixa criar. A catraca do tamanho do código
dos motores continua só descendo: ela limita o motor, nunca a criança.

## O que a criança vê quando chega num teto

- Um contador à vista a partir de 80% de cada teto que ela pode alcançar (materiais, blocos,
  objetos, formas e camadas), no lugar onde ela está trabalhando.
- No teto, um recado que diz o que aconteceu e o que fazer, em palavras de criança, sem número
  técnico cru.
- Nada some em silêncio e nada se perde: o que não coube fica guardado, com o motivo.
- "Tente de novo" só aparece para falha passageira, nunca para um teto.

Os onze consertos que o levantamento já achou:

1. No Jogo 3D, o objeto que passa de 300 não nasce e ninguém fica sabendo (o recado do console
   fala de outra coisa). Passa a aparecer um recado na gaveta Problemas do Estúdio, com o número e
   o que fazer.
2. O projeto acima de 10 mil blocos, ao ser importado, é recusado com a frase de que tem partes que
   o Estúdio "ainda não sabe abrir". Ele passa a dizer que o projeto ficou grande demais, e o
   contador de blocos aparece antes de a criança chegar lá.
3. No salvar progresso, o valor acima de 100 mil caracteres é cortado ao guardar e volta truncado.
   O jogo passa a receber o erro na hora de salvar, como já acontece com o espaço cheio.
4. No Mural, acima de 9 MB a criança lê "tente de novo daqui a pouco", e a capa acima de 4 MB some
   do post. Os dois viram recados do teto.
5. Na conta, a 2.001ª criação recebe o recado de falta de espaço. Ele passa a falar de quantidade.
6. Os recados de material dizem "imagem inválido" e "assets". Passam a falar português de criança.
7. O "Trazer do Molda" diz só "grande demais". Passa a dizer qual limite, com as mesmas linhas do
   "Conferir para o Estúdio".
8. A peça escondida de um modelo do Molda some no Estúdio sem aviso. Ela ganha aviso.
9. O desenho do Pinta na aula só descobre o limite ao enviar, e a tela mostra "tente de novo". O
   tamanho passa a ser conferido antes, e o motivo chega à tela.
10. O cenário do Pinta que não cabe no Estúdio sai na leitura com aviso só no console. Ele vira
    recado na tela.
11. No Pinta vetorial, o texto para de aceitar letras e o traço longo é simplificado, os dois sem
    aviso. Os dois ganham aviso.

## Os lotes

**Lote 1. Os jogos, as artes e a medida.**
- Os sete jogos e os três pacotes de arte, gerados por script, só para a equipe na galeria.
- A peça de cada pacote montada pela tela, gesto a gesto.
- A página de medida cresce para os sete jogos e os editores.

**Lote 2. O caminho inteiro, medido.**
- Cada jogo e cada arte pelos onze passos: no CI (as provas de tamanho são exatas e as de tempo
  são alarme) e nos aparelhos (aceite).
- A comparação das ferramentas de detalhe.
- Cada teto tocado com a sua classe e o motivo.
- O relatório com o veredito por tipo de jogo.

**Lote 3. O que a criança vê no teto.**
- Contadores a partir de 80%, recados e o fim dos cortes em silêncio: os onze acima e os que o
  lote 2 achar.

**Lote 4. As saídas aceitam o que o editor cria.**
- A entrega da aula, o Verificar, o Mural, o /jogar e o Pro hospedado passam a receber os materiais
  por referência, em partes guardadas pelo conteúdo: o mesmo caminho da conta e da entrega pela
  galeria. É a parte de publicação e de aula do item C do plano das partes autoritativas, feita no
  envelope de partes de lá.
- O Verificar busca os materiais pelo endereço, e a conferência roda com o jogo inteiro.
- A publicação copia as partes para o espaço do Mural: o post continua igual mesmo se a criança
  apagar o projeto.
- Os posts e as entregas que já existem continuam abrindo como estão.

**Lote 5. Os tetos que a medida mandar subir.**
- Cada teto das classes 2, 3 e 4 sobe até onde o jogo de referência ainda passa nos números do
  notebook comum.
- Os primeiros da fila, pelo levantamento: objetos no Jogo 3D (300), no 3D Avançado (200) e no
  Mundo 3D (200), sprites por grupo no 2D (400), chaves de salvamento (500), o PNG de cada desenho
  do Pinta no Estúdio (800 mil caracteres), as formas do vetor (500), as malhas por modelo no jogo
  (48) e os objetos do cenário no Estúdio (cerca de 1.300).

**Lote 6. Prova permanente.**
- Os jogos de referência ficam no CI como prova de tamanho e alarme de tempo: uma mudança que
  encolha o que cabe reprova.
- Uma página em `docs/operations` com todos os tetos, a classe, o motivo e o recado de cada um.
- As notas nos CLAUDE.md dos pacotes e a memória.

A regra de todos os lotes: os cursos gravados (Cadê, Chave do Farol e Ilha do Farol) e os jogos da
galeria passam nas provas antes de cada lote fechar, e nenhum projeto que já existe perde nada.

## Junto com as outras frentes

- **Mundos de 2 km:** o mundo de 2 km e a página de medida são a base da exploração 3D. A auditoria
  não mexe nos lotes de lá; o próximo passo deles (juntar as colisões por lote, para caber mais
  objetos na cena) entra no veredito dos Cenários.
- **Pinta Cenários 2D:** o mapa da aventura 2D usa o formato público de hoje. Quando o formato por
  regiões abrir, o mesmo mapa é medido de novo.
- **Partes autoritativas do Estúdio:** o lote 4 usa o envelope de partes de lá.
- **Evolução do Estúdio:** os jogos D e E são a base dos jogos de referência, e a galeria continua
  só para a equipe.
- **Molda Cenários:** os moldes do pacote do Molda entram nos Cenários pelo caminho de sempre.

## O que precisa da Helena

- Abrir a página de medida no notebook e num tablet, duas vezes: depois do lote 1 e no fim. Cerca
  de 20 minutos por aparelho.
- Aprovar a proposta de tela das ferramentas de detalhe que a comparação apontar, se apontar
  alguma.

## Fontes do levantamento

Os quatro inventários de 23/11/2026 (tetos do Pinta; do Molda, dos Cenários e do Estúdio 3D; dos
jogos do Estúdio; de conta e publicação), com arquivo e linha de cada teto, estão no registro da
sessão. Os principais: `packages/studio/src/core/projectAssetBudget.ts`,
`packages/studio/src/core/projectAssets.ts`, `packages/members/src/domain/course/lesson-block.ts`,
`packages/member-shell/src/routes/studio.ts`, `packages/core/src/studio/pro-artifact.ts`,
`packages/members/src/domain/creations/creation.ts`, `packages/core/src/learning/gallery-studio-source.ts`,
`packages/pinta/src/core/projectConfig.ts`, `packages/core/src/studio/pinta-scene.ts`,
`packages/molda/src/core/limits.ts`, `packages/molda/src/export/sceneStudioCompatibility.ts`,
`packages/molda-cenarios-core/src/compilar/limites.ts`, `packages/molda-cenarios-core/src/compilar/studio.ts`,
`packages/studio/src/official-extensions/game-3d/runtime.ts` e
`packages/member-shell/src/lib/world-measurement.ts` (os números de aceite do 3D).
