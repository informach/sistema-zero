# Curso extra na Jornada do Criador

## Decisão aprovada

Os cursos Kids têm três papéis pedagógicos explícitos:

| Papel | Posição (`careerSlot`) | Trava da jornada | Conta para subir de posto |
| --- | --- | --- | --- |
| Curso da jornada | Obrigatória | Etapa futura ou curso-base anterior | Sim, com conclusão e publicação no Mural |
| Bônus-recompensa | Nenhuma | Abre após completar a etapa | Não |
| Curso extra | Nenhuma | Nenhuma | Não |

O papel **curso extra** não é uma concessão de acesso. A criança só entra com matrícula específica ativa para o curso ou com a chave-mestra Kids da Comunidade dos Criadores. O curso pode ser gratuito por convite, vendido à parte ou incluído na Comunidade; seu preço não determina o papel pedagógico. A conclusão das aulas, o certificado e a trava sequencial *dentro* do curso continuam funcionando normalmente.

**Cadê Todo Mundo?** fica na trilha Faísca (`primeiros-passos` + `2d`) como curso extra, sem posição. O novo **Desafio do Primeiro Jogo** continua sendo a única posição obrigatória dessa etapa. Fazer o gratuito não é requisito para começar o Desafio nem substitui a conclusão e a publicação dele para avançar à Construtor(a).

## Catálogo e acesso

O cartão do curso extra usa a mesma apresentação e o mesmo comportamento dos cartões de cursos normais. Sem matrícula, aparece com cadeado e o botão **Mostrar ao responsável** abre a URL externa de oferta cadastrada no curso — para Cadê Todo Mundo?, a página da Comunidade dos Criadores. Com matrícula específica ou chave-mestra Kids ativa, mostra **Acessar curso**. Não haverá concessão automática de acesso apenas porque o curso é extra ou aparece na Faísca.

Dentro de cada página de trilha, a ordem visual é: **cursos extras por criação (mais antigos primeiro), cursos com posição pelo número do slot e bônus-recompensa por criação (mais antigos primeiro)**. Essa ordenação não muda a ordem geral do catálogo nem atribui um slot ao curso extra. Na Faísca, Cadê Todo Mundo? aparece antes do Desafio do Primeiro Jogo.

O servidor deve aplicar a distinção tanto na listagem do catálogo/Meus cursos quanto nas rotas de acesso direto. Para o curso extra, a trava pedagógica é sempre aberta; a verificação comercial da matrícula continua obrigatória. Os bônus-recompensa e cursos com posição mantêm a política atual, inclusive para cursos já cadastrados.

## Modelo e compatibilidade

O papel é um dado explícito do curso, não uma exceção pelo slug. A autoria oferece **curso da jornada**, **bônus-recompensa** e **curso extra**. Cursos existentes com posição são classificados como curso da jornada; cursos existentes sem posição continuam bônus-recompensa. A combinação de papel e posição deve ser validada: somente curso da jornada tem posição; bônus e extra não têm. O valor deve chegar às respostas do admin e do aluno para que rótulos como “Curso bônus” não apareçam num curso extra.

Ao cadastrar Cadê Todo Mundo? no admin, configurar o papel curso extra, a etapa Faísca e a URL de oferta da Comunidade. Essa configuração é uma operação de conteúdo separada da implantação de código e não altera matrículas existentes.

## Verificação

Testar os três papéis antes e depois da conclusão do curso-base; conferir matrícula específica, chave-mestra Kids, ausência/expiração de matrícula, acesso direto por URL, cartão com cadeado e destino externo, ordenação da trilha, contagem da jornada e comportamento dos cursos já cadastrados. Não publicar ou implantar conteúdo automaticamente como parte desta alteração de código.
