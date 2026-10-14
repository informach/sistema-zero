# P04 · Arquivos no computador

**Produzido em 14/10/2026.** Sete slides 1080 × 1350, na ordem do calendário depois de P01, P07 e P34 entre os carrosséis. Estado: arquivos produzidos para revisão da Helena; não publicado ou agendado.

## Copy e direção

Fonte: [ficha P04](../../../../postagens/01-p01-a-p10.md#p04), revisão de clareza de 13/10/2026. Texto dos sete slides e legenda preservados integralmente. A conclusão e o convite para seguir ocupam o slide final. Paleta azul, branca e amarela; tipografia Nunito 600/800, a mesma das três referências aprovadas.

As imagens acompanham a sequência: uso do celular, galeria, arquivos com nomes pouco claros, prática de salvar, pasta organizada, retomada do projeto no Estúdio e conversa com a mãe. A personagem é uma menina fictícia, com a mesma fisionomia nas cenas em que seu rosto aparece. A mãe também é fictícia. Nenhuma imagem representa resultado ou depoimento de aluna real.

## Imagens e interfaces

| Slide | Arquivo de apoio | Origem |
| --- | --- | --- |
| 1 | `01-capa-foto.png` | Foto gerada: menina no sofá usando celular; computador ao fundo. |
| 2 | `02-galeria-foto.png` | Foto gerada: detalhe de uma galeria genérica no celular. |
| 3 | `03-arquivos.png` e `.html` | Ilustração editorial em HTML/CSS: arquivos com nomes vagos. Não é uma tela da plataforma. |
| 4 | `04-pratica-foto.png` | Foto gerada: menina digita; adulto observa sem operar. O recorte Salvar como é uma ilustração nativa na montagem HTML, com texto aplicado. |
| 5 | `05-pasta-escola.png` e `.html` | Ilustração editorial de uma pasta em lista, com nomes legíveis. Não é recurso do Estúdio. |
| 6 | `06-projeto-foto.png` | Foto gerada usando a captura real `06-lista-real-inteira.png` como referência da tela. |
| 7 | `07-conversa-foto.png` | Foto gerada: menina mostra à mãe a pasta, na vista em grade usada como referência da cena. A versão final do slide 5 usa lista para ampliar os nomes. |

As cinco fotografias foram criadas pela **ferramenta integrada `image_gen`**, sem CLI ou API avulsa. Cada foto foi gerada em uma chamada própria. A foto da capa serviu de referência de identidade nas novas cenas dos slides 4, 6 e 7. Nenhuma pose foi repetida. [Prompts completos](prompts.json) e [registro das saídas](imagens-geradas.json).

As ilustrações de arquivos e o texto da arte são editáveis em HTML/CSS. Não há interface de concorrente, nome de criança real ou dado de família. As janelas genéricas se distinguem da captura real do Estúdio.

### Captura da plataforma

`06-lista-real-inteira.png` foi capturada do componente real `packages/studio/src/projects/ProjectList.tsx`, em navegador isolado no playground local, com `showExamples: false` e tema claro. O projeto de demonstração recebeu o nome **Aventura na floresta**. Sua base é o exemplo Meu Mundo; a miniatura vem da captura real do mundo, já registrada na produção do P01. O exemplo foi preparado pela equipe, sem autoria atribuída à menina.

O projeto e a miniatura foram gravados somente no armazenamento do navegador isolado, pelas funções reais de persistência. Não houve login, escrita numa conta de usuário, alteração do produto ou envio à nuvem. A captura mostra o estado local da lista, sem simular uma confirmação de salvamento na conta. O registro está em [captura-lista.json](captura-lista.json).

## Verificação

- Sete PNGs em 1080 × 1350; montagem sem transbordamento ou corte de texto.
- Texto e legenda comparados à ficha vigente; correspondência integral registrada em [verificacao.json](verificacao.json).
- Todas as imagens e as duas fontes carregadas na exportação.
- Prévia conferida como grade e em largura de celular; nomes dos arquivos ampliados no slide 5.
- Leitura visual das sete artes: cenas diferentes, continuidade da personagem, ausência de títulos gerados dentro das fotos e tela da plataforma coerente com a captura.
- Legenda, textos alternativos curtos e longos, montagem editável e instruções de publicação incluídos.

Os arquivos de trabalho e os scripts de captura e montagem estão em `output/instagram/p04-2026-10-14/`. A verificação é de produção e leitura da arte, sem teste de desempenho ou conversão.
