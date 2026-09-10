# Rollout da oficina 3D nova do Molda

Escrito em 10/09/2026, com a implementação pronta na `staging`. Este documento é a ordem
de implantação e o que fazer se algo der errado. Nada aqui foi implantado por mim.

## O que muda para a criança

A oficina 3D nova passa a ser o editor de **modelos**. Textura e céu continuam nos
editores de sempre. Ao abrir um modelo antigo, ele é **promovido** para o formato novo,
no aparelho e na nuvem. A promoção preserva o original e grava lápides para que uma aba
antiga não ressuscite o registro anterior.

## A ordem, e por que ela importa

O risco de inverter é este: um cliente que ainda não sabe LER o formato novo encontrando
uma criação já promovida. Ele não perde o dado (as guardas cobrem isso), mas mostra a
criação na área de recuperação em vez de abrir. Por isso os leitores vão primeiro.

| Passo | O que é | Commits | Estado |
| --- | --- | --- | --- |
| 1 | Guardas de formato no backend e a migration `0075` | `d957a313` | **já em produção** |
| 2 | Reserva confirma o formato e a exclusão leva capacidade | `3a30fef5` | na staging |
| 3 | **Leitores**: o cliente sabe abrir a geração nova, e o espelho da nuvem conhece as duas | `13153d48` | na staging |
| 4 | **Escritor**: a oficina nova vira o editor de modelos | `b4a3cbd0` | na staging |

Os passos 2 e 3 podem ir juntos. O passo 4 idealmente vai num **deploy seguinte** ao do 3.

Ir tudo de uma vez é aceitável, mas pior: quem estiver com a página aberta de antes ainda
tem o código velho e veria uma criação promovida como ilegível até recarregar. Nenhum dado
se perde nesse intervalo.

### Serviços a implantar

`members` e `member-shell` (passo 2) e `community-kids` (passos 3 e 4). O Molda não é um
serviço: ele é código-fonte dentro do kids.

## Como conferir depois de implantar

1. Abra o kids com um perfil de teste e crie um modelo. Ele tem que abrir na oficina nova.
2. Volte para a galeria: o cartão tem que mostrar a foto do modelo, não o cubo de reserva.
3. Recarregue: a criação continua lá e reabre na oficina.
4. Entre com o MESMO perfil em outro aparelho: a criação tem que descer inteira.
5. No Estúdio, "Trazer do Molda" tem que listar e trazer a criação promovida.
6. Apague a criação num aparelho e confira que ela não volta no outro.

O passo 4 é o mais importante: é ele que prova que a nuvem entendeu o formato novo.

## Se precisar voltar atrás

**Desligar é seguro e é uma linha.** Em `packages/community-kids/src/components/kids/
molda-client.tsx`, troque `sceneWorkshop: true` por `false` e implante o kids.

O que acontece: nenhum modelo antigo é promovido a partir daí. **As criações já promovidas
continuam listadas e continuam abrindo na oficina nova** — a chave governa só a promoção,
não o acesso. Foi assim de propósito: se ela escondesse o que já foi promovido, voltar
atrás deixaria o trabalho da criança preso num editor que não sabe lê-lo.

Não desligue os leitores (passo 3) depois de qualquer criação ter sido promovida: aí sim
as criações promovidas ficariam ilegíveis para a nuvem.

## O que continua sendo seu, e não meu

- **Implantar.** Merge na `main` e `gh workflow run "Deploy produção"` com o CSV dos
  serviços. Eu não empurrei nada.
- **Tablet e celular físicos.** Emulação de tamanho não é toque.
- **Uma criança de 9 a 11 anos na frente da oficina.** Nenhum teste prova compreensão.
- **A janela do ALTER da migration `0075`** já foi validada quando ela entrou em produção.
