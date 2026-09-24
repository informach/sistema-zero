# Curso gratuito: Cadê Todo Mundo?

Título no catálogo: **Cadê Todo Mundo?**. Descrição curta: **Crie seu primeiro jogo de procurar personagens**. Identificador interno: `cade-todo-mundo`.

## Decisão aprovada

O curso é a primeira experiência de criação de jogos de quem tem entre 8 e 15 anos. Uma pessoa pode começar no evento presencial, conseguir uma vitória em 15 a 20 minutos com pouca ajuda e concluir em casa. O jogo tem três personagens escondidos num jardim. O cenário, as imagens, os personagens, a animação básica e a regra de vitória começam preparados. A criança programa a reação ao toque e completa a contagem dos achados. Os recursos visuais são próprios do projeto; os blocos usam somente a extensão Jogo 2D e os blocos nativos indispensáveis de números, variável e condição. Não há Pinta nem acesso ao Estúdio completo.

### Alternativas rejeitadas

- Entregar um jogo praticamente pronto e pedir só para jogar tornaria o curso rápido, mas a criança não sentiria que programou algo.
- Montar cenário, personagens, eventos e placar do zero exigiria tempo e vocabulário demais para um primeiro contato independente.
- O projeto preparado deixa a autoria concentrada em uma regra pequena, testável e visível.

## Percurso

| Aula | Momento | Vitória observável | Seções |
| --- | --- | --- | --- |
| 1. O primeiro achado | Evento, 15 a 20 minutos | Um toque abre um esconderijo e revela quem estava atrás | Apresentação; caderno visual opcional; toque e resposta com experiência; programação da primeira reação |
| 2. Complete a busca | Em casa, cerca de 10 a 15 minutos | Cada achado passa a contar; ao chegar a três, o jogo comemora | Retomada do jogo; contagem no próprio jogo; teste e finalização |
| 3. Certificado | Após terminar o jogo | Certificado emitido | Conquista e certificado, sem oferta nem pitch |

Todas as seções têm um único vídeo curto e contextualizado. O primeiro vídeo da Aula 1 inclui uma introdução mínima à própria página da aula: pausar/rever vídeo, fazer a atividade da seção e avançar com Próxima seção. Não há tour separado; o Estúdio é explicado quando aparece. Vídeo e atividade ficam disponíveis juntos. A seção prática só conclui com 90% do vídeo e uma verificação real do projeto; a seção de conceito exige também a experiência. As falas do Zappy são pontes curtas, sem repetir a instrução interna da cena nem o passo a passo do vídeo. Não há quiz nem palpite obrigatório. Um caderno visual de uma página é opcional: ajuda na retomada em casa, mas o download não bloqueia a aula.

## Jogo e projeto inicial

O palco é um jardim colorido com três esconderijos grandes, separados e tocáveis. Atrás de cada um há um personagem visualmente distinto. A arte é entregue como imagens locais no `initialProject` e usada por `sz_g2d_create_image_sprite`; o projeto fica autossuficiente e sem dependência de rede. Os blocos de preparação criam os sprites e o grupo dos esconderijos. O desenho do jogo mantém os personagens atrás dos esconderijos. O evento de toque identifica o esconderijo escolhido. A primeira ação que a criança encaixa deixa esse esconderijo invisível, revelando o personagem. Um esconderijo invisível deixa de receber toques, portanto não conta duas vezes. Na segunda aula, um contador já preparado fica visível e a criança liga o incremento à reação. O projeto preparado cuida da tela de vitória quando os três forem encontrados. O vídeo explica todos os gestos de montagem, com os caminhos reais da paleta e os campos que precisam ser configurados.

O projeto tem uma única cadeia entre as duas aulas. A aula seguinte parte do projeto salvo, não de outra cópia pronta. A capa, o cenário e o resultado final usam a mesma identidade visual. É preciso testar mouse e toque, a ordem visual dos sprites, o reinício, a contagem única e o critério de conclusão de cada seção.

## Experiência conceitual

As cenas `layers` e `variable` não servem ao primeiro conceito. A primeira ensina ordem de desenho; a segunda separa guardar, mudar e mostrar. A cena nova `touch-response` ensina que um toque só dispara uma ação quando os dois estão ligados. Começa com um esconderijo e um personagem oculto. A criança toca sem ligar a reação, observa que nada muda, liga a reação e toca no mesmo lugar para comparar. Não pede palpite nem antecipa os resultados. Cada meta só cai depois do toque correspondente, nunca ao mexer no controle. Instrução breve do Zappy, pistas progressivas, palco e bancada na ordem padrão, sem instrução duplicada. O vídeo usa uma analogia próxima, como tocar uma campainha e ouvir uma resposta, mas não narra os testes da cena. A cena deve poder ser reutilizada em outros cursos que introduzam eventos de toque.

## Certificado e transição comercial

O certificado reconhece o jogo concluído. Não contém pitch, link de compra ou pedido para a criança convencer alguém. Cursos não adquiridos continuam levando à landing page externa configurada para o responsável. No cartão, `Quero acesso` vira `Mostrar ao responsável`, com indicação acessível de que abre uma página externa em nova aba. A mudança não altera catálogo, funil, preço nem regras de acesso. A revisão jurídica final da comunicação comercial fica com a equipe.

## Publicação e limites

Serão produzidos proposta, roteiro falado e manifesto v5 para cada aula; especificação/implementação da experiência; arte preparada no projeto; caderno visual; testes dos manifestos e do fluxo; e ajuste de copy no cartão. O curso não será publicado automaticamente. Os vídeos ficam `plannedVideo` até a gravação e a vinculação no admin. O curso e as lições precisam existir no catálogo antes da importação dos manifestos. A cópia antiga de introdução e certificado do Desafio permanece intacta.
