import { describe, it, expect } from "bun:test";
import { mapearAnime, permitirAnime, obterCapa } from "./catalog";

const anime = { mal_id: 1, title: "Original", synopsis: "Original synopsis", episodes: 0, score: 0, images: { jpg: { large_image_url: "https://cdn.myanimelist.net/images/anime/1/1.jpg" } } };

/** Verifica a proteção do conteúdo editorial ao atualizar dados do Jikan. */
describe("Importação Jikan", () => {
  it("preserva textos existentes sem enviar campos traduzidos", () => {
    const dados = mapearAnime(anime, { mal_id: 1, title: "Título em português", synopsis: "Sinopse em português" });
    for (const campo of ["title", "synopsis", "synopsis_pt", "local_image_url", "genres", "studios"]) expect(dados).not.toHaveProperty(campo);
  });
  it("preenche campos vazios e mantém valores zero", () => {
    expect(mapearAnime(anime, { mal_id: 1, title: " " }).title).toBe("Original");
    expect(mapearAnime(anime).episodes).toBe(0);
    expect(mapearAnime(anime).score).toBe(0);
  });
  it("bloqueia músicas, comerciais e vídeos promocionais", () => {
    for (const type of ["Music", "CM", "PV"]) expect(permitirAnime({ ...anime, type })).toBe(false);
    expect(permitirAnime({ ...anime, type: "TV" })).toBe(true);
  });
  it("não aceita capas fora da origem autorizada", () => {
    expect(obterCapa(anime)).toBe(anime.images.jpg.large_image_url);
    expect(obterCapa({ ...anime, images: { jpg: { large_image_url: "https://cdn.myanimelist.net.evil.example/a.jpg" } } })).toBeNull();
  });
});