# Base estudada para o novo Arquipélago

Leitura de 15/11/2026, no workspace `sistema-zero`. Fontes narrativas: `C:/Users/tocha/Downloads/O Livro Dourado e as seis luzes.md` e `C:/Users/tocha/Downloads/plano_macro_arquipelago_vagalume.md`. Este documento distingue o funcionamento atual, a direção fornecida e o primeiro blockout.

## Funcionamento atual

O jogo é um pacote independente (`packages/arquipelago`), compilado com Bun e montado na plataforma pela função `montarArquipelago`. Os contratos de acesso, inventário, progresso e tempo pertencem a `arquipelago-contracts`; o serviço fica em `arquipelago-api`. A plataforma não deve importar o renderer do jogo. A cena usa React Three Fiber, Three.js e física Rapier; estado de jogo e comandos são compartilhados pelo contexto e pelas lojas Zustand.

O personagem usa controlador cinemático com passo fixo. Teclado, toque e gamepad alimentam o mesmo controle. Os modos incluem chão, nado, pulo, escalada, cipó, montaria e planador. Caminhar por clique/toque consulta os colisores reais. A câmera usa os modos do personagem, perfis de enquadramento e sondas de colisão. Recriar esses sistemas junto com o terreno acrescentaria risco sem melhorar a geografia.

O avatar Cute Characters já possui catálogo de ossos, medidas, peças e clipes. Cápsula, cintura, cabeça e alcance derivam desse catálogo. As velocidades nativas derivam de passada/duração dos clipes; o pulo deriva da subida do quadril. O perfil compacto usa escala 1,85; o novo blockout usa escala 1. Na cópia aprovada conferida nesta sessão, a altura calculada aparece como aproximadamente 1,16 m no painel; a referência de 1,15 m do levantamento era aproximada. Não fixar medidas do corpo manualmente a partir dessa aproximação.

A Morada já é um documento compartilhado da plataforma, com casa, cômodos, peças e visitas. Inventário, projetos Pinta/Molda, coleções e progressão possuem regras próprias. Preservar os sistemas úteis significa conectá-los à nova declaração espacial; não manter todas as coordenadas e regras do cenário compacto. O mundo atual ainda associa abertura de ilhas à Jornada e carrega variantes por ilha; essas duas decisões não servem como base definitiva para a nova campanha.

## Regras narrativas que mudam a arquitetura

- Faísca permanece o centro da vida livre, casa, construção e retorno. As outras seis ilhas são territórios com regiões, percursos e atividades além da missão principal.
- O posto da Jornada habilita a Missão do Núcleo. A instalação do Núcleo no Farol reconstrói a ponte. Habilitação de missão e conexão física são fatos diferentes.
- A libertação local dos moradores, as seis conexões e a libertação final do Livro têm estados distintos. Não reduzir a narrativa a um único booleano de ilha aberta.
- Nuvens preserva o observatório; ele não cria um sétimo Núcleo. A Terra da Aventura é uma região final especial, fora do anel inicial.
- Zappy protege a liberdade do jogador; os guardiões usam suas próprias lanternas. Os conflitos são lúdicos e cômicos. Casa e exploração continuam úteis depois da campanha.

O blockout não implementa essas missões. Seu comando de reconstrução é uma ferramenta de teste, sem conceder Núcleo ou progresso de conta.

## Referências de arte

| Território | Referências fornecidas | Uso previsto |
| --- | --- | --- |
| Faísca | [Kingdom](https://ithappystudios.com/locations/kingdom/) e [Adventure Land](https://ithappystudios.com/locations/adventure-land/) | Natureza, vila, invenções, Farol e conexões; casa pela Morada |
| Bosque | Kingdom e [Western](https://ithappystudios.com/locations/western/) | Floresta extensa e região interna de rancho/cânions/trilhos |
| Vila Doce | [Sweet Land](https://ithappystudios.com/locations/candy-game-3d-models-sweet-land-pack/) | Bairros, feira, fábrica e rotas de exploração |
| Recife | [Battle Stadium](https://ithappystudios.com/locations/battle-stadium-3d-game-assets/) e costa | Arena da Maré como uma região, além de praias, porto e recifes |
| Pico | [Winter](https://ithappystudios.com/locations/winter/) | Vila, montanha, lago, trenó e cavernas |
| Vale | [Temple](https://ithappystudios.com/locations/temple/) | Templo, selva, rios, fósseis e exploração |
| Nuvens | Kingdom e Adventure Land | Castelo, jardins elevados, plataformas e observatório |
| Jogador | [Cute Characters](https://ithappystudios.com/characters/cute-characters/) | Avatar nativo, personalização e animações |

As páginas e as imagens oficiais foram consultadas. As referências não tornam materiais Unity/Unreal, shaders ou comportamento automaticamente compatíveis com Three.js. A biblioteca local de arte contém tanto arquivos importados quanto criações próprias inspiradas nas referências; não tratá-los como se fossem todos os packs oficiais já integrados. A próxima etapa de arte precisa conferir formato, dimensões, pivô, colisão, materiais e orçamento dos modelos efetivamente usados.

## Direção confirmada

Sete envelopes de estudo de 520 a 640 m, aproximadamente 2 km de arquipélago, com contornos e relevo próprios. Setores iniciais de 80 m, silhuetas distantes permanentes e colisores próximos. Um oceano compartilhado. Primeira conexão Faísca–Bosque, com 5 m de largura; a geometria provisória resulta em 232,23 m entre âncoras, incluindo as entradas sobre as margens. Esses números continuam sujeitos ao teste de percurso e à composição artística.

O jogo está restrito aos administradores. Não criar migração de posições nem compatibilidade com os salvamentos da geografia compacta. A nova campanha precisa de um contrato espacial e narrativo próprio; o primeiro ensaio guarda apenas seu estado local de medição.

Preservar a identidade e o estilo visual atuais das interfaces adulta e Kids. É permitido adaptar sua organização, fluxos e componentes para o novo jogo. A troca dos cenários não implica trocar a identidade das interfaces. O painel técnico do playground não é o HUD final.

Implementação e limites do primeiro marco: [geografia macro](2026-11-15-arquipelago-macro-design.md). O próximo passo de produção é validar a escala com o usuário e compor os percursos e regiões da Faísca com os modelos reais, antes de detalhar as demais ilhas e conectar a nova campanha.
