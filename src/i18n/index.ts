import { createContext, useContext } from 'react';
import { en } from './en';
import { te } from './te';
import { hi } from './hi';
import type { Language } from '@/types';
import type { Strings } from './en';

export const strings: Record<Language, Strings> = { en, te, hi };

export const I18nContext = createContext<Strings>(en);

export function useT(): Strings {
  return useContext(I18nContext);
}

export function t(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? key));
}
