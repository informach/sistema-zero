# Arquipélago: configuração para a primeira implantação

O jogo usa o Postgres existente, em um schema próprio `arquipelago` e com journal de migrações independente. O serviço roda a migração antes de ficar pronto. Cada ambiente mantém seus próprios dados.

Para disponibilizar a mesma entrada aos dois públicos cadastrados, configurar `ARQUIPELAGO_MODO=aberto` e `ARQUIPELAGO_PUBLICOS=kids,adulto` nos dois ambientes. O serviço mantém o limite familiar somente para perfis Kids. A elegibilidade de ferramentas e cursos continua sob as regras das respectivas plataformas.

`arquipelago-api` precisa de `APP_ENV`, `DATABASE_URL` e `INTERNAL_API_TOKEN`; o gateway precisa de `ARQUIPELAGO_URL` e de `ARQUIPELAGO_INTERNAL_TOKEN` com o mesmo segredo do serviço. A porta de moedas do Members usa o segredo dedicado `ARQUIPELAGO_COINS_TOKEN`. Valores são configurados diretamente no provedor e nunca entram no Git. A porta de moedas só aceita chamadas internas: o jogo precisa atribuir recompensas no servidor, e não aceitar valores enviados pelo navegador.

A adição do serviço altera o inventário de infraestrutura. O controlador bloqueia criação de recursos no apply automático; a instância deve ser provisionada antes da onda, com deploy automático desligado em produção. Em staging, o preflight verifica a identidade, ausência de execução pendente e histórico antes da primeira implantação; o serviço e sua migração precisam estar saudáveis antes do gateway. Em produção, selecionar explicitamente `arquipelago-api` e a opção de primeira implantação; o controlador valida o inventário, a barreira da jornada e a saúde antes do gateway. Um plano vazio não é prova de implantação concluída: conferir o primeiro deployment e os fluxos reais nas duas comunidades.

## Pendências que impedem a abertura

- Pinta e Molda foram ligados ao host com acesso verificado por público e retorno condicionado à confirmação do salvamento na conta. O Estúdio e pedidos com molde ainda devolvem indisponível. Validar as duas ferramentas ligadas com contas, navegador e nuvem reais; completar o Estúdio com suas autoridades e comportamento do Pro. O jogo pausa o tempo enquanto a ferramenta está aberta; validar foco, teclado, telas menores e desempenho.
- A contagem usa eventos identificados, fila recuperável por perfil e gravação idempotente. Há provas locais de falha de armazenamento no Chrome, resposta perdida atravessando API e Postgres, concorrência e troca de dia. Ainda falta validar com sessão Kids e serviços reais, medir desempenho, tratar a pausa ao abrir ferramentas e revisar os limites da confiança na data fornecida pelo cliente. A política de limite não deve ser anunciada como validada apenas com os testes locais.
- A rota interna de moedas do Members está implementada e testada no banco, mas o serviço do jogo ainda precisa consumi-la em ações autorizadas pelo servidor. Não expor ao navegador um endpoint capaz de escolher valor ou chave de crédito.
