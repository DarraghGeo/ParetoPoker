// Preflop ranges by position and by preflop action, 6-max, 100 big blinds: the two ranges that reach the flop, each hand
// with how much of it is held (1 unless written after a colon), and the pot and the stack behind in big blinds.
// Single-raised, 3-bet and 4-bet pots are every pairing the owner's 100NL chart covers (poker-huerosolver: each call
// with the open, 3-bet or 4-bet it answers); squeezed and limped pots are the starting ranges of napkinpoker's solves.
/** The preflop actions, in the order they are offered: its key, and its name on a button. */
export const ACTIONS = [['SRP', 'SRP'], ['3BP', '3-bet'], ['4BP', '4-bet'], ['Squeeze', 'Squeeze'], ['Limped', 'Limp']];
/** Seats in the order they act before the flop. */
export const SEATS = ['UTG', 'HJ', 'CO', 'BU', 'SB', 'BB'];
export const PRESETS = [
  { action: 'SRP', oop: 'BB', ip: 'UTG', line: 'UTG opens to 2.5bb, BB calls', pot: 5.5, stack: 97.5,
    ranges: {
      oop: 'JJ:0.95,TT:0.87,99:0.99,88:0.96,77:0.99,66:0.99,55,44,33,22,AQs:0.94,AJs,ATs,A9s:0.72,A8s:0.63,A7s:0.81,A6s:0.49,A4s:0.7,A3s:0.81,A2s:0.73,KJs:0.7,KTs:0.69,K9s:0.28,K8s:0.78,K7s:0.64,K6s:0.36,K5s:0.54,K4s:0.19,QJs:0.72,QTs,Q9s:0.69,Q8s:0.25,JTs,J9s,J8s:0.47,T9s:0.94,T8s:0.93,T7s:0.77,98s,97s,96s:0.49,87s:0.81,86s,85s:0.09,76s:0.84,75s,65s:0.94,64s,54s:0.86,53s:0.87,43s:0.86,AKo:0.07,AQo:0.73,AJo:0.89,ATo:0.13,KQo:0.78,KJo:0.5,QJo:0.14',
      ip: 'AA,KK,QQ,JJ,TT,99,88,77,66:0.36,55:0.44,44:0.07,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s:0.48,K6s:0.32,K5s:0.68,QJs,QTs,Q9s,JTs,T9s:0.57,87s:0.05,76s:0.07,65s:0.39,54s:0.24,AKo,AQo,AJo,ATo,KQo,KJo,KTo:0.57,QJo:0.41',
    } },
  { action: 'SRP', oop: 'BB', ip: 'HJ', line: 'HJ opens to 2.5bb, BB calls', pot: 5.5, stack: 97.5,
    ranges: {
      oop: 'JJ:0.34,TT:0.84,99:0.98,88:0.97,77:0.94,66:0.97,55,44,33,22,AQs:0.97,AJs,ATs,A9s,A8s:0.61,A7s:0.61,A6s:0.53,A5s:0.19,A4s:0.44,A3s:0.67,A2s:0.76,KQs:0.07,KJs:0.82,KTs:0.99,K9s:0.5,K8s:0.93,K7s:0.82,K6s:0.39,K5s:0.25,K4s:0.99,K3s:0.72,QTs:0.77,Q9s:0.59,Q8s:0.36,Q7s:0.22,JTs:0.87,J9s:0.82,J8s,T9s:0.98,T8s:0.81,T7s:0.93,98s,97s,96s:0.94,87s:0.87,86s,85s:0.59,76s:0.93,75s,65s,64s,54s:0.63,53s:0.99,43s,AQo:0.63,AJo:0.69,ATo:0.79,KQo:0.68,KJo:0.64,KTo:0.15,QJo:0.85,JTo:0.16',
      ip: 'AA,KK,QQ,JJ,TT,99,88,77,66,55:0.69,44:0.31,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s,K6s,K5s,K4s:0.39,QJs,QTs,Q9s,Q8s,JTs,J9s,T9s,87s:0.15,76s:0.13,65s:0.45,54s:0.25,AKo,AQo,AJo,ATo,A9o:0.58,A8o:0.01,A5o:0.32,KQo,KJo,KTo,QJo,QTo:0.56,JTo:0.1',
    } },
  { action: 'SRP', oop: 'BB', ip: 'CO', line: 'CO opens to 2.5bb, BB calls', pot: 5.5, stack: 97.5,
    ranges: {
      oop: 'TT:0.47,99:0.9,88:0.9,77:0.88,66:0.94,55:0.96,44,33,22,AQs:0.74,AJs,ATs,A9s,A8s,A7s:0.83,A6s:0.52,A5s:0.85,A4s:0.41,A3s:0.92,A2s:0.44,KQs:0.88,KJs:0.97,KTs,K9s,K8s,K7s:0.82,K6s:0.52,K5s,K4s:0.57,K3s:0.7,K2s:0.73,QJs:0.57,QTs:0.18,Q9s:0.99,Q8s:0.63,Q7s:0.89,Q6s:0.85,Q4s:0.92,JTs:0.04,J9s:0.62,J8s:0.83,J7s:0.4,T9s,T8s:0.98,T7s:0.76,98s,97s,96s,87s,86s,85s,76s:0.96,75s,74s:0.58,65s:0.99,64s,63s:0.29,54s,53s,52s:0.02,43s:0.83,42s:0.28,AQo:0.5,AJo:0.81,ATo:0.9,A9o:0.74,KQo:0.48,KJo:0.4,KTo:0.68,QJo:0.62,QTo:0.92,JTo:0.98',
      ip: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33:0.3,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s,K6s,K5s,K4s,K3s,QJs,QTs,Q9s,Q8s,Q7s,Q6s:0.7,JTs,J9s,J8s,J7s:0.73,T9s,T8s,98s,97s:0.18,87s:0.17,76s:0.36,65s:0.47,54s:0.27,AKo,AQo,AJo,ATo,A9o,A8o,A7o:0.54,A5o,KQo,KJo,KTo,K9o:0.37,QJo,QTo,JTo',
    } },
  { action: 'SRP', oop: 'BB', ip: 'BU', line: 'BU opens to 2.5bb, BB calls', pot: 5.5, stack: 97.5,
    ranges: {
      oop: '99:0.28,88:0.74,77:0.66,66:0.91,55:0.81,44,33,22,AJs:0.08,ATs,A9s,A8s,A7s,A6s,A5s:0.71,A4s,A3s,A2s,KJs,KTs,K9s,K8s,K7s:0.91,K6s:0.65,K5s:0.97,K4s,K3s:0.34,K2s:0.82,QJs:0.77,QTs:0.68,Q9s,Q8s:0.75,Q7s,Q6s:0.88,Q5s:0.99,Q4s,Q3s:0.83,Q2s,JTs:0.2,J8s:0.67,J7s:0.01,J6s:0.79,J5s:0.67,J4s:0.55,T9s:0.39,T8s:0.87,T7s:0.52,T6s:0.25,98s,97s,96s:0.83,87s,86s,85s,76s:0.82,75s,74s,65s:0.94,64s,63s:0.99,54s:0.94,53s,52s:0.68,43s,42s:0.25,AJo:0.72,ATo:0.72,A9o,A8o:0.83,A7o:0.61,A5o:0.43,A4o:0.1,KQo:0.76,KJo:0.28,KTo:0.29,K9o:0.52,QJo:0.69,QTo:0.81,Q9o:0.2,JTo:0.77,J9o:0.73,T9o:0.69,98o:0.1',
      ip: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,22:0.85,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s,K6s,K5s,K4s,K3s,K2s,QJs,QTs,Q9s,Q8s,Q7s,Q6s,Q5s,Q4s,Q3s:0.96,JTs,J9s,J8s,J7s,J6s,J5s,J4s:0.39,T9s,T8s,T7s,T6s,98s,97s,96s:0.72,87s,86s,76s,75s:0.93,65s,54s:0.9,AKo,AQo,AJo,ATo,A9o,A8o,A7o,A6o,A5o,A4o,A3o,KQo,KJo,KTo,K9o,K8o:0.89,K7o:0.43,QJo,QTo,Q9o,JTo,J9o,J8o:0.12,T9o,T8o:0.49',
    } },
  { action: 'SRP', oop: 'SB', ip: 'BB', line: 'SB opens to 3bb, BB calls', pot: 6, stack: 97,
    ranges: {
      oop: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,22,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s,K6s,K5s,K4s,K3s,K2s,QJs,QTs,Q9s,Q8s,Q7s,Q6s,Q5s,Q4s,Q3s,Q2s,JTs,J9s,J8s,J7s,J6s,J5s,T9s,T8s,T7s,T6s,98s,97s,96s,87s,86s,85s,76s,75s,65s,64s,54s,53s:0.67,AKo,AQo,AJo,ATo,A9o,A8o,A7o,A6o,A5o,A4o,A3o:0.68,KQo,KJo,KTo,K9o,K8o:0.74,QJo,QTo,Q9o,JTo,J9o,T9o,T8o:0.48,98o:0.72',
      ip: '88:0.61,77:0.68,66:0.94,55:0.81,44,33,22,ATs,A9s,A8s,A7s,A6s,A5s:0.65,A4s,A3s,A2s,KTs:0.92,K9s,K8s,K7s,K6s,K5s:0.98,K4s,K3s,K2s,QJs:0.96,QTs,Q9s,Q8s,Q7s,Q6s,Q5s,Q4s,Q3s,Q2s,JTs:0.57,J9s,J8s,J7s,J6s:0.82,J5s:0.59,J4s:0.78,J3s:0.28,J2s:0.47,T9s:0.63,T8s,T7s,T6s:0.99,T5s:0.17,T4s:0.22,T3s:0.01,T2s:0.15,98s:0.91,97s,96s,95s,87s:0.93,86s,85s,76s:0.55,75s,74s,65s:0.84,64s,63s,54s:0.82,53s,52s,43s,42s,32s,AJo:0.96,ATo,A9o,A8o,A7o:0.46,A6o:0.24,A5o:0.84,A4o:0.54,KQo,KJo,KTo:0.83,K9o:0.49,K8o:0.48,K7o:0.22,QJo,QTo:0.71,Q9o:0.25,JTo:0.89,J9o:0.63,J8o:0.28,T9o:0.83,T8o:0.62,98o:0.98,87o:0.75,76o:0.55,65o:0.31,54o:0.23',
    } },
  { action: 'SRP', oop: 'SB', ip: 'UTG', line: 'UTG opens to 2.5bb, SB calls', pot: 6, stack: 97.5,
    ranges: {
      oop: 'QQ:0.02,JJ:0.17,TT:0.28,99:0.22,88:0.24,77:0.15,66:0.05,55:0.09,44:0.04,AQs:0.3,AJs:0.48,ATs:0.23,A5s:0.02,A4s:0.1,KJs:0.09,KTs:0.11,QJs:0.07,QTs:0.03,JTs:0.11,T9s:0.01,87s:0.01,76s:0.02,65s:0.08,54s:0.08,AKo:0.01,AQo:0.09,KQo:0.06',
      ip: 'AA,KK,QQ,JJ,TT,99,88,77,66:0.36,55:0.44,44:0.07,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s:0.48,K6s:0.32,K5s:0.68,QJs,QTs,Q9s,JTs,T9s:0.57,87s:0.05,76s:0.07,65s:0.39,54s:0.24,AKo,AQo,AJo,ATo,KQo,KJo,KTo:0.57,QJo:0.41',
    } },
  { action: 'SRP', oop: 'SB', ip: 'HJ', line: 'HJ opens to 2.5bb, SB calls', pot: 6, stack: 97.5,
    ranges: {
      oop: 'JJ:0.14,TT:0.28,99:0.4,88:0.35,77:0.27,66:0.1,55:0.16,44:0.02,AQs:0.42,AJs:0.55,ATs:0.38,A9s:0.1,A8s:0.03,A5s:0.09,A4s:0.11,A3s:0.03,KQs:0.29,KJs:0.13,KTs:0.2,QJs:0.07,QTs:0.13,JTs:0.2,T9s:0.01,98s:0.01,76s:0.05,65s:0.09,54s:0.09,AQo:0.06,KQo:0.04',
      ip: 'AA,KK,QQ,JJ,TT,99,88,77,66,55:0.69,44:0.31,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s,K6s,K5s,K4s:0.39,QJs,QTs,Q9s,Q8s,JTs,J9s,T9s,87s:0.15,76s:0.13,65s:0.45,54s:0.25,AKo,AQo,AJo,ATo,A9o:0.58,A8o:0.01,A5o:0.32,KQo,KJo,KTo,QJo,QTo:0.56,JTo:0.1',
    } },
  { action: 'SRP', oop: 'SB', ip: 'BU', line: 'BU opens to 2.5bb, SB calls', pot: 6, stack: 97.5,
    ranges: {
      oop: 'TT:0.01,99:0.05,88:0.05,77:0.06,66:0.08,55:0.06,44:0.02,ATs:0.12,A9s:0.12,A8s:0.05,A7s:0.02,A5s:0.02,A4s:0.04,KJs:0.07,KTs:0.05,K9s:0.04,QJs:0.06,QTs:0.04,Q9s:0.01,JTs:0.04,J9s:0.01,T9s:0.04,AQo:0.02,AJo:0.02,KQo:0.02',
      ip: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,22:0.85,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s,K6s,K5s,K4s,K3s,K2s,QJs,QTs,Q9s,Q8s,Q7s,Q6s,Q5s,Q4s,Q3s:0.96,JTs,J9s,J8s,J7s,J6s,J5s,J4s:0.39,T9s,T8s,T7s,T6s,98s,97s,96s:0.72,87s,86s,76s,75s:0.93,65s,54s:0.9,AKo,AQo,AJo,ATo,A9o,A8o,A7o,A6o,A5o,A4o,A3o,KQo,KJo,KTo,K9o,K8o:0.89,K7o:0.43,QJo,QTo,Q9o,JTo,J9o,J8o:0.12,T9o,T8o:0.49',
    } },
  { action: 'SRP', oop: 'UTG', ip: 'BU', line: 'UTG opens to 2.5bb, BU calls', pot: 6.5, stack: 97.5,
    ranges: {
      oop: 'AA,KK,QQ,JJ,TT,99,88,77,66:0.36,55:0.44,44:0.07,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s:0.48,K6s:0.32,K5s:0.68,QJs,QTs,Q9s,JTs,T9s:0.57,87s:0.05,76s:0.07,65s:0.39,54s:0.24,AKo,AQo,AJo,ATo,KQo,KJo,KTo:0.57,QJo:0.41',
      ip: 'QQ:0.2,JJ:0.5,TT:0.38,99:0.53,88:0.55,77:0.59,66:0.18,55:0.19,44:0.11,33:0.06,22:0.02,AQs:0.26,AJs:0.71,ATs:0.56,A9s:0.34,A8s:0.11,A7s:0.01,A5s:0.32,A4s:0.28,A3s:0.07,KQs:0.6,KJs:0.56,KTs:0.31,QJs:0.09,QTs:0.31,JTs:0.52,T9s:0.17,98s:0.07,87s:0.02,76s:0.1,65s:0.22,54s:0.31,AKo:0.1,AQo:0.49,KQo:0.06',
    } },
  { action: 'SRP', oop: 'HJ', ip: 'BU', line: 'HJ opens to 2.5bb, BU calls', pot: 6.5, stack: 97.5,
    ranges: {
      oop: 'AA,KK,QQ,JJ,TT,99,88,77,66,55:0.69,44:0.31,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s,K6s,K5s,K4s:0.39,QJs,QTs,Q9s,Q8s,JTs,J9s,T9s,87s:0.15,76s:0.13,65s:0.45,54s:0.25,AKo,AQo,AJo,ATo,A9o:0.58,A8o:0.01,A5o:0.32,KQo,KJo,KTo,QJo,QTo:0.56,JTo:0.1',
      ip: 'QQ:0.03,JJ:0.45,TT:0.44,99:0.56,88:0.5,77:0.56,66:0.26,55:0.19,44:0.15,33:0.08,AJs:0.77,ATs:0.8,A9s:0.2,A8s:0.14,A7s:0.06,A5s:0.4,A4s:0.28,A3s:0.02,KQs:0.64,KJs:0.23,KTs:0.55,K9s:0.19,QJs:0.21,QTs:0.11,JTs:0.53,T9s:0.18,98s:0.05,87s:0.03,76s:0.07,65s:0.19,54s:0.21,AQo:0.49,AJo:0.06,KQo:0.17',
    } },
  { action: 'SRP', oop: 'CO', ip: 'BU', line: 'CO opens to 2.5bb, BU calls', pot: 6.5, stack: 97.5,
    ranges: {
      oop: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33:0.3,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s,K6s,K5s,K4s,K3s,QJs,QTs,Q9s,Q8s,Q7s,Q6s:0.7,JTs,J9s,J8s,J7s:0.73,T9s,T8s,98s,97s:0.18,87s:0.17,76s:0.36,65s:0.47,54s:0.27,AKo,AQo,AJo,ATo,A9o,A8o,A7o:0.54,A5o,KQo,KJo,KTo,K9o:0.37,QJo,QTo,JTo',
      ip: 'JJ:0.13,TT:0.35,99:0.42,88:0.44,77:0.53,66:0.23,55:0.27,44:0.1,33:0.05,AJs:0.59,ATs:0.82,A9s:0.35,A8s:0.19,A7s:0.04,A5s:0.22,A4s:0.32,A3s:0.02,KQs:0.34,KJs:0.08,KTs:0.43,K9s:0.23,QJs:0.42,QTs:0.32,JTs:0.45,T9s:0.17,98s:0.03,76s:0.03,65s:0.14,54s:0.13,AQo:0.34,AJo:0.12,KQo:0.16,KJo:0.09',
    } },
  { action: 'SRP', oop: 'UTG', ip: 'CO', line: 'UTG opens to 2.5bb, CO calls', pot: 6.5, stack: 97.5,
    ranges: {
      oop: 'AA,KK,QQ,JJ,TT,99,88,77,66:0.36,55:0.44,44:0.07,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s:0.48,K6s:0.32,K5s:0.68,QJs,QTs,Q9s,JTs,T9s:0.57,87s:0.05,76s:0.07,65s:0.39,54s:0.24,AKo,AQo,AJo,ATo,KQo,KJo,KTo:0.57,QJo:0.41',
      ip: 'QQ:0.14,JJ:0.3,TT:0.23,99:0.36,88:0.25,77:0.14,66:0.06,55:0.06,44:0.03,33:0.01,AQs:0.26,AJs:0.45,ATs:0.34,A9s:0.03,A5s:0.15,A4s:0.11,KQs:0.39,KJs:0.19,KTs:0.12,QJs:0.08,QTs:0.07,JTs:0.16,T9s:0.05,76s:0.02,65s:0.07,54s:0.11,AKo:0.06,AQo:0.17',
    } },
  { action: 'SRP', oop: 'HJ', ip: 'CO', line: 'HJ opens to 2.5bb, CO calls', pot: 6.5, stack: 97.5,
    ranges: {
      oop: 'AA,KK,QQ,JJ,TT,99,88,77,66,55:0.69,44:0.31,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s,K6s,K5s,K4s:0.39,QJs,QTs,Q9s,Q8s,JTs,J9s,T9s,87s:0.15,76s:0.13,65s:0.45,54s:0.25,AKo,AQo,AJo,ATo,A9o:0.58,A8o:0.01,A5o:0.32,KQo,KJo,KTo,QJo,QTo:0.56,JTo:0.1',
      ip: 'QQ:0.08,JJ:0.33,TT:0.31,99:0.36,88:0.28,77:0.19,66:0.08,55:0.06,44:0.05,33:0.01,AQs:0.14,AJs:0.61,ATs:0.48,A9s:0.06,A8s:0.04,A5s:0.18,A4s:0.11,KQs:0.53,KJs:0.16,KTs:0.26,QJs:0.07,QTs:0.1,JTs:0.18,65s:0.04,54s:0.07,AKo:0.01,AQo:0.18',
    } },
  { action: 'SRP', oop: 'UTG', ip: 'HJ', line: 'UTG opens to 2.5bb, HJ calls', pot: 6.5, stack: 97.5,
    ranges: {
      oop: 'AA,KK,QQ,JJ,TT,99,88,77,66:0.36,55:0.44,44:0.07,AKs,AQs,AJs,ATs,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQs,KJs,KTs,K9s,K8s,K7s:0.48,K6s:0.32,K5s:0.68,QJs,QTs,Q9s,JTs,T9s:0.57,87s:0.05,76s:0.07,65s:0.39,54s:0.24,AKo,AQo,AJo,ATo,KQo,KJo,KTo:0.57,QJo:0.41',
      ip: 'QQ:0.1,JJ:0.13,TT:0.14,99:0.11,88:0.08,77:0.05,66:0.02,55:0.02,44:0.02,AQs:0.14,AJs:0.31,ATs:0.12,A5s:0.06,A4s:0.02,KQs:0.15,KJs:0.07,KTs:0.04,QJs:0.02,QTs:0.05,JTs:0.04,76s:0.01,65s:0.04,54s:0.02,AKo:0.04,AQo:0.04',
    } },
  { action: '3BP', oop: 'BB', ip: 'UTG', line: 'BB 3-bets to 12bb, UTG calls', pot: 24.5, stack: 88,
    ranges: {
      oop: 'AA,KK,QQ,JJ:0.05,TT:0.13,99:0.01,88:0.04,77:0.01,66:0.01,AKs,AQs:0.06,A9s:0.28,A8s:0.37,A7s:0.19,A6s:0.51,A5s,A4s:0.3,A3s:0.19,A2s:0.27,KQs,KJs:0.3,KTs:0.31,K9s:0.72,K8s:0.22,K7s:0.36,K6s:0.64,K5s:0.46,QJs:0.28,Q9s:0.31,T9s:0.06,T8s:0.07,87s:0.19,76s:0.16,65s:0.06,54s:0.14,53s:0.13,43s:0.14,AKo:0.93,AQo:0.27,AJo:0.11,ATo:0.23,KQo:0.22,KJo:0.07',
      ip: 'KK:0.08,QQ,JJ:0.64,TT:0.58,99:0.67,88:0.57,77:0.52,66:0.36,55:0.44,44:0.07,AQs,AJs,ATs:0.88,A5s:0.44,A4s:0.01,KQs:0.9,KJs:0.16,JTs:0.17,T9s:0.15,76s:0.03,65s:0.07,54s:0.16,AKo:0.52',
    } },
  { action: '3BP', oop: 'SB', ip: 'UTG', line: 'SB 3-bets to 11bb, UTG calls', pot: 23, stack: 89,
    ranges: {
      oop: 'AA,KK,QQ:0.98,JJ:0.83,TT:0.72,99:0.5,88:0.12,77:0.22,66:0.05,AKs,AQs:0.7,AJs:0.52,ATs:0.5,A8s:0.05,A6s:0.01,A5s:0.98,A4s:0.9,KQs,KJs:0.91,KTs:0.89,K9s:0.06,K8s:0.01,K6s:0.23,K5s:0.05,QJs:0.58,65s:0.05,54s:0.04,AKo:0.99,AQo:0.91,KQo:0.55',
      ip: 'QQ,JJ,TT:0.67,99:0.46,88:0.31,77:0.25,66:0.23,55:0.37,44:0.07,AQs,AJs:0.95,ATs:0.23,A5s:0.32,KQs:0.52,KJs:0.52,JTs:0.36,T9s:0.15,65s:0.39,54s:0.24,AKo:0.66',
    } },
  { action: '3BP', oop: 'UTG', ip: 'BU', line: 'BU 3-bets to 7.5bb, UTG calls', pot: 16.5, stack: 92.5,
    ranges: {
      oop: 'QQ:0.44,JJ:0.75,TT:0.86,99:0.79,88:0.8,77:0.6,66:0.36,55:0.44,44:0.07,AQs,AJs:0.38,ATs:0.73,A9s:0.01,A8s:0.12,A5s:0.26,A4s:0.4,KQs:0.6,KJs:0.2,KTs:0.38,QJs:0.34,JTs:0.67,T9s:0.33,87s:0.05,76s:0.07,65s:0.39,54s:0.24,AKo:0.44',
      ip: 'AA,KK,QQ:0.8,JJ:0.51,TT:0.62,99:0.47,88:0.45,77:0.26,66:0.26,55:0.05,AKs,AQs:0.74,AJs:0.29,ATs:0.44,A9s:0.61,A8s:0.89,A7s:0.24,A5s:0.68,A4s:0.72,A3s:0.69,KQs:0.4,KJs:0.44,KTs:0.69,K9s:0.31,K5s:0.19,QJs:0.91,QTs:0.69,JTs:0.48,T9s:0.3,76s:0.16,65s:0.33,54s:0.27,AKo:0.9,AQo:0.51,AJo:0.06,KQo:0.48,KJo:0.03',
    } },
  { action: '3BP', oop: 'UTG', ip: 'CO', line: 'CO 3-bets to 7.5bb, UTG calls', pot: 16.5, stack: 92.5,
    ranges: {
      oop: 'QQ:0.46,JJ:0.76,TT:0.86,99:0.64,88:0.62,77:0.55,66:0.36,55:0.44,44:0.07,AQs,AJs:0.36,ATs:0.42,A5s:0.27,A4s:0.26,KQs:0.47,KJs:0.34,KTs:0.29,QJs:0.13,JTs:0.72,T9s:0.33,87s:0.05,76s:0.07,65s:0.39,54s:0.24,AKo:0.44',
      ip: 'AA,KK,QQ:0.86,JJ:0.7,TT:0.77,99:0.64,88:0.43,77:0.18,66:0.26,AKs,AQs:0.74,AJs:0.55,ATs:0.66,A9s:0.18,A8s:0.67,A7s:0.19,A5s:0.85,A4s:0.89,A3s:0.12,KQs:0.61,KJs:0.81,KTs:0.88,K9s:0.13,K5s:0.04,QJs:0.92,QTs:0.35,JTs:0.03,T9s:0.11,76s:0.11,65s:0.38,54s:0.23,AKo:0.94,AQo:0.81,KQo:0.42',
    } },
  { action: '3BP', oop: 'UTG', ip: 'HJ', line: 'HJ 3-bets to 7.5bb, UTG calls', pot: 16.5, stack: 92.5,
    ranges: {
      oop: 'QQ:0.5,JJ:0.8,TT:0.83,99:0.52,88:0.55,77:0.45,66:0.36,55:0.44,44:0.07,AQs:0.94,AJs:0.39,ATs:0.31,A5s:0.17,A4s:0.34,KQs:0.53,KJs:0.32,KTs:0.12,JTs:0.72,T9s:0.24,87s:0.05,76s:0.07,65s:0.39,54s:0.24,AKo:0.44',
      ip: 'AA,KK,QQ:0.9,JJ:0.87,TT:0.86,99:0.46,88:0.27,77:0.19,66:0.17,AKs,AQs:0.86,AJs:0.69,ATs:0.88,A9s:0.21,A8s:0.49,A7s:0.21,A5s:0.94,A4s:0.98,KQs:0.85,KJs:0.93,KTs:0.96,K9s:0.01,K5s:0.07,QJs:0.82,T9s:0.04,76s:0.15,65s:0.46,54s:0.28,AKo:0.96,AQo:0.69,KQo:0.36',
    } },
  { action: '3BP', oop: 'BB', ip: 'HJ', line: 'BB 3-bets to 12bb, HJ calls', pot: 24.5, stack: 88,
    ranges: {
      oop: 'AA,KK,QQ,JJ:0.66,TT:0.16,99:0.02,88:0.03,77:0.06,66:0.03,AKs,AQs:0.03,A8s:0.39,A7s:0.39,A6s:0.47,A5s:0.81,A4s:0.56,A3s:0.33,A2s:0.24,KQs:0.93,KJs:0.18,KTs:0.01,K9s:0.5,K8s:0.07,K7s:0.18,K6s:0.61,K5s:0.75,K4s:0.01,K3s:0.25,K2s:0.04,QJs,QTs:0.23,Q9s:0.41,Q8s:0.64,JTs:0.13,J9s:0.18,T9s:0.02,T8s:0.19,87s:0.13,76s:0.07,54s:0.37,53s:0.01,AKo,AQo:0.37,AJo:0.31,ATo:0.21,KQo:0.32,KJo:0.36,QJo:0.14',
      ip: 'QQ:0.66,JJ,TT:0.7,99:0.82,88:0.74,77:0.4,66:0.51,55:0.58,44:0.31,AQs,AJs,ATs,A9s:0.03,A5s:0.95,KQs,KJs,QJs:0.09,QTs:0.35,JTs:0.05,T9s:0.39,76s:0.05,65s:0.02,AKo:0.55,AQo:0.15',
    } },
  { action: '3BP', oop: 'SB', ip: 'HJ', line: 'SB 3-bets to 11bb, HJ calls', pot: 23, stack: 89,
    ranges: {
      oop: 'AA,KK,QQ,JJ:0.86,TT:0.72,99:0.6,88:0.28,77:0.32,66:0.04,AKs,AQs:0.58,AJs:0.45,ATs:0.62,A9s:0.01,A8s:0.14,A7s:0.1,A6s:0.07,A5s:0.91,A4s:0.89,A3s:0.94,KQs:0.71,KJs:0.87,KTs:0.8,K9s:0.2,K7s:0.06,K5s:0.06,QJs:0.93,QTs:0.02,JTs:0.15,AKo,AQo:0.94,AJo:0.11,KQo:0.96,KJo:0.03',
      ip: 'QQ:0.22,JJ:0.86,TT:0.94,99:0.61,88:0.37,77:0.35,66:0.23,55:0.36,44:0.31,AQs,AJs,ATs:0.39,A5s:0.28,KQs,KJs:0.18,JTs:0.47,T9s:0.12,65s:0.45,54s:0.11,AKo:0.46,AQo:0.08',
    } },
  { action: '3BP', oop: 'HJ', ip: 'BU', line: 'BU 3-bets to 7.5bb, HJ calls', pot: 16.5, stack: 92.5,
    ranges: {
      oop: 'QQ:0.05,JJ:0.63,TT:0.62,99:0.81,88:0.89,77,66:0.37,55:0.69,44:0.31,AQs,AJs:0.68,ATs:0.34,A9s:0.29,A8s:0.28,A5s:0.38,A4s:0.2,KQs:0.73,KTs:0.4,QJs:0.38,QTs:0.33,JTs:0.88,T9s:0.49,T8s:0.15,87s:0.08,76s:0.09,65s:0.45,54s:0.25,AKo:0.34,AQo:0.11',
      ip: 'AA,KK,QQ:0.97,JJ:0.55,TT:0.56,99:0.44,88:0.5,77:0.44,66:0.44,55:0.08,AKs,AQs,AJs:0.23,ATs:0.2,A9s:0.8,A8s:0.86,A7s:0.94,A6s:0.01,A5s:0.6,A4s:0.72,A3s:0.98,A2s:0.12,KQs:0.36,KJs:0.77,KTs:0.45,K9s:0.67,K8s:0.21,K5s:0.01,QJs:0.79,QTs:0.89,Q9s:0.12,JTs:0.47,T9s:0.44,76s:0.03,65s:0.11,54s:0.27,AKo,AQo:0.51,AJo:0.49,ATo:0.05,KQo:0.83',
    } },
  { action: '3BP', oop: 'HJ', ip: 'CO', line: 'CO 3-bets to 7.5bb, HJ calls', pot: 16.5, stack: 92.5,
    ranges: {
      oop: 'QQ:0.13,JJ:0.53,TT:0.77,99:0.73,88:0.98,77:0.66,66:0.34,55:0.56,44:0.31,AQs,AJs:0.2,ATs:0.57,A5s:0.23,A4s:0.26,KQs:0.54,KJs:0.07,KTs:0.37,QJs:0.35,JTs:0.88,J9s:0.09,T9s:0.34,T8s:0.09,87s:0.08,76s:0.09,65s:0.45,54s:0.25,AKo:0.35,AQo:0.06',
      ip: 'AA,KK,QQ:0.92,JJ:0.67,TT:0.69,99:0.64,88:0.57,77:0.22,66:0.39,55:0.07,AKs,AQs:0.86,AJs:0.39,ATs:0.52,A9s:0.94,A8s:0.89,A7s:0.41,A5s:0.82,A4s:0.89,A3s:0.83,KQs:0.47,KJs:0.84,KTs:0.74,K9s:0.02,QJs:0.93,QTs:0.9,JTs:0.11,T9s:0.07,65s:0.05,54s:0.1,AKo:0.99,AQo:0.82,AJo:0.16,KQo:0.85',
    } },
  { action: '3BP', oop: 'BB', ip: 'CO', line: 'BB 3-bets to 12bb, CO calls', pot: 24.5, stack: 88,
    ranges: {
      oop: 'AA,KK,QQ,JJ,TT:0.53,99:0.1,88:0.1,77:0.12,66:0.06,55:0.04,AKs,AQs:0.26,A7s:0.17,A6s:0.48,A5s:0.15,A4s:0.59,A3s:0.08,A2s:0.56,KQs:0.12,KJs:0.03,K7s:0.18,K6s:0.48,K4s:0.43,K3s:0.3,K2s:0.27,QJs:0.43,QTs:0.82,Q9s:0.01,Q8s:0.37,Q7s:0.11,Q6s:0.15,JTs:0.96,J9s:0.38,J8s:0.17,J7s:0.48,T8s:0.02,T7s:0.24,76s:0.04,65s:0.01,43s:0.17,AKo,AQo:0.5,AJo:0.19,ATo:0.1,A9o:0.15,A8o:0.06,A5o:0.6,A4o:0.03,KQo:0.52,KJo:0.6,KTo:0.32,QJo:0.38,QTo:0.01,JTo:0.02',
      ip: 'AA:0.02,JJ:0.79,TT,99:0.97,88:0.97,77:0.45,66:0.6,55:0.35,44:0.67,33:0.02,AKs:0.33,AQs,AJs,ATs,A9s:0.36,A7s:0.18,A5s,A4s:0.3,KQs,KJs,KTs:0.78,QJs,QTs:0.41,JTs:0.23,T9s:0.19,98s:0.04,87s:0.07,76s:0.03,65s:0.01,AKo:0.22,AQo:0.59',
    } },
  { action: '3BP', oop: 'SB', ip: 'CO', line: 'SB 3-bets to 11bb, CO calls', pot: 23, stack: 89,
    ranges: {
      oop: 'AA,KK,QQ,JJ,TT:0.79,99:0.71,88:0.51,77:0.36,66:0.19,AKs,AQs,AJs:0.36,ATs:0.42,A9s:0.75,A8s:0.01,A7s:0.01,A6s:0.06,A5s:0.92,A4s:0.91,A3s:0.92,KQs:0.61,KJs:0.74,KTs:0.78,K9s:0.11,QJs:0.88,QTs:0.73,JTs:0.79,AKo,AQo:0.88,AJo:0.91,KQo,KJo:0.52',
      ip: 'JJ:0.14,TT,99,88:0.78,77:0.35,66:0.35,55:0.36,44:0.45,33:0.14,AQs,AJs,ATs:0.43,A5s:0.21,KQs,KJs:0.7,KTs:0.29,QTs:0.42,JTs:0.45,T9s:0.38,65s:0.37,54s:0.2,AKo:0.21,AQo:0.5',
    } },
  { action: '3BP', oop: 'CO', ip: 'BU', line: 'BU 3-bets to 7.5bb, CO calls', pot: 16.5, stack: 92.5,
    ranges: {
      oop: 'JJ:0.14,TT:0.5,99:0.76,88:0.72,77:0.88,66:0.82,55:0.69,44,33:0.3,AQs,AJs,ATs:0.14,A9s:0.44,A8s:0.58,A5s:0.03,A4s:0.39,KQs,KTs:0.49,K9s:0.02,QJs:0.57,QTs:0.58,JTs:0.74,J9s:0.04,T9s:0.77,T8s:0.02,98s:0.03,87s:0.17,76s:0.36,65s:0.47,54s:0.27,AKo:0.07,AQo:0.14,KQo:0.04',
      ip: 'AA,KK,QQ,JJ:0.87,TT:0.65,99:0.58,88:0.56,77:0.47,66:0.77,55:0.12,AKs,AQs,AJs:0.41,ATs:0.18,A9s:0.65,A8s:0.81,A7s:0.96,A6s,A5s:0.78,A4s:0.68,A3s:0.98,A2s:0.17,KQs:0.66,KJs:0.92,KTs:0.57,K9s:0.77,K8s:0.17,QJs:0.58,QTs:0.68,Q9s:0.41,JTs:0.55,J9s:0.14,T9s:0.36,76s:0.11,65s:0.13,54s:0.11,AKo,AQo:0.66,AJo:0.88,ATo:0.57,KQo:0.84,KJo:0.5,QJo:0.38',
    } },
  { action: '3BP', oop: 'BB', ip: 'BU', line: 'BB 3-bets to 12bb, BU calls', pot: 24.5, stack: 88,
    ranges: {
      oop: 'AA,KK,QQ,JJ,TT,99:0.72,88:0.26,77:0.34,66:0.09,55:0.19,AKs,AQs,AJs:0.92,A5s:0.29,KQs,K7s:0.09,K6s:0.35,K5s:0.03,K3s:0.66,K2s:0.18,QJs:0.23,QTs:0.32,Q8s:0.25,Q6s:0.12,Q5s:0.01,Q3s:0.17,JTs:0.8,J9s,J8s:0.33,J7s:0.99,J6s:0.21,J5s:0.33,T9s:0.61,T8s:0.13,T7s:0.48,T6s:0.75,96s:0.17,76s:0.18,65s:0.06,54s:0.06,AKo,AQo,AJo:0.28,ATo:0.28,A8o:0.17,A7o:0.39,A5o:0.57,A4o:0.67,KQo:0.24,KJo:0.72,KTo:0.71,K9o:0.48,QJo:0.31,QTo:0.19,JTo:0.23,J9o:0.25,T9o:0.31',
      ip: 'AA:0.02,TT:0.64,99,88,77,66,55,44:0.7,33:0.39,AQs,AJs,ATs,A9s,A8s:0.73,A7s:0.23,A5s,A4s,A3s:0.1,KQs,KJs,KTs,K9s:0.96,QJs,QTs,JTs,J9s:0.73,T9s,98s:0.01,87s:0.31,76s:0.4,65s:0.02,AQo:0.84,AJo:0.45,KQo:0.36,KJo:0.17',
    } },
  { action: '3BP', oop: 'SB', ip: 'BU', line: 'SB 3-bets to 11bb, BU calls', pot: 23, stack: 89,
    ranges: {
      oop: 'AA,KK,QQ,JJ,TT:0.99,99:0.95,88:0.95,77:0.94,66:0.92,55:0.28,AKs,AQs,AJs,ATs:0.88,A9s:0.88,A8s:0.95,A7s:0.98,A6s:0.11,A5s:0.98,A4s:0.96,A3s:0.6,KQs,KJs:0.93,KTs:0.95,K9s:0.96,QJs:0.94,QTs:0.96,JTs:0.96,J9s:0.66,T9s:0.65,AKo,AQo:0.98,AJo:0.98,ATo:0.99,KQo:0.98,KJo,KTo:0.39,QJo:0.11',
      ip: 'TT:0.25,99,88,77,66:0.83,55:0.61,44:0.77,33:0.33,AQs,AJs,ATs,A9s:0.76,A5s,A4s:0.11,KQs,KJs,KTs:0.76,QJs:0.82,QTs:0.69,JTs:0.82,T9s:0.83,98s:0.55,87s:0.16,76s:0.05,65s:0.52,AQo:0.87,AJo:0.4,KQo:0.33',
    } },
  { action: '3BP', oop: 'SB', ip: 'BB', line: 'BB 3-bets to 10bb, SB calls', pot: 20, stack: 90,
    ranges: {
      oop: '99:0.68,88,77,66,55,44:0.19,AJs,ATs,A9s,A8s,A7s,A6s:0.34,A5s,A4s:0.59,A3s:0.68,KQs,KJs,KTs,K9s,K8s:0.86,QJs,QTs,Q9s:0.53,JTs,J9s,T9s,T8s:0.15,76s:0.09,54s:0.05,AQo:0.13,AJo:0.38,ATo:0.02,KQo:0.25,KJo:0.04',
      ip: 'AA,KK,QQ,JJ,TT,99,88:0.39,77:0.32,66:0.06,55:0.19,AKs,AQs,AJs,A5s:0.35,KQs,KJs,KTs:0.08,K5s:0.02,QJs:0.04,JTs:0.43,J6s:0.18,J5s:0.41,J4s:0.22,J3s:0.72,J2s:0.53,T9s:0.37,T6s:0.01,T5s:0.83,T4s:0.78,T3s:0.99,T2s:0.85,98s:0.09,87s:0.07,76s:0.45,65s:0.16,54s:0.18,AKo,AQo,AJo:0.04,A7o:0.54,A6o:0.76,A5o:0.16,A4o:0.46,A3o,A2o,KTo:0.17,K9o:0.51,K8o:0.52,K7o:0.78,K6o:0.5,K5o:0.11,QTo:0.29,Q9o:0.75,Q8o:0.75,JTo:0.11,J9o:0.37,J8o:0.72,T9o:0.17,T8o:0.38,T7o:0.01,98o:0.02',
    } },
  { action: '4BP', oop: 'BB', ip: 'UTG', line: 'UTG 4-bets to 27bb, BB calls', pot: 54.5, stack: 73,
    ranges: {
      oop: 'QQ:0.09,TT:0.01,88:0.03,77:0.01,66:0.01,AQs:0.06,A5s:0.02,87s:0.01,76s:0.01,65s:0.02,AKo:0.01',
      ip: 'AA,KK:0.92,AKs,A4s:0.1,A3s:0.58,A2s,KQs:0.1,KJs:0.21,KTs:0.47,K9s:0.01,AKo:0.48,AQo:0.08',
    } },
  { action: '4BP', oop: 'BB', ip: 'HJ', line: 'HJ 4-bets to 27bb, BB calls', pot: 54.5, stack: 73,
    ranges: {
      oop: 'QQ:0.02,77:0.01,AQs:0.03',
      ip: 'AA,KK,QQ:0.34,AKs,A7s:0.12,A3s:0.43,A2s,KTs:0.02,K7s:0.17,AKo:0.45,AQo:0.23,ATo:0.16,KQo:0.16,KJo:0.14',
    } },
  { action: '4BP', oop: 'BB', ip: 'CO', line: 'CO 4-bets to 27bb, BB calls', pot: 54.5, stack: 73,
    ranges: {
      oop: 'AA:0.01,99:0.01,88:0.01,AQs:0.08,KJs:0.03,76s:0.02,65s:0.01',
      ip: 'AA:0.98,KK,QQ,JJ:0.21,AKs:0.67,A9s:0.15,A8s:0.32,A7s:0.79,A6s:0.43,A3s:0.55,A2s:0.95,K9s:0.11,K3s:0.13,AKo:0.78,AQo:0.41,ATo:0.01,A9o:0.02,KQo:0.02,KJo:0.16,KTo:0.18',
    } },
  { action: '4BP', oop: 'BB', ip: 'BU', line: 'BU 4-bets to 27bb, BB calls', pot: 54.5, stack: 73,
    ranges: {
      oop: 'AA:0.1,99:0.13,88:0.15,77:0.16,66:0.09,AQs:0.42,AJs:0.73,A5s:0.09,KQs:0.38,QTs:0.21,JTs:0.17,T9s:0.38,76s:0.18,65s:0.06,54s:0.06,AQo:0.3',
      ip: 'AA:0.98,KK,QQ,JJ,TT:0.36,AKs,A8s:0.27,A7s:0.5,A6s:0.57,A3s:0.9,A2s,K9s:0.04,K8s:0.17,Q9s:0.07,AKo,AQo:0.16,AJo:0.48,ATo:0.09,KQo:0.64,KTo:0.19',
    } },
  { action: '4BP', oop: 'SB', ip: 'BB', line: 'SB 4-bets to 26bb, BB calls', pot: 52, stack: 74,
    ranges: {
      oop: 'AA,KK,QQ,JJ,TT,99:0.32,AKs,AQs,A6s:0.66,A4s:0.41,A3s:0.31,A2s:0.16,K7s:0.13,K5s:0.71,Q9s:0.47,AKo,AQo:0.87,AJo:0.62,ATo:0.98,A9o:0.1,KQo:0.75,KJo:0.5,QJo:0.35',
      ip: 'AA:0.69,99:0.09,88:0.06,66:0.06,AQs:0.72,AJs,A5s:0.35,KQs,KTs:0.07,K5s:0.02,QJs:0.04,JTs:0.43,T9s:0.37,98s:0.09,87s:0.07,76s:0.45,65s:0.16,54s:0.18,AQo:0.03,AJo:0.04',
    } },
  { action: '4BP', oop: 'SB', ip: 'UTG', line: 'UTG 4-bets to 25bb, SB calls', pot: 51, stack: 75,
    ranges: {
      oop: 'QQ:0.15,JJ:0.04,TT:0.04,99:0.05,88:0.02,77:0.04,66:0.04,AQs:0.19,AJs:0.06,ATs:0.2,A5s:0.09',
      ip: 'AA,KK,AKs,A8s:0.02,A5s:0.31,A4s:0.26,A3s:0.71,KJs:0.48,KTs:0.56,K9s:0.18,K8s:0.21,K7s:0.26,K6s:0.27,AKo:0.34,AQo:0.09',
    } },
  { action: '4BP', oop: 'SB', ip: 'HJ', line: 'HJ 4-bets to 25bb, SB calls', pot: 51, stack: 75,
    ranges: {
      oop: 'JJ:0.13,TT:0.01,99:0.01,88:0.08,77:0.04,66:0.04,AQs:0.37,ATs:0.09,A5s:0.08,KQs:0.05',
      ip: 'AA,KK,QQ:0.78,JJ:0.14,AKs,A8s:0.25,A7s:0.29,A5s:0.64,A4s:0.6,A3s:0.01,KJs:0.82,KTs:0.82,K9s:0.29,K6s:0.44,AKo:0.54,AQo:0.24,KJo:0.13',
    } },
  { action: '4BP', oop: 'SB', ip: 'CO', line: 'CO 4-bets to 25bb, SB calls', pot: 51, stack: 75,
    ranges: {
      oop: 'TT:0.15,99:0.07,88:0.08,77:0.09,66:0.12,AQs:0.5,AJs:0.11,ATs:0.04,KQs:0.31,KJs:0.07',
      ip: 'AA,KK,QQ,JJ:0.86,AKs,ATs:0.57,A9s:0.49,A8s:0.22,A7s:0.28,A6s:0.4,A5s:0.65,A4s:0.19,KJs:0.3,KTs:0.71,K9s:0.14,K8s:0.3,K7s:0.23,K6s:0.19,K5s:0.3,AKo:0.79,AQo:0.5,AJo:0.06,KQo:0.12,KJo:0.03',
    } },
  { action: '4BP', oop: 'SB', ip: 'BU', line: 'BU 4-bets to 25bb, SB calls', pot: 51, stack: 75,
    ranges: {
      oop: 'AA:0.01,99:0.89,88:0.45,77:0.75,66:0.56,55:0.01,AQs,AJs,ATs:0.74,A5s:0.25,KQs,KTs:0.01,QJs:0.57,QTs:0.6,JTs:0.21,T9s:0.05,AQo:0.83',
      ip: 'AA,KK,QQ,JJ,TT:0.75,66:0.17,55:0.39,44:0.04,AKs,A9s:0.24,A8s:0.67,A7s:0.62,A4s:0.61,KTs:0.24,K9s:0.26,QJs:0.18,QTs:0.31,JTs:0.18,T9s:0.17,AKo,AQo:0.13,AJo:0.6,ATo:0.15,KQo:0.65,KJo:0.04',
    } },
  { action: '4BP', oop: 'UTG', ip: 'BU', line: 'UTG 4-bets to 20bb, BU calls', pot: 41.5, stack: 80,
    ranges: {
      oop: 'AA,KK,QQ:0.56,JJ:0.25,TT:0.14,99:0.12,88:0.08,77:0.01,AKs,AJs:0.62,ATs:0.27,A8s:0.08,A5s:0.74,A4s:0.48,KQs:0.4,KJs:0.8,KTs:0.62,AKo:0.56,AQo:0.35',
      ip: 'AA:0.7,QQ:0.76,JJ:0.51,TT:0.37,99:0.19,88:0.29,77:0.26,66:0.26,55:0.05,AQs:0.74,AJs:0.29,ATs:0.44,A5s:0.63,KQs:0.4,KJs:0.39,T9s:0.3,76s:0.16,65s:0.33,54s:0.27,AKo:0.28',
    } },
  { action: '4BP', oop: 'HJ', ip: 'BU', line: 'HJ 4-bets to 20bb, BU calls', pot: 41.5, stack: 80,
    ranges: {
      oop: 'AA,KK,QQ:0.95,JJ:0.37,TT:0.38,99:0.19,88:0.11,AKs,AJs:0.32,ATs:0.66,A8s:0.09,A5s:0.62,A4s:0.27,KQs:0.27,KJs,KTs:0.6,K9s:0.55,AKo:0.66,AQo:0.89',
      ip: 'AA:0.84,QQ:0.51,JJ:0.53,TT:0.53,99:0.44,88:0.5,77:0.31,66:0.44,55:0.08,AQs,AJs:0.23,ATs:0.2,A5s:0.6,A4s:0.3,KQs:0.36,KJs:0.77,KTs:0.27,T9s:0.25,76s:0.03,65s:0.11,54s:0.27,AKo:0.16,AQo:0.08',
    } },
  { action: '4BP', oop: 'CO', ip: 'BU', line: 'CO 4-bets to 20bb, BU calls', pot: 41.5, stack: 80,
    ranges: {
      oop: 'AA,KK,QQ,JJ:0.86,TT:0.5,99:0.24,88:0.28,77:0.12,66:0.18,AKs,ATs:0.86,A9s:0.18,A8s:0.08,A7s:0.18,A5s:0.97,A4s:0.14,KJs,KTs:0.51,K9s:0.48,QJs:0.43,QTs:0.24,JTs:0.26,AKo:0.93,AQo:0.86,AJo:0.18,KQo:0.19',
      ip: 'AA,KK:0.02,QQ:0.01,JJ:0.48,TT:0.65,99:0.58,88:0.56,77:0.46,66:0.49,55:0.12,AQs,AJs:0.41,ATs:0.18,A5s:0.78,A4s:0.48,KQs:0.66,KJs:0.92,KTs:0.57,QJs:0.28,JTs:0.37,T9s:0.35,76s:0.11,65s:0.13,54s:0.11,AQo:0.54',
    } },
  { action: '4BP', oop: 'UTG', ip: 'CO', line: 'UTG 4-bets to 20bb, CO calls', pot: 41.5, stack: 80,
    ranges: {
      oop: 'AA,KK,QQ:0.54,JJ:0.24,TT:0.14,99:0.1,88:0.04,77:0.01,AKs,AJs:0.64,ATs:0.28,A8s:0.05,A5s:0.73,A4s:0.26,KQs:0.53,KJs:0.66,KTs:0.66,AKo:0.56,AQo:0.39',
      ip: 'AA:0.7,QQ:0.82,JJ:0.62,TT:0.3,99:0.24,88:0.29,77:0.18,66:0.26,AQs:0.74,AJs:0.55,ATs:0.45,A5s:0.6,KQs:0.53,KJs:0.18,T9s:0.11,76s:0.11,65s:0.38,54s:0.23,AKo:0.31',
    } },
  { action: '4BP', oop: 'HJ', ip: 'CO', line: 'HJ 4-bets to 20bb, CO calls', pot: 41.5, stack: 80,
    ranges: {
      oop: 'AA,KK,QQ:0.87,JJ:0.47,TT:0.23,99:0.27,88:0.02,AKs,AJs:0.8,ATs:0.43,A5s:0.77,KQs:0.46,KJs:0.93,KTs:0.63,K9s:0.17,AKo:0.65,AQo:0.91',
      ip: 'AA:0.78,QQ:0.53,JJ:0.65,TT:0.41,99:0.48,88:0.57,77:0.22,66:0.39,55:0.07,AQs:0.86,AJs:0.39,ATs:0.38,A5s:0.56,A4s:0.29,KQs:0.47,KJs:0.84,KTs:0.07,T9s:0.07,65s:0.05,54s:0.1,AKo:0.17,AQo:0.03',
    } },
  { action: '4BP', oop: 'UTG', ip: 'HJ', line: 'UTG 4-bets to 20bb, HJ calls', pot: 41.5, stack: 80,
    ranges: {
      oop: 'AA,KK,QQ:0.5,JJ:0.2,TT:0.17,99:0.15,88:0.05,77:0.02,AKs,AQs:0.06,AJs:0.61,A8s:0.1,A5s:0.83,A4s:0.03,KQs:0.47,KJs:0.68,KTs:0.48,AKo:0.56,AQo:0.39',
      ip: 'AA:0.69,QQ:0.84,JJ:0.56,TT:0.38,99:0.24,88:0.24,77:0.19,66:0.17,AQs:0.86,AJs:0.69,ATs:0.33,A5s:0.44,KQs:0.27,KJs:0.14,T9s:0.04,76s:0.15,65s:0.46,54s:0.28,AKo:0.31',
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
