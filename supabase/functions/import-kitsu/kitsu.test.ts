// Testes do mapeamento do Kitsu: preservação de textos, preenchimento de vazios e capas.
import { describe, it, expect } from "bun:test";
import {
  mapearAnimeKitsu, permitirAnimeKitsu, obterCapaKitsu,
  mapearStatusKitsu, mapearTipoKitsu, mapearClassificacaoKitsu,
  type AnimeKitsu, type TextosExistentesKitsu,
} from "./kitsu.ts";

/** Monta um anime de exemplo do Kitsu com os campos essenciais. */
function animeExemplo(sobrescrever: Partial<AnimeKitsu["attributes"]> = {}): AnimeKitsu {
  return {
    id: "1",
    attributes: {
      canonicalTitle: "Cowboy Bebop",
      titles: { en: "Cowboy Bebop", en_jp: "Cowboy Bebop", ja_jp: "カウボーイビバップ" },
      synopsis: "In the year 2071...",
      subtype: "TV",
      status: "finished",
      episodeCount: 26,
      averageRating: "82.27",
      userCount: 50000,
      ratingRank: 15,
      popularityRank: 30,
      seasonYear: 1998,
      season: "spring",
      ageRating: "R",
      posterImage: { original: "https://media.kitsu.app/anime/poster_images/1/original.jpg", large: "https://media.kitsu.app/anime/poster_images/1/large.jpg" },
      ...sobrescrever,
    },
  };
}

describe("permitirAnimeKitsu", () => {
  it("aceita animes normais", () => {
    expect(permitirAnimeKitsu(animeExemplo())).toBe(true);
  });
  it("exclui conteúdos musicais", () => {
    expect(permitirAnimeKitsu(animeExemplo({ subtype: "music" }))).toBe(false);
  });
  it("exclui animes sem título", () => {
    expect(permitirAnimeKitsu(animeExemplo({ canonicalTitle: null }))).toBe(false);
  });
});

describe("mapearStatusKitsu e tipos", () => {
  it("traduz status", () => {
    expect(mapearStatusKitsu("current")).toBe("Currently Airing");
    expect(mapearStatusKitsu("finished")).toBe("Finished Airing");
    expect(mapearStatusKitsu("upcoming")).toBe("Not yet aired");
    expect(mapearStatusKitsu("qualquer")).toBeNull();
  });
  it("traduz tipos", () => {
    expect(mapearTipoKitsu("movie")).toBe("Movie");
    expect(mapearTipoKitsu("special")).toBe("Special");
    expect(mapearTipoKitsu("desconhecido")).toBeNull();
  });
  it("traduz classificação etária", () => {
    expect(mapearClassificacaoKitsu("R")).toBe("R - 17+ (violence & profanity)");
    expect(mapearClassificacaoKitsu("G")).toBe("G - All Ages");
  });
});

describe("mapearAnimeKitsu", () => {
  it("anime novo recebe mapeamento completo", () => {
    const registro = mapearAnimeKitsu(animeExemplo());
    expect(registro.title).toBe("Cowboy Bebop");
    expect(registro.title_japanese).toBe("カウボーイビバップ");
    expect(registro.score).toBeCloseTo(8.23, 2);
    expect(registro.type).toBe("TV");
    expect(registro.status).toBe("Finished Airing");
    expect(registro.year).toBe(1998);
    expect(registro.image_url).toBe("https://media.kitsu.app/anime/poster_images/1/original.jpg");
    expect("synopsis_pt" in registro).toBe(false);
    expect("local_image_url" in registro).toBe(false);
  });

  it("anime existente NÃO sobrescreve textos nem notas preenchidos", () => {
    const existente: TextosExistentesKitsu = {
      title: "Cowboy Bebop", title_english: "Cowboy Bebop", title_japanese: "カウボーイビバップ",
      synopsis: "Sinopse já cadastrada", score: 8.7, episodes: 26, year: 1998, status: "Finished Airing",
      type: "TV", image_url: "https://cdn.myanimelist.net/capa.jpg",
    };
    const registro = mapearAnimeKitsu(animeExemplo(), existente);
    expect(registro.title).toBeUndefined();
    expect(registro.synopsis).toBeUndefined();
    expect(registro.score).toBeUndefined();
    expect(registro.episodes).toBeUndefined();
    expect(registro.status).toBeUndefined();
    // Campos nulos continuam sendo preenchidos.
    const comLacunas: TextosExistentesKitsu = { members: null, popularity: null, rating: null, season: null };
    const preenchido = mapearAnimeKitsu(animeExemplo(), comLacunas);
    expect(preenchido.members).toBe(50000);
    expect(preenchido.popularity).toBe(30);
    expect(preenchido.rating).toBe("R - 17+ (violence & profanity)");
    expect(preenchido.season).toBe("spring");
  });

  it("capa só entra quando o anime não tem nenhuma imagem", () => {
    const comImagem: TextosExistentesKitsu = { image_url: "https://cdn.myanimelist.net/capa.jpg" };
    expect(mapearAnimeKitsu(animeExemplo(), comImagem).image_url).toBeUndefined();
    const comCapaLocal: TextosExistentesKitsu = { image_url: null, local_image_url: "https://backend/anime-images/capa.jpg" };
    expect(mapearAnimeKitsu(animeExemplo(), comCapaLocal).image_url).toBeUndefined();
    const semImagem: TextosExistentesKitsu = { image_url: null, local_image_url: null };
    expect(mapearAnimeKitsu(animeExemplo(), semImagem).image_url).toBe("https://media.kitsu.app/anime/poster_images/1/original.jpg");
  });

  it("ignora capas de domínios não oficiais", () => {
    const suspeito = animeExemplo({ posterImage: { original: "http://malicioso.com/capa.jpg" } });
    expect(obterCapaKitsu(suspeito)).toBeNull();
  });
});

import { estimarTemporada, extrairMetadadosKitsu, mapearStatusKitsu as statusKitsu } from "./kitsu.ts";

import { test } from "bun:test";
describe("metadados Kitsu", () => {
  // Temporada estimada pela data de estreia segue a regra documentada.
  test("estima temporada por mês e diferencia ausência", () => {
    expect(estimarTemporada("2024-01-05")).toEqual({ season: "winter", year: 2024 });
    expect(estimarTemporada("2024-04-01")).toEqual({ season: "spring", year: 2024 });
    expect(estimarTemporada("2024-09-30")).toEqual({ season: "summer", year: 2024 });
    expect(estimarTemporada("2024-12-31")).toEqual({ season: "fall", year: 2024 });
    expect(estimarTemporada(null)).toBeNull();
    expect(estimarTemporada("2024")).toBeNull();
  });
  // Status "current" do Kitsu é gravado no padrão canônico do Jikan.
  test("normaliza status em exibição", () => {
    expect(statusKitsu("current")).toBe("Currently Airing");
  });
  // Só estúdios com papel "studio" entram; gêneros vêm só pelos nomes oficiais, sem IDs MAL.
  test("extrai gêneros e estúdios sem inventar IDs", () => {
    const mapa = extrairMetadadosKitsu({
      data: [{ id: "2", attributes: { startDate: "2001-09-01" }, relationships: {
        genres: { data: [{ id: "1", type: "genres" }, { id: "1", type: "genres" }] },
        animeProductions: { data: [{ id: "a", type: "animeProductions" }, { id: "b", type: "animeProductions" }] } } } as never],
      included: [
        { id: "1", type: "genres", attributes: { name: "Action" } },
        { id: "a", type: "animeProductions", attributes: { role: "producer" }, relationships: { producer: { data: { id: "9", type: "producers" } } } },
        { id: "b", type: "animeProductions", attributes: { role: "studio" }, relationships: { producer: { data: { id: "4", type: "producers" } } } },
        { id: "9", type: "producers", attributes: { name: "Bandai" } },
        { id: "4", type: "producers", attributes: { name: "BONES" } },
      ],
    });
    const m = mapa.get(2)!;
    expect(m.genres).toEqual([{ name: "Action" }]);
    expect(m.studios).toEqual([{ name: "BONES" }]);
    expect(JSON.stringify(m)).not.toContain("mal_id");
  });
});
