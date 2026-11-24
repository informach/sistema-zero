# Nave Contra Asteroides — projetos para aprovação

Protótipos do curso base 2D do Construtor, preparados em 24/11/2026 com os contratos do Estúdio em `9ca0696aef5a536846525704b9d01261e2bd0da7`.

## Arquivos para importar

| Arquivo | O que abre |
| --- | --- |
| `nave-2d-completo.szproject.json` | Jogo completo, combinação Aurora |
| `nave-2d-inicial.szproject.json` | Projeto inicial do aluno: telas, nave e fluxo preparados; regras a construir |
| `nave-2d-orbita.szproject.json` | Mesmo jogo completo, combinação Órbita |
| `nave-2d-nebulosa.szproject.json` | Mesmo jogo completo, combinação Nebulosa |

São documentos JSON nativos `.szproject.json`, com blocos editáveis, IR, arquivos gerados e imagens incorporadas. Cada projeto contém as mesmas 12 artes. Nenhuma imagem precisa ser baixada de outro endereço.

No jogo completo, **Enter** começa, **setas esquerda/direita** movem, e cada aperto de **Espaço** dispara um laser. Depois de vitória ou derrota, Enter retorna à abertura; Enter novamente começa a nova partida.

O projeto inicial abre na tela de início. **Enter** leva à área de jogo, onde a nave permanece parada. As telas de início, vitória e derrota, o estado inicial, o controle por Enter e o reinício já estão preparados. Um bloco **Se o estado for jogando**, vazio, está no laço de atualização para receber as regras construídas nas aulas.

A criança ainda construirá movimento, grupos, disparo por Espaço, criação periódica de asteroides, colisões, retirada de objetos, pontos, vidas e as condições de término. O projeto inicial não inclui esses sistemas, o evento de Espaço nem o temporizador. A criança usará o mesmo padrão **Se jogando** nos novos eventos e no temporizador, e escreverá as condições que selecionam as telas prontas de vitória ou derrota. Ela testará o reinício preparado, sem precisar construir sua arquitetura neste posto.

Os textos das telas iniciais usam valores literais, sem consultar variáveis de pontos, meta ou vidas antes de elas serem criadas nas aulas. As telas de resultado ainda não são alcançáveis durante uma partida do projeto inicial: serão acionadas pelas condições que a criança programar. Quando acionadas, Enter reinicia o projeto e retorna à abertura; outro Enter começa novamente.

## Personalização somente da aparência

| Elemento | Opções | Onde escolher no projeto completo |
| --- | --- | --- |
| Nave | `nave-falcao-azul`, `nave-exploradora-coral`, `nave-arraia-lilas` | Ao iniciar → imagem do bloco que cria o sprite `nave` |
| Cenário | `cenario-aurora`, `cenario-orbita`, `cenario-nebulosa` | Ao iniciar → bloco Pôr o cenário atrás de tudo |
| Asteroide | `asteroide-rocha-lunar`, `asteroide-gelo-azul`, `asteroide-cristal-violeta` | Enquanto estiver rodando → A cada 1,5 segundo → imagem do sprite criado no grupo `asteroides` |
| Laser | `laser-ciano`, `laser-dourado`, `laser-lilas` | Quando acontecer → tecla Espaço → imagem do sprite criado no grupo `tiros` |

Use o seletor de imagem desses blocos para combinar as opções livremente. As três combinações de arquivo são exemplos para a aprovação visual, não temas que precisam permanecer juntos.

No projeto inicial, nave e cenário já podem ser escolhidos. As outras artes estão na biblioteca do projeto e serão usadas quando a criança construir tiros e asteroides.

Todas as naves usam o mesmo retângulo de 56 × 64 e a mesma área de colisão; todos os asteroides, 48 × 48; todos os lasers, 10 × 28. Trocar a imagem mantém vidas, meta, velocidade, intervalos e regras. O JSON dos três jogos completos difere no IR apenas pelos quatro nomes de imagem.

## Regras para conferir jogando

- Meta de 20 acertos; três vidas.
- Surgimento a cada 1,5 segundo, em uma posição segura dentro da tela.
- Um disparo por aperto, sem rajada por segurar a tecla.
- Um acerto retira somente o tiro e o asteroide envolvidos e soma um ponto.
- Asteroides que escapam são retirados sem tirar vida.
- Batida na nave custa uma vida, com proteção breve contra dano repetido.
- Vida zero tem prioridade se a meta for atingida no mesmo ciclo de colisões.
- Depois do fim, disparos, movimento, criação e pontuação ficam bloqueados.
- Reiniciar restaura a partida e mantém as escolhas de imagens feitas nos blocos.

## Verificação realizada

Os quatro arquivos passaram pelo esquema oficial de IR, pelo carregamento e ida/volta no Blockly com os campos oficiais e pelo sanitizador de projeto salvo do Estúdio. O inicial atualizado passou novamente pela validação oficial, com 97 blocos em três áreas. O validador preservou as 12 imagens e os arquivos gerados.

Na validação anterior, o script gerado foi executado com o runtime oficial de Jogo 2D em DOM de teste e Canvas2D nativo. Vinte verificações passaram sem erros ou avisos: entrada e disparo, movimento/limites, origem do tiro, criação periódica, retirada fora da área, contato, contagem única, dano, proteção, prioridade do resultado, bloqueio após o fim, reinício repetido, integridade do projeto inicial e igualdade das regras entre aparências. Os três arquivos completos foram preservados byte a byte nesta atualização, conforme seus hashes SHA-256.

O inicial atualizado passou por mais oito verificações focadas, sem erros ou avisos: ausência dos sistemas que a criança construirá; somente Enter e laço com guarda preparados; abertura imediata; Enter para a área de jogo sem movimento/disparo; Enter sem reiniciar durante a partida; apresentação e reinício de cada tela de resultado; execução da interface sem variáveis ausentes. O relatório está em `../validacao/comportamento-2d-inicial.json`. Para conferir as telas de resultado, o teste forçou esses estados apenas no ambiente de QA; nenhuma condição de vitória ou derrota foi acrescentada ao projeto inicial.

As imagens em `previews/` são desenhos produzidos por esse runtime com Canvas2D real. Os arquivos com sufixo `-qa.png` mostram os estados de resultado forçados pelo teste. O adaptador usa Noto Sans e decodifica os SVGs para o canvas nativo; os projetos preservam os SVGs originais e a fonte normal do Estúdio. A interface completa do Estúdio no navegador não foi usada neste teste. A importação e a avaliação de jogabilidade por Helena continuam sendo a aprovação solicitada.

## Fontes e reprodução

As fontes autorais estão em `../fontes/2d/`: `assets.mjs`, `game.mjs` e `prepare.mjs`. O exportador compartilhado está em `../fontes/exportar-projetos.ts`. A sequência de geração está no [README principal](../README.md#reprodução-no-repositório).

Os relatórios de importação, conversão de blocos e comportamento estão em `../validacao/`. Os testes usam os módulos oficiais do Estúdio; as cópias temporárias de pesquisa não fazem parte do pacote nem são necessárias para importar os projetos.
