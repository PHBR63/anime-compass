# Importação e atualização via Jikan

O painel administrativo, na aba **Importação**, oferece uma fonte Jikan independente da importação legada.

- **Catálogo completo:** varredura paginada por identificador MAL, com 25 registros por página.
- **Temporada atual:** consulta `/seasons/now` para inserir e atualizar títulos da temporada.
- **Importar uma página:** executa apenas um lote; **Retomar** continua a partir da última página salva.
- **Importar / atualizar** e **Retomar no servidor:** registram execução autônoma, independente do navegador. Checkpoints incompletos são retomados, não reiniciados.
- **Pausar:** impede páginas seguintes, deixa a página adquirida terminar e confirma a pausa no servidor. A pausa permanece inclusive perante o cron diário.
- A instalação não assume a importação anterior: ela continua pelo executor que a iniciou. A transição exige ação explícita do administrador entre páginas.

O Jikan não oferece um feed de alterações equivalente ao delta da fonte legada. Atualizar aqui significa consultar novamente o catálogo completo ou a temporada atual; não há remoção automática de títulos ausentes.

## Conteúdo preservado

O importador nunca envia `synopsis_pt`. Títulos e sinopses já preenchidos também são omitidos das atualizações, independentemente do idioma, evitando substituir conteúdo editorial em PT-BR. Gêneros e estúdios existentes são preservados; novos registros recebem os dados da fonte. Notas, episódios, situação e outros metadados são atualizados.

As capas HTTPS do CDN do MAL são baixadas em grupos limitados e salvas no armazenamento de imagens existente. Falhas de download não apagam a capa anterior; a URL original permanece disponível. Tipos Music, CM e PV são excluídos.

## Segurança e execução

Todas as ações exigem sessão válida e papel de administrador verificado no servidor. O estado `jikan_import` é separado da importação legada. A aquisição condicional do estado impede páginas simultâneas; gravações finais exigem o mesmo bloqueio, para impedir que chamadas antigas sobrescrevam execuções novas. Uma chamada do Jikan por página, com intervalo mínimo conservador de 1,2 segundo, respeita os limites documentados de 3 consultas/segundo e 60/minuto.

Falhas temporárias de rede, tempo limite, HTTP 408/429 e erros 5xx geram tentativas com esperas de 5, 10, 20, 40, 80, 160 e até 300 segundos. O limite 429 respeita pelo menos 60 segundos e o cabeçalho `Retry-After`, quando presente. A última falha, número da tentativa e contagem regressiva aparecem no painel. Erros permanentes, de permissão ou parâmetros encerram a retomada automática.

O servidor guarda intenção, modo, tentativa, prazo e pausa em `jikan_server_run`, separado do checkpoint `sync_state`. O painel apenas envia comandos e consulta status a cada cinco segundos; não restaura intenções antigas do navegador. `jikan-worker` aceita somente o token protegido do cron existente; nenhum token é entregue ao frontend ou criado na implantação. RPCs de controle são exclusivas do serviço e verificam o papel do administrador. Aquisição de páginas e comandos usam o mesmo bloqueio transacional; confirmações exigem a concessão original.

Ao iniciar/retomar, o banco desperta o executor e arma `jikan-server-recovery` a cada minuto, somente enquanto há trabalho. Cada despertar processa no máximo uma página. Pausa, conclusão e erro permanente removem o job; uma pausa durante processamento mantém a recuperação somente até a página terminar ou sua concessão expirar. O prazo de concessão é cinco minutos; retomada de chamada morta pode levar até seis minutos. Falhas transitórias persistem tentativa e `Retry-After`, com espera progressiva até cinco minutos (ou mais quando exigido pela fonte). Não há limite artificial de tentativas temporárias; o administrador pode pausar a espera, que continua gerando custo enquanto ativa. Erros permanentes requerem intervenção.

São no máximo 1.440 verificações por dia enquanto ativo. Com uma página de até 25 títulos por minuto, 1.230 páginas levam cerca de 20h30 sem falhas; fechamento do navegador não muda essa cadência. Um prazo de retry pode ter até um minuto adicional de atraso. Essa recuperação é necessária porque execução em segundo plano da função não é durável; não há verificação permanente quando a fila drena.

O cron `jikan-import-daily` permanece às 03h BRT e até 40 páginas por disparo, com seu comando e token intactos. Ele não assume execução autônoma ativa/pausada. Quando não há execução autônoma, mantém o comportamento anterior. Isso não representa uma atualização completa diária. Sugestões DeepL continuam no fluxo existente e podem consumir sua cota; não são publicadas automaticamente.

### Validação de implantação (06/11/2026)

- Migrações aditivas, sem backfill ou alteração do checkpoint/catalog/listas; instalação com zero execuções autônomas e zero jobs novos ativos.
- Testes SQL em PostgreSQL isolado: admin vs usuário comum, checkpoint 145→146, bloqueio da importação em andamento, aquisição duplicada, exclusão de navegador, pausa entre páginas, Retry-After, recuperação de concessão expirada, executor antigo rejeitado, resposta perdida, conclusão e erro permanente retirando agendamento.
- Testes de autorização, retentativa e preservação do catálogo executados; status real autenticado e painel verificados.
- Não iniciar/pausar a importação real para teste: ciclo completo de importação autônoma em produção não validado nesta implantação, para preservar o trabalho em andamento. O despertar protegido foi exercitado apenas no banco isolado com comando sem credenciais; a primeira execução real depende de ação do administrador e da disponibilidade da fonte.

## Opções de tradução automática pesquisadas

O fluxo DeepL está implementado para gerar sugestões pendentes; depende de chave/cota válida e revisão administrativa. Não salva automaticamente a sinopse final. Os serviços abaixo utilizam modelos de tradução automática, mesmo quando não são ferramentas de IA generativa.

| Opção | Português | Requisitos e observações |
| --- | --- | --- |
| DeepL API | Variante explícita PT-BR | Conta e chave de API. Plano Free documenta 500 mil caracteres/mês; confirmar disponibilidade e condições na contratação. |
| Google Cloud Translation | Português; conferir variantes do modelo escolhido | Projeto Google, faturamento e credencial. A tabela de preços distingue tradução padrão e modelos avançados. |
| LibreTranslate | Idiomas dependem dos modelos instalados | Hospedagem própria ou serviço contratado. Confirmar PT-BR na instância antes de escolher; hospedagem própria tem custos operacionais. |

**Recomendação:** avaliar DeepL pela variante PT-BR, traduzindo somente `synopsis_pt` vazio em lotes e persistindo o resultado. Qualquer integração deve ser aprovada antes de enviar textos para um serviço externo, com custos e tratamento de dados definidos. Preservar as traduções existentes continua obrigatório.

### Fontes

- [Jikan: documentação e limites](https://docs.api.jikan.moe/)
- [DeepL: variantes de idioma](https://developers.deepl.com/docs/learning-how-tos/examples-and-guides/customizations-for-variants)
- [DeepL: planos da API](https://support.deepl.com/hc/pt-br/articles/360021200939-Planos-da-API-do-DeepL)
- [Google: preços](https://cloud.google.com/translate/pricing?hl=pt-br)
- [Google: idiomas](https://docs.cloud.google.com/translate/docs/languages)
- [LibreTranslate: documentação](https://docs.libretranslate.com/)
