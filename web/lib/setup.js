// The setup every page plays with: the ranges, pot, stack and bet sizes set up in Study (or the first visit's spot).
import { load } from './storage.js';

/** The spot a first visit opens on. Train and Play deal their own boards and take the rest from here. */
export const DEFAULTS = {
  board: 'Td 9d 6h Qc 7s', pot: 100, stack: 200, bets: [0.33, 0.75, 1.5], raises: [2.5], maxRaises: 1, allIn: false,
  oop: '66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s',
  ip: 'QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+',
};
export const SETUP_KEY = 'pareto';

/** The setup as Study last saved it, over the defaults (an older single raise read as a list). */
export function savedSetup() {
  const config = { ...DEFAULTS, ...(load(SETUP_KEY)?.config ?? {}) };
  if (!Array.isArray(config.raises)) config.raises = config.raise > 0 ? [config.raise] : [];
  delete config.raise;
  return config;
}

/** Each street's bet sizes, as lists: one list for every street, or one per street. */
export const betLists = (config) => (Array.isArray(config.bets[0]) ? config.bets : [config.bets]);
