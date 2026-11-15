# Verificação local da migração Morada

Implementação em 14/11/2026. Nenhum deploy, upload para R2 ou operação de conversão no banco da aplicação foi executado nesta sessão.

Após este recibo, os dez achados do review foram corrigidos e tiveram nova verificação, registrada em [2026-11-14-morada-review.md](./2026-11-14-morada-review.md).

## Entrega

- Catálogo: 3.106 peças — 2.455 móveis, 459 de construção, 160 da fazenda, 24 gatos/cachorros e oito troféus próprios. Conferência de integridade: 6.693 recursos privados locais íntegros. Só os troféus anteriores permanecem como fontes de arte versionadas.
- Casa canônica no Members, revisão/CAS, escrita limitada ao quarto, projeções de perfil/visitas e validação de referências, dimensões, encaixes, posse de troféus e limites.
- Migração com ensaio, reembolso histórico idempotente e preservação da Galeria, conquistas e UGC. A migration 0149 foi aplicada somente ao Postgres descartável usado pelo teste.
- Renderer compartilhado de peças, texturas, paletas, partes móveis, encaixes e pets. Nenhuma reserva visual com os modelos anteriores.
- Meu Quarto mantém as peles Kids/adulta, dez abas, cabeçalho, moedas, salvamento, câmera ortográfica e organização das bandejas. A tira lista objetos, sem acrescentar os pisos e paredes estruturais do novo documento.
- Jogo mantém HUD, Viver/Construir, 13 ferramentas, barra inferior, escolhas horizontais e Pronto. Casa e quintal usam física nativa; as ilhas continuam com sua física atual. A cena encoberta deixa de desenhar durante a permanência na casa.
- Projetos, funções, horta com até 24 cultivos, coleções, aconchego, visitas e descanso continuam ligados ao progresso. O descanso real recupera energia e termina ao levantar, completar a soneca, construir ou sair.

## Caminhada

Comparação com `artes-3d/biblioteca_aventura/avatar/pagina/avatar.html`: a cena nativa acelerava o andar 2,28 vezes e a corrida 2,53 vezes, sem mistura de poses. Agora as velocidades vêm da passada/duração do catálogo, em escala 1. Aceleração, freio e viradas são graduais; a animação mede o deslocamento efetivo após colisões e limites do lote.

A máquina de locomoção compartilha as transições do jogo, parametrizadas pela escala. A mistura conserva soma 1 por quadro, inclusive ao frear de uma combinação andar/correr, evitando entrada involuntária da pose rígida do esqueleto. Regressão em 30/60/120 quadros por segundo. O clipe preserva o balanço autoral; só o deslocamento contínuo fica com a física.

## Evidências

| Verificação | Resultado |
| --- | --- |
| Jogo, suíte completa após restauro da interface e descanso | 1.960 passaram, 0 falhas; 1 integração Postgres pulada por falta de variável específica |
| Locomoção, Morada e movimento após ajustes do avatar | 74 passaram, 0 falhas |
| Renderer, core, editores, peles, integração do host e recursos dos apps | 90 passaram, 0 falhas; testes adicionais de host/gateway também passaram |
| Members, casa e regressões do quarto | 40 passaram, 0 falhas |
| Members, SQL real em Postgres 16 descartável | 2 passaram: concorrência/CAS, isolamento, ensaio, valores históricos, Galeria, troféus e repetição |
| Contratos do jogo, suíte completa | 273 passaram, 0 falhas |
| Comunidade adulta, suíte completa | 118 passaram, 0 falhas |
| Builds de produção do jogo, Kids e adulto | Passaram |
| Tipos de core, avatar-quarto, contratos, Members, gateway, member-shell e ambos os apps | Passaram |
| Biome nos arquivos da migração | Passou |

As suítes amplas de member-shell e Kids tiveram falhas fora da migração durante execução concorrente: dois testes HTTP Python no shell e quatro casos de cenas de aula no Kids. Todos os seis passaram quando repetidos isoladamente, sem alteração de seus arquivos. Portanto não se registra aqui uma execução integral verde dessas duas suítes.

No navegador, com recursos privados locais: peles Kids/adulta em 1280×900 e 390×844; sem estouro horizontal; edição e salvamento de pet; conflito 409 e recuperação explícita; clima persistido; adição de móvel no jogo, guardar, sair e reabrir; HUD/barra originais; caminhada por teclado; noite usando o Céu original. Sem exceções JavaScript nos fluxos finais. As capturas ficam em `output/morada-qa/`, fora do Git. Não foi realizado benchmark quantitativo de desempenho nem uma matriz de dispositivos físicos.

## Publicação e limites

A publicação foi concluída em staging e produção em 14/11/2026: artes privadas enviadas e verificadas, migration 0149 aplicada, contas convertidas e reembolsos históricos executados. O [registro operacional](../operations/2026-11-14-morada-publicacao.md) contém o SHA, os deployments e os resultados reais. O procedimento reproduzível permanece em `scripts/morada/README.md`.

Nesta entrega as peças novas são grátis; troféus continuam exigindo conquista. UGC próprio continua no salvamento do jogo. Visitas usam a peça Morada base, sem transportar URLs ou bytes privados pela casa. A projeção Pinta conserva a planificação histórica e superfícies curvas podem demandar ajuste artístico. Casa e quintal abrem numa cena nativa separada, ligada às ilhas por portais.
