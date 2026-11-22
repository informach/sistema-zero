# Integração da staging 6a3028a8d — 22/11/2026

Recebida a staging `6a3028a8d353cf9eb0ae948f4ae5f718f40f2726` na branch da
missão, sobre `9a3e3eb4a`. Dos 27 arquivos recebidos, 26 conservam exatamente
os blobs remotos. A união automática do teste SQL conserva os 15 corpos
anteriores, incluindo as duas parametrizações de formato 6, e acrescenta o
caso recebido de reserva pendente. Comparação por AST arquivada; não é execução
SQL. Não há fonte Pinta/Core ou mudança funcional 3D neste lote.

Revisão da fronteira de persistência: uma recusa antiga não cria cópia de saída
enquanto o mesmo projeto continua aberto, nem cobre a captura mais recente ao
transferir uma escrita cancelada. As migrações reconhecem o cancelamento de
saída sem convertê-lo em falha definitiva, relendo o estado antes de continuar.
O reconhecimento de projeto inicial ignora IDs gerados de parâmetros/métodos
sem descartar os respectivos nomes.

Revisão do Blockly: abrir ancestrais apenas para mostrar um bloco conserva o
estado salvo e o histórico. Uma edição real encerra essa condição transitória.
Corpos recolhidos continuam adiados, conexões só são rastreadas após desenho e
corpos longos desenham até o alvo mais 1,5 tela. A unidade acima é completada
antes de posicionar a próxima. Não foi necessária correção própria nos fontes
recebidos.

Verificação desta integração:

- 157 testes unitários, sete arquivos e 701 asserções, zero falhas/omissões.
- 21 ensaios de abertura transitória em Chromium, Firefox e WebKit.
- Três percursos na aplicação real: revelar bloco do Reino Zero Ultra sem
  alterar o salvo; interromper a migração de 30 projetos em Chromium e WebKit,
  com recuperação integral na reabertura.
- 12 percursos Pinta–Estúdio no Chromium; os 36 ensaios passaram sem retry.
- Tipos completos de Estúdio e member-shell e lint de 23 arquivos aprovados.
  A checagem do member-shell foi repetida porque o primeiro processo havia
  terminado sem resultado recuperável; a repetição terminou com código zero.

A porta padrão 5195 estava ocupada por outra sessão. Os testes reais usaram
5597 e 5598 com builds próprios; não houve conexão ou interrupção do servidor
alheio. Todos os browsers rodam nesta máquina. Números de tempo do percurso
Blockly são diagnóstico sob carga, não qualificação de desempenho do Pinta.

Os testes SQL recebidos não foram executados neste lote. As suítes completas
2.748 Pinta/3.227 Core pertencem ao pai, cujos fontes não mudaram. Não houve
promoção de formato, implantação ou merge da feature em staging. Continuar
consultas/geometria regionais e motores; as etapas macro seguem abertas.
