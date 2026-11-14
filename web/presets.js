// Preflop ranges by position and by preflop action, 6-max, 100 big blinds: the two ranges that reach the flop, each hand
// with how much of it is held (1 unless written after a colon), and the pot and the stack behind in big blinds.
// Brought in from the owner's napkinpoker, where they are the starting ranges of its reference solves.
/** The preflop actions, in the order they are offered: its key, and its name on a button. */
export const ACTIONS = [['SRP', 'SRP'], ['3BP', '3-bet'], ['4BP', '4-bet'], ['Squeeze', 'Squeeze'], ['Limped', 'Limp']];
/** Seats in the order they act before the flop. */
export const SEATS = ['UTG', 'CO', 'BU', 'SB', 'BB'];
export const PRESETS = [
  { action: 'SRP', oop: 'BB', ip: 'BU', line: 'BU opens, BB calls', pot: 5.5, stack: 97.5,
    ranges: {
      oop: '99:0.28,88:0.74,77:0.66,66:0.91,55:0.81,44,33,22,AJs:0.08,ATs,A9s,A8s,A7s,A6s,A5s:0.71,A4s,A3s,A2s,KJs,KTs,K9s,K8s,K7s:0.91,K6s:0.65,K5s:0.97,K4s,K3s:0.34,K2s:0.82,QJs:0.77,QTs:0.68,Q9s,Q8s:0.75,Q7s,Q6s:0.88,Q5s:0.99,Q4s,Q3s:0.83,Q2s,JTs:0.2,J8s:0.67,J7s:0.01,J6s:0.79,J5s:0.67,J4s:0.55,T9s:0.39,T8s:0.87,T7s:0.52,T6s:0.25,98s,97s,96s:0.83,87s,86s,85s,76s:0.82,75s,74s,65s:0.94,64s,63s:0.99,54s:0.94,53s,52s:0.68,43s,42s:0.25,AJo:0.72,ATo:0.72,A9o,A8o:0.83,A7o:0.61,A5o:0.43,A4o:0.1,KQo:0.76,KJo:0.28,KTo:0.29,K9o:0.52,QJo:0.69,QTo:0.81,Q9o:0.2,JTo:0.77,J9o:0.73,T9o:0.69,98o:0.1',
      ip: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,22:0.85,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s,K6s,K5s,K4s,K3s,K2s,QJs,QTs,Q9s,Q8s,Q7s,Q6s,Q5s,Q4s,Q3s:0.96,JTs,J9s,J8s,J7s,J6s,J5s,J4s:0.39,T9s,T8s,T7s,T6s,98s,97s,96s:0.72,87s,86s,76s,75s:0.93,65s,54s:0.9,AKo,AQo,AJo,ATo,A9o,A8o,A7o,A6o,A5o,A4o,A3o,KQo,KJo,KTo,K9o,K8o:0.89,K7o:0.43,QJo,QTo,Q9o,JTo,J9o,J8o:0.12,T9o,T8o:0.49',
    } },
  { action: 'SRP', oop: 'BB', ip: 'CO', line: 'CO opens, BB calls', pot: 5.5, stack: 97.5,
    ranges: {
      oop: 'TT:0.47,99:0.9,88:0.9,77:0.88,66:0.94,55:0.96,44,33,22,AQs:0.74,AJs,ATs,A9s,A8s,A7s:0.83,A6s:0.52,A5s:0.85,A4s:0.41,A3s:0.92,A2s:0.44,KQs:0.88,KJs:0.97,KTs,K9s,K8s,K7s:0.82,K6s:0.52,K5s,K4s:0.57,K3s:0.7,K2s:0.73,QJs:0.57,QTs:0.18,Q9s:0.99,Q8s:0.63,Q7s:0.89,Q6s:0.85,Q4s:0.92,JTs:0.04,J9s:0.62,J8s:0.83,J7s:0.4,T9s,T8s:0.98,T7s:0.76,98s,97s,96s,87s,86s,85s,76s:0.96,75s,74s:0.58,65s:0.99,64s,63s:0.29,54s,53s,52s:0.02,43s:0.83,42s:0.28,AQo:0.5,AJo:0.81,ATo:0.9,A9o:0.74,KQo:0.48,KJo:0.4,KTo:0.68,QJo:0.62,QTo:0.92,JTo:0.98',
      ip: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33:0.3,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s,K6s,K5s,K4s,K3s,QJs,QTs,Q9s,Q8s,Q7s,Q6s:0.7,JTs,J9s,J8s,J7s:0.73,T9s,T8s,98s,97s:0.18,87s:0.17,76s:0.36,65s:0.47,54s:0.27,AKo,AQo,AJo,ATo,A9o,A8o,A7o:0.54,A5o,KQo,KJo,KTo,K9o:0.37,QJo,QTo,JTo',
    } },
  { action: 'SRP', oop: 'BB', ip: 'UTG', line: 'UTG opens, BB calls', pot: 5.5, stack: 97.5,
    ranges: {
      oop: 'JJ:0.95,TT:0.87,99:0.99,88:0.96,77:0.99,66:0.99,55,44,33,22,AQs:0.94,AJs,ATs,A9s:0.72,A8s:0.63,A7s:0.81,A6s:0.49,A4s:0.7,A3s:0.81,A2s:0.73,KJs:0.7,KTs:0.69,K9s:0.28,K8s:0.78,K7s:0.64,K6s:0.36,K5s:0.54,K4s:0.19,QJs:0.72,QTs,Q9s:0.69,Q8s:0.25,JTs,J9s,J8s:0.47,T9s:0.94,T8s:0.93,T7s:0.77,98s,97s,96s:0.49,87s:0.81,86s,85s:0.09,76s:0.84,75s,65s:0.94,64s,54s:0.86,53s:0.87,43s:0.86,AKo:0.07,AQo:0.73,AJo:0.89,ATo:0.13,KQo:0.78,KJo:0.5,QJo:0.14',
      ip: 'AA,KK,QQ,JJ,TT,99,88,77,66:0.36,55:0.44,44:0.07,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s:0.48,K6s:0.32,K5s:0.68,QJs,QTs,Q9s,JTs,T9s:0.57,87s:0.05,76s:0.07,65s:0.39,54s:0.24,AKo,AQo,AJo,ATo,KQo,KJo,KTo:0.57,QJo:0.41',
    } },
  { action: 'SRP', oop: 'SB', ip: 'BB', line: 'SB opens, BB calls', pot: 6, stack: 97,
    ranges: {
      oop: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,22,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s,K6s,K5s,K4s,K3s,K2s,QJs,QTs,Q9s,Q8s,Q7s,Q6s,Q5s,Q4s,Q3s,Q2s,JTs,J9s,J8s,J7s,J6s,J5s,T9s,T8s,T7s,T6s,98s,97s,96s,87s,86s,85s,76s,75s,65s,64s,54s,53s:0.67,AKo,AQo,AJo,ATo,A9o,A8o,A7o,A6o,A5o,A4o,A3o:0.68,KQo,KJo,KTo,K9o,K8o:0.74,QJo,QTo,Q9o,JTo,J9o,T9o,T8o:0.48,98o:0.72',
      ip: '88:0.61,77:0.68,66:0.94,55:0.81,44,33,22,ATs,A9s,A8s,A7s,A6s,A5s:0.65,A4s,A3s,A2s,KTs:0.92,K9s,K8s,K7s,K6s,K5s:0.98,K4s,K3s,K2s,QJs:0.96,QTs,Q9s,Q8s,Q7s,Q6s,Q5s,Q4s,Q3s,Q2s,JTs:0.57,J9s,J8s,J7s,J6s:0.82,J5s:0.59,J4s:0.78,J3s:0.28,J2s:0.47,T9s:0.63,T8s,T7s,T6s:0.99,T5s:0.17,T4s:0.22,T3s:0.01,T2s:0.15,98s:0.91,97s,96s,95s,87s:0.93,86s,85s,76s:0.55,75s,74s,65s:0.84,64s,63s,54s:0.82,53s,52s,43s,42s,32s,AJo:0.96,ATo,A9o,A8o,A7o:0.46,A6o:0.24,A5o:0.84,A4o:0.54,KQo,KJo,KTo:0.83,K9o:0.49,K8o:0.48,K7o:0.22,QJo,QTo:0.71,Q9o:0.25,JTo:0.89,J9o:0.63,J8o:0.28,T9o:0.83,T8o:0.62,98o:0.98,87o:0.75,76o:0.55,65o:0.31,54o:0.23',
    } },
  { action: '3BP', oop: 'SB', ip: 'BU', line: 'BU opens, SB 3-bets, BU calls', pot: 23, stack: 89,
    ranges: {
      oop: 'AA,KK,QQ,JJ,TT:0.99,99:0.95,88:0.95,77:0.94,66:0.92,55:0.28,AKs,AQs,AJs,ATs:0.88,A9s:0.88,A8s:0.95,A7s:0.98,A6s:0.11,A5s:0.98,A4s:0.96,A3s:0.6,KQs,KJs:0.93,KTs:0.95,K9s:0.96,QJs:0.94,QTs:0.96,JTs:0.96,J9s:0.66,T9s:0.65,AKo,AQo:0.98,AJo:0.98,ATo:0.99,KQo:0.98,KJo,KTo:0.39,QJo:0.11',
      ip: 'TT:0.25,99,88,77,66:0.83,55:0.61,44:0.77,33:0.33,AQs,AJs,ATs,A9s:0.76,A5s,A4s:0.11,KQs,KJs,KTs:0.76,QJs:0.82,QTs:0.69,JTs:0.82,T9s:0.83,98s:0.55,87s:0.16,76s:0.05,65s:0.52,AQo:0.87,AJo:0.4,KQo:0.33',
    } },
  { action: '3BP', oop: 'BB', ip: 'BU', line: 'BU opens, BB 3-bets, BU calls', pot: 24.5, stack: 88,
    ranges: {
      oop: 'AA,KK,QQ,JJ,TT,99:0.72,88:0.26,77:0.34,66:0.09,55:0.19,AKs,AQs,AJs:0.92,A5s:0.29,KQs,K7s:0.09,K6s:0.35,K5s:0.03,K3s:0.66,K2s:0.18,QJs:0.23,QTs:0.32,Q8s:0.25,Q6s:0.12,Q5s:0.01,Q3s:0.17,JTs:0.8,J9s,J8s:0.33,J7s:0.99,J6s:0.21,J5s:0.33,T9s:0.61,T8s:0.13,T7s:0.48,T6s:0.75,96s:0.17,76s:0.18,65s:0.06,54s:0.06,AKo,AQo,AJo:0.28,ATo:0.28,A8o:0.17,A7o:0.39,A5o:0.57,A4o:0.67,KQo:0.24,KJo:0.72,KTo:0.71,K9o:0.48,QJo:0.31,QTo:0.19,JTo:0.23,J9o:0.25,T9o:0.31',
      ip: 'AA:0.02,TT:0.64,99,88,77,66,55,44:0.7,33:0.39,AQs,AJs,ATs,A9s,A8s:0.73,A7s:0.23,A5s,A4s,A3s:0.1,KQs,KJs,KTs,K9s:0.96,QJs,QTs,JTs,J9s:0.73,T9s,98s:0.01,87s:0.31,76s:0.4,65s:0.02,AQo:0.84,AJo:0.45,KQo:0.36,KJo:0.17',
    } },
  { action: '3BP', oop: 'CO', ip: 'BU', line: 'CO opens, BU 3-bets, CO calls', pot: 16.5, stack: 92.5,
    ranges: {
      oop: 'JJ:0.4,TT:0.51,99:0.89,88:0.72,77:0.87,66,55,44,33,AQs,AJs,ATs:0.19,A9s:0.86,A8s:0.94,A7s:0.26,A5s:0.26,A4s:0.55,KQs:0.49,KJs:0.02,KTs:0.44,K9s:0.75,QJs:0.74,QTs:0.97,JTs:0.62,J9s:0.81,T9s:0.93,T8s:0.44,98s:0.16,87s:0.78,76s:0.55,65s:0.66,54s:0.43,AKo:0.13,AQo:0.18,AJo:0.16,KQo:0.44',
      ip: 'AA,KK,QQ,JJ:0.8,TT:0.56,99:0.61,88:0.57,77:0.46,66:0.71,55:0.41,AKs,AQs,AJs:0.44,ATs:0.14,A9s:0.56,A8s:0.8,A7s:0.72,A6s:0.92,A5s:0.75,A4s:0.62,A3s:0.66,A2s:0.06,KQs:0.62,KJs:0.91,KTs:0.48,K9s:0.61,K8s:0.31,K7s:0.1,QJs:0.55,QTs:0.57,Q9s:0.83,JTs:0.63,J9s:0.8,T9s:0.71,T8s:0.01,98s:0.03,76s:0.33,65s:0.03,54s:0.11,AKo,AQo:0.61,AJo:0.74,ATo:0.61,KQo:0.71,KJo:0.27,QJo:0.22',
    } },
  { action: '4BP', oop: 'BB', ip: 'BU', line: 'BU opens, BB 3-bets, BU 4-bets, BB calls', pot: 54.5, stack: 73,
    ranges: {
      oop: '99:0.06,88:0.52,AQs:0.14,AJs:0.35,KQs:0.22,JTs:0.85,T9s:0.69,76s:0.27,65s:0.45,AQo',
      ip: 'AA,KK,QQ,JJ,TT:0.17,AKs,A6s:0.45,A3s:0.08,A2s:0.91,K2s:0.19,AKo,AQo:0.17,AJo:0.36,ATo:0.02,A8o:0.35,A7o:0.23,A5o:0.19,A3o:0.29,KQo:0.83,KJo:0.03',
    } },
  { action: '4BP', oop: 'CO', ip: 'BU', line: 'CO opens, BU 3-bets, CO 4-bets, BU calls', pot: 41.5, stack: 80,
    ranges: {
      oop: 'AA,KK,QQ,JJ:0.86,TT:0.5,99:0.24,88:0.28,77:0.12,66:0.18,AKs,ATs:0.86,A9s:0.18,A8s:0.08,A7s:0.18,A5s:0.97,A4s:0.14,KJs,KTs:0.51,K9s:0.48,QJs:0.43,QTs:0.24,JTs:0.26,AKo:0.93,AQo:0.86,AJo:0.18,KQo:0.19',
      ip: 'AA,KK:0.02,QQ:0.01,JJ:0.48,TT:0.65,99:0.58,88:0.56,77:0.46,66:0.49,55:0.12,AQs,AJs:0.41,ATs:0.18,A5s:0.78,A4s:0.48,KQs:0.66,KJs:0.92,KTs:0.57,QJs:0.28,JTs:0.37,T9s:0.35,76s:0.11,65s:0.13,54s:0.11,AQo:0.54',
    } },
  { action: '4BP', oop: 'SB', ip: 'BU', line: 'BU opens, SB 3-bets, BU 4-bets, SB calls', pot: 51, stack: 75,
    ranges: {
      oop: 'AA:0.33,TT:0.4,99:0.94,88:0.98,77:0.68,66:0.74,55:0.44,AQs,AJs,ATs:0.96,A9s:0.24,A5s:0.01,A4s:0.13,KQs,KJs:0.85,QJs:0.99,QTs:0.96,T9s:0.12,AQo:0.98',
      ip: 'AA,KK,QQ,JJ:0.96,TT:0.22,88:0.05,77:0.02,55:0.13,44:0.22,AKs:0.67,A8s:0.72,A7s:0.53,A6s:0.04,A5s:0.03,A4s:0.4,A3s:0.09,KTs:0.07,K9s:0.65,QJs:0.25,J9s:0.07,T8s:0.17,AKo:0.96,AJo:0.37,ATo:0.44,KQo:0.36,KJo:0.22',
    } },
  { action: 'Squeeze', oop: 'BB', ip: 'BU', line: 'BB squeezes, BU calls', pot: 28.5, stack: 87,
    ranges: {
      oop: 'AA,KK,QQ,JJ,TT,99,88:0.35,AKs,AQs,AJs:0.69,A9s:0.01,A5s:0.14,A4s:0.17,A3s:0.01,A2s:0.64,KQs,KJs,KTs:0.53,K9s:0.34,K8s:0.06,K5s:0.26,K3s:0.6,K2s:0.04,QJs:0.4,QTs:0.2,Q9s,Q8s:0.99,Q7s:0.72,Q6s:0.79,Q5s:0.44,Q4s:0.02,JTs:0.36,J9s:0.64,J8s:0.16,J7s:0.15,T9s:0.45,T8s:0.01,98s:0.52,97s:0.23,96s:0.17,76s:0.29,75s:0.1,65s:0.15,AKo,AQo,AJo:0.68,ATo:0.49,A9o:0.77,A5o:0.53,KQo:0.62,KJo:0.17,KTo:0.02,K9o:0.06,QJo:0.38,QTo:0.25,Q9o:0.43,J9o:0.07,T9o:0.69,98o:0.01',
      ip: 'AA:0.68,TT:0.68,99,88:0.49,77:0.94,66:0.56,55:0.43,44:0.43,33:0.09,AQs:0.14,AJs,ATs,A9s:0.17,A8s:0.29,A5s:0.92,A4s:0.51,KQs,KJs,KTs:0.99,K9s:0.42,QJs:0.99,QTs:0.98,JTs:0.96,65s:0.02,AQo:0.7,AJo:0.17,KQo:0.33',
    } },
  { action: 'Squeeze', oop: 'BB', ip: 'CO', line: 'BB squeezes, CO calls', pot: 29, stack: 87,
    ranges: {
      oop: 'AA,KK,QQ,JJ,TT,99:0.18,88:0.18,77:0.3,66:0.16,AKs,AQs,AJs,ATs:0.64,A5s:0.56,A4s:0.72,A3s:0.16,KQs,KJs,KTs,K9s:0.13,K6s:0.18,QJs,QTs:0.93,JTs,J9s:0.71,T9s:0.28,T8s:0.3,76s:0.09,65s:0.15,AKo,AQo,AJo:0.34,KQo:0.61,KJo:0.51,KTo:0.02',
      ip: 'AA:0.07,JJ:0.04,TT:0.47,99:0.24,88:0.18,77:0.03,66:0.16,55:0.05,AQs,AJs:0.58,KQs:0.48,KJs:0.26',
    } },
  { action: 'Squeeze', oop: 'SB', ip: 'CO', line: 'SB squeezes, CO calls', pot: 29.5, stack: 87,
    ranges: {
      oop: 'AA,KK,QQ,JJ,TT,99:0.65,88:0.31,77:0.42,66:0.36,AKs,AQs,AJs:0.9,ATs:0.71,A5s:0.45,A4s:0.63,KQs:0.98,KJs,KTs:0.99,QJs:0.99,QTs:0.83,JTs,T9s:0.01,AKo,AQo,AJo:0.4,KQo:0.91,KJo:0.3',
      ip: 'AA:0.07,JJ:0.06,TT:0.26,99:0.26,88:0.15,77:0.04,66:0.09,55:0.04,AQs,AJs:0.17,KQs:0.34,KJs:0.3,JTs:0.02,65s:0.1',
    } },
  { action: 'Limped', oop: 'BB', ip: 'BU', line: 'BU limps, BB checks', pot: 2.5, stack: 99,
    ranges: {
      oop: '99:0.28,88:0.74,77:0.66,66:0.91,55:0.81,44,33,22,AJs:0.08,ATs,A9s,A8s,A7s,A6s,A5s:0.71,A4s,A3s,A2s,KJs,KTs,K9s,K8s,K7s:0.91,K6s:0.65,K5s:0.97,K4s,K3s:0.34,K2s:0.82,QJs:0.77,QTs:0.68,Q9s,Q8s:0.75,Q7s,Q6s:0.88,Q5s:0.99,Q4s,Q3s:0.83,Q2s,JTs:0.2,J8s:0.67,J7s:0.01,J6s:0.79,J5s:0.67,J4s,J3s,J2s,T9s:0.39,T8s:0.87,T7s:0.52,T6s:0.25,T5s,T4s,T3s,T2s,98s,97s,96s:0.83,95s,94s,93s,92s,87s,86s,85s,84s,83s,82s,76s:0.82,75s,74s,73s,72s,65s:0.94,64s,63s,62s,54s:0.94,53s,52s,43s,42s,32s,AJo:0.72,ATo:0.72,A9o,A8o:0.83,A7o:0.61,A6o,A5o:0.43,A4o:0.33,A3o,A2o,KQo:0.76,KJo:0.28,KTo:0.29,K9o:0.52,K8o,K7o,K6o,K5o,K4o,K3o,K2o,QJo:0.69,QTo:0.81,Q9o,Q8o,Q7o,Q6o,Q5o,Q4o,Q3o,Q2o,JTo:0.77,J9o:0.75,J8o,J7o,J6o,J5o,J4o,J3o,J2o,T9o:0.69,T8o,T7o,T6o,T5o,T4o,T3o,T2o,98o,97o,96o,95o,94o,93o,92o,87o,86o,85o,84o,83o,82o,76o,75o,74o,73o,72o,65o,64o,63o,62o,54o,53o,52o,43o,42o,32o',
      ip: 'JJ:0.16,TT:0.43,99:0.51,88:0.53,77:0.64,66:0.28,55:0.33,44:0.12,33:0.06,AJs:0.72,ATs,A9s:0.42,A8s:0.23,A7s:0.05,A5s:0.27,A4s:0.39,A3s:0.03,KQs:0.42,KJs:0.1,KTs:0.52,K9s:0.28,QJs:0.51,QTs:0.39,JTs:0.54,T9s:0.2,98s:0.04,76s:0.04,65s:0.17,54s:0.16,AQo:0.41,AJo:0.14,KQo:0.19,KJo:0.11',
    } },
  { action: 'Limped', oop: 'SB', ip: 'BB', line: 'SB limps, BB checks', pot: 2, stack: 99,
    ranges: {
      oop: 'TT:0.11,99:0.4,88:0.4,77:0.51,66:0.66,55:0.51,44:0.15,AJs:0.01,ATs,A9s:0.99,A8s:0.46,A7s:0.18,A6s:0.01,A5s:0.18,A4s:0.31,A3s:0.02,KJs:0.57,KTs:0.46,K9s:0.3,QJs:0.48,QTs:0.3,Q9s:0.09,JTs:0.34,J9s:0.1,T9s:0.3,98s:0.01,87s:0.02,76s:0.03,54s:0.01,AQo:0.18,AJo:0.17,KQo:0.19,QJo:0.01',
      ip: '88:0.61,77:0.68,66:0.94,55:0.81,44,33,22,ATs,A9s,A8s,A7s,A6s,A5s:0.65,A4s,A3s,A2s,KTs:0.92,K9s,K8s,K7s,K6s,K5s:0.98,K4s,K3s,K2s,QJs:0.96,QTs,Q9s,Q8s,Q7s,Q6s,Q5s,Q4s,Q3s,Q2s,JTs:0.57,J9s,J8s,J7s,J6s:0.82,J5s:0.59,J4s:0.78,J3s:0.28,J2s:0.47,T9s:0.63,T8s,T7s,T6s:0.99,T5s:0.17,T4s:0.22,T3s:0.01,T2s:0.15,98s:0.91,97s,96s,95s,94s,93s,92s,87s:0.93,86s,85s,84s,83s,82s,76s:0.55,75s,74s,73s,72s,65s:0.84,64s,63s,62s,54s:0.82,53s,52s,43s,42s,32s,AJo:0.96,ATo,A9o,A8o,A7o:0.46,A6o:0.24,A5o:0.84,A4o:0.54,KQo,KJo,KTo:0.83,K9o:0.49,K8o:0.48,K7o:0.22,K6o:0.5,K5o:0.89,K4o,K3o,K2o,QJo,QTo:0.71,Q9o:0.25,Q8o:0.25,Q7o,Q6o,Q5o,Q4o,Q3o,Q2o,JTo:0.89,J9o:0.63,J8o:0.28,J7o,J6o,J5o,J4o,J3o,J2o,T9o:0.83,T8o:0.62,T7o:0.99,T6o,T5o,T4o,T3o,T2o,98o:0.98,97o,96o,95o,94o,93o,92o,87o,86o,85o,84o,83o,82o,76o,75o,74o,73o,72o,65o,64o,63o,62o,54o,53o,52o,43o,42o,32o',
    } },
];
/** The preset for a choice of action and seats, if there is one. */
export const presetFor = (sel) => PRESETS.find((p) => p.action === sel?.action && p.oop === sel?.oop && p.ip === sel?.ip) ?? null;
/** The preset whose two ranges these are, if they are one's. */
export const presetOf = (oop, ip) => PRESETS.find((p) => p.ranges.oop === oop && p.ranges.ip === ip) ?? null;
/**
 * A choice after one of its three parts changes: the action and seats asked for where a preset has
 * them, else the nearest that exists (the same action, and the seat just chosen kept).
 */
export function choose(sel, part, value) {
  const want = { ...(sel ?? {}), [part]: value };
  const same = PRESETS.filter((p) => p.action === (want.action ?? PRESETS[0].action));
  const found = same.find((p) => p.oop === want.oop && p.ip === want.ip)
    ?? (part !== 'action' ? same.find((p) => p[part] === value) : null)
    ?? same.find((p) => p.oop === want.oop || p.ip === want.ip) ?? same[0];
  return { action: found.action, oop: found.oop, ip: found.ip };
}
