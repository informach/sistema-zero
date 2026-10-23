# Impacto das mudanças nas gravações dos cursos

Situação em 20/10/2026. Este documento orienta a revisão das gravações; não declara todos os cursos prontos para regravar nem aprovados em staging.

Escopo confirmado pela autora: os roteiros existentes estavam bons. Preservar as falas gravadas, a sequência e a montagem. Ajustar o roteiro apenas no trecho de verificar os objetivos que mudou, e melhorar os objetivos dos manifestos. A revisão de coerência não autoriza reescrever as aulas nem pedir regravação geral. Quando uma mudança real de interface/verificação exigir complemento, apontar somente o trecho e o motivo concretos.

Adicionar Python não exige refazer todas as aulas JavaScript. JavaScript continua sendo o padrão e mantém seus recursos. É preciso comparar os trechos que mostram a plataforma com a interface validada e conferir o roteiro junto do manifesto da mesma aula.

| Área | Mudança | Trechos a conferir |
|---|---|---|
| Criação e galeria do Estúdio | Oferta Python visível somente para admin/superadmin; JavaScript continua padrão para alunos | Conferir a demonstração com perfil de aluno. A nova oferta administrativa não exige, por si só, regravar a criação de projetos JavaScript |
| Programação JavaScript | Recursos existentes preservados | A adição de Python, isoladamente, não exige refazer a montagem dos programas JS |
| Programação Python | Categorias próprias, Turtle como extensão, Blocos/Ponte/código e Pro | Conteúdo novo; validar o percurso completo antes de gravar |
| Objetivos das aulas | Conferência centralizada nos objetivos da parte, com autoridade no servidor | Apresentação dos objetivos, verificar, feedback e avançar de parte |
| Pensa e missões nas oficinas | Planner redesenhado e novo painel de missão, sem cobrir a oficina | Planejar, abrir missão, recolher/abrir guia, concluir e continuar; Pensa permanece JS nesta etapa |
| Pinta/Molda e comunidade | Mudanças das respectivas frentes integradas ao remoto | Conferir os percursos que usam essas telas; a validação do Python não aprova automaticamente esses tutoriais |
| Jornada configurável | Regras administráveis com configuração inicial preservando as regras existentes | Não exige, por si só, refazer uma aula de programação; conferir gravações que explicam navegação e liberação |
| Admin de aulas | Linguagem, tipo de projeto, curadoria e objetivos | Tutoriais de autoria/configuração, separados da demonstração para a criança |

## Lote pedagógico Farol inicial (histórico)

O lote de nove arquivos integrado em `1389d1b4f` alterou o Dia 1 do Desafio Primeiro Jogo/Farol, seção `andar` ("Faça seu personagem andar"). O roteiro, seu resumo, a fonte de conteúdo e o manifesto desse dia foram atualizados juntos.

Mantém dois critérios de montagem e acrescenta quatro verificações de direção. Na avaliação, cor, arte, posição e magnitude da velocidade não precisam copiar a demonstração; os valores precisam produzir o comportamento pedido. No roteiro, a professora mostra a velocidade `3` e manda colocar esse valor, com uma instrução concreta por vez, e testa as quatro setas. Soltar a tecla e mostrar a parada é orientação da demonstração, não um novo critério avaliado.

Esse lote não reescreveu os Dias 2/3, as seções de borda/entrega nem todos os demais cursos. As propostas de Cadê Todo Mundo que ficaram fora do commit não devem ser tratadas como material final ou publicado. Atualizar um arquivo local também não comprova sua importação e publicação no Admin.

## Revisão pedagógica dos cursos

O inventário e a validação técnica não substituem a revisão dos objetivos. A conciliação atual reúne a revisão das 37 aulas Kids e das 37 versões Adulto. Os arquivos Kids ficam agora em `docs/aulas-interativas/kids/`; os adultos, em `docs/aulas-interativas/adulto/`. As traduções adultas são mantidas pelo gerador canônico, com os mesmos projetos e critérios dos Kids.

Os critérios compartilhados passaram a representar intervalos numéricos, textos não vazios, alternativas correlacionadas no mesmo bloco, comandos no mesmo encaixe e ordem relativa ao comando específico. Isso permite aceitar valores coerentes sem exigir os números ou a arte da demonstração. Mantêm-se as dependências ensinadas: sinal da velocidade, objeto/grupo correto, estado, evento e prioridade entre derrota e vitória. A geometria base de cada jogo continua sendo a ensinada quando outras partes dependem dela. Esses critérios estruturais não executam expressões Python/JavaScript arbitrárias; verificações de comportamento são indicadas separadamente.

Na conferência independente da integração, as 2.423 linhas citadas dos 37 roteiros Kids são idênticas à referência `89aa5acc4`; as 2.187 linhas citadas dos 37 roteiros Adulto são idênticas à referência `ae2c1c021`. As notas acrescentadas sobre a lista de objetivos e a resposta do servidor são orientações da equipe, explicitamente marcadas para não gravar. Esse lote não exige regravar todas as falas.

As provas locais da versão conciliada incluem os 74 manifestos válidos, os 203 clipes Kids conferidos pelo validador de roteiros e a suíte dos cursos. Isso não comprova importação/publicação desses arquivos no Admin nem o percurso do aluno no ambiente implantado. O review final ainda pode corrigir um critério sem modificar a narração; registrar essa correção antes do fechamento do lote.

Ainda não há liberação geral para gravação: registrar o resultado por aula e validar o percurso correspondente em staging. O seletor administrativo já integrado ao Git também não comprova que a nova versão foi implantada no site.

## Liberação por aula

Antes de gravar uma demonstração de tela, registrar para aquela aula:

1. Roteiro revisado e correspondente ao objetivo pedagógico pretendido.
2. Manifesto da mesma versão, incluindo inicial, gabarito e critérios coerentes quando aplicáveis.
3. Importação/configuração conferida no Admin e percurso do aluno validado em staging, inclusive verificação e avanço.
4. Interface e textos do percurso conferidos; registrar a versão usada na gravação.

Uma mudança apenas no executor ou no critério do servidor não exige automaticamente regravar vídeo: primeiro conferir se a demonstração continua correta e suficiente. Se só um trecho deixou de corresponder, atualizar esse trecho, sem presumir que o curso inteiro precisa ser refeito.

Enquanto esses itens estão pendentes, é possível preparar roteiros, exemplos e explicações conceituais. Não considerar liberada a gravação de um percurso ainda sujeito a ajustes de tela, roteiro ou manifesto. Este registro será atualizado por lote; o aceite funcional geral do Python continua separado.

## Instrução guiada e avaliação flexível

Direção explicitada pela autora em 20/10: a flexibilidade dos objetivos não deve transformar o passo a passo em uma escolha aberta. O roteiro especifica o bloco, o campo e o valor mostrado pela professora, um comando por vez. Por exemplo: "Coloque 3 na velocidade." A verificação pode aceitar outro valor coerente que cumpra o comportamento, sem exigir esse mesmo número. Aplicar a mesma separação a cores e sprites. Não pedir que a criança decida valores durante uma montagem guiada apenas porque a avaliação permite variação.
