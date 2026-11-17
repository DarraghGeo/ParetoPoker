// The sprint as the page keeps it: how many hands until the next one (eight to twelve, at random), and over the sprints
// answered, how often each kind of question was got right. Kept on this device.
import { keep, load } from '../storage.js';

const KEY = 'pareto-sprint';
/** What each kind of question is, for the record. */
export const KINDS = {
  equity: 'Your hand\'s equity against his range', price: 'The price of a call', needs: 'What a hand needs to continue',
  'range-advantage': 'Who has the range advantage', 'nut-advantage': 'Who has the nut advantage', strong: 'How much of his range is strong',
  weak: 'How much of his range is weak', bluffs: 'Bluffs for a bet size', 'mdf-applies': 'Whether MDF applies', 'mdf-enough': 'Whether your rule meets MDF', butterfly: 'Picking the spot\'s butterfly',
};
const gap = () => 8 + Math.floor(Math.random() * 5);

export const loadQuiz = () => { const kept = load(KEY); return kept?.stats ? kept : { left: gap(), stats: {} }; };
const save = (game, quiz) => { game.quiz = quiz; keep(KEY, quiz); };

/** A hand finished: one fewer until the next sprint. */
export const handPlayed = (game) => save(game, { ...game.quiz, left: game.quiz.left - 1 });
/** Whether a sprint is due in the hand about to be dealt. */
export const sprintDue = (game) => game.quiz.left <= 0;
/** A sprint has come up: the next is eight to twelve hands on. */
export function sprintStarted(game, sprint) { save(game, { ...game.quiz, left: gap() }); game.sprint = { questions: sprint.questions, at: 0, picked: null, right: 0 }; }

/** An answer given to the question on show: counted for its kind. */
export function answer(game, k) {
  const s = game.sprint; if (!s || s.picked != null) return; const q = s.questions[s.at]; const right = k === q.answer;
  const was = game.quiz.stats[q.id] ?? { n: 0, right: 0 };
  save(game, { ...game.quiz, stats: { ...game.quiz.stats, [q.id]: { n: was.n + 1, right: was.right + (right ? 1 : 0) } } });
  game.sprint = { ...s, picked: k, right: s.right + (right ? 1 : 0) };
}
/** On to the next question, or back to the table after the last. */
export function next(game) { const s = game.sprint; if (!s) return; game.sprint = s.at + 1 < s.questions.length ? { ...s, at: s.at + 1, picked: null } : null; }

/** Each kind of question answered so far, the least often right first. */
export const quizList = (quiz) => Object.keys(KINDS).filter((id) => quiz.stats[id]?.n).map((id) => ({ id, text: KINDS[id], n: quiz.stats[id].n, pct: Math.round((100 * quiz.stats[id].right) / quiz.stats[id].n) })).sort((a, b) => a.pct - b.pct);
