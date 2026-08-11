# Remediação completa de Jogo 2D Avançado

Data: 2026-08-11  
Status: aprovado

## Objetivo

Corrigir todos os achados do full review da extensão `game-2d-advanced` sem
invalidar projetos salvos. O trabalho cobre campanha, persistência, eventos,
controles touch, editor visual, documentação, testes, contratos e fronteiras
arquiteturais.

## Estratégia

A implementação seguirá uma remediação por domínios. As APIs públicas e os
blocos existentes permanecem compatíveis, enquanto campanha, input e
persistência ganham módulos próprios. Uma reescrita integral elevaria o risco de
regressão; correções pontuais manteriam as causas estruturais.

## Contratos e compatibilidade

Campanhas passam por uma fronteira única de normalização. Essa fronteira gera
IDs determinísticos para entidades legadas com ID ausente ou duplicado e
preserva IDs válidos. O editor exige IDs explícitos e únicos nas novas edições e
mostra o erro na linha correspondente. O contrato tipado deixa de propagar IDs
opcionais depois da normalização.

A persistência identifica colecionáveis pelo par fase–entidade. Ao carregar uma
fase, o runtime omite itens já coletados. Saves antigos continuam reconhecidos;
o próximo salvamento grava a representação normalizada. Recarregar, voltar a
uma fase ou iniciar replay não recria itens persistentes nem duplica eventos.

A definição da campanha recebe uma condição explícita de conclusão por gemas.
O runtime genérico não presume oito itens. O exemplo Reino Zero Pro declara
oito gemas no próprio projeto.

## Eventos e fluxo de dados

Um bloco de cabeçalho “Quando acontecer na campanha” percorre todo o pipeline:
Blockly → IR → JavaScript → parser → IR → Blockly. Ele registra o callback pela
API pública `onCampaignEvent`. O evento inclui nome e payload; blocos repórteres
expõem os campos úteis sem obrigar a criança a manipular objetos.

O runtime usa um único roteador de eventos de campanha. Entradas por região,
coletas, checkpoints, guardiões, mudanças de fase e fim de campanha passam por
esse roteador. O reset remove listeners do ciclo anterior.

## Controles touch

Os controles visuais usam as mesmas ações semânticas do teclado e do controle.
O layout deriva do retângulo visível do palco, usa margens seguras e ancora os
grupos nas bordas, sem coordenadas da resolução lógica. O d-pad cobre quatro
direções; os botões de ação cobrem pulo, corrida, interação, confirmação, voltar
e pausa conforme as ações habilitadas.

Cada ponteiro mantém estado independente. `pointerup`, `pointercancel`, perda de
captura e teardown liberam a ação. O E2E móvel verifica posição, multitouch e
cancelamento no `SZGameKit` real.

## Editor visual

Um catálogo tipado concentra os tipos de entidade, rótulos em português,
propriedades, limites e valores padrão. Schema, editor e runtime consultam esse
catálogo para evitar contratos paralelos. O editor oferece campos específicos
para vida, direção, velocidade, alcance e requisito de guardião.

Todos os controles recebem rótulo, nome e descrição acessível. O mapa entra na
ordem de tabulação e oferece pintura por teclado. Em telas estreitas, formulários
e linhas de entidade passam para uma coluna. Erros apontam o campo inválido e
movem o foco para ele.

A pintura redesenha apenas a célula alterada. Redimensionamentos e abertura do
editor continuam autorizados a redesenhar a grade inteira. Essa separação evita
percorrer até 262.144 células em cada movimento do ponteiro.

## Arquitetura e tipos

O domínio de campanha será dividido em estado/simulação, persistência, eventos e
input visual. `runtime.ts` apenas compõe os módulos e publica a API. Testes
arquiteturais verificam dependências e registro/reset de cada domínio, em vez de
usar somente limites de linhas.

Tipos públicos não usados serão removidos. Campanha, save, replay e ações terão
assinaturas concretas; a lista de chaves da API continuará derivada de uma única
fonte. O trabalho não adicionará casts de evasão, supressões de lint ou métodos
exclusivos para testes.

## Documentação e experiência de desenvolvimento

O manual da extensão ganha uma receita infantil de campanha, regras de IDs,
eventos, saves, replay e controles móveis. O contexto da IA e o manual humano
descrevem o mesmo contrato.

O E2E “Reino Zero” passa a executar a extensão avançada. O servidor de teste
aguarda uma condição observável de prontidão e recebe um orçamento compatível
com o build medido. O typecheck será perfilado; a correção atacará o domínio que
consome tempo, sem apenas elevar timeouts.

## Erros

A normalização legada nunca descarta uma fase válida. Dados irrecuperáveis
produzem diagnóstico com fase, entidade e propriedade. O editor bloqueia a
confirmação enquanto houver erros e preserva o rascunho para correção. O runtime
recusa definições inválidas antes de alterar a campanha ativa.

## Verificação

Cada defeito funcional receberá uma regressão que falha antes da correção. A
matriz final inclui:

- schema estrito e migração legada idempotente;
- coleta, reload, retorno de fase, save/load e replay;
- evento de região ponta a ponta e reset de listeners;
- conclusão configurável;
- editor acessível, responsivo e com pintura incremental;
- touch móvel, multitouch e cancelamento;
- round-trip Blockly/IR/código/parser;
- contratos arquiteturais e tipos públicos;
- documentação e exemplos;
- testes da extensão, integrações, suíte completa, Biome, typecheck e E2E.
