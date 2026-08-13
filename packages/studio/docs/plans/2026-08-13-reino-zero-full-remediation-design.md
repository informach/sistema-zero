# Reino Zero — remediação completa e fidelidade autoral

**Status:** implementado e verificado em 2026-08-13.

## Objetivo

Transformar o Reino Zero de uma campanha apenas inspirada em plataforma clássica numa réplica mecânica autoral completa: preservar nomes, arte e layouts próprios, mas oferecer a variedade de progressão e os gestos centrais esperados do gênero.

## Princípios

- Uma fase tem uma única fonte de verdade para geometria, tema, movimento, atalhos, perigos e progressão.
- Mecânicas compartilháveis pertencem ao runtime Jogo 2D; regras específicas da campanha pertencem ao exemplo.
- Nenhum cast, supressão ou fallback invisível será usado para esconder contratos incorretos.
- Toda correção nasce com uma reprodução que falha antes e passa depois.
- Os layouts continuam autorais; não serão copiadas coordenadas de fases da Nintendo.

## Arquitetura

### Descritor canônico de fase

Cada uma das 32 fases será materializada como um descritor derivado de `LEVEL_PLANS`, contendo:

- identidade (`world`, `stage`, `level`);
- tipo (`surface`, `underground`, `water`, `castle`);
- dimensões e grade;
- pontos de spawn derivados da grade;
- capacidades presentes, como cano de atalho e perigos rotativos.

Mapa, seleção de física, posição do atalho, inimigos e testes consumirão o mesmo descritor. Quando uma capacidade não existir, seu objeto interativo ficará explicitamente desativado fora do mundo, e não numa coordenada de fallback.

### Física e entidades

- O atualizador de cascos será o único dono de movimento, gravidade e colisão dos cascos. A gravidade genérica não tocará nesse tipo.
- Power-ups terão estado de mundo: surgimento, movimento, gravidade e coleta.
- O tamanho do herói será sincronizado por transição de estado, preservando a posição dos pés.
- O estado de poder terá três degraus: pequeno, grande e fogo.

### Progressão e fidelidade

- 100 moedas concedem uma vida e preservam o restante.
- Herói grande ou de fogo quebra tijolos ao cabecear.
- Ação enquanto no estado fogo lança projéteis com limite, quique e dano real.
- Castelos recebem barras de fogo e variações de guardião/perigos.
- A segunda jornada reduz tempo, aumenta pressão e acrescenta inimigos de forma sistemática.
- Comprimentos e composição variam por tipo/fase sem reproduzir layouts proprietários.

### Contratos da extensão

Os papéis de tile e lados de contato terão uma única definição exportada pela extensão e reutilizada por IR, schema, codec, runtime e testes. O typecheck será corrigido na origem; erros antigos fora do escopo só serão alterados quando forem consequência direta desses contratos.

## Testes

- Playthrough parametrizado para física de todas as fases e atalhos com/sem cano.
- Casco parado, chute após espera e queda sem dupla gravidade.
- 100 moedas, quebra de tijolo, transições pequeno/grande/fogo e projétil.
- Perigos e variação dos oito castelos; segunda jornada.
- Schema/codec/runtime typecheck e round-trip completo.
- Suíte Jogo 2D, suíte Studio, Biome do escopo e E2E Chromium do Reino Zero.

## Não objetivos

- Copiar gráficos, nomes, música ou coordenadas exatas de fases da Nintendo.
- Substituir a arquitetura de exportação por string do Studio neste lote; o risco será reduzido por derivação, template guards e módulos menores, sem reescrever todo o sandbox.
