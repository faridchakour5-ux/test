import { getGateLock, setGateLock, resetGateLock } from './gateLock';
import { openLock, registerGateFail, GATE_MAX_TRIES } from '../domain/parental';

afterEach(resetGateLock);

describe('verrou du portail parental (mémoire de l\'application)', () => {
  it('démarre ouvert, sans échec', () => {
    expect(getGateLock()).toEqual(openLock());
  });
  it('garde les échecs d\'un écran à l\'autre: rouvrir le portail ne remet pas les essais à zéro', () => {
    let l = openLock();
    for (let i = 0; i < GATE_MAX_TRIES; i++) l = registerGateFail(l, 1000);
    setGateLock(l);
    expect(getGateLock()).toBe(l);
    expect(getGateLock().lockedUntil).toBeGreaterThan(1000);
  });
  it('resetGateLock remet un verrou neuf (réussite du portail)', () => {
    setGateLock(registerGateFail(openLock(), 5));
    resetGateLock();
    expect(getGateLock()).toEqual(openLock());
  });
});
