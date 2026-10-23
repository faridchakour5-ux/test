import { GATE_MAX_TRIES, isGateLocked, openLock, registerGateFail } from './parental';

describe('verrou du portail parental', () => {
  it('ouvert au départ, et les deux premières erreurs ne bloquent pas', () => {
    let lock = openLock();
    expect(isGateLocked(lock, 1000)).toBe(false);
    lock = registerGateFail(lock, 1000);
    lock = registerGateFail(lock, 1000);
    expect(isGateLocked(lock, 1000)).toBe(false);
  });

  it('la 3e erreur bloque 30 s, puis le blocage se lève', () => {
    let lock = openLock();
    for (let i = 0; i < GATE_MAX_TRIES; i++) lock = registerGateFail(lock, 10_000);
    expect(isGateLocked(lock, 10_000)).toBe(true);
    expect(isGateLocked(lock, 39_999)).toBe(true);
    expect(isGateLocked(lock, 40_000)).toBe(false);
  });

  it('les pauses suivantes doublent (60 s, 120 s...) avec un plafond de 5 min', () => {
    let lock = openLock();
    const waits: number[] = [];
    for (let round = 0; round < 6; round++) {
      for (let i = 0; i < GATE_MAX_TRIES; i++) lock = registerGateFail(lock, 0);
      waits.push(lock.lockedUntil);
    }
    expect(waits).toEqual([30_000, 60_000, 120_000, 240_000, 300_000, 300_000]);
  });
});
