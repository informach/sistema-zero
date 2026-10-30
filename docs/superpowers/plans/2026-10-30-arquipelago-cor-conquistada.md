# A02: a cor acompanha conquistas confirmadas

> Execução em sequência com a skill `executing-plans`, sem subagentes. Revisar, testar, fazer
> commit e merge no staging local. Sem push.

**Objetivo:** catálogo ausente não pinta a ilha; retirar, mover ou substituir um desafio publicado
não apaga o pedaço já conquistado. Não acrescentar estado ao salvamento nem conceder recompensa
pelo navegador.

**Desenho:** separar catálogo jogável de conquistas históricas. O repositório de desafios já guarda
`ilha`, `tipo` e `quadro` da conclusão, inclusive depois de arquivar/mover o cadastro. Uma leitura
pequena dessas posições será independente da publicação e das réguas do Members. Acesso ao jogo
continua obrigatório. A cor usa essa leitura; as ações e recompensas continuam usando o catálogo.

**Tecnologia:** TypeScript, Zod, Elysia, Zustand, Three, Bun e o gateway/porta existentes.

**Referência:** auditoria A1 e plano geral `docs/plans/2026-10-30-arquipelago-ajustes-da-auditoria.md`.

## Contrato e serviço

- [ ] Criar `packages/arquipelago-contracts/src/cores-conquistadas.ts`: resposta V1 estrita,
  `ilhas: [{ id: IlhaId, quadros: number[] }]`, até oito ilhas, sem repetição; quadros únicos de 1 a 6.
  Exportar pelo índice e testar limites, duplicatas, campos desconhecidos e isolamento da entrada.
- [ ] Em `ServicoDosDesafios`, acrescentar a leitura das cores a partir de `repo.conclusoes`,
  com identidade/público autenticados e `decidirAcesso`. Não escolher desafio do dia, consultar
  carteira, cobrar pendências ou depender de `listarPublicados` e do Members para esta leitura.
- [ ] Criar `GET /arquipelago/desafios/cores`, antes da rota `/:id`. Manter todas as respostas
  existentes idênticas. Testar conquistas de desafios arquivados/movidos, repetição do mesmo quadro,
  outra ilha/pessoa/público, acesso recusado, suporte sem escrita e catálogo desligado.

## Porta da plataforma

- [ ] Acrescentar a rota GET no gateway, a lista permitida do host e o BFF de member-shell;
  expor as rotas de Kids/adulto no mesmo padrão das listagens existentes.
- [ ] Testar GET autorizado, rejeição de método/caminho inesperados e identidade obtida da sessão,
  nunca do corpo ou de parâmetros livres. Não modificar a versão do contrato Plataforma: sua
  porta genérica de serviço já comporta a leitura.

## Estado visual e reserva

- [ ] Criar regra pura para união das posições confirmadas e seleção das seis intensidades.
  `feito` vale 1; disponível, trancado, vazio ou desconhecido valem 0 além da cor-base da ponte.
- [ ] Guardar somente a última fotografia visual confirmada no aparelho, separada por perfil e
  público, com schema/teto e tolerância à indisponibilidade do armazenamento. Não gravar no suporte.
  Ela não conclui desafios, não acende botões de prêmio e não libera moedas, curso ou ilha.
- [ ] Ler catálogo e cores de forma independente, com aborto e proteção contra resposta antiga.
  Falha de catálogo conserva cores; falha de cores usa última leitura confirmada e conclusões que
  vierem no catálogo. Host/serviço antigo pode recusar a rota nova, sem quebrar o jogo.
- [ ] Alterar `cor-da-ilha.ts`, o estado de desafios e a pintura do anel para usar esse resultado.
  A primeira renderização de uma montagem não reutiliza cores de outra pessoa. Estado inicial sem
  prova é a base da ponte, nunca ilha restaurada por indisponibilidade.
- [ ] Atualizar a plataforma falsa e os testes: vazio, primeiro acesso offline, recuperação,
  conquista, publicação posterior, arquivamento, recarga e mudança de perfil.

## Conferência e integração

- [ ] Testar contrato, serviço sem banco remoto, rotas e regras/estado do jogo. Manter as provas
  atuais de aprovação/recompensa para mostrar que a mudança é visual, não uma segunda autoridade.
- [ ] Conferir no playground catálogo desligado e disponível, antes/depois de concluir, em duas
  larguras. Não editar o verificador da rede de barcos da outra sessão.
- [ ] Suítes dos pacotes tocados, tipagem com 8 GB, Biome dos arquivos tocados, revisão completa,
  documentação nas regras/CLAUDE e QA próprio antes de commit e merge local.

## Compatibilidade e limites

A nova rota é aditiva. Um host antigo pode bloquear seu caminho; a reserva usa apenas conclusões
conhecidas, nunca inventa quais posições correspondem ao contador agregado `quadro.feitos`.
Servidor antigo sem a leitura histórica não recupera posições arquivadas numa primeira visita
sem cache. Isso deve ficar explícito no procedimento de implantação conjunta, não virar uma
regra de conceder cor por ausência de dados.

Pedidos de arte: nenhum. Mudança de salvamento: nenhuma. Banco remoto e publicação: fora deste lote.
