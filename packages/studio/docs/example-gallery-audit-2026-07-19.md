# Auditoria completa da galeria de exemplos — 2026-07-19

> **Snapshot histórico.** Os números abaixo descrevem o catálogo auditado em
> 19/07/2026 e não representam mais o inventário atual. Em 02/08/2026 a galeria
> possui **148 exemplos**: 31 de Jogo 2D, 36 de Jogo 2D Avançado, 18 de Jogo 3D,
> 17 de Jogo 3D Avançado, 13 de Mundo 3D e 33 do núcleo. A classificação vigente
> é **127 jogos, 9 demonstrações e 12 explorações**. O contrato executável em
> `src/examples/qaContracts.ts` é a fonte atual; achados posteriores não devem
> ser inferidos como “sem pendências” a partir deste documento histórico.

## Escopo e resultado

O catálogo real possui **67 exemplos**, não 63: 14 de Jogo 2D, 19 de Jogo 2D
Avançado, 8 de Jogo 3D, 6 de Jogo 3D Avançado, 12 de Mundo 3D e 8 do núcleo.
Cada cartão tem contrato de promessa, classificação e cenário de aceite próprio.
A distribuição é **46 jogos, 9 demonstrações e 12 explorações**.

Todos os exemplos foram convertidos diretamente para IR V2, com comportamento
separado em **⚙️ Ao iniciar**, **⚡ Quando acontecer** e
**🔁 Enquanto estiver rodando**. A abertura pela `KitGallery`,
o schema, os assets, as extensões, a geração, a reconstrução Blockly e o
round-trip sem warnings são guardas obrigatórias do catálogo. As correções não
alteraram o gate privilegiado da galeria nem a API pública do pacote.

## Achados transversais corrigidos

1. Projetos antigos misturavam preparação, eventos e repetição. A migração agora
   classifica as raízes, preserva IDs e rascunhos e é idempotente; projetos novos
   começam vazios e só recebem as áreas que a criança criar.
2. As seis áreas são opcionais e únicas. Conexões erradas são recusadas; blocos
   soltos ou vindos de uma área excluída continuam visíveis como rascunho com
   aviso, sem executar silenciosamente.
3. O motor inicia automaticamente por um `RuntimeLifecycleContract` obrigatório
   em cada extensão. **⚙️ Ao iniciar**, **⚡ Quando acontecer** e
   **🔁 Enquanto estiver rodando** formam uma fábrica de
   execução; nos motores com novo jogo, reiniciar limpa os registros e executa
   novamente a fábrica. O descarte do preview libera os recursos do motor,
   inclusive GPU nos motores 3D.
4. `A cada N quadros` e `A cada N segundos` são loops-raiz independentes. Eventos
   de contato disparam na entrada do contato; consultas de sobreposição continuam
   valores/loops contínuos.
5. Nomes de cenas no Jogo 2D são campos livres. Estados como `ganhou1` sobrevivem
   ao Blockly sem os warnings antes emitidos pelos dois jogos de gorilas.
6. No RPG, **Criar mapa**, **Começar o jogo no mapa** e **Quando entrar no mapa**
   têm responsabilidades distintas. O runtime não inventa o desenho da criança;
   referências inválidas diagnosticam o nome e projetos legados caem no primeiro
   mapa realmente criado.
7. A Vila do Dragão ganhou vila e caverna desenhadas no próprio exemplo, pontos
   de referência visíveis e a jornada completa: ferreiro, chave, porta, caverna,
   dragão, batalha, vitória e novo jogo.
8. O Jogo 3D teve revisão de ergonomia e runtime: tooltips em português, sombras
   numéricas editáveis, blocos largos em disposição vertical, teclado limpo ao
   perder foco, movimento/distância no chão X-Z, passo independente da taxa de
   quadros e cadência correta do spawner.
9. O Mundo 3D passou a criar o grafo de áudio só depois da primeira interação,
   eliminando warnings de autoplay sem remover ambiente ou efeitos.
10. O sanitizador do Canvas 3D passou a aceitar o estado legítimo do loop de
    animação usado pelo Folio procedural.
11. O canvas do Jogo 2D ganhou descrição configurável, foco por teclado e
    anúncios de estado. No Canvas 3D, todos os blocos cabem individualmente no
    carrossel de 390 px e os seletores têm alvo de toque de pelo menos 44 px.
12. O projeto real do curso em Jogo 2D 0.19.0 migra de forma transparente ao
    abrir no Estúdio e ao jogar no mural: a área antiga é separada, temporizadores
    aninhados viram loops-raiz e o código manual da Ponte permanece intocado.

## Inventário auditado

“Contrato transversal” abaixo significa: conversão V2, áreas corretas, schema,
assets/extensões, geração, Blockly, round-trip, primeiro frame, controles e
console aprovados; em jogos inclui conclusão/reinício no harness, e em
explorações/demonstrações inclui as interações ou a técnica prometida.

### Jogo 2D

| Exemplo | Classe | Promessa | Achado e correção | Resultado |
| --- | --- | --- | --- | --- |
| Pong simples | Jogo | Partida contra o computador até cinco pontos | Faltavam adversário e ciclo completo; ganhou menu, placar, vitória/derrota e reinício | Aprovado |
| Herói que anda | Demonstração | Sprite, spritesheet e quatro direções | Separado nas áreas V2; animação e movimento preservados | Aprovado |
| Mini plataforma | Demonstração | Movimento, pulo, gravidade e limites | Separado nas áreas V2; técnica exercitada no harness | Aprovado |
| Plataforma com inimigos | Jogo | Combater três tipos de inimigo | Sapinho não concluía a missão; todos recebem tiro, vida zero derrota e Enter reinicia | Aprovado |
| Jogo desenhado por código | Demonstração | Herói e moeda feitos somente com formas | Contrato transversal; nenhum asset oculto | Aprovado |
| Sala com paredes | Demonstração | Tilemap com paredes sólidas | Contrato transversal; colisão validada em todos os lados | Aprovado |
| Nave contra Asteroides | Jogo | Atirar, pontuar, vencer/perder e recomeçar | Cadência de asteroides elevada a loop independente | Aprovado |
| Asteroides clássico | Jogo | Girar, impulsionar e atirar | Cadência periódica separada do quadro principal | Aprovado |
| Dino Run | Jogo | Obstáculos, bônus, recorde e derrota | Cadências de obstáculos/bônus separadas e reinício completo | Aprovado |
| Guerra de Gorilas | Jogo | Mira, vento, crateras e dois jogadores | Cena personalizada virou nome livre; explosão usa API canônica | Aprovado |
| Guerra de Gorilas vs Robô | Jogo | Jogada humana e resposta calculada | Cena personalizada sem warning e turno automático preservado | Aprovado |
| Equilibrista | Jogo | Esticar bastão, atravessar e falhar | Reinício passou a estar explícito no exemplo | Aprovado |
| Balão | Jogo | Combustível limitado e árvores | Reinício passou a estar explícito no exemplo | Aprovado |
| Aventura com câmera | Exploração | Caminho, câmera, paisagem, áudio e quatro moedas | Mundo antes vazio ganhou referências visuais, spawn seguro e moedas alcançáveis | Aprovado |

### Jogo 2D Avançado

| Exemplo | Classe | Promessa | Achado e correção | Resultado |
| --- | --- | --- | --- | --- |
| Meu primeiro jogo | Demonstração | Base mínima de personagem e movimento | Contrato transversal; boot manual removido | Aprovado |
| Caça-moedas profissional | Jogo | Menu, pausa, estados e cinco moedas | Contrato transversal; nova partida recria estado e escopo | Aprovado |
| Arena dos Goblins | Jogo | Derrotar dez goblins | Eventos, spawner, dano e invencibilidade auditados | Aprovado |
| Vila do Dragão | Jogo | Missão, chave, poção, caverna e dragão | Mapas vazios/implícitos e passo aninhado corrigidos; jornada visual completa | Aprovado |
| Floresta Ninja | Jogo | Derrotar dois ninjas patrulheiros | Contrato transversal; direção, ataque, vitória e reinício exercitados | Aprovado |
| Salto na Floresta | Jogo | Pulo tolerante, plataformas especiais e pisão | Contrato transversal; cinco frutas e conclusão alcançáveis | Aprovado |
| Bichinhos do Quintal | Jogo | Encontrar, batalhar e capturar três criaturas | Mapa inicial explícito; exploração e turnos exercitados | Aprovado |
| Invasão dos Óvnis | Jogo | Formação que marcha, atira e acelera | Contrato transversal; power-up e dois finais exercitados | Aprovado |
| Duelo dos Bonecos | Jogo | Melhor de três contra o computador | Contrato transversal; golpes, defesa e rounds reiniciáveis | Aprovado |
| Defesa do Reino | Jogo | Comprar torres e defender cinco vidas | Contrato transversal; compra inválida, ondas e finais exercitados | Aprovado |
| Reino Aberto | Exploração | Quatro mapas ligados e dois NPCs | Todos os mapas são criados, têm início explícito e transições válidas | Aprovado |
| Batalha em Equipe | Jogo | Combate por turnos com aliado e fichas | Contrato transversal; escolha de alvo e cura exercitadas | Aprovado |
| O Chefao | Jogo | Chefe que muda de fase | Mapa inicial explícito; segunda fase e conclusão exercitadas | Aprovado |
| O Chefao da Ficha | Jogo | Chefe definido por ficha | Caverna criada e escolhida explicitamente; batalha reiniciável | Aprovado |
| Corrida de Tabuleiro | Jogo | Dado, peões e dois turnos | Contrato transversal; casa premiada e final alcançáveis | Aprovado |
| Jogo da Memoria | Jogo | Encontrar três pares embaralhados | Contrato transversal; erro, acerto, vitória e novo jogo exercitados | Aprovado |
| Duelo de Cartas | Jogo | Energia, cartas e intenção inimiga | Contrato transversal; turnos e finais exercitados | Aprovado |
| Cobrinha | Jogo | Grade, comida, crescimento e colisão | Tick periódico deixou de ficar aninhado no update; reinício limpa o corpo | Aprovado |
| Quebra-blocos | Jogo | Rebater a bola e limpar blocos | Contrato transversal; perda, vitória e reinício exercitados | Aprovado |

### Jogo 3D

| Exemplo | Classe | Promessa | Achado e correção | Resultado |
| --- | --- | --- | --- | --- |
| Boneco de formas | Demonstração | Modelo composto por formas em rotação | Tooltips, sombras e disposição dos construtores corrigidos | Aprovado |
| Noite enevoada | Demonstração | Céu, neblina, sombras e luz pontual | Contrato transversal; primeiro frame e rotação contínua exercitados | Aprovado |
| Enxame que gira | Demonstração | Cinco cópias iteradas em conjunto | Adicionado contador tipado do enxame e auditoria de iteração | Aprovado |
| Torre maluca | Jogo | Soltar andares e pontuar encaixes | Reinício limpa torre e estado do motor | Aprovado |
| Corrida maluca | Jogo | Voltas e rivais | Movimento circular/distância corrigidos para X-Z e passo por tempo | Aprovado |
| Atravesse a rua | Jogo | Grade isométrica com trânsito | Posição/movimento de grade e limpeza de teclado auditados | Aprovado |
| Desvie dos blocos | Jogo | Correr e pular de obstáculos crescentes | Spawner passou a acumular tempo no campo correto; ritmo independe do FPS | Aprovado |
| Cubo girando | Demonstração | Cubo Three.js em rotação contínua | Loop 3D validado como raiz e rotação nos três eixos exercitada | Aprovado |

### Jogo 3D Avançado

| Exemplo | Classe | Promessa | Achado e correção | Resultado |
| --- | --- | --- | --- | --- |
| Defesa da Torre | Jogo | Torres autônomas e cristal | Ciclo de vida, FSM, pooling, vitória/derrota e reinício auditados | Aprovado |
| Salto nas Nuvens | Jogo | Física 3D, moedas e câmera seguidora | Contrato transversal; queda e reinício não vazam estado | Aprovado |
| Parkour do Vulcão | Jogo | Rampa, elevador, trampolim e zonas | Todas as zonas e três gemas exercitadas | Aprovado |
| Quadra Maluca | Jogo | Movimento pela câmera e bolas físicas | Movimento, gelo, câmera e cinco coletas exercitados | Aprovado |
| Guardião do Portal | Jogo | Defender por trinta segundos determinísticos | Semente e temporizador reiniciam de forma reproduzível | Aprovado |
| Tiro ao Alvo | Jogo | Doze pontos em 25 segundos | Alvos comuns/dourado, vitória/derrota e reinício exercitados | Aprovado |

### Mundo 3D

| Exemplo | Classe | Promessa | Achado e correção | Resultado |
| --- | --- | --- | --- | --- |
| Meu Mundo | Exploração | Floresta, ciclo diário, turbo e segredo | Contrato transversal; todas as interações anunciadas exercitadas | Aprovado |
| Corrida do Por do Sol | Jogo | Cinco checkpoints, cronômetro e recorde | Contrato transversal; ordem e volta completa exercitadas | Aprovado |
| Boliche na Praca | Jogo | Derrubar dez pinos e pilhas | Áudio passou a inicializar após gesto, sem warning de autoplay | Aprovado |
| Inverno Magico | Exploração | Neve, vento, gelo e totens | Contrato transversal; derrapagem e totens exercitados | Aprovado |
| Ilha dos Criadores | Jogo | Pé, carro, barco e quinze moedas | Veículos, diálogo, missão e conquista exercitados | Aprovado |
| Parque dos Brinquedos | Exploração | Boliche, TNT, tornado, buzina e física | Todas as atrações anunciadas exercitadas | Aprovado |
| Vila das Vocacoes | Exploração | Cidade, trânsito, portas, diálogo e minimapa | Guia, escolha, dois locais, coleta e teleporte exercitados | Aprovado |
| Base da Lua | Jogo | Baixa gravidade, jetpack e doze moedas | Cratera, coleta, conquista e reinício exercitados | Aprovado |
| Fazendinha | Exploração | Fazenda viva e diálogo com Rosa | Plantações, animais, moinho e escolha exercitados | Aprovado |
| Folio Procedural | Exploração | Portfólio 3D procedural com física | Contrato transversal; personagem, jipe e distrito exercitados | Aprovado |
| Coastal World Procedural | Exploração | Arquipélago só com primitivas | Personagem, barco, jetpack, pontes e farol exercitados | Aprovado |
| Vocation Vista Procedural | Exploração | Cidade educativa, bairros e inventário | Três distritos, diálogos, locais e missão exercitados | Aprovado |

### Núcleo

| Exemplo | Classe | Promessa | Achado e correção | Resultado |
| --- | --- | --- | --- | --- |
| Cidade & Moinho (na mão) | Jogo | Mini-Gorillas com blocos genéricos | Contrato transversal; vento, bomba, moinho e reinício exercitados | Aprovado |
| Invasores do Espaço (na mão) | Jogo | Space Invaders somente com o núcleo | Eventos/loops separados; ondas, dois finais e reinício exercitados | Aprovado |
| Plataforma Vertical (na mão) | Jogo | Plataforma vertical somente com o núcleo | Física, tábuas, câmera e reinício exercitados | Aprovado |
| Portas do Castelo (na mão) | Jogo | Fases por portas e fade manual | Troca de fase e reinício exercitados | Aprovado |
| Defesa da Torre (na mão) | Jogo | Torres e ondas somente com o núcleo | Compra, moedas, vidas, finais e reinício exercitados | Aprovado |
| Duelo (na mão) | Jogo | Luta local de dois jogadores | Dois controles, golpes e fim por tempo exercitados | Aprovado |
| Passeio 3D (na mão) | Exploração | Three.js, clima e áudio posicional | Contrato transversal; direção, buzina, câmera e ciclo diário exercitados | Aprovado |
| Folio 3D procedural (na mão) | Exploração | Terreno, estrada, prédios e física nativos | `extraState` legítimo do loop de animação passou a sobreviver ao sanitizador | Aprovado |

## Evidência automatizada

- Guarda do catálogo: 67/67 contratos, sem exemplo ausente ou duplicado.
- Classificação: 46 jogos, 9 demonstrações e 12 explorações.
- Suíte unitária do pacote: 4.218 testes e 37.254 asserções aprovadas em 285
  arquivos.
- TypeScript: `tsc --noEmit` aprovado.
- Biome: 665 arquivos aprovados, sem correções pendentes.
- Build de produção do playground: 1.442 módulos transformados e bundle gerado.
- Chromium: 75 cenários da galeria, incluindo os 67 cartões, a Vila do Dragão
  integral e uma amostra estreita de cada família.
- E2E completo do Estúdio: 116 cenários aprovados, incluindo galeria, projeto
  vazio, Ponte, CSS, SVG, Canvas 3D, formatação, reabertura/migração, segurança
  do preview e arrasto do workspace.
