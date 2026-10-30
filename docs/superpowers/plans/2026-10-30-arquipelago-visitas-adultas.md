# Visitas adultas consentidas, L12

**Objetivo:** permitir visitar uma casa adulta somente por escolha de quem a compartilha,
sem abrir os caminhos da família Kids ou conceder edição, prêmio ou acesso a conteúdo privado.

**Base:** `8c89b2565`, sincronizada com origin/staging. Executar nesta sessão com as skills
executing-plans, Drizzle, Elysia e verification-before-completion. Autorização: programa de
entrega integral e instrução da dona para continuar os lotes. Sem push neste lote.

## Desenho e alternativas

A proposta pede visita opt-in, mas não exige um diretório. Escolhido: código aleatório
revogável, compartilhado por quem recebe. Evita listar identidades e não depende de amizade
ou perfil público. Um diretório dependeria de descoberta e moderação; convites por pessoa
exigiriam outro sistema de relações. Nenhum deles é necessário para esta entrega.

O código tem 32 caracteres base64url, 192 bits aleatórios. A API guarda somente seu SHA-256,
um por salvamento adulto, com FK e exclusão em cascata. Gerar outro substitui o anterior;
desligar revoga. Começa desligado. O código não aparece em URL, log, save, localStorage ou
resposta de consulta. Só a resposta de geração o revela, e a tela o conserva em memória.

O serviço exige identidade adulta, acesso ao jogo e, nas alterações, sessão que permita
escrita. Receber visita não depende de limite parental. A casa é uma projeção de obra,
horta, objetos completos e quarto, sem nome, id, saldo, progresso ou aparência privada dos
projetos. O quarto vem da porta existente do Members com audience adult. O desenho reutiliza
as regras da visita atual: sem colher, construir, trocar aparência ou gravar no mundo visitado.

As rotas autenticadas usam corpo estrito e no-store: GET/POST/DELETE
`/visitas-adultas/convite`; POST `/visitas-adultas/abrir` e `/visitas-adultas/conferir`.
O código fica no corpo, com rate limit por pessoa no gateway. Confirmar é uma consulta pequena,
sem retransmitir o quarto. Durante uma visita: conferir a cada 15 s visíveis e ao retomar,
com prazo de 5 s. Recusa, indisponibilidade ou revogação retiram a visita. Não prometer
revogação instantânea ou apagar dados já vistos por outra pessoa.

## Entregas e verificação

- [x] Contrato V1 estrito e testes: código, estado, projeção sem identidade e campos extras.
- [x] Repositório, migração gerada, serviço e HTTP: padrão desligado, rotação, revogação,
  sessão Kids, suporte, próprio código, concorrência, FK, dados mínimos e prazo de leitura.
  Testes só em Postgres local descartável arquipelago_test*.
- [x] Gateway, BFF, shims somente na comunidade adulta e host: métodos/caminhos/tetos,
  no-store e recusa local no host Kids. Nenhum pacote da plataforma importa o jogo.
- [x] Painel com tema existente, estado por montagem, cancelamento e respostas tardias,
  revalidação e volta segura. Plataforma falsa com as mesmas respostas e recusas.
- [x] Navegador em computador e celular emulado: abrir, revogar, sair, voltar sem alterar
  o próprio save, painel sem rolagem lateral. Prints em docs/qa.
- [x] Suites dos pacotes, tipagem com heap 8192, Biome e revisão. Integração por commits
  descritivos e merge local, registrados no histórico Git, sem push.

## Conciliação final

Base `11002f9ff`: inclui a orientação do Farol, o índice canônico, a correção remota dos
testes de banco e a medição A06. A 0015 de medição foi preservada; o convite foi regenerado
como 0016 e qualificado em Postgres novo. Não aplicar a primeira tentativa 0015 dos convites,
que nunca foi commitada. O navegador final usa a composição nova e mantém os negativos
anteriores. Suites, imagens, comandos e limites em `docs/qa/2026-10-30-visitas-adultas/`.

## Restrições e limites do aceite

Não editar Blender, GLB, .env ou CI; nenhuma escrita em bases remotas. V18 e seu teto de
65.536 bytes permanecem iguais. Sem dados de criança na visita adulta. Textos simples,
neutros, sem travessão ou exclamação. O fluxo hospedado com sessões reais e aparelhos físicos
permanece em L14, separado das provas locais de serviço e navegador.
