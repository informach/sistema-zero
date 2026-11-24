# Faísca: blockout artístico e ritmo

Fontes: `C:/Users/tocha/Downloads/A Ilha Faísca.md`, `C:/Users/tocha/Downloads/faisca-v2-proxima-etapa-blockout.md` e pareceres do usuário sobre o marco macro. A fundação está aceita como prova de conceito; dimensões, densidade e ritmo ainda são hipóteses. Esta entrega transforma a Faísca em mapa jogável, sem implementar o capítulo inteiro.

## Decisões

Manter o avatar em escala nativa. A pedido expresso posterior do usuário, resolver também a lentidão: perfil de exploração em ensaio com 1,5 m/s andando e 3,4 m/s correndo, passada ampliada por IK sem escalar ossos, e cadência sincronizada à distância. Referência anterior e perfil ágil ficam comparáveis na ferramenta. A altura do pulo, a cápsula e os modos especiais permanecem os nativos; testar alcance, freio e transições. Concentrar casa, praça, horta e entrada da oficina no sul da Faísca, perto da descida ao píer. O Farol ocupa uma colina suave ao norte desse coração, mais central que a posição do ensaio anterior. O bosque fica a nordeste; a costa se desdobra em enseadas. Um anel liga os seis distritos; atalhos e seis ramais levam às cabeceiras existentes.

As distâncias e os tempos são calculados sobre as rotas, incluindo altura do terreno, com o perfil selecionado; medir também o avatar real. A referência anterior era 0,9225/2,21485 m/s. Não reutilizar os 2,2/4,6 m/s do documento como se fossem o perfil nativo. Seguir as hipóteses mais recentes: porta–praça 10–15 m, praça–horta 15–25 m, praça–Pátio e começo da descida 20–30 m. Cais é exploração livre, com uma descida composta, sem obrigar sua visita no tutorial. Pontos de estudo podem ser amostrados a cada 24 m; isso não significa que todos já recebam conteúdo artístico ou uma atividade real.

Escolha: geografia própria, caminhos declarativos e uma região piloto com modelos reais. Alternativas rejeitadas: decorar os marcadores antigos espalhados sem testar ritmo; montar a ilha de demonstração do Reino ampliada. Nenhuma atende ao coração habitado e à distribuição narrativa.

## Entrega

- Seis distritos com contornos de estudo e seus lugares internos identificados. Lote reservado para Morada, praça, seis canteiros de referência, entrada/oficina, Farol, lago, píer, clareiras e mirantes.
- Anel, atalhos e ramais percorríveis. Altura compartilhada entre terreno desenhado e físico, com suavização nos caminhos e patamares habitados.
- Mapa local da Faísca com percursos, nomes, marcos visitados e tempos de referência. Ferramentas de medir ida real e retorno a lugares descobertos são do ensaio; nenhum endpoint de campanha é alterado.
- Piloto na Vila, Campos e entrada do Pátio: vegetação, cercas, canteiros, poço, caixas e construções selecionadas do Reino/Adventure Land, sem castelo dominando a ilha. Farol como marco. Uma ponte curta de arte real para aferir proporção e colisão, sem aprovar a ponte longa como definitiva.
- Íris é a primeira referência: corpo de coelha, animações existentes, pequeno percurso e conversa com câmera à altura da cabeça. Não chamá-la de Íris completa: acessórios e gestos de ofício constituem o marco seguinte. Os demais moradores vêm depois desse exemplo.

## Arte e carregamento

Somente arquivos lidos do commit aprovado `7816a7aca0ba6f7d93a90fe4c15f40638b01525f` do repositório de arte, sem importar a pasta de trabalho. O exportador usa esse commit por padrão; atualizar a referência é uma decisão explícita. Adventure Land é o pack comprado; Reino é criação própria aprovada sobre ele. Manifesto conserva origem, dimensões, materiais, triângulos, caixa e clipes. Arquivos privados ficam em cache local ignorado, servidos por allowlist do playground; não publicar GLBs soltos nem copiar segredos de ambiente.

Colisão simples para decoração sólida; ponte selecionada usa a colisão em malha declarada no catálogo. Modelos repetidos estáticos usam instancing por material/mesh; personagens usam cópias de esqueleto e clipes próprios. Carregamento e descarregamento da região piloto precisam liberar geometria, materiais, texturas e mixers; falha de arte fica visível e mantém o terreno e referências de bloco utilizáveis.

## Dados e identidade

Não migrar coordenadas, não criar compatibilidade espacial, não alterar contas, inventário, avatar, projetos ou documentos Morada. O lote reservado não é uma cópia da casa do aluno. O ensaio usa uma chave nova para o novo layout; o checkpoint permite recuperar o marco anterior pelo Git.

Humanos são visitantes; moradores são criaturas. Preservar identidade/estilo visuais das interfaces adulta e Kids. O mapa e as medições permanecem ferramentas internas do playground, sem propor um HUD substituto.

## Aceite

Rotas medidas e conectadas, piso sem frestas, começo legível por três direções, seis distritos e cabeceiras visíveis no mapa, Farol reconhecível, modelos reais com materiais e medidas conferidos, retorno seguro após descarga de setores. Testar avatar real, teclado e toque; capturas de dia/noite e indicadores de desenho/memória. Não declarar testes com crianças nem desempenho de aparelho físico a partir de automação desktop.

Campanha, abertura, Missão da Sombra, Núcleo real, Morada integrada e povoamento completo não pertencem a esta entrega. Dependem do aceite do mapa/piloto.
