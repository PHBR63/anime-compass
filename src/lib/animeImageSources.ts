/** Valida se a capa local pertence ao armazenamento público do projeto atual. */
export function isCurrentAnimeImageUrl(url: string): boolean {
  try {
    const currentOrigin = new URL(import.meta.env.VITE_SUPABASE_URL).origin;
    const parsed = new URL(url);
    return parsed.origin === currentOrigin &&
      parsed.pathname.startsWith('/storage/v1/object/public/anime-images/');
  } catch {
    return false;
  }
}

/** Descarta capas de ambientes antigos, preservando imagens externas e arquivos do aplicativo. */
export function getUsableAnimeImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith('/storage/v1/object/public/anime-images/') &&
      !isCurrentAnimeImageUrl(url)) return undefined;
  } catch {
    // Caminhos relativos são imagens válidas do próprio aplicativo.
  }
  return url;
}