// Testes do estado da Descobrir: URL, intervalos, chips e payload enviado ao banco.
import { describe, expect, test } from 'bun:test';
import {
  activeChips, clearFilters, hideInListStorageKey, parseDiscoverParams, removeChip,
  toDiscoverParams, toRpcFilters, validateYearRange,
} from '../src/lib/discoverParams';
import { dedupeByMalId } from '../src/hooks/useDiscover';
import { formatCardMeta } from '../src/components/anime/DiscoverAnimeCard';

const agora = new Date('2026-10-14T12:00:00Z');

describe('URL da Descobrir', () => {
  // Ida e volta preserva todos os filtros (voltar/recarregar).
  test('serializa e lê de volta', () => {
    const sp = new URLSearchParams('q=naruto&genero=Action&estudio=Studio Pierrot&de=1907&ate=2029&ordem=title&nota=7');
    const s = parseDiscoverParams(sp, agora);
    expect(s).toMatchObject({ search: 'naruto', genre: 'Action', studio: 'Studio Pierrot', yearMin: 1907, yearMax: 2029, sort: 'title', scoreMin: 7 });
    expect(parseDiscoverParams(toDiscoverParams(s, agora), agora)).toEqual(s);
  });
  // Intervalo invertido vindo da URL descarta o ano final.
  test('descarta intervalo inválido', () => {
    expect(parseDiscoverParams(new URLSearchParams('de=2020&ate=2010'), agora).yearMax).toBeNull();
    expect(validateYearRange(2020, 2010)).not.toBeNull();
    expect(validateYearRange(1907, 2029)).toBeNull();
  });
  // Temporada padrão é o trimestre atual, com ano explícito no payload.
  test('modo temporada envia ano e trimestre', () => {
    const s = parseDiscoverParams(new URLSearchParams('modo=season'), agora);
    expect(toRpcFilters(s, false)).toEqual({ season: 'fall', season_year: 2026 });
  });
  // Ordenação sozinha não cria filtro algum (funciona sem outros filtros).
  test('ordenação sozinha', () => {
    const s = parseDiscoverParams(new URLSearchParams('ordem=popularity'), agora);
    expect(toRpcFilters(s, false)).toEqual({});
  });
  // Busca e gênero são combináveis.
  test('busca + gênero juntos', () => {
    const s = parseDiscoverParams(new URLSearchParams('q=one&genero=Comedy'), agora);
    expect(toRpcFilters(s, true)).toEqual({ search: 'one', genre: 'Comedy', hide_in_list: true });
  });
  test('modos em exibição e próximos usam aliases de status', () => {
    expect(toRpcFilters(parseDiscoverParams(new URLSearchParams('modo=airing&status=finished'), agora), false)).toEqual({ status: 'airing' });
    expect(toRpcFilters(parseDiscoverParams(new URLSearchParams('modo=upcoming'), agora), false)).toEqual({ status: 'upcoming' });
  });
});

describe('chips e preferências', () => {
  test('remove chip e limpa tudo', () => {
    const s = parseDiscoverParams(new URLSearchParams('genero=Action&de=2000&ate=2010&tipo=TV'), agora);
    expect(activeChips(s).map(c => c.key)).toEqual(['genre', 'type', 'years']);
    expect(removeChip(s, 'years')).toMatchObject({ yearMin: null, yearMax: null, genre: 'Action' });
    expect(activeChips(clearFilters(s))).toEqual([]);
  });
  test('preferência de ocultar é por conta', () => {
    expect(hideInListStorageKey('a')).not.toBe(hideInListStorageKey('b'));
    expect(hideInListStorageKey(null)).toBeNull();
  });
});

describe('paginação e cards', () => {
  test('remove duplicatas preservando ordem', () => {
    expect(dedupeByMalId([{ mal_id: 1 }, { mal_id: 2 }, { mal_id: 1 }])).toEqual([{ mal_id: 1 }, { mal_id: 2 }]);
  });
  test('linha de metadados do card', () => {
    expect(formatCardMeta({ type: 'Movie', year: 2001, episodes: 1, status: null })).toBe('Filme · 2001 · 1 ep');
    expect(formatCardMeta({ type: null, year: null, episodes: null, status: 'Airing' })).toBe('Ano ? · Em andamento');
  });
});
