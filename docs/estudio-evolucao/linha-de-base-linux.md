# Linha de base em Linux (18/11/2026)

Medições desta sessão, num servidor Linux sem interface e sem placa de vídeo. Servem para
comparar antes e depois **nesta máquina**. Não são orçamento de aparelho de criança e não se
comparam com os números do Windows (`diagnostico-windows.md`).

## Pro (projeto de laboratório do `e2e/pro-workspace-performance.spec.ts`)

Chrome Headless Shell 148.0.7778.96, tela de 1366 por 768.

| Medida | p95 | Teto do teste |
|---|---|---|
| Abrir a página até o editor visível (depois da primeira abertura) | 1 206 ms | 2 000 ms |
| Tecla até o segundo requestAnimationFrame (proxy de apresentação) | 33 ms | 60 ms |
| Ida e volta dos modos Só o jogo / Lado a lado | 159 ms | 300 ms |

O ZIP de fonte grande (81 arquivos, 200 mil bytes) usa um worker só e o descarta.

O proxy de apresentação fica abaixo de 50 ms neste projeto de laboratório. Ele não mede a
latência exata dos pixels ou INP e não certifica sozinho a meta de digitação da etapa 3.
A abertura usa navegação da página, não troca de arquivo numa sessão já aberta.
O projeto modular de 60 arquivos com dependências passou a existir em 20/11/2026, com digitar,
abrir painel, a primeira resposta da busca e a análise entre arquivos medidos no Linux e no
Windows: ver [`pro-em-escala.md`](pro-em-escala.md). Referências e renomear seguem sem medida de
tempo no navegador (o ensaio de mil arquivos do serviço mede os dois sem a tela).

## Clássico

Ver `classico-em-escala.md` (tabelas sem tela, no navegador e da montagem sob demanda).

## Prévia com programa hostil

`e2e/preview-hostile-programs.spec.ts`, cinco casos, Chromium 148 e 153: o relógio do editor não
atrasa mais de 500 ms, o Parar responde em menos de 5 s e o conserto roda em menos de 15 s.
Só Chromium e só Linux nesta sessão.

## O que este ambiente não mede

- WebContainer (precisa de rede para fora) e, portanto, a execução completa do Pro.
- Firefox e WebKit (não instalados), Windows, Android e iPad.
- Placa de vídeo: quadros por segundo dos motores 3D e pintura do SVG acelerada.
- Pygame nativo e a memória por processo do navegador.
