# Manifesto de desafios do Arquipélago

**Estado em 28/10/2026:** contratos, serviço, rotas e a seção do Admin descritos abaixo estão
implementados, com a divisão automática em lotes. O primeiro arquivo pronto é o do Bosque
(`docs/desafios-do-jogo/bosque/bosque.manifesto.json`, com o guia ao lado).

O manifesto é um arquivo que já traz os desafios configurados, como o manifesto das aulas. Você
sobe o arquivo no Admin e os desafios ficam cadastrados. Um formato só serve para três tamanhos:

- **Um desafio**: `"escopo": "desafio"`, com um desafio só.
- **O pacote de uma ilha**: `"escopo": "ilha"`, com todos os desafios da mesma ilha e do mesmo
  público.
- **O jogo inteiro**: `"escopo": "jogo"`, com desafios de várias ilhas.

Sem escopo, o arquivo também vale. Nesse caso o Admin não procura o que ficou de fora.

Onde fica no Admin: **Jogo → Desafios → Manifesto de desafios**, embaixo da lista.

## Como funciona

1. **Escolha o arquivo** (ou cole o conteúdo) e clique em **Conferir**. Nada é gravado ainda.
2. A conferência mostra cada desafio com o que vai acontecer:
   - **Novo**: o identificador (`slug`) ainda não existe.
   - **Muda**: já existe e alguma coisa do arquivo está diferente.
   - **Igual**: já está exatamente assim.
   - **Não dá para gravar**: o motivo aparece embaixo (veja "Quando não dá para gravar").

   Também aparece o resultado da análise de cada desafio que vai mudar, a mesma do botão
   Analisar.
3. **Aplicar** processa cada desafio e informa o resultado de cada linha. Não é uma transação
   única do arquivo inteiro. Só a administração aplica. A equipe confere e revisa.
4. Subir o mesmo arquivo de novo dá tudo **Igual** e não cria revisão nova. Para mudar um desafio,
   edite o arquivo e suba de novo: o `slug` liga o arquivo ao desafio que já existe.

Um desafio que não está no arquivo **nunca muda sozinho**. No pacote de uma ilha ou do jogo, o
Admin lista os desafios do cadastro que o arquivo não traz. Se quiser tirá-los do jogo, marque
**Arquivar também os que não estão no arquivo**. As conquistas das crianças ficam guardadas.

## Publicar

Desde C01a (30/10/2026), a cobertura é requisito de publicação, não só aviso. Cada bloco exigido
precisa existir e ter curso publicado naquela comunidade até o posto da ilha. No Quadro das
Cores, ao menos uma fonte deve ser base 2D, base 3D ou missão. Poder, extra e Maestria podem
ensinar o mesmo bloco, mas não podem ser a única opção de quem quer completar os quadros.
Uma atividade que depende de Poder escolhido pode ser desafio opcional, com o curso indicado.
Não use ajustes manuais de blocos para esconder uma lacuna de ensino.

Desde C01c, o Members exige também os tipos de blocos cujo conteúdo, ordem, área de execução
ou quantidade muda entre inicial e gabarito. Completar o corpo de um laço já preparado conta;
apoio idêntico e mudanças só de apresentação do editor não. Blocos desconhecidos em qualquer
dos dois projetos impedem a análise. Essa comparação não substitui as provas de comportamento.
Para conferir os arquivos locais com a mesma regra, rode
`bun docs/desafios-do-jogo/regras-a-completar.ts`. O JSON ao lado registra fontes locais e
recusas do leitor do Estúdio, sem afirmar que cursos estejam publicados ou concluídos.

Chegar ao posto abre a ilha, não concede os blocos de seus cursos. A pessoa continua precisando
do repertório realmente conquistado para abrir o desafio. A reativação de uma publicação
arquivada confere sua cobertura atual também. Não remove conquistas anteriores.

Com `"publicar": true`, o desafio sai publicado quando a análise não acusa problema. Com problema,
ele é gravado e fica em rascunho, e a linha mostra o motivo. Sem `publicar` (ou com `false`), o
desafio fica em rascunho. Um desafio que já estava publicado continua publicado na versão
anterior até ser publicado de novo.

## Quando não dá para gravar

- **Desafio arquivado**: reative no Admin antes de subir de novo.
- **Quadro ocupado**: outro desafio já está naquele quadro da ilha. Isso também vale para um
  desafio que mudou de quadro no rascunho sem publicar: o quadro publicado continua dele até a
  nova publicação.
- **Troca em roda**: dois desafios do arquivo trocam de quadro entre si (o 1 vai para o 2 e o 2
  para o 1). Mova um deles para um quadro livre, aplique e depois suba o arquivo final.
- **Mudou depois da conferência**: alguém gravou um dos desafios entre o Conferir e o Aplicar.
  Confira de novo; o que já tinha sido aplicado aparece como Igual.
- **Mudou durante a aplicação**: a linha informa `DESAFIO_DESATUALIZADO`; a edição concorrente
  não é substituída nem publicada, e os demais resultados continuam na resposta. Uma falha de
  rede ou de infraestrutura exige nova conferência para saber o que chegou a ser gravado.

Mudar um desafio de quadro dentro do mesmo arquivo funciona, mesmo que o quadro novo ainda seja de
outro desafio do arquivo que também está mudando: o Admin grava na ordem certa.

## Baixar o que está cadastrado

- **Baixar manifesto**, em cada linha da lista: um desafio.
- **Baixar a ilha**: a ilha escolhida no filtro da lista.
- **Baixar o jogo inteiro**: todos os desafios do público da lente (Kids ou Adultos).

Os arquivados não vão no arquivo baixado. O arquivo baixado pode ser editado e subido de volta
(é assim que um desafio passa de um ambiente para outro).

## Pacotes grandes

O Admin manda o arquivo em partes de até 4 desafios (e menos de 3,5 MB cada). A conferência roda
o gabarito de cada desafio, então um pacote grande leva alguns minutos. Os desafios do Quadro das
Cores de uma mesma ilha vão sempre na mesma parte.

## O formato

```json
{
  "formato": "arquipelago-desafios",
  "versao": 1,
  "escopo": "ilha",
  "desafios": [
    {
      "slug": "corrida-dos-bichos",
      "publico": "kids",
      "ilha": "bosque",
      "tipo": "quadro-das-cores",
      "quadro": 6,
      "ordem": 60,
      "publicar": true,
      "conteudo": {
        "versao": 1,
        "titulo": "A corrida dos bichos",
        "enunciado": "Os bichos querem apostar corrida.",
        "dicas": ["Comece pela largada."],
        "projetoInicial": { "...": "o projeto do Estúdio" },
        "gabarito": { "...": "o projeto do Estúdio" },
        "objetivos": [],
        "recompensa": { "cor": true, "moedas": 20, "moedasExtra": 0 },
        "blocosManuais": { "acrescentar": [], "retirar": [] }
      }
    }
  ]
}
```

- `slug`: letras minúsculas, números e hífens. É a identidade do desafio.
- `tipo`: `quadro-das-cores`, `desafio-do-dia` ou `pedido-de-morador`. Só o Quadro das Cores tem
  `quadro` (de 1 a 6). Nos outros tipos, `quadro` é `null`.
- `conteudo`: o mesmo que o editor do Admin grava. O jeito mais fácil de começar é baixar um
  desafio feito no Admin e usar como modelo.
- Até 200 desafios por arquivo. O mesmo `slug`, ou o mesmo quadro da mesma ilha, não pode
  aparecer duas vezes.
- A exportação com mais de 200 resultados responde `422 MANIFESTO_EXCEDE_LIMITE`, sem truncar
  nem gerar um arquivo inválido. Reduza o filtro por público, ilha ou tipo; a exportação
  individual permanece disponível. Exportação paginada/arquivo multipartes ainda não foi implementada.
- A análise e a publicação são sequenciais. O teto de 200 itens não é uma garantia de duração:
  o gateway limita a requisição a 165 segundos, por isso o Admin manda o arquivo em lotes
  (veja "Pacotes grandes"). Após interrupção, confira novamente antes de aplicar.

Regras técnicas: `packages/arquipelago-api/CLAUDE.md`, seção "Manifesto de desafios".
