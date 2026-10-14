// Utilitários compartilhados de tradução DeepL e detecção de idioma.
// deno-lint-ignore no-explicit-any
type Banco = any;

const palavrasIngles = new Set(["the", "and", "of", "to", "is", "his", "her", "with", "that", "in", "he", "she", "they", "their", "who", "was", "for", "from", "but", "an", "when", "will", "by", "this"]);
const palavrasPortugues = new Set(["de", "que", "e", "o", "a", "do", "da", "em", "um", "uma", "para", "com", "não", "os", "as", "seu", "sua", "ele", "ela", "mas", "quando", "por", "dos", "das", "é"]);

/** Heurística simples: considera inglês quando palavras comuns do inglês dominam o texto. */
export function pareceIngles(texto: string | null | undefined) {
  if (!texto) return false;
  const palavras = texto.toLowerCase().match(/[a-zà-ú]+/g) ?? [];
  let en = 0, pt = 0;
  for (const p of palavras) { if (palavrasIngles.has(p)) en++; if (palavrasPortugues.has(p)) pt++; }
  return en >= 3 && en > pt * 1.5;
}

/** Erro do DeepL com status e mensagem em PT-BR. */
export class ErroDeepl extends Error {
  constructor(mensagem: string, readonly status: number) { super(mensagem); }
}

/** Traduz uma lista de textos do inglês para PT-BR (máx. 25 por chamada). */
export async function traduzirDeepl(textos: string[]) {
  const chave = Deno.env.get("DEEPL_API_KEY");
  if (!chave) throw new ErroDeepl("Chave do DeepL não configurada", 503);
  const host = chave.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
  const resposta = await fetch(`${host}/v2/translate`, {
    method: "POST",
    headers: { Authorization: `DeepL-Auth-Key ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: textos, target_lang: "PT-BR", source_lang: "EN" }),
    signal: AbortSignal.timeout(30000),
  });
  if (!resposta.ok) {
    const corpo = await resposta.text();
    console.error(`DeepL falhou [${resposta.status}]: ${corpo}`);
    const msg = resposta.status === 456 ? "Cota do DeepL esgotada neste mês"
      : resposta.status === 403 ? "Chave do DeepL inválida"
      : resposta.status === 429 ? "Muitas solicitações ao DeepL; aguarde e tente novamente"
      : "Falha ao traduzir com o DeepL";
    throw new ErroDeepl(msg, resposta.status === 456 ? 402 : resposta.status);
  }
  const { translations } = await resposta.json() as { translations: { text: string }[] };
  return translations.map(t => t.text);
}

interface Candidato { mal_id: number; title: string; synopsis: string | null; synopsis_pt: string | null }

/** Filtra animes sem sinopse PT-BR ou com sinopse PT-BR em inglês e grava sugestões pendentes. */
export async function gerarSugestoes(banco: Banco, animes: Candidato[], origem: "import" | "manual") {
  const alvos = animes
    .filter(a => a.synopsis?.trim())
    .map(a => ({ ...a, motivo: !a.synopsis_pt?.trim() ? "missing" : (a.synopsis_pt === a.synopsis || pareceIngles(a.synopsis_pt)) ? "english" : null }))
    .filter(a => a.motivo);
  if (!alvos.length) return 0;
  // Ignora animes que já possuem sugestão pendente ou rejeitada (evita gastar cota de novo).
  const { data: existentes } = await banco.from("translation_suggestions").select("mal_id,status").in("mal_id", alvos.map(a => a.mal_id));
  const bloqueados = new Set((existentes ?? []).filter((e: { status: string }) => e.status !== "approved").map((e: { mal_id: number }) => e.mal_id));
  const novos = alvos.filter(a => !bloqueados.has(a.mal_id)).slice(0, 25);
  if (!novos.length) return 0;
  const traducoes = await traduzirDeepl(novos.map(a => a.synopsis as string));
  const { error } = await banco.from("translation_suggestions").upsert(novos.map((a, i) => ({
    mal_id: a.mal_id, title: a.title, source_text: a.synopsis, current_pt: a.synopsis_pt ?? null,
    suggested_text: traducoes[i] ?? "", reason: a.motivo, status: "pending", origin: origem, created_at: new Date().toISOString(), reviewed_at: null,
  })), { onConflict: "mal_id" });
  if (error) throw error;
  return novos.length;
}
