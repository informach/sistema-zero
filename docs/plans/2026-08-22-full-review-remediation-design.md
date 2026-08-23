# Remediação integral do full review de 22/08/2026

## Objetivo

Corrigir os sete achados das entregas de 21 e 22/08/2026: concorrência e prazo absoluto da
personificação, auditoria da troca de modo, exportação GIF vetorial, polling da fila de
entregas e tecla presa no controle direcional.

## Decisões

### Personificação

1. O member-shell resolve a cadeia de sucessores do refresh antes de adquirir o lock e
   serializa operações pela credencial canônica. Assim modo, logout e rotação não correm em
   locks diferentes para a mesma família dentro do processo.
2. O Auth considera o modo da família somente depois de reivindicar atomicamente o refresh.
   Uma troca de modo que venceu a corrida passa a ser observada pela rotação; uma troca que
   perdeu não consegue publicar sucesso nem access token incompatível.
3. A troca de modo persiste a alteração canônica e sua auditoria de sucesso numa transação.
   As ações distinguem elevação para `write` e rebaixamento para `readonly`. A elevação falha
   fechada sem auditoria; se a auditoria estiver indisponível durante o rebaixamento, o modo é
   reduzido mesmo assim e a falha é registrada no log operacional.
4. Selecionar ou sair de um perfil dentro de uma personificação valida o refresh atual e
   propaga o `familyExpiresAt` autoritativo para a nova família. Trocas de perfil não renovam
   a janela absoluta de suporte nem revivem uma família inválida.

### GIF vetorial

1. A folha vetorial é rasterizada em blocos cujo canvas nunca excede 4096 px de largura. O
   caso máximo aceito pela interface, 24 quadros de 128 px em escala 4, produz vários blocos
   e continua em um único GIF.
2. A paleta permanece global para evitar mudança de cores entre quadros. Pixels com alfa
   parcial usam dithering ordenado e determinístico, preservando visualmente sua cobertura
   apesar da transparência binária do GIF.
3. Quando a paleta exige aproximação, o mapeamento aplica dithering de cor determinístico
   antes da busca pela cor mais próxima. Gradientes ganham transições menos marcadas sem
   introduzir cintilação aleatória entre quadros.
4. O caminho sem perda para desenhos de cores chapadas permanece sem dithering de cor.

### Interfaces concorrentes

1. A fila administrativa separa a autoridade de leituras foreground da atualização em
   background. Polling nunca invalida filtro ou paginação iniciados pelo operador e nunca
   reduz silenciosamente a lista carregada à primeira página.
2. Perder foco num botão do direcional libera somente aquela direção, preservando outras
   teclas ainda pressionadas e emitindo o `keyup` correspondente.

## Estratégia de implementação

Cada achado recebe primeiro um teste de regressão que reproduz a falha. As correções serão
aplicadas por domínio: Auth e member-shell, Pinta, admin e community-kids. Dependências de
teste não serão expostas na API de produção; abstrações extraídas precisam representar
responsabilidades reais do código.

## Verificação final

- Testes determinísticos das corridas de refresh, modo e transição de perfil.
- Decodificação externa do GIF, preservação de duração/loop e métricas de cobertura alfa e
  erro de gradiente no vetor.
- Testes focados de polling e teclado.
- `git diff --check`, Biome, typecheck e suítes completas de todos os pacotes afetados.
