# Linha de base em Linux (18/11/2026)

Medições desta sessão, num servidor Linux sem interface e sem placa de vídeo. Servem para
comparar antes e depois **nesta máquina**. Não são orçamento de aparelho de criança e não se
comparam com os números do Windows (`diagnostico-windows.md`).

## Pro (projeto de laboratório do `e2e/pro-workspace-performance.spec.ts`)

Chrome Headless Shell 148.0.7778.96, tela de 1366 por 768.

| Medida | p95 | Teto do teste |
|---|---|---|
| Abrir um arquivo (depois do primeiro) | 1 206 ms | 2 000 ms |
| Quadro de digitação | 33 ms | 60 ms |
| Ida e volta do layout (largo, tablet, celular) | 159 ms | 300 ms |

O ZIP de fonte grande (81 arquivos, 200 mil bytes) usa um worker só e o descarta.

A meta da etapa 3 para digitação (p95 abaixo de 50 ms) é atendida neste projeto de laboratório.
Falta medir no projeto modular de 60 arquivos com dependências, que ainda não existe como fixture,
e falta medir busca, referências e renomear.

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
