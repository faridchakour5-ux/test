import React, { createContext, useContext, useMemo } from 'react';
import { Lang, StringKey, t as translate, tf as translateVars } from './strings';

interface LangValue {
  lang: Lang;
  t: (key: StringKey) => string;
  tf: (key: StringKey, vars: Record<string, string | number>) => string;
}

const make = (lang: Lang): LangValue => ({ lang, t: (k) => translate(lang, k), tf: (k, v) => translateVars(lang, k, v) });
const LangContext = createContext<LangValue>(make('fr'));

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const value = useMemo(() => make(lang), [lang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
