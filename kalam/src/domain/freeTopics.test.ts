import { FREE_LESSON_ID, FREE_TOPICS, getFreeTopic } from './freeTopics';
import { LESSONS } from './lessons';
import { UI_LANGS } from '../i18n/strings';

describe('sujets libres', () => {
  it('propose au moins 6 sujets uniques traduits dans toutes les langues', () => {
    expect(FREE_TOPICS.length).toBeGreaterThanOrEqual(6);
    expect(new Set(FREE_TOPICS.map((t) => t.id)).size).toBe(FREE_TOPICS.length);
    for (const t of FREE_TOPICS) {
      expect(t.emoji).toBeTruthy();
      UI_LANGS.forEach((l) => expect(t.title[l].trim()).not.toBe(''));
      expect(t.scenario).toMatch(/Free conversation about:/);
      expect(t.scenario.length).toBeLessThanOrEqual(300); // limite imposée par le serveur
      expect(t.id).toMatch(/^[a-z-]{1,20}$/);
    }
  });
  it('la leçon libre existe et getFreeTopic retrouve un sujet', () => {
    expect(LESSONS.some((l) => l.id === FREE_LESSON_ID)).toBe(true);
    expect(getFreeTopic('travel')?.id).toBe('travel');
    expect(getFreeTopic('nope')).toBeUndefined();
    expect(getFreeTopic(null)).toBeUndefined();
  });
});
