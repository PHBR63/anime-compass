import { describe, expect, test } from 'bun:test';
import { getAnnSource, isAnnCacheCurrent } from '../src/lib/annMetadata';

describe('atribuição e cache ANN', () => {
  test('vínculo aprovado gera apenas URL oficial', () => {
    expect(getAnnSource(312)).toEqual({id:2061,url:'https://www.animenewsnetwork.com/encyclopedia/anime.php?id=2061'});
    expect(getAnnSource(-1)).toBeNull();
    expect(getAnnSource(1)).toBeNull();
  });
  test('cache afetado requer origem atual; demais títulos preservam cache', () => {
    expect(isAnnCacheCurrent(312,undefined)).toBe(false);
    expect(isAnnCacheCurrent(312,{ann:{id:2061}})).toBe(true);
    expect(isAnnCacheCurrent(312,{ann:{id:2}})).toBe(false);
    expect(isAnnCacheCurrent(1,undefined)).toBe(true);
  });
});
