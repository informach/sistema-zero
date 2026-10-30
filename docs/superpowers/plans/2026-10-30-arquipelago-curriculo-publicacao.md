# C01: currículo, repertório e publicação

## Desenho aprovado pela auditoria

Chegar à ilha não significa concluir os cursos daquele posto. Os desafios usam a concessão
real de blocos do Members. A publicação deve exigir uma fonte de ensino existente, sem
transformar Poder, extra ou Maestria em requisito obrigatório de todos.

O lote C01a fecha uma falha verificável: hoje `analiseDe` devolve avisos de cobertura, mas
`publicar` só bloqueia problemas. Assim, bloco sem curso ou de curso futuro pode publicar.
Não alterar promoção, acesso comercial, salvamento, gabaritos ou objetivos neste primeiro lote.

## C01a: barreira de repertório

- Converter cobertura impossível em problemas de publicação: bloco desconhecido, sem curso
  publicado, ou ensinado apenas depois da ilha/fora de um posto conhecido.
- No Quadro das Cores, cada bloco exigido precisa ter ao menos uma fonte universal até o posto:
  base2d, base3d ou missão. Curso opcional também pode ensinar o mesmo bloco. Não obrigar todos
  a escolher o mesmo Poder. Papel desconhecido não comprova uma fonte universal.
- Desafio do dia e pedido de morador podem ser opcionais e usar Poder/extra do posto ou anterior.
  A pessoa só abre com seus blocos reais; o serviço já mostra os cursos em Aprenda isso em.
- Reativação usa os metadados e blocos congelados na publicação, não o rascunho editado depois.
  Arquivar continua possível sem Members. Não apagar conclusões ou retirar cor conquistada.
- A importação usa a mesma análise e conserva como rascunho o que não pode publicar.
- Os avisos existentes continuam no contrato. Problemas usam o formato já existente, sem nova
  versão ou migração. Não acrescentar nem retirar blocos manualmente para passar a barreira.

## C01b: classificação do conteúdo e evidência

Depois da barreira, classificar os pacotes em retomada/aplicação com fonte local, apoio pronto
e comportamento a completar. Confrontar o repertório com cursos realmente existentes, sem
tomar a união de opcionais como conhecimento universal. Código pronto não é evidência de
aprendizagem. Python, texto e Pro dependem do C02; pacote central e autoria ficam no C03.
Não publicar arquivos remotos durante a restrição de envio.

## Provas e etapas C01a

- [x] Regra pura: curso ausente, futuro, desconhecido, opcional e base alternativa; entrada na
  ilha ainda sem blocos não abre o desafio; conquista antiga permanece.
- [x] API real em memória: análise, publicação, reativação e importação recusam incoerência.
- [x] Suítes, tipagem, Biome e revisão completa, incluindo os caminhos alternativos de publicação.
- [x] Documentação.
- [x] Commit `796c2ae89`, merge `c06f7ea87` no staging local.

## Verificação C01a

- Antes da alteração, dois testes falharam: publicar sem fonte e reativar sem fonte eram aceitos.
  Depois, análise/publicação, importação e reativação passam pelas mesmas regras.
- `bun test` em `arquipelago-api`: 265 aprovados, 106 ignorados, zero falhas, 1.058 asserções.
  Ignorados: suítes de banco sem suas variáveis locais. Este lote não muda persistência.
- `NODE_OPTIONS=--max-old-space-size=8192 bunx tsc --noEmit`: aprovado. Dois acessos a JSON
  desconhecido nos novos testes foram corrigidos usando os schemas reais de resposta.
- `bunx biome check` nos cinco TS tocados e `git diff --check`: aprovados.
- Revisão: fonte alternativa de base, cursos opcionais, comunidades, posto futuro, reativação
  com rascunho diferente, CAS, importação, arquivar sem Members, mensagem no teto do contrato.
  Testes existentes de bloqueio por blocos reais e preservação de conclusão continuam passando.
- API exercitada pela borda HTTP real com repositório em memória e resposta controlada do
  Members. Não confundir com prova do executor pedagógico ou publicação remota. Nenhuma mudança
  visual, navegador ou banco neste lote; o Admin usa a lista existente de problemas.
- A concessão de blocos segue a fonte do Members. Os ajustes manuais históricos do editor não
  foram removidos; não servem como prova pedagógica. Os pacotes do C01b devem manter os ajustes
  vazios e comprovar as regras no executor, como previsto na auditoria.

## Pedidos de arte

Nenhum. C01a não altera experiência visual ou arte; conferência é pela API e regra existentes.

## C01b1: inventário verificável e rascunhos

O confronto encontrou blocos exclusivos de extras (Cadê Todo Mundo e O Jogo do Meu Jeito)
e estruturas sem curso local, inclusive Para cada. Não mudar o currículo para fingir ensino.
Usar somente Farol 2D, Ilha 3D, Jardim Secreto, Nave e Dino como fontes locais da trilha
correspondentes à proposta. Os demais cursos locais continuam listados como fontes opcionais.
O mapa publicado do Members continua sendo a autoridade em execução.

- [x] Inventário reproduzível dos 54 desafios, com ambas as versões, objetivos obrigatórios,
  linguagem, tipos já preparados, tipos acrescentados e fontes locais por papel/posto.
- [x] Classificação editorial explícita: retomada, aplicação em blocos ou apoio preparado.
  Não apresentar Recife/Pico como prova de Python nem Vale/Nuvens como texto/Pro.
- [x] Os 108 itens ficam com publicação automática desligada, em geradores e JSON. Isso não
  arquiva nada remoto nem muda recompensa, projeto, objetivo ou conquista. A equipe publica
  depois de conferir fontes reais. Remover afirmações atuais de publicação automática nos guias.
- [x] Testes de correspondência, ausência de bloco manual e consistência dos públicos; suítes,
  tipagem, Biome e revisão.
- [ ] Commit e merge local.

C01b1 não substitui a revisão dos projetos com dependências opcionais. Essas dependências ficam
individualizadas no inventário para C01b2/C02, sem escondê-las no rótulo de curso concluído.

### Provas C01b1

- Contratos: 205 testes aprovados, zero falhas, 9.010 asserções. Conteúdo local: 18 testes
  aprovados, zero falhas, 12.316 asserções. Os quatro testes novos conferem o inventário
  regenerado, fontes opcionais, públicos e ausência de concessões manuais.
- Tipagem de contratos e dos seis geradores aprovada com limite de memória de 8 GB.
  `docs/desafios-do-jogo/tsconfig.json` permite conferir os geradores juntos.
- Comparação JSON profunda com `node:util.isDeepStrictEqual` contra HEAD: os seis arquivos
  Kids diferem somente em `publicar`. Adultos intactos. Projetos, objetivos, recompensa e
  arte não mudaram. A primeira comparação com PowerShell truncou a profundidade; não foi
  usada como prova. A comparação Node não tem esse limite.
- Biome dos arquivos tocados, regeneração determinística e `git diff --check` aprovados.
  Nenhuma alteração visual ou execução nova de projeto: as provas anteriores do executor
  continuam referentes aos mesmos projetos. Não confundir este inventário com prova nova
  de aprendizagem ou publicação no Members.
