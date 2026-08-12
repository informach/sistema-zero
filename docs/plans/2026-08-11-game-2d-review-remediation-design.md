# Correções do full review do Jogo 2D

Data: 2026-08-11  
Status: aprovado

## Objetivo

Corrigir os seis achados do full review da extensão Jogo 2D sem quebrar projetos salvos: semântica da animação de uma vez, transições reentrantes de Fase, colisão de sprites maiores que o Mundo, margem do bundle, estabilidade do teste de DPR e foco visível na galeria.

## Decisões

### Animação de uma vez

O runtime distinguirá uma chamada contínua no loop de uma nova ação. Enquanto o mesmo comando for chamado em quadros consecutivos, a animação concluída permanecerá no último quadro e `animationEnded` continuará respondendo `true`. Uma chamada depois de pelo menos um quadro sem solicitação reiniciará a animação, preservando golpes e ações disparadas mais de uma vez.

### Transições de Fase

Entradas e reinícios usarão uma fila síncrona FIFO. O runtime concluirá os handlers da fase atual antes de aplicar a próxima transição. A fila aceitará A → B e bloqueará apenas fases repetidas na mesma cadeia, como A → A ou A → B → A. Uma transição bloqueada não alterará fase ativa, posição, mapas ou grupos.

### Bordas de Mundo

Os limites usarão máximos não negativos. Quando um sprite for maior que o Mundo, o runtime o fixará na origem do eixo impossível de conter e emitirá um aviso único, mantendo coordenadas válidas.

### Bundle

O contrato de extensões ganhará um carregador opcional de documentação completa. O manifest manterá um resumo imediato; o painel carregará e armazenará o manual completo somente quando o usuário o abrir. O Jogo 2D moverá seu manual para um chunk sob demanda. O teste de bundle exigirá margem mínima de 5% em vez de um limite colado à medição atual.

### Galeria e E2E

O teste de DPR aguardará a condição observável do canvas e readquirirá o elemento durante a navegação do `srcdoc`. Não usará espera fixa. O campo de busca receberá um anel `focus-visible` consistente com os demais controles do Estúdio.

## Verificação

Cada defeito terá um teste que falha antes da correção. A validação final inclui a suíte do Jogo 2D, os testes de extensões e galeria, Biome, typecheck, medição do bundle e os cenários Playwright afetados.
