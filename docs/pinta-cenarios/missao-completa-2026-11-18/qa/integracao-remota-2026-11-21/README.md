# Integração do remoto e revisão das fronteiras — 21/11/2026

Pais: lote verificado `2fb2f58de` e staging remoto
`33cd419d8592fc2d2ba19c32e82d7912f932a8ef`. Integração na branch isolada da
missão, sem conflitos. Não é merge da feature em staging ou implantação.

## Trabalho concorrente preservado

O remoto trouxe trabalho no Estúdio, pagamentos/acessos, conteúdo e Molda.
Nenhuma dessas implementações foi reescrita. A comparação com o remoto dos
pacotes Molda, carregadores Three, runtime 3D Avançado e studio-runtime é vazia.
Na exceção de QA/CI já autorizada, dois artefatos de testes receberam correção:
`kitHarness.ts` declara os métodos reais `burstAt`/`scatterDecor`, chamados pelos
novos testes remotos, e `contracts.test.ts` exige a lista de materiais antes de
devolvê-la. Não há cast, supressão de tipos ou fallback vazio que esconda perda.
Os sete diagnósticos de tipos anteriores estão preservados no recibo.
Pinta e core não receberam mudanças funcionais desse remoto. O lote anterior
continua com seus hashes e 2.527 testes aprovados, qualificados na base anterior;
as fronteiras afetadas pelo merge foram exercitadas novamente abaixo.

A revisão relevante para o Pinta encontrou compactação compartilhada do runtime,
tetos de bootstrap atualizados, avisos de limites nos dois motores e mudanças na
abertura/salvamento dos programas. Por isso a integração foi preparada sem commit
e verificada antes de concluí-la. Não foram aumentados limites do Pinta.

## Verificação após integrar

- 84 testes aprovados, zero falhas, 6.452 asserções: fragmento de cenário,
  execução dos dois motores, colisões, variante pelo host, criação de jogo,
  bundle/mundo, compactação de código e novos avisos de limite. O controle antes
  da integração tinha 69 aprovações e 6.424 asserções; 15 casos adicionais da
  implementação remota foram incluídos na rodada posterior.
- 12 percursos de navegador aprovados, sem retries, no host local Pinta/Estúdio.
  O jogo de plataforma criado pelo Pinta executou e o personagem pousou no chão.
  Importação e atualização em JavaScript/Python conservaram arquivos, blocos e
  referências; os contornos reabriram completos. Vila/destino, versões privadas,
  animação, recusa do leitor anterior e rollback de gravação parcial foram
  exercitados pelos testes existentes, sem mudar suas asserções.
- O fluxo Python desses percursos verifica importação, metadados e conservação
  da programação; não executa um jogo Python novo. Os testes abortam `/api/**`:
  IndexedDB e interface são reais, backend/login/publicação não são parte dessa
  prova. A homologação autenticada anterior permanece no seu próprio relatório.
- Tipos completos do Estúdio após a integração e recibos estão no `index.json`.
- 92 testes das duas bancadas de QA ajustadas aprovados, zero falhas e 771
  asserções. A execução 3D aqui é a bancada existente com renderer simulado;
  nenhuma homologação gráfica nova do Molda é afirmada por esse controle.

O medidor oficial registrou, nesta mesma máquina, o Jogo 2D com cenário passando
de 447.179 para 394.456 caracteres; o teto remoto é 397.000. Sem cenário, de
420.769 para 368.046. O Avançado com cenário ficou em 436.183, abaixo de 437.000.
São medidas de tamanho do código, não qualificação de fluidez do editor, tempo
de abertura ou desempenho em outro aparelho. Tempos incidentais de compilação
estão nos dados brutos e não fundamentam uma conclusão de latência.

O `diff --check` completo encontra dois espaços finais em saídas brutas de
profiler recebidas do remoto (`perfil-do-gesto-10mil-antes/depois.txt`). Foram
conservadas intactas como evidências da outra sessão. A checagem de código e dos
demais arquivos, excluindo somente esses dois recibos, termina sem problemas;
ambos os resultados estão arquivados. Não há alteração funcional para contornar
verificadores ou mudança nas provas remotas.

## Continuação

Um desktop físico; nenhuma validação com crianças ou outro aparelho nesta
integração. Regiões 8 continuam internas. Geometria/câmera, IO 3, adaptadores,
autorregras/projeções e o ciclo final completo da Vila e Floresta continuam no
plano. As novas mudanças remotas não convertem as provas legadas em homologação
dos formatos futuros. CI global e disponibilidade pública não são inferidos de
um merge Git ou destes ensaios locais.
