# Diagnóstico

| Sintoma | Verificação e ação |
|---|---|
| `recovering` ou `failed` | Execute `doctor`; leia `recoveryError`. Preserve os arquivos e reconcilie o recurso indicado. |
| Perfil ocupado na atualização | Encerre o supervisor desse perfil por `runtime.shutdown`; não mate processos de outro projeto. |
| Modelo ausente | Escolha `/backend`, atualize `/models` e selecione ID do catálogo. Assinaturas e chave API são conexões distintas. |
| Cliente oficial incompatível | Confira versão homologada; não habilite escrita num protocolo não certificado. |
| Aprovação parece travada | Veja `/tasks` e `/question ID`; a pergunta pode pertencer a um filho. Responda pelo ID persistido. |
| Efeito `unknown` | Verifique o destino e reconcilie com evidência; não repita o envio para testar. |
| Browser indisponível | Confira Node e Chromium Playwright 1.62.1. Browser usa worker Node sob demanda. |
| Preview `unverified` | Configure o reporter que vincula build e revisão; screenshot sozinho não certifica saúde. |
| Container indisponível | Confira Docker/imagem por digest. O adapter não usa o host automaticamente. |
| `output_limit` | O processo excedeu sua reserva de log; reduza verbosidade ou use um comando com saída resumida. |
| Quota de artefatos | Inspecione `storage.status`, arquive evidências, desfixe o que pode expirar e execute coleta. |
| Terminal pequeno | Mínimo 50×14; uso testado em 80×24, 120×40 e 200×60. Redimensione ou use CLI JSONL. |

Relatos devem incluir versão, plataforma, método/capability, ID da tarefa e erro saneado. Não inclua tokens, OTP, arquivos `.env`, conteúdo privado de conversas ou dumps integrais do cofre.
