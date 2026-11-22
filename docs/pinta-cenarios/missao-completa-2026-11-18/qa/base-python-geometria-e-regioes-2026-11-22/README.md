# Base Python: geometria e células regionais — 22/11/2026

Base `18458d850`. As consultas de contornos, quadros de animação e transformação
afim saem de `pygameProject.ts` para uma fonte Python comum, independente de
motor. O compositor Pygame atual embute as mesmas funções; seu texto entregue
continua exatamente igual ao trecho já distribuído em `pinta.py`: 29.865 bytes,
SHA-256 `a1fef3ae8aa4c6c608c95887ffee7e0e8cbcddd5494e4115547b61fb637dcd05`.
Não há segunda implementação geométrica Python para os futuros adaptadores.

`pythonSceneRegions.ts` prepara o codec de células para esses adaptadores.
Constantes vêm de `core/creations`; todos os cabeçalhos, coordenadas, duplicatas
e orçamento por mapa precedem o primeiro base64. O plano captura strings e
limites próprios, admite uma tentativa de decode e libera suas referências aos
payloads depois dela. A recusa não devolve grades parciais. Base64 é canônico;
índices i16 são little-endian, com verificação de tamanho, células vazias e
preenchimento além dos limites do mapa.

Cada grade possui índice e arrays compactos próprios. Consulta pontual e visita
por chunks/linhas retornam valores inteiros completos, conservando flags; não
extraem índices de peças. A admissão das referências de tilesets, cenas, imagens
e dos orçamentos agregados do mundo ainda pertence à próxima fronteira. Este
codec não valida sozinho um cenário completo nem seleciona seu modo de física.

## Revisão

A comparação com o Core cobre formas abertas/fechadas, contato sem penetração,
elipses analíticas, giros/espelhos e conjuntos com escala não uniforme. O Python
roda isolado e recusa imports dos motores gráficos durante a prova geométrica.
Os controles existentes continuam usando Pygame real, sem substituir superfícies.

A revisão acrescentou uma regressão para retângulos de consulta com metadados
extras. O primeiro helper os recusava; agora usa somente os quatro campos da
janela, como o Core. Os cabeçalhos de documentos continuam estritos. O recibo
anterior conserva a falha, e a suíte focada confirma a correção. A guarda de
leitores crus também exigiu registrar a auditoria do codec: ele movimenta células
inteiras, sem decodificação manual de bits ou redução dos controles existentes.

## Verificações

- 4.050 consultas geométricas, 72 transformações e 96 consultas de animação
  comparadas com o Core em CPython real, sem importar Pygame/Pygame Zero/Raylib.
- 32 grades válidas e 40 casos de admissão comparados com o codec Core,
  incluindo coordenadas negativas, bordas parciais, flags, corrupção e campos
  futuros. As três entradas vazias/válidas são controles positivos.
- 516 consultas pontuais e dez visitas com recortes/ordens diferentes comparadas
  com o leitor comum. Cabeçalhos aceitam exatamente 2.048 chunks/4 MiB e recusam
  o próximo antes de decodificar; esse caso é admissão, não benchmark de decode.
- Mundo esparso 10.000 × 10.000: dois chunks, 4 KiB de índices; pico de alocação
  rastreada abaixo de 256 KiB durante preparo/decode/consulta, depois da leitura
  do JSON, no CPython desta máquina. Não mede FPS,
  memória total do motor, navegador ou desempenho em outro aparelho.
- Snapshot preservado após mutação da entrada; tentativa única tanto no sucesso
  quanto na corrupção; o controle positivo confirma que o decoder é exercitado.

- 22 testes focados, 6.791 asserções e quatro arquivos, sem omissões/falhas.
- Suíte completa final: 2.776 testes, 37.384 asserções, 259 arquivos e 226,13 s,
  sem omissões/falhas; executada sem outro job de testes desta sessão. Inclui os
  quatro controles reais Pygame existentes. A execução anterior conserva a
  falha da lista obrigatória de leitores, corrigida antes desta execução final.
- 79 ensaios Chromium, sem retries/omissões/falhas: 67 de regiões/persistência
  e 12 Pinta–Estúdio. Incluem desktop e CPU 4× emulados nesta máquina, recuperação
  offline entre abas, Vila/Cabana, comparação de pixels e atualização preservando
  programas nos contratos anteriores. Não executam os novos adaptadores Python.
- Tipos completos Core/Pinta/Estúdio, lint dos seis arquivos e verificadores
  oficiais de fontes geradas Python/JavaScript aprovados; whitespace conferido.
- CPython 3.12.10, AMD64 little-endian, i16 de dois bytes. Não foi validada outra
  arquitetura física, outra máquina ou uma sessão com crianças neste lote.

`index.json` registra 18 recibos comprimidos e hashes dos seis fontes. Core
3.251 e as provas externas anteriores são carregados das bases documentadas;
não foram repetidos nem apresentados como suporte regional nos motores externos.

## Integração seguinte

Ainda faltam admissão Python de cenas/PNGs/mundos, desenho, colisão do cenário,
portas e integração completa com Pygame-ce, Pygame Zero e Raylib 2D. A extração
das funções existentes não significa suporte regional nos jogos. Os formatos
públicos, a distribuição e as receitas continuam inalterados.

Nenhum bloco novo entrou neste lote: `areas.ts`, `raylib/commonCatalog.ts`,
catálogos, recibos de jogos e versão do motor não mudaram. Comandos e valores
futuros usam as categorias das extensões; novos chapéus serão coordenados por ID.
Esta frente requalifica os recibos que afetar, e o último a concluir gera a versão
única/lista aprovada após integrar todas as frentes. O acordo está no plano.

Sem mudança visual, alterações funcionais 3D, implantação ou merge em staging.
