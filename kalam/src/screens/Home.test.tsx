import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { LESSONS } from '../domain/lessons';
import { initialProgress } from '../domain/progress';
import { ThemeProvider } from '../theme/ThemeProvider';
import { HomeScreen } from './HomeScreen';

const noop = () => {};
type Handlers = Partial<{ onOpenLesson: (id: string) => void; onReview: () => void; onDuo: () => void; onSettings: () => void; onTarget: (t: 'en' | 'fr') => void }>;

const home = (progress: ReturnType<typeof initialProgress>, today: string, target: 'en' | 'fr' = 'en', h: Handlers = {}, dueCount = 0) => (
  <ThemeProvider profileId="adult">
    <HomeScreen lang="fr" level="A1" progress={progress} onOpenLesson={h.onOpenLesson ?? noop} dueCount={dueCount} onReview={h.onReview ?? noop}
      onDuo={h.onDuo ?? noop} onSettings={h.onSettings ?? noop} target={target} onTarget={h.onTarget ?? noop} today={today} />
  </ThemeProvider>
);
const P = (over = {}) => ({ ...initialProgress('2026-03-10'), ...over });

describe('HomeScreen: un geste évident', () => {
  it('le gros bouton « Continuer » ouvre la prochaine leçon conseillée', async () => {
    const onOpenLesson = jest.fn();
    await render(home(P(), '2026-03-10', 'en', { onOpenLesson }));
    await fireEvent.press(screen.getByText(/▶ Continuer: /));
    expect(onOpenLesson).toHaveBeenCalledTimes(1);
    const first = LESSONS.find((l) => l.level === 'A1' && l.id !== 'free')!;
    expect(onOpenLesson).toHaveBeenCalledWith(first.id);
  });
  it('après une leçon terminée, « Continuer » propose la suivante (pas la même)', async () => {
    const onOpenLesson = jest.fn();
    const first = LESSONS.find((l) => l.level === 'A1' && l.id !== 'free')!;
    await render(home(P({ completedLessons: [first.id] }), '2026-03-10', 'en', { onOpenLesson }));
    await fireEvent.press(screen.getByText(/▶ Continuer: /));
    expect(onOpenLesson.mock.calls[0][0]).not.toBe(first.id);
  });
  it('quand tout est terminé, « Continuer » ouvre la conversation libre', async () => {
    const onOpenLesson = jest.fn();
    await render(home(P({ completedLessons: LESSONS.map((l) => l.id) }), '2026-03-10', 'en', { onOpenLesson }));
    await fireEvent.press(screen.getByText(/▶ Continuer: /));
    expect(onOpenLesson).toHaveBeenCalledWith('free');
  });
  it('en français, « Continuer » suit les leçons faites EN FRANÇAIS (pas celles d\'anglais)', async () => {
    const onOpenLesson = jest.fn();
    const first = LESSONS.find((l) => l.level === 'A1' && l.id !== 'free')!;
    await render(home(P({ completedLessons: [first.id] }), '2026-03-10', 'fr', { onOpenLesson })); // fait en anglais seulement
    await fireEvent.press(screen.getByText(/▶ Continuer: /));
    expect(onOpenLesson).toHaveBeenCalledWith(first.id);
  });
});

describe('HomeScreen: accueil allégé', () => {
  it('le bouton Réglages ouvre les réglages', async () => {
    const onSettings = jest.fn();
    await render(home(P(), '2026-03-10', 'en', { onSettings }));
    await fireEvent.press(screen.getByLabelText('Réglages'));
    expect(onSettings).toHaveBeenCalled();
  });
  it('les réglages (langue, couleurs, export, effacement, profil) ne sont PLUS sur l\'accueil', async () => {
    await render(home(P(), '2026-03-10'));
    for (const text of [/Exporter mes données/, /Effacer mes données/, /Changer de profil/, /Couleurs/]) expect(screen.queryByText(text)).toBeNull();
    expect(screen.queryByLabelText('Français')).toBeNull(); // sélecteur de la langue de l'interface
  });
  it('révision et conversation à deux sont accessibles, avec le nombre de cartes à revoir', async () => {
    const onReview = jest.fn();
    const onDuo = jest.fn();
    await render(home(P(), '2026-03-10', 'en', { onReview, onDuo }, 7));
    await fireEvent.press(screen.getByText('Réviser (7)'));
    await fireEvent.press(screen.getByText(/Conversation à deux/));
    expect(onReview).toHaveBeenCalled();
    expect(onDuo).toHaveBeenCalled();
  });
  it('montre le défi du jour, le niveau et la semaine', async () => {
    await render(home(P(), '2026-03-10'));
    expect(screen.getByText(/Défi du jour/)).toBeTruthy();
    expect(screen.getByText(/Niveau 1/)).toBeTruthy();
    expect(screen.getByText(/Cette semaine/)).toBeTruthy();
  });
});

describe('HomeScreen: changement de jour', () => {
  it('n\'affiche pas les minutes d\'hier comme celles d\'aujourd\'hui', async () => {
    await render(home({ ...initialProgress('2026-03-09'), minutesToday: 10 }, '2026-03-10'));
    expect(screen.getByText(/Objectif du jour: 0\/10/)).toBeTruthy();
    expect(screen.queryByText(/Objectif atteint/)).toBeNull();
  });
  it('affiche les minutes du jour quand c\'est bien aujourd\'hui', async () => {
    await render(home(P({ minutesToday: 4 }), '2026-03-10'));
    expect(screen.getByText(/Objectif du jour: 4\/10/)).toBeTruthy();
  });
});

describe('HomeScreen: langue apprise', () => {
  it('propose anglais et français', async () => {
    const onTarget = jest.fn();
    await render(home(P(), '2026-03-10', 'en', { onTarget }));
    expect(screen.getByLabelText('Langue à apprendre: Anglais')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Langue à apprendre: Français'));
    expect(onTarget).toHaveBeenCalledWith('fr');
    expect(screen.queryByLabelText(/Langue à apprendre: (Espagnol|Arabe)/)).toBeNull();
  });
  it('les leçons terminées en anglais ne comptent pas comme terminées en français, et inversement', async () => {
    await render(home(P({ completedLessons: ['family'] }), '2026-03-10', 'en'));
    expect(screen.getAllByText(/✓ Terminée/)).toHaveLength(1);
  });
  it('« fr:family » ne compte que pour le français', async () => {
    await render(home(P({ completedLessons: ['fr:family'] }), '2026-03-10', 'en'));
    expect(screen.queryAllByText(/✓ Terminée/)).toHaveLength(0);
  });
});
