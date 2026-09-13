# O jogo do meu jeito — revisão das oito aulas gravadas

As oito aulas foram refeitas a partir dos roteiros originais: **76 seções, 13 demonstrações, 5 experimentos funcionais, 55 clipes planejados, 8 entregas pela galeria e 16 perguntas de quiz final**. Cada aula original continua sendo uma aula. Os arquivos originais foram apenas lidos e preservados; os vídeos ainda precisam de recorte e complementos.

Em cada pasta, `roteiro.md` apresenta o percurso, as falas revisadas, o trabalho da criança e os critérios do professor. `manifesto.json` organiza os blocos e a conclusão das seções. `montagem.json` identifica os trechos do roteiro gravado por entrada e saída, com instruções de corte, substituição de fala e imagem. Não há minutagens inventadas nem vídeos já editados neste pacote.

## As oito aulas

| Aula | Como fica a experiência | Criação entregue |
| --- | --- | --- |
| [1 — Seu jogo no Estúdio Completo](aula-01/roteiro.md) | Observar a lista e a ponte da cópia; criar um projeto de teste; importar o Dia 5; salvar e reencontrar o cartão certo | Jogo importado do Desafio, separado do projeto vazio |
| [2 — Desenhe a sua nave](aula-02/roteiro.md) | Preparar o quadro; experimentar o espelho; contorno; cor; observar volume; luz/sombra; entender salvamento | `nave`, pixel art, Personagem 32 × 32, espaço inferior para o motor |
| [3 — O motor ganha movimento](aula-03/roteiro.md) | Observar o livrinho; desenhar fogo-base; comparar quadros iguais/diferentes; duplicar e mover a ponta; observar fantasma; conferir e nomear | `nave`, animação `voando`, dois quadros, 8 fps |
| [4 — Asteroide em vetor](aula-04/roteiro.md) | Preparar o quadro; observar preenchimento/contorno; traçar; suavizar; copiar crateras; comparar bordas | `asteroide`, vetor, Personagem 64 × 64, espaço superior para a chama |
| [5 — Chama e animação](aula-05/roteiro.md) | Comparar ordem das formas; construir chama externa/interna; observar mudança local; duplicar, ajustar e nomear | Nave e asteroide juntos; `girando` com dois quadros, 8 fps |
| [6 — A nave entra no jogo](aula-06/roteiro.md) | Trazer as duas artes; substituir o criador; observar a folha inteira; experimentar o recorte; carregar folha; animar e testar | Mesmo jogo, nave própria em 54 × 54 e folha com quadros 32 × 32 |
| [7 — Os asteroides entram](aula-07/roteiro.md) | Carregar folha 64 × 64; observar tempo do jogo versus quadros da animação; trocar criador preservando o sorteio; animar cada nascimento | Mesmo jogo com as duas artes, regras e reinício preservados |
| [8 — Publique o jogo](aula-08/roteiro.md) | Publicar primeiro e conferir no Mural; observar possibilidades futuras de versões, ideias e ajuda; enviar o projeto e link; fechar o curso | Projeto final; professor confere a publicação pelo endereço enviado |

## O que o professor prepara e a criança faz

| Formato | Professor | Criança | Conclusão |
| --- | --- | --- | --- |
| Apresentação | Recorta resultado e abertura da aula | Assiste, pausa ou revê | 90% do vídeo isolado |
| Demonstração | Mostra uma relação com imagem e fala; sem controles de manipulação | Observa, pausa ou revê | 90% do vídeo isolado; não vira experimento |
| Experimentação | Usa um dos cinco exemplos delimitados deste pacote | Escolhe duas situações, testa e guarda cada resultado; responde uma pergunta | Participação registrada no navegador e resposta corrigida no servidor |
| Aplicação | Seleciona clipe do gesto e critérios de conferência da criação | Pausa, usa a ferramenta completa em outra aba e volta à aula | Uma pergunta verifica compreensão; a montagem/desenho será revisada na entrega |
| Entrega | Configura seleção da galeria e revisa a criação recebida | Seleciona a criação já salva na conta e envia | Recebimento confirmado; não é nota automática de beleza ou jogabilidade |
| Fechamento e quiz | Retoma o resultado e seleciona duas questões | Assiste e responde; pode rever e tentar novamente | Vídeo isolado e acerto das duas questões |

Este curso ensina a trabalhar **fora da aula**, na galeria do Pinta e em Meus Jogos. Os atalhos abrem outra aba. Oriente a criança a manter a aba da ferramenta que já abriu e a voltar à aba da aula; não criar um projeto a cada seção. A entrega captura a criação escolhida da galeria, preservando o trabalho na ferramenta. Não há Estúdio incorporado nem migração artificial para um projeto da aula.

As aplicações têm critérios de criação concretos, mas a plataforma não inspeciona automaticamente o projeto livre durante cada etapa. A pergunta confere a ideia e a galeria permite revisar o trabalho real. No Pinta, cor, formato, número exato de crateras e fidelidade ao desenho de Júlio não recebem gabarito. Na aula 8, a pergunta também não comprova uma publicação: o professor abre o link enviado e verifica o jogo.

## Escolhas com foco

Na criação artística, escolher a silhueta e as cores é parte do objetivo do curso. Cada tarefa limita a decisão ao que está sendo aprendido: um contorno, a direção da luz, a ponta do fogo ou algumas crateras. Referências são oferecidas dentro da aula; não é preciso sair para procurar imagens. Os nomes e dimensões usados na integração ficam explícitos.

Os experimentos têm apenas duas situações pertinentes à mesma relação. Ao registrar ambas, os controles encerram e os resultados ficam lado a lado. A criança continua pela pergunta, sem abrir outro desafio. Não há pontuação por velocidade, tempo limite nem obrigação de acrescentar animações. A aula 8 apresenta versões e o Clube como possibilidades após o curso, sem exigir outro jogo, remix, competição ou postagem.

As duas perguntas do quiz final evitam repetir todas as checagens feitas durante a criação. A função é aplicar ideias em situações curtas. Pistas apontam um próximo gesto; problemas de desenho são tratados com Desfazer e ajuste, sem encenar falhas para justificar ferramentas.

## Experimentos incluídos

| Arquivo | Única variável | O que fica fixo | Resultado observado |
| --- | --- | --- | --- |
| [espelho.html](interacoes/espelho.html) | Espelho desligado/ligado | Mesmo traço e mesmo eixo | Um ou dois traços correspondentes |
| [quadros.html](interacoes/quadros.html) | Fogo igual/diferente no segundo quadro | Corpo, posição, dois quadros, 8 fps | Aparência estática ou pulsação |
| [bordas.html](interacoes/bordas.html) | Ampliação 1×/8× | Mesma forma em pixels e vetor | Degraus dos pixels e redesenho das linhas |
| [ordem.html](interacoes/ordem.html) | Quem está na frente | Mesmas formas e posições | Pedra coberta ou inteira à frente |
| [folha.html](interacoes/folha.html) | Largura do recorte 16/32 | Altura 32, folha 64 × 32, sprite 54 × 54 | Parte do desenho ou quadro inteiro |

São fragmentos HTML incorporados ao manifesto e executados no iframe isolado existente, sem rede, cookies ou acesso à galeria. Não são o motor do Estúdio nem uma cópia do Pinta. Guardam escolhas e observações pelo protocolo do player. A pergunta e o gabarito ficam fora do iframe; a participação do HTML continua sendo evidência declarada pelo cliente, não uma execução revalidada pelo servidor como nas experiências nativas do Dino.

O exemplo de animação toca por dois segundos a pedido da criança. Com movimento reduzido, os desenhos parados permitem comparar sem reprodução. Todos os experimentos têm botões com nome, operação por teclado, resultado em texto e retomada após reabrir. Não exigem som. A altura acompanha o conteúdo no player.

## Ajustes importantes nas gravações

- **Aulas 1–2:** usar o aviso real Guardado na sua conta, sem prometer cotas numéricas ou exibir como esperado um navegador vazio após sincronizar. Não tornar exclusão de projetos uma tarefa de boas-vindas.
- **Aula 2:** substituir a alegação de que retratos de Celeste seriam vetoriais por exemplo produzido no próprio Pinta. Mostrar cores disponíveis; a paleta não oferece uma rampa completa para toda cor.
- **Aula 3:** seguir fogo-base → duplicar → selecionar/mover a ponta → preencher o vão. A descrição de imagem e a narração original divergiam. Não inventar desalinhamento para ensinar o fantasma.
- **Aulas 4–5:** reservar espaço superior para o fogo e manter as formas dentro de 64 × 64. A folha vetorial recorta o que sair do quadro. Soltar a seleção antes de preparar a cor de outra forma.
- **Aula 5:** chama é uma escolha visual do jogo. Retirar explicações físicas universais sobre fogo no espaço, cor e temperatura. Suavizar só a base se esse for o gesto mostrado; preservar as pontas.
- **Aula 6:** substituir “motor apagado e aceso” por “fogo pequeno e grande”. Quadro 32 × 32, folha total 64 × 32 e sprite 54 × 54 são três medidas com funções distintas.
- **Aula 7:** preparar a folha uma vez e animar cada novo sprite no mesmo relógio/ramo da criação. Remover o criador antigo depois de transferir o sorteio. A caixa baseada na arte usa limites do conteúdo opaco; não é promessa de colisão pixel a pixel.
- **Aula 8:** publicar antes dos exemplos. Se uma versão de carrinho removeu tiro ou mudou o objetivo, não afirmar que só o tema mudou. Não prometer desbloqueios, prêmios ou rankings sem verificar a configuração atual. Os jogos de comparação ainda precisam ser preparados para a edição.

O mapa de cada aula detalha as substituições. As falas originais selecionadas são matéria-prima para edição, não o texto final a concatenar inteiro com a ponte nova. Gravar complementos somente onde identificados, mantendo gesto, legenda e destaque no mesmo objeto.

## Configuração para importar

1. Abra o **rascunho** da aula correspondente. Prepare um bloco do tipo indicado abaixo e, em **Onde a criança faz este trabalho?**, escolha **Na ferramenta completa, com entrega pela galeria**. O seletor já existe no editor. Se o primeiro bloco desse tipo for um editor incorporado, confira seu uso antes de configurar a entrega; não importar às cegas sobre ele.
2. Nas aulas **1, 6, 7 e 8**, configure **Estúdio**, uma criação. Nas aulas **2, 3 e 4**, configure **Pinta**, mínimo e máximo 1. Na aula **5**, configure **Pinta**, mínimo e máximo 2, para nave e asteroide.
3. Importe o `manifesto.json` com **Vincular ao destino aberto**. A referência `entrega-galeria-v6` usa `existing.kind` (`studio` ou `pinta`) e `index: 0`. Verifique na prévia que ela reutiliza a entrega preparada. O arquivo não inclui projetos iniciais nem identidades da conta.
4. Confira as instruções antigas indicadas em `retireBlockKeys`. A revisão usa formato de manifesto **4** para o quiz e a substituição explícita dos blocos instrucionais da versão anterior. Histórico, vídeos vinculados e referências de projeto seguem as regras existentes de importação; revisar antes de aplicar.
5. Exporte e vincule os 55 clipes pelos cartões de vídeo planejado. As chaves são estáveis na reimportação. A plataforma mantém a publicação bloqueada enquanto faltar mídia; esta pasta não fornece URLs fictícias.
6. Confira o Pinta e os blocos liberados no **perfil real do curso**, inclusive as categorias Sprites, Muitos e Animação. Os testes locais não comprovam a configuração publicada de acesso/Carreira.
7. Percorra a prévia do rascunho e depois o fluxo de aluno em ambiente de revisão: abrir a ferramenta em outra aba, retornar, guardar na conta, selecionar a criação correta e enviar. Confira especialmente duas artes na aula 5 e o link de publicação na aula 8.

Não foi necessário alterar o código de produção nesta adaptação: vídeo planejado, iframe, perguntas, quiz, ferramentas externas e entrega de galeria já suportam o percurso. O trabalho novo contém os roteiros, manifestos, cinco experimentos, gerador, validação e uma página de ensaio local.

## Conferência reproduzível

Na raiz do repositório:

```powershell
bun docs/aulas-interativas/qa/gerar-meu-jeito-v6.ts 'CAMINHO_DOS_ROTEIROS_ORIGINAIS'
bun docs/aulas-interativas/qa/validar-meu-jeito-v6.ts 'CAMINHO_DOS_ROTEIROS_ORIGINAIS'
bun packages/community-kids/tests/visual/serve-meu-jeito-preview.ts
```

O último comando abre um ensaio local em `http://127.0.0.1:4322`, com o componente real de iframe e correção local de demonstração. Ele não usa conta, API ou banco. O botão de reabrir permite conferir a retomada. Encerre com Ctrl+C.

O [relatório estrutural](../qa/meu-jeito-v6-verificacao.json) registra fontes, âncoras, seções e contratos. O [relatório de revisão](../qa/meu-jeito-v6-revisao.md) distingue testes locais, inspeção visual e o que ainda depende dos vídeos e do ambiente de publicação.
