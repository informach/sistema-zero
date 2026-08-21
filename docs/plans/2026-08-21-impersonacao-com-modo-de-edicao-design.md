# Impersonação com modo de edição explícito

**Data:** 21/08/2026  
**Status:** desenho aprovado

## Contexto

Uma tentativa de reenviar a atividade do perfil Rafa Daibert, no curso “Desafio do
Primeiro Jogo”, recebeu `403 IMPERSONATION_READONLY` no BFF do Community Kids. A
requisição não chegou ao gateway nem ao `members`; por isso, a entrega de “Dia 1”
continuou com o snapshot de 29/07 e “Sincronizar com o enviado” trouxe essa versão.

O bloqueio atual protege o cliente contra alterações acidentais durante uma sessão de
suporte, mas a interface ainda oferece ações que o servidor recusará. A operação de
suporte também precisa corrigir dados reais quando o administrador decidir fazê-lo.

## Decisões de produto

- Toda impersonação começa em modo somente leitura.
- O administrador pode ativar um modo de edição explícito.
- O modo de edição libera todas as ações normais do cliente ou perfil. As permissões,
  validações e limites existentes continuam valendo.
- A autorização vale somente na sessão de impersonação atual.
- Sair do perfil, encerrar a impersonação ou fazer logout desativa a edição.
- Atualizar a página preserva o modo enquanto a mesma sessão e o mesmo perfil continuarem
  ativos.
- O sistema registra cada mutação com o administrador real e o cliente ou perfil afetado.

## Abordagem escolhida

A autorização de escrita fará parte da sessão autenticada, não do estado do navegador.
A claim `act`, já usada para identificar o administrador, ganhará um modo explícito:
`readonly` ou `write`. Claims antigas sem o campo equivalem a `readonly`.

O auth persistirá o modo na família curta de refresh tokens da impersonação. Assim, um
refresh de access token não perde a autorização. O navegador não poderá forjar o modo, e
todos os serviços receberão a mesma decisão.

Foram descartadas duas alternativas:

- Um cookie exclusivo do BFF seria mais simples, mas esconderia o modo do gateway e dos
  demais serviços.
- Estado em React ou `localStorage` não serviria como autorização e poderia ser adulterado.

## Fluxo de ativação

1. O admin entra como cliente. O auth emite `act.mode = readonly`.
2. O portal mostra um banner amarelo com a ação “Ativar edição”.
3. O admin confirma que alterará dados reais do cliente.
4. O BFF chama uma rota autenticada do auth para ativar a edição.
5. O auth confere a claim `act`, relê o administrador e valida que ele continua ativo e
   autorizado a impersonar o alvo.
6. O auth marca a família de refresh como editável e emite novos tokens com
   `act.mode = write`.
7. O BFF substitui os cookies HttpOnly e recarrega a página.
8. O portal mostra um banner vermelho: “Modo de edição ativo — alterações reais em nome de
   {perfil}”.

A rota de ativação é idempotente. Uma tentativa fora de impersonação, com ator inativo ou
sem permissão, recebe `403` e não altera os cookies.

## Encerramento do modo

O auth redefine o modo para `readonly` quando a sessão sai do perfil. Reentrar no mesmo ou
em outro perfil exige nova ativação. Logout e encerramento da impersonação revogam a família
de refresh e eliminam o modo com ela.

Falhas ao desativar durante a saída do perfil devem impedir a troca silenciosa. A interface
mantém o usuário no estado atual e mostra um erro; ela nunca entra em outro perfil carregando
uma autorização de escrita anterior.

## Autorização das mutações

As guardas atuais deixam de perguntar apenas se existe `act`. Elas passam a permitir a
operação quando não há impersonação ou quando `act.mode === write`:

```text
sessão normal                         → permite
impersonação readonly ou claim antiga → recusa
impersonação write                    → permite
```

Uma função compartilhada aplicará essa regra nas rotas do `member-shell`, do Hub, das
criações, do Pensa, da mídia, do certificado e do Studio Zappy. A resposta de recusa mantém
`403 IMPERSONATION_READONLY`.

O gateway também aplicará a regra às rotas mutantes do cliente. Rotas de controle da própria
sessão — ativar edição, sair do perfil, logout e refresh — ficam explicitamente fora do
bloqueio. Essa segunda barreira impede que uma chamada direta ao gateway contorne o BFF.

## Auditoria

O gateway registrará toda resposta mutante bem-sucedida quando o JWT contiver
`act.mode = write`, mesmo que a rota não seja uma rota administrativa. O evento usará:

- `impersonatorId`: administrador real;
- `actorId`: cliente ou perfil efetivo;
- `action`: identificador da rota;
- `targetId`: primeiro recurso identificado no caminho, quando existir;
- método, caminho, status, IP, user-agent e request ID.

Sessões normais não geram essa auditoria adicional. Respostas recusadas ou com erro também
não registram uma alteração que não aconteceu.

## Interface e erros

No modo somente leitura, o banner atual continua amarelo e acrescenta “Ativar edição”. O
diálogo de confirmação cita o cliente ou perfil e explica que as alterações serão reais e
auditadas.

No modo editável, o banner fica vermelho, permanece visível e oferece “Desativar edição” e
“Encerrar”. A ação de desativar reemite a sessão em `readonly` sem encerrar a impersonação.

Componentes que ainda receberem `IMPERSONATION_READONLY` mostram a mensagem do servidor:
“Ative o modo de edição para alterar dados deste cliente.” O Estúdio deixa de converter esse
erro no aviso genérico “Não foi possível enviar o projeto”.

## Compatibilidade e implantação

Claims antigas continuam somente leitura. O auth e o gateway entram antes dos portais; dessa
forma, bundles antigos continuam seguros durante a janela de implantação. A coluna nova da
família de refresh nasce com `false`, sem migração de dados.

Ordem de implantação:

1. auth com migration e emissão da claim;
2. gateway com autorização e auditoria;
3. `member-shell`, Community e Community Kids com ativação, banners e mensagens.

Rollback dos portais preserva o bloqueio. Rollback do gateway ou auth exige primeiro retirar
os portais novos, pois eles dependem da rota de ativação.

## Testes

- Auth: impersonação nasce `readonly`; ativação exige ator válido; refresh preserva `write`;
  saída de perfil, desativação e logout removem o modo.
- Gateway: mutação `readonly` recebe `403`; mutação `write` chega ao serviço; rotas de controle
  funcionam em ambos os modos; chamada direta não contorna a política.
- Auditoria: mutação `write` registra administrador e alvo; sessão normal e resposta falha não
  geram o evento adicional.
- Member Shell: todas as guardas compartilham a nova regra; claim antiga permanece bloqueada;
  mensagens usam `IMPERSONATION_READONLY`.
- Interface: ativação exige confirmação, o banner muda de amarelo para vermelho e sair do
  perfil desativa o modo.
- Regressão do incidente: sob `write`, “Reenviar ao professor” atualiza `submitted_at`, guarda
  a versão anterior e “Sincronizar com o enviado” devolve o snapshot recém-enviado.

## Critérios de aceite

- Uma impersonação nova não altera dados antes da ativação explícita.
- Depois da ativação, o admin consegue realizar qualquer ação permitida ao cliente ou perfil.
- O reenvio do Estúdio atualiza a entrega mais recente e reaparece como pendente ao professor.
- A auditoria identifica o administrador que executou cada mutação.
- Sair do perfil ou encerrar a sessão elimina a autorização de escrita.
