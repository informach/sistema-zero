# Auditoria completa da extensão Jogo 2D — 2026-07-19

## Resultado

Os 190 blocos da extensão continuam disponíveis. Esta revisão não alterou a
curadoria progressiva da paleta: nas aulas, o professor continua decidindo quais
blocos apresentar à criança.

Os 14 exemplos reais foram revisados no código-fonte, no pipeline
IR → Blockly → JavaScript → IR, no runtime e no Chromium. Todos possuem uma raiz
**Ao iniciar** quando precisam preparar a partida, raízes independentes em
**⚡ Quando acontecer — Eventos** e **🔁 Enquanto estiver rodando — Loops**, e abrem com um primeiro frame visível. O motor inicia
automaticamente depois do registro dessas áreas. A classificação ficou em nove
jogos, quatro demonstrações e uma exploração.

## Achados corrigidos

1. **O comportamento não separava preparação, eventos e repetição.** Os 14
   exemplos foram convertidos diretamente para IR V2. Preparação fica em **Ao
   iniciar**, ocorrências em **⚡ Quando acontecer — Eventos** e laços contínuos/periódicos em
   **Loops**. O antigo `g2d:onStart` é aceito apenas pela migração transparente;
   projetos e exemplos novos não dependem dele.
2. **Reiniciar recarregava a página e deixava estado escapar.** O runtime agora
   reinicia em memória, cancela o frame anterior, limpa entradas, câmera, áudio,
   grupos e registradores, e executa novamente o começo da partida.
3. **Laços periódicos estavam aninhados no quadro principal.** `A cada N
   quadros` e `A cada N segundos` agora são raízes independentes; o agendador
   aceita vários laços identificados, com passo fixo de 60 Hz. Um erro em um
   callback é diagnosticado sem congelar os demais.
4. **Eventos podiam duplicar após regenerar ou reiniciar.** Teclado, ponteiro e
   colisões são registrados por identidade estável; reiniciar ou regenerar
   substitui a receita anterior em vez de acumular listeners.
5. **Pausar tinha comportamento ambíguo.** Pausa congela laços e contatos, mas
   mantém teclado e clique ativos para que a própria criança consiga continuar ou
   reiniciar. Tooltips, manual e contexto da IA agora dizem exatamente isso.
6. **Erros de nome apareciam tarde no console.** O schema valida declarações
   duplicadas e referências inexistentes de sprites, grupos, mapas e inimigos,
   respeitando variáveis locais de callbacks. No Blockly, o aviso fica preso ao
   bloco culpado; enquanto o projeto está inválido, o último preview válido é
   preservado.
7. **Pong não cumpria a promessa de jogo.** Ganhou adversário controlado pelo
   computador, menu e instruções, placar dos dois lados, vitória/derrota em cinco
   pontos e reinício completo por Enter.
8. **Plataforma com inimigos não tinha conclusão e ignorava um inimigo.** Tiros
   agora atingem patrulha, sapinho e canhão; os três contam para a vitória. Vida
   zero causa derrota, há telas de início/fim e Enter reinicia toda a partida.
9. **Aventura com câmera parecia vazia.** O exemplo agora desenha caminho, casa,
   árvores, água e marco visual, nasce em área segura, limita o herói ao mundo e
   oferece quatro moedas alcançáveis com feedback de conclusão.
10. **Equilibrista e Balão escondiam o reinício dentro do kit.** Os exemplos
    agora conectam explicitamente Enter ao estado de fim e ao reinício, mostrando
    como compor eventos com os kits temáticos.
11. **Havia duas APIs para a mesma explosão.** O bloco temático antigo foi
    preservado para compatibilidade visual, mas gera e faz round-trip pela API
    canônica `playExplosion`; o método duplicado `playBoom` saiu do runtime.
12. **O manual completo era carregado sempre no prompt da IA.** A extensão usa
    um resumo operacional curto e carrega a documentação detalhada somente quando
    solicitada.
13. **O pipeline não protegia o novo contrato de ciclo de vida.** Gerador,
    parser, serialização Blockly, allowlist de extensões e persistência agora
    reconhecem o começo da partida. O contrato interno é tipado em
    `GameTwoDLifecycleApi`; a auditoria automática percorre todos os blocos e
    compara os helpers gerados com a API real do runtime.
14. **O canvas não explicava o jogo para tecnologia assistiva.** Cada projeto
    pode declarar título, objetivo e controles; o runtime expõe essa descrição
    com nome acessível, texto associado, foco por teclado e anúncios de estado.
15. **O runtime e o catálogo estavam concentrados em arquivos monolíticos.** O
    catálogo, os exemplos e os dez domínios do runtime foram separados sem mudar
    o JavaScript entregue ao preview. Um inventário exato protege os 188 métodos
    da API interna contra implementação sem tipo ou contrato sem implementação.
16. **O projeto real do curso na versão 0.19.0 precisava continuar funcionando.**
    Ao abrir `projeto-da-aula.szproject.json`, o Estúdio converte em memória a IR
    plana e a área antiga de comportamento para as três áreas atuais, inclusive
    elevando `A cada N quadros` aninhado. O player público do mural usa a mesma
    migração leve antes de gerar o preview. Projetos da Ponte não são reescritos,
    porque neles o código manual da criança continua sendo a fonte da verdade.

## Inventário dos exemplos

| Exemplo | Classe | Promessa verificada | Correção principal | Chromium |
|---|---|---|---|---|
| Pong simples | Jogo | Primeiro a cinco, vitória/derrota e novo jogo | Adversário, placar e ciclo completo | Aprovado |
| Herói que anda | Demonstração | Sprite, animação e quatro direções | Migração direta para as áreas V2 | Aprovado |
| Mini plataforma | Demonstração | Movimento, pulo, gravidade e limites | Migração direta para as áreas V2 | Aprovado |
| Plataforma com inimigos | Jogo | Três tipos, combate, vitória/derrota e novo jogo | Sapinho, conclusão e reinício | Aprovado |
| Jogo desenhado por código | Demonstração | Herói e moeda feitos com formas | Migração direta para as áreas V2 | Aprovado |
| Sala com paredes | Demonstração | Tilemap e paredes sólidas | Migração direta para as áreas V2 | Aprovado |
| Nave contra Asteroides | Jogo | Tiro, pontos, fim e reinício | Ciclo de vida compartilhado | Aprovado |
| Asteroides clássico | Jogo | Girar, acelerar, atirar e concluir | Ciclo de vida compartilhado | Aprovado |
| Dino Run | Jogo | Pular, abaixar, bônus, derrota e recorde | Ciclo de vida compartilhado | Aprovado |
| Guerra de Gorilas | Jogo | Mira, vento, crateras, dois jogadores e placar | Explosão canônica e ciclo de vida | Aprovado |
| Guerra de Gorilas vs Robô | Jogo | Jogada humana e resposta do robô | Explosão canônica e ciclo de vida | Aprovado |
| Equilibrista | Jogo | Esticar, atravessar, falhar e recomeçar | Reinício explícito por Enter | Aprovado |
| Balão | Jogo | Combustível, árvores, falha e recomeço | Reinício explícito por Enter | Aprovado |
| Aventura com câmera | Exploração | Cenário amplo, câmera, áudio e quatro moedas | Mundo visível, seguro e concluível | Aprovado |

## Evidência automatizada

- Contrato do catálogo: os 67 cartões atuais têm classificação e cenário de QA;
  os 14 do Jogo 2D passam por schema, projeto real da galeria, assets e round-trip
  sem warning.
- Playthrough dos fixtures exatos: Pong percorre vitória, derrota e dois
  reinícios; Plataforma com inimigos derrota os três tipos, vence, reinicia e
  também percorre a derrota.
- Testes do runtime: começo único, múltiplos laços, passo fixo, pausa, eventos,
  erros isolados e reinício em memória.
- Projeto legado real do curso: abertura no Estúdio, três áreas, geração atual,
  vitória, derrota, reinício e renderização pelo player público aprovados.
- Suíte completa do pacote: 4.218 testes aprovados em 285 arquivos, com 37.254
  asserções e nenhuma falha.
- TypeScript: `tsc --noEmit` aprovado.
- Biome no pacote completo: 665 arquivos aprovados, sem correções pendentes.
- Build de produção do playground: 1.442 módulos transformados e bundle gerado.
- Chromium: os 14 cartões do Jogo 2D e a amostra estreita em 390×844 foram
  aprovados. O fluxo completo da Vila do Dragão também foi aprovado.
- Suíte E2E completa: 116 cenários aprovados, sem falha.
