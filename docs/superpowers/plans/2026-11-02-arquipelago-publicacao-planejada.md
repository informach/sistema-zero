# Publicação do Arquipélago antes da produção dos cursos

**Objetivo:** publicar o conteúdo pronto do jogo nos dois públicos sem publicar cursos
inacabados nem conceder ferramentas ao aluno.

**Decisão da dona:** preparar o jogo agora; os cursos serão atualizados depois. A mesma
autoria serve aos dois públicos. O catálogo remoto de cursos publicados serve ao acesso e
às indicações de cursos, mas é uma fonte incompleta do planejamento curricular.

**Causa comprovada em 02/11:** 170 desafios atuais importados em cada ambiente. Só 71
publicados em staging e 31 em produção. No adulto, apenas o Cadê Todo Mundo tem blocos
publicados, como extra. A análise conclui erroneamente que número e condição são exclusivos
de um curso opcional. O erro é reproduzido pela rota canônica de publicação.

## Implementação

- [x] Gerar um inventário editorial de fontes obrigatórias a partir das listas versionadas
  dos cursos escritos: Farol 2D, Farol 3D, Jardim, Nave e Dino. Guardar origem e hash
  semântico; nunca inventar curso ou UUID. Extras e Poderes não entram.
- [x] Injetar esse inventário somente no serviço de autoria/publicação do jogo. Uma fonte
  planejada obrigatória no mesmo posto ou anterior pode comprovar que o bloco não é exclusivo
  de opcional ou de posto futuro. Catálogo desconhecido continua impeditivo. Sem fonte
  planejada, conservar a análise remota atual.
- [x] Preservar a cobertura com cursos reais, a escolha do aluno, os requisitos derivados,
  a análise executada do gabarito e do inicial, as migrações e as políticas de acesso.
- [x] Testes negativos e positivos do domínio, fontes e publicação HTTP em memória;
  validar o inventário contra as fontes; executar testes, tipos e Biome; revisar o diff.
- [ ] Integrar o fix sem incorporar edições em andamento de outras frentes. Implantar a API
  qualificada nos dois ambientes. Retomar somente publicações ainda pendentes pela rota
  Admin com revisão CAS e validar o histórico imutável.
- [ ] Relatório final por ilha/público com conteúdo publicado, exceções reais e evidências.

## Operação

Consultas SQL somente em transação read only. Publicar apenas pela API do Admin, com
backup, manifesto conferido, revisão atual e recibos duráveis. Nenhum teste escreve em
banco remoto. Não editar .env, workflows, salvamento ou cursos. Os 70 desafios antigos
arquivados em cada ambiente ficam como histórico. A dona autorizou em 02/11/2026 as duas variações noturnas do Bosque como desafios
do dia opcionais, sem cor nem quadro obrigatório. A opacidade continua dependendo do bloco
conquistado em Cadê Todo Mundo; a exceção editorial fica explícita no teste de repertório.

## Limites

O inventário só prova o repertório planejado, não que uma pessoa o aprendeu. Não altera
o Members, o vínculo de curso na jornada nem a liberação de blocos. Referências a cursos
no jogo continuam vindo exclusivamente do catálogo publicado do público correspondente.

## Evidência da correção

Regressão pura antes da correção: 8 testes passaram e 2 falharam nos casos de fonte
obrigatória ainda não publicada e missão anterior. Depois: publicação e reativação HTTP
em memória nos dois públicos passam com a fonte planejada; executor que recusa o gabarito,
catálogo desconhecido, fonte opcional e fonte futura sem alternativa continuam recusados.
Suíte do serviço: 319 passaram, 146 de Postgres local pulados, zero falhas, 1379 asserções.
Typecheck do pacote e Biome dos arquivos tocados passaram. Inventário: 5 fontes, 92 blocos.
Revisão: fontes somente na composição de autoria, nenhum uso em régua do jogador, nenhum
novo contrato/migração, nenhum curso inventado ou alteração no currículo remoto.


## Entrada e momento da observação na Vila Doce

A publicação em produção recusou o objetivo pulo-alto do adulto. O executor local original
passou em cadência normal. Uma regressão com Chromium real a 20 fps e aperto logo depois do
quadro reproduziu a perda do toque de 30 ms: y ficou em 171, no chão. Com 80 ms, a força
válida 12 ainda foi recusada na observação final, y=103,8: os 250 ms de acomodação do
executor já a encontravam na descida. Os dois negativos foram preservados no recibo local.

O toque de pulo passa a 80 ms, já usado na conferência manual da Vila. No pulo alto, o
checkpoint do passo 4 observa y<90 durante o salto, o passo 2 continua exigindo chão antes
de pular, e a observação final exige voltar ao chão após mais 700 ms. A física, a faixa
permitida de força 12 a 16 e a altura mínima permanecem iguais. Assim, uma posição alta
constante não substitui um salto. Os projetos e seus blocos não foram alterados.

A suíte do executor cobre gabarito, inicial com força 9, forças válidas 12 e 16, em cadência
normal e com quadros de 50 ms. O controle de cadência só entra na cópia temporária do executor
usada pelo teste; não integra o runtime distribuído. Importar os quatro conteúdos alterados
da Vila pela rota de manifesto, sem sobrescrever publicações históricas ou progresso.
