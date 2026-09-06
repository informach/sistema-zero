# Correções do full review de 06/09/2026

## Objetivo

Corrigir os oito achados do review do Helpdesk, da ponte Molda–Studio e dos gestos vetoriais do Pinta. Cada correção deve preservar os invariantes existentes, falhar de forma explícita e ganhar uma regressão que falhe contra o código anterior.

## Helpdesk

### Triagem por cabeçalho

`X-Auto-Response-Suppress` não identifica uma resposta automática. Ele apenas pede ao destinatário que suprima respostas automáticas. A triagem deixará de usar sua presença como evidência. `Auto-Submitted: auto-replied` e os demais sinais com semântica de origem continuam válidos.

### Operações exclusivas de atendimento

O domínio tratará `triage='human'` como pré-condição para responder e executar IA sob demanda. O backend aplicará a regra antes de qualquer I/O externo; a interface esconderá essas ações em tickets automáticos. Um ticket automático permanecerá `closed`, mesmo que um PATCH tente combinar rebaixamento com status ativo.

`demoteTicket` incrementará `aiGeneration`. Assim, qualquer escrita assíncrona iniciada antes do rebaixamento perderá o CAS. O repositório manterá a geração como guarda e os serviços recusarão novas execuções fora do atendimento.

### Backfill atômico

Cada decisão aplicada pelo backfill atualizará ticket e mensagens na mesma transação. O CAS do ticket ocorrerá dentro dela; conflito abortará também as mensagens. A defesa que desarma IA consultará o estado efetivamente persistido, nunca a decisão calculada antes do conflito.

## Ponte Molda–Studio

### Namespace explícito

Callbacks assíncronos não alterarão o namespace singleton da biblioteca pessoal. O host passará `viewerId` diretamente às operações `get` e `save`. Isso mantém cada operação presa ao perfil que a originou, inclusive depois do unmount.

### Origem autoritativa de assets legados

Assets novos persistem `libOrigin`. Para assets legados sem o campo, o Studio consulta, nesta ordem:

1. o registro pessoal local;
2. os catálogos autoritativos do Pinta e do Molda;
3. o tipo 3D, que identifica o Molda sem ambiguidade.

Uma imagem que continuar ambígua não ganha editor por heurística. A interface explica que a criação precisa ser reimportada. Ao resolver uma origem, o projeto persiste `libOrigin` para não repetir a consulta.

### Reparo e resync observáveis

O Studio só abre o editor depois que o registro pessoal necessário à volta da ponte existir. Falha de reparo permanece na tela e impede a navegação. O resync deixa de engolir `updated:false` e erros: o host devolve um resultado descritivo e o Molda apresenta a falha de sincronização sem perder a criação salva localmente.

## Pinta

Um novo `pointerdown` nunca pertence a um gesto anterior com o mesmo `pointerId`: esse evento inicia um novo ciclo do ponteiro. Se existir um gesto sem captura, o palco o encerra antes de processar o novo evento. Se a captura ainda estiver ativa, o gesto atual continua protegido.

## Testes

- Triagem: `X-Auto-Response-Suppress` isolado continua humano.
- Helpdesk: reply e IA recusam ticket automático; rebaixamento invalida geração; PATCH não cria status ativo automático.
- Backfill: conflito de versão reverte mensagens e não altera IA do ticket concorrente.
- Community/Studio/Molda: namespace antigo não contamina o novo perfil; origem legada vem dos catálogos; ambiguidade bloqueia edição; reparo e resync falhos ficam visíveis.
- Pinta: gesto sem release seguido por novo `pointerdown` com o mesmo ID recupera o palco.

## Verificação

Executar primeiro os testes focados de cada regressão. Depois executar testes, typecheck e Biome em Helpdesk, Helpdesk App, Helpdesk Contracts, Community Kids, Molda, Studio e Pinta. Testes PostgreSQL exigem `HELPDESK_TEST_DATABASE_URL`; sem ela, registrar o gap explicitamente.
