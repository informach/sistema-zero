# Vila autenticada: pacotes externos após a primeira edição

Os seis recursos QA pertencem ao cenário criado e editado anteriormente na
conta de staging. A leitura RPC97 não alterou a conta nem outros projetos.
O transporte QA preservou os seis hashes nativos, incluindo o mapa Vila
0da3e50a083e3ba60ebbc848583a30d239b3055de73b1ce4dda61d37113d511b.
Os pacotes foram construídos pelo exportador oficial do commit fb973c50f,
a partir desses dados. Não são uma nova geração da fixture de homologação.

Cada destino contém dois mapas com 18 e duas camadas, e os seis desenhos
editáveis. Os hashes de todos os arquivos gerados foram verificados antes
e depois dos ensaios. Os arquivos autorais dos pacotes não foram modificados.
As saídas nativas e arquivos de importação do Godot foram acrescentados ao cache.

- Tiled 1.12.2: quatro reexportações nativas JSON/TMX; comparação da cena
  completa dos dois mapas, sem diferenças ou avisos.
- Phaser 3.90.0: navegador Chromium 159, desktop e toque emulado. Movimento,
  colisão da casa, portas de ida e volta, água animada e primeiro plano;
  nenhum erro ou aviso no console. O toque é o perfil emulado: os movimentos
  deste ensaio foram comandados pelo teclado.
- Pygame-ce 2.5.8, Python 3.12.10: superfícies reais com SDL dummy, movimento,
  colisões, propriedades e referências de objetos, portas, animação e primeiro
  plano. O main.py portátil também executou 20 quadros e gerou imagem.
- Godot 4.7.2: importação normal, execução OpenGL 3.3 na RTX 3050, movimento
  pelo teclado, colisão da casa, portas, animação e captura gráfica.

As capturas Godot e Phaser desktop foram inspecionadas. Estes resultados
comprovam os pacotes após a primeira edição da Vila. Ainda não comprovam o
download pela nova interface em staging, a segunda edição e atualização no
Estúdio, a publicação do jogo, o rollout entre leitores ou o aceite completo.
O uso autenticado anterior está documentado separadamente; estes motores
externos executaram nesta máquina sem credenciais da plataforma.

O Python 3.13 anterior não conseguiu carregar uma DLL do pygame-ce 2.5.8,
recusada pela política de aplicativos do Windows. Foi criado um ambiente
isolado Python 3.12 com o requirements.txt original, sem alterar a política
do sistema, o pacote exportado ou sua versão exigida. O pygame-ce 2.5.7
existente não foi usado como substituto para o resultado final.

Não houve criança participante, aparelho físico adicional ou validação
de mapas infinitos, isométricos ou hexagonais neste ensaio.
