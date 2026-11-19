# Cenários ligados no Estúdio Python/Pygame

Continuação da etapa 2a, a partir de staging `5da218d5c`, no worktree isolado do Pinta.
Preservar os arquivos de Molda e a identidade visual. A biblioteca e os componentes de seleção
de imagem continuam os existentes. Não depende de autorização entre etapas.

## Contrato e compatibilidade

A seleção atual `map` produz um PNG com o atlas, camadas, objetos e cena, mas contém um único
mapa. `pinta.Mapa` só registra essa cena; a escolha de imagem simples `tilemap` é diferente.
Manter as receitas anteriores e acrescentar a seleção explícita `map-world` para o cenário
completo com seus destinos. Ela aparece no mesmo seletor do Pygame; a revisão de um material
existente conserva a opção anterior. Turtle e Pygame Zero não passam a importar esse pacote.
O host verifica a capacidade `pinta-map-world-v1` na versão exata do runtime do projeto antes
de oferecer essa seleção. Ambientes anteriores mantêm `map` como padrão. Sem host de execução,
o editor ainda pode preparar a exportação de fonte. Um material existente conserva sua escolha,
mas a execução exige o leitor: o registro de runtimes recusa sem perder programa ou mapa.

O documento autoral continua sendo o Pinta nativo. O PNG é um contêiner derivado de execução,
não uma imagem achatada usada como documento. Seu bloco `pinta` versão 3 conserva o atlas e
a cena da raiz, e acrescenta os PNGs estruturados dos destinos, com IDs e nomes. Os destinos
são folhas versão 2, sem mundos aninhados. O retorno à raiz usa o registro em memória;
não há referência binária circular nem busca arbitrária de arquivos pelo texto de uma porta.
Leitores Python antigos recusam a versão 3. A receita versão 2, exclusiva de `map-world`, permite a recusa do
projeto em leitores que ainda não o reconhecem, antes de alterar seus dados.
As seleções antigas continuam com receita versão 1. O documento Python do Estúdio permanece
no formato 3, cujo contrato aceita materiais opacos: sua leitura sem perda valida a receita
aninhada, e a gravação usa a revisão local por CAS. A prova com código congelado verifica
tanto a recusa da receita desconhecida quanto a recusa da gravação da aba já aberta.

Reutilizar `sceneMapClosure` e a captura da autoridade local: mesmos IDs, ciclos, portas
ocultas e em conjuntos, referências e recusas do caminho JavaScript. A proveniência inclui
todos os documentos nativos do fechamento, sem a própria raiz nem criações alheias.
Recursos privados já estão no documento que os contém. O PNG e o registro canônico da
biblioteca saem da mesma captura; a biblioteca continua guardando a representação canônica
JavaScript, e o projeto Python recebe um único material derivado, com sua receita.

Não ampliar cotas existentes. Além dos 16 mapas e 225 documentos do fechamento, usar o
orçamento de 2.097.152 células para o mundo e seus conjuntos, até 4 MiB de PNGs de destinos
codificados, 4 MiB de cache temporário de recursos codificados e até 16 MiB de JSON
descomprimido acumulado entre raiz e destinos (o teto atual do leitor Python). Cada imagem
continua sujeita aos limites de dimensão, pixels, bytes e espaço do destino. Renderizar um
destino por vez e liberar canvases, incluindo o canvas auxiliar de células do renderizador
existente. O orçamento conservador de atlas, recursos escalados e superfícies temporárias
de conjuntos/arte (com escala, espelho e rotação) não passa de 16.777.216 pixels. Ele recusa
uma instância ampliada antes da importação, e o leitor repete a verificação antes de
decodificar imagens. Esse orçamento não é uma medição do heap total do processo Python.
O leitor
carrega imagens de destinos sob demanda e não
mantém um cache de superfícies de todos os mapas.

## Execução e aceite

- [x] Reproduzir a ausência dos destinos no PNG estruturado e na execução Python.
- [x] Acrescentar a seleção e sua regra de dependências aos contratos compartilhados, sem
  trocar a identidade das receitas antigas. Provar recusa em leitores anteriores.
- [x] Produzir o mundo a partir de uma captura, com orçamento, cancelamento e validação
  antes da gravação. Preservar o exportador antigo de mapa e a imagem simples.
- [x] Ler o contêiner no `pinta.py`, reutilizando a inicialização de `Mapa`. Expor abertura
  do destino de uma porta e ponto inicial usando os dados já existentes. Conservar camadas,
  imagens, animações, colisões, conjuntos e propriedades. O programa do jogo decide quando
  atravessar a porta; o Pinta continua sem lógica de eventos.
- [x] Integrar a seleção à importação, prévia, atualização automática e materialização de
  execução/exportação de projetos Python, conservando arquivos, programação e vínculos.
- [x] Ensaiar Vila → Cabana → Vila no Pygame real, incluindo o mapa atualizado, quadros,
  colisões e propriedades. Reexecutar os projetos anteriores e PyDew Valley.
- [x] Exercitar a interface no navegador e registrar separadamente o que exige runtime
  autenticado/deploy de staging. Rever, verificar tipos/testes e commitar o lote.

As provas locais e nativas não substituem o rollout e o ciclo autenticado da etapa 0b.

Provas e reprodução: [QA do mundo Python](qa/mundos-no-pygame/README.md).
