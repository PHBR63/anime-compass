# Complemento seguro do anime-offline-database

## Resumo
Pacote derivado fixo 2026-27, SHA-256 `395be786fb2f98f1fca9e963911b9332110098a080e7e2569902bbc5641d1a41`. Só vazios: 9.307 temporadas, 1.286 formatos, 775 conjuntos de estúdios canônicos e 16 anos. 10.268 títulos únicos. Sem gêneros/tags, notas, sinopses, capas ou dados de usuários.

## Arquivos e fluxo
- `scripts/prepare-aod-metadata.py`: biblioteca padrão Python; recebe snapshot público do catálogo e fonte original, exige hash, vínculo MAL único, ano compatível e estúdio canônico não ambíguo. Retorna JSON derivado e contagens.
- `tests/test_prepare_aod.py`: importa o preparador; testa preservação, ambiguidades, ano, taxonomia e nomes/IDs conhecidos.
- `public/metadata/aod/derived.json`: dados derivados e alterações selecionadas, sem informação de contas; servido gratuitamente sem autenticação.
- `public/metadata/aod/prepare-aod-metadata.py`: cópia pública do método de transformação; gerada junto ao pacote.
- `public/metadata/aod/LICENSE.txt`: licença integral ODbL/DbCL original.
- `public/metadata/aod/index.html`: atribuição, fonte, versão, escopo e links de download.
- `src/components/layout/MainLayout.tsx`: recebe páginas como children e exibe atribuição/link no rodapé do app.
- `supabase/migrations/20261014210000_aod_safe_metadata.sql`: cria auditoria privada `aod_metadata_audit` (ID MAL/versão/chaves alteradas/valores antes e depois/data), com RLS e sem grants públicos; cria `apply_aod_metadata(jsonb)` somente para serviço. Recebe lotes até 500, trava registro, preenche vazios, registra origem por campo e devolve contagens. Nenhum campo é removido.

Fluxo: fonte fixa + snapshot → preparador → JSON público revisável → função administrativa → catálogo + auditoria privada → RPCs existentes → filtros/cards. O JWT/RLS da lista pessoal e as regras das RPCs não mudam.

## Patch e regras
`FOR UPDATE` revalida os vazios ao gravar, evitando sobrescrita concorrente. Temporada só com ano válido/compatível; formato só em enum reconhecido; studios somente pacote canônico. Chaves não permitidas (inclusive `genres`/`tags`) causam erro. Repetição não regrava títulos auditados da mesma versão. O audit guarda material necessário para revisão/recuperação de campos; recuperação futura deve respeitar alterações posteriores.

## Licença
Contém informações de anime-offline-database, por manami-project, sob ODbL 1.0 / DbCL 1.0. Dataset derivado e conteúdos adicionais da normalização são disponibilizados sob essas mesmas licenças. JSON, método completo, fonte original e texto da licença são publicados em `/metadata/aod/index.html`, sem cobrança/cadastro. Exportação separada apenas de metadados, sem usuários/listas/reviews/conversas. Fonte arquivada em 04/07/2026: não é atualização contínua. A licença de metadados não licencia imagens. Fonte: https://github.com/manami-project/anime-offline-database/blob/2026-27/LICENSE .

## Como testar
`python -m unittest discover -s tests -p test_prepare_aod.py`; TypeScript e build. SQL isolado deve verificar vazio/preenchido, ano divergente, idempotência, rejeição de gêneros e grants. Produção: comparar hash dos campos protegidos e gêneros; validar auditoria para alterações somente de vazios; verificar todos os gêneros e estúdios contra SQL/RPC; confirmar download JSON/método/licença por HTTP sem login e rodapé visível. Contagens derivam das mesmas RPCs, sem números adicionados manualmente.
