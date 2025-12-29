/**
 * Edge Function para proxy de imagens
 * Resolve problemas de CORS ao buscar imagens de CDNs externos como MyAnimeList
 * Permite que as imagens sejam cacheadas pelo navegador e Service Worker
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// Lista de domínios permitidos para proxy (segurança)
const ALLOWED_DOMAINS = [
  'cdn.myanimelist.net',
  'img1.ak.crunchyroll.com',
  'image.tmdb.org',
];

/**
 * Verifica se a URL é de um domínio permitido
 */
function isAllowedDomain(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return ALLOWED_DOMAINS.some(domain => parsedUrl.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

/**
 * Extrai a extensão do arquivo da URL para determinar content-type
 */
function getContentType(url: string): string {
  const extension = url.split('.').pop()?.toLowerCase().split('?')[0];
  
  const contentTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'avif': 'image/avif',
  };
  
  return contentTypes[extension || ''] || 'image/jpeg';
}

Deno.serve(async (req) => {
  // Tratamento de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Apenas GET é permitido
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    // Obtém a URL da query string
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get('url');

    if (!imageUrl) {
      console.log('[proxy-image] URL não fornecida');
      return new Response(
        JSON.stringify({ error: 'Parâmetro "url" é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Valida se a URL é de um domínio permitido
    if (!isAllowedDomain(imageUrl)) {
      console.log(`[proxy-image] Domínio não permitido: ${imageUrl}`);
      return new Response(
        JSON.stringify({ error: 'Domínio não permitido' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[proxy-image] Buscando imagem: ${imageUrl}`);

    // Faz o fetch da imagem original
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AniCheck/1.0)',
        'Accept': 'image/*',
      },
    });

    if (!imageResponse.ok) {
      console.log(`[proxy-image] Erro ao buscar imagem: ${imageResponse.status}`);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar imagem', status: imageResponse.status }),
        { 
          status: imageResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Obtém os bytes da imagem
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || getContentType(imageUrl);

    console.log(`[proxy-image] Imagem obtida: ${imageBuffer.byteLength} bytes, ${contentType}`);

    // Retorna a imagem com headers CORS e cache
    return new Response(imageBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Length': imageBuffer.byteLength.toString(),
        // Cache por 7 dias no navegador e CDN
        'Cache-Control': 'public, max-age=604800, immutable',
        // Headers para CDN
        'CDN-Cache-Control': 'public, max-age=2592000',
        'Vary': 'Accept-Encoding',
      },
    });

  } catch (error) {
    console.error('[proxy-image] Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
