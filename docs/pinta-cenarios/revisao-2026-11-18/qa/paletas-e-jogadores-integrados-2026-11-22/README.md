# Paletas e jogadores privados — repetição integrada

Corte de produto `efc2cf6bf`, com staging `e27c60f85` incorporada. Os logs
comprimidos, códigos de saída e SHA-256 do conteúdo estão em [evidence.json](evidence.json).
São provas locais nesta máquina. Não houve ativação remota, release ou publicação.

| Verificação | Resultado |
| --- | --- |
| Suíte completa Pinta, três backends Python nativos configurados | 2.894 testes; 38.681 verificações; zero falhas |
| Contratos regionais Core | 30 testes; 184 verificações |
| Atualização, material completo, Clássico/Pro e controller Python | 73 testes; 313 verificações |
| Prévia JavaScript existente | 65 testes; 455 verificações |
| Host, sessão, selagem e autoridade local | 9 testes; 53 verificações |
| Typecheck completo Member Shell / Pinta | ambos saída 0, após corrigir os erros iniciais arquivados |
| Paletas, duas abas em Chrome 157 | GET tardio sem reintrodução; escritor anterior recusado; recuperação estável ao reabrir |
| Paletas no percurso BFF → Gateway → Members → PostgreSQL → MinIO | 1 teste; 40 verificações |
| PostgreSQL causal / HTTP completo / repositório legado / purga | 21 / 1 / 23 / 4 testes; zero falhas |
| Projetos salvos nos cinco jogadores, Chrome | 11 testes; zero falhas ou skips |

A prova dos jogadores usa PNG 5 reaberto do IndexedDB, os dois motores JavaScript
em Clássico e Pro, Pygame-ce nas duas formas, Pygame Zero e Raylib 2D. Confere
portas homônimas em mundos distintos, pixels alterados, preservação do programa,
arquivos e blocos e recusa de SHA incorreto antes de executar o programa. Os
avisos HappyDOM nos testes de prévia correspondem ao bloqueio de scripts em
iframes nesse ambiente; a execução real é a prova separada do Chrome.

O ensaio de storage usa serviços reais em loopback e sessão sintética no BFF.
Não demonstra login de staging, R2 remoto, outro dispositivo físico ou uso por
crianças. Os roteiros repetíveis continuam nos diretórios
[MinIO](../../../missao-completa-2026-11-18/qa/nuvem-causal-minio-2026-11-22/PALETA.md)
e [paletas entre abas](../paletas-cas/).

## Controle do compilador

O build Bun 1.3.11 produziu a candidata
`205eb48c4b6f07f7aeb0a8b4b287a1e31ad904c034a6732894208a15d82f39ca`,
usada nos onze ensaios. A compilação da mesma fonte com Bun 1.4.3 gerou
`3fc4c3a625c3aff12f8b78e196d74025def228eba50a29ee1096ffda101c09f6`.
Ambas têm 129 arquivos, todos revalidados pelo manifesto. O controle 1.4.3
reproduziu os bytes e hashes dos arquivos não comprimidos da candidata anterior
`842f92c7…`, exceto `playtest.mjs`; os novos blocos candidatos entraram desde
aquela revisão. Frame, worker, inspeção e renderizadores mantiveram seus hashes.
Não atribuir a diferença de tamanho entre compiladores à ponte de materiais.
O controle de compilação 1.4.3 não é uma homologação nova de playtest nem uma release.

## Limites deste corte

O [ensaio histórico offline](../../../missao-completa-2026-11-18/qa/projeto-autoridade-offline-2026-11-22/)
reproduziu restauro e exclusão que ainda alcançam projetos privados novos no
binário 16bf. A autoridade V5 está em implementação e impede encerrar esse lote.
Também permanecem os leitores/gravadores de partes seladas, publicação regional,
rollout autenticado, exportadores regionais completos, IO incremental integrado,
automapping, projeções e homologação final. O typecheck Studio registrado na
rodada anterior tinha três erros no arquivo 3D recebido do remoto, ainda intocado.
Nenhum destes resultados encerra as etapas macro 1–9 da missão.
