import { getAnnSource } from '@/lib/annMetadata';

/** Crédito da obra cujos gêneros/estúdios foram complementados pelo ANN. */
export function AnimeMetadataCredit({ malId }: { malId?: number }) {
  const source = getAnnSource(malId);
  if (!source) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Gêneros ou estúdios complementados com dados do Anime News Network.{' '}
      <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
        Detalhes desta obra no Anime News Network
      </a>
    </p>
  );
}
