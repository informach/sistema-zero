# Revisão do calendário: força e precisão da copy

**13/10/2026.** Pedido: ajustar a reescrita das postagens comuns preservando capas fortes, curiosidade, linguagem direta e poder de convencimento. Aplicado às 60 postagens P01–P60 e às 20 sequências ST01–ST20. ManyChat, fixados e destaques ficam fora desta revisão.

## O que mudou

- Mantidos ganchos como “Nada funciona”, ele diz. E fecha o notebook; “Ele mudou três coisas. Funcionou. Esse é o problema”; e “O placar não sabe quem jogou melhor”. A explicação passou a sustentar melhor a provocação.
- Substituídas afirmações que atribuíam dependência aos lembretes dos pais, tratavam vídeo assistido até o fim como mau sinal ou diagnosticavam interesse por uma resposta isolada.
- Novas capas mantêm cenas concretas: “A tarefa está aberta. O celular também.”, “Ele amou a primeira aula. O plano dura doze meses.” e “A partida começou. A regra de parar ainda não.”
- Exemplos passaram a mostrar decisões de construção e testes: programação do lançamento em P04, dependência entre mira e disparo em P13, teste de condição em P10 e mudança de força do turbo em P01.
- Legendas e fechamentos foram revistos para reduzir resultados familiares inventados, repetir menos a cena de “vem ver” e convidar a acompanhar o perfil pelo assunto da peça.
- Os 18 Reels foram enxugados e receberam estimativas de tempo com espaço para demonstração. Ritmo e duração reais ainda dependem da gravação; depoimentos não devem ser acelerados.
- Stories mantêm o objetivo de educar. Foram retirados testes que classificavam interesse ou autonomia da criança por uma única resposta. Enquetes de preferência não têm gabarito.
- O guia editorial passou a usar critérios de qualidade em vez de impor seis momentos iguais a todas as peças. Suspense, cena familiar futura e dica prática não são obrigatórios.

## Coerência com os exemplos

Conferência adicional de fonte em `packages/studio/src/official-extensions/world-3d/examples.ts`: Meu Mundo tem comando de força do turbo e não tem as moedas mencionadas no rascunho. P01 foi ajustado para a regra existente. A variante de turbo deve ser preparada e executada antes de captar a comparação.

Conferido também o comportamento do balão em `game-2d/runtime/casualKitsBalloon.ts`: força participa do impulso e do consumo; altitude também entra no consumo. P45 evita atribuir o alcance a um único fator e orienta comparação mantendo as demais condições.

As outras notas técnicas já registradas nas fichas foram preservadas e alinhadas à nova cena quando necessário. Esta revisão não executou todos os jogos nem produziu capturas novas. Comparações preparadas continuam sujeitas à conferência na produção.

Falas de Fernando, Jeffrey, Daniel, Harle e Flávia conferidas no registro de fontes de Avaliações. Falas de Rafael, Débora e André preservam os textos autorizados já documentados. Demonstrações da equipe não são apresentadas como projetos desses alunos.

## Conferência final

- 60 IDs, com a correspondência de P01–P30 às 30 dores e P31–P60 aos 30 desejos preservada.
- 30 carrosséis, 18 Reels e 12 imagens únicas, todos com legenda completa e convite final para seguir.
- 20 sequências de quatro stories: **80 telas**, com copy completa. Corrigida a contagem antiga de 60 telas nos índices.
- Nenhuma tela de carrossel, arte ou story acima de 42 palavras na conferência mecânica. A legibilidade visual será avaliada na arte.
- Reels com 86 a 99 palavras faladas e estimativas de 43 a 49 segundos. A tabela é referência de produção, não duração de mídia já gravada.
- 406 unidades de copy pública extraídas para o linter da skill `revisao-copy`. As 15 ocorrências são da regra de pergunta no gancho: 12 em slides internos ou stories de conversa/quiz, e três em frases declarativas que citam uma pergunta (legendas P20 e P29; fala inicial P51). Conferidas editorialmente; não são capas interrogativas. Nenhuma ocorrência das demais regras mecânicas.
- Links locais conferidos nos lotes e documentos de navegação; títulos do calendário e do mapa de cobertura sincronizados.

Evidências locais: `output/instagram/revisao-forca-2026-10-13/verificacao-final.json`, textos extraídos em `copy-limpa/` e versão anterior em `antes.json`. Os scripts de preparação são artefatos locais desta revisão, não código da aplicação.

## Estado de entrega

Copy refinada nos documentos de produção. As artes antigas de P01, P07 e P34 continuam identificadas como versões anteriores a refazer. Nenhuma imagem nova foi gerada, nenhuma peça foi publicada e nenhum fluxo foi ativado nesta revisão. O trabalho é editorial; efeito em retenção e conversão só poderá ser avaliado depois da publicação.
