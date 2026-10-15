# P50 · Um jogo para compartilhar

Produção local em 14/10/2026. Sete slides de 1080 × 1350, proporção 4:5 e perfil sRGB. Segundo post da semana 12 do calendário comum; série Diário de criador; desejo W20. Destino: seguir o perfil.

## Copy e relato

Fonte: [ficha atual do P50](../../../../postagens/10-p41-a-p50.md#p50). Copy e legenda preservadas integralmente: [texto](copy.json) e [verificação](verificacao.json). [Direção visual vigente](../../../../postagens/05-direcao-visual-e-producao.md).

A fala No fim eu peguei o link e mandei pro meu amigo jogar foi conferida na versão histórica c3c142e8f^ de packages/funnel/src/components/funnel/oferta/DesafioOfertaBody.astro. Ela é a segunda frase de um relato sobre uma nave que atira em asteroides. Esta peça usa somente a segunda frase. A corrida não é o projeto do relato. [Registro de fontes dos depoimentos](../../../destaques/avaliacoes/fontes-dos-relatos.txt).

Retrato: packages/funnel/public/img/desafio-primeiro-jogo/depo-rafael.webp, cópia integral em [rafael.webp](rafael.webp), 160 × 160. Exibido no tamanho original, com recorte circular feito na montagem. Não foi gerada nem editada a fisionomia. As aspas de abertura e fechamento recebem o mesmo tratamento gráfico; nenhuma palavra da fala foi removida ou reescrita.

## Imagens e direção

Quatro imagens criadas pela ferramenta nativa image_gen.imagegen: três cenas fotográficas e uma ilustração. [Prompts e referências](prompts.json). [Arquivos selecionados, origens e hashes](imagens-geradas.json).

Slide 1: celular gerado com tela em branco; balão de link aplicado na edição. É representação editorial genérica, sem remetente, destinatário, URL ou diálogo inventado. Slide 3: cadeira e controle esperando alguém experimentar uma criação, com um esboço no caderno. Não é interface da plataforma. Slides 4 e 7: dois meninos fictícios em cenas distintas, primeiro no computador e depois no portão de uma escola genérica. A imagem 4 foi referência de aparência para a 7. Não são Rafael e seu amigo nem evidência de um acontecimento real. Nenhuma imagem se repete entre slides.

## Corrida Infinita 3D

Base: packages/studio/src/official-extensions/game-3d/examples.ts, corridaInfinitaExample, com regras em game-3d/__gen_corridaInfinita.ts. O projeto original foi exportado e executado com o runtime atual, sem mudar regras, velocidade, colisões ou cenário. [Código](corrida-original.js), [IR](corrida-original.json) e [estados conferidos](capturas-verificadas.json).

Três pistas. Velocidade inicial 0,14, incremento de 0,005 a cada segundo e limite 0,56. Captura aos 64 segundos, velocidade 0,46, herói vivo e três caixas no trajeto. A navegação foi feita com entradas de teclado. Não há moedas nem tremor de câmera da versão Profissional. O destaque amarelo do tempo é editorial e repete o placar verificado; não representa um controle novo.

A primeira tentativa acumulou trabalho de GPU ao avançar o relógio e falhou na captura. Na captura final, somente o desenho dos frames intermediários foi suprimido; a lógica original continuou a cada quadro. O renderizador original desenhou o estado final antes do screenshot. O observador apenas lê posições e variáveis. A demonstração é local, sem conta autenticada e sem atribuição de autoria a aluno.

## Mural e compartilhamento

Fonte visual real já usada no funil: packages/funnel/public/img/comunidade-dos-criadores/tela-mural@2x.webp. [Cópia original](mural-original.webp). Esta produção não capturou novamente uma conta autenticada. A montagem usa três recortes da mesma captura: item de menu, miniaturas e ações. Nomes de perfis, identificação da conta, descrições e métricas ficam fora dos recortes. Não houve geração de controles nem inclusão de comentários falsos.

Capacidades conferidas no código atual: packages/community-kids/src/components/kids/kids-space-detail.tsx, PlayLinkActions, constrói a rota pública /jogar/id e permite copiar/compartilhar o link; a página do Mural fica em src/app/(app)/mural-dos-criadores/page.tsx. A moderação está em packages/hub/src/application/threads/thread.service.ts e application/moderation/moderation.service.ts. A possibilidade de comentar depende do acesso do perfil. O post não promete comentários a todo projeto nem envio público obrigatório.

## Entrega e revisão

- [Prévia](../index.html), [montagem editável](../montagem.html) e [legenda](../legenda.txt).
- [Textos alternativos](../texto-alternativo.txt), com origem descrita e versões curtas até 100 caracteres.
- [Orientações de publicação](../publicacao.txt), incluindo Rótulo de IA e conferência da autorização do relato.
- [Verificação final](entrega-verificada.json): texto vigente, dimensões, fontes, legibilidade, arquivos, links, retrato e imagens geradas.

Nunito 600 e 800, com [licença](LICENSE-Nunito), reutilizada da produção anterior. Scripts em output/instagram/p50-2026-10-14/. Revisão editorial, conferência visual e execução do exemplo; não é teste de conversão. Sem publicação, agendamento, ZIP, commit ou deploy. Próximo carrossel: P52, terceiro post da semana 13.
