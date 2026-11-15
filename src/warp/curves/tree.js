/**
 * The betting tree of a warp game from one decision on. Amounts are in chips. A state holds, per player, `wager` (the
 * total on this street) and `left` (chips behind); `added` is what each put in since the decision, `dead` everything
 * already in the pot.
 */
const menuOf = (menu) => {
  const { bet: fractions = [0.33, 0.75, 1.5], raise: multiple = 2.5, addAllIn = 1.5, forceAllIn = 0.15 } = menu ?? {};
  return { fractions, multiple, addAllIn, forceAllIn };
};

/** Builds the betting tree from one decision on. Amounts are in chips. */
export function buildTree({ pot, toCall = 0, stack, invested = 0, rootActions = null, checkCloses = false, menu, maxRaises = 4 }) {
  const build = { nodes: [], menu: menuOf(menu), maxRaises };
  // Player 0 is the one to act. Both started the street with the same stack.
  const start = {
    actor: 0, wager: [invested, invested + toCall], left: [stack, stack - toCall], added: [0, 0], dead: pot,
    raises: toCall > 0 ? 1 : 0, acted: checkCloses ? 1 : 0,
  };
  const root = decisionNode(build, start, rootActions);
  return { root, nodes: build.nodes };
}

const owedBy = (state) => state.wager[1 - state.actor] - state.wager[state.actor];
const potOf = (state) => state.dead + state.added[0] + state.added[1];
const cents = (chips) => Math.round(chips * 100) / 100;
/** A bet or raise that would leave too little behind is all-in instead. */
const shoveIfShort = (add, stack, potAfter, menu) => (stack - add <= menu.forceAllIn * potAfter ? stack : add);

function decisionNode(build, state, given) {
  const node = { player: state.actor, actions: [], children: [], index: build.nodes.length, wager: [...state.wager] };
  build.nodes.push(node);
  const push = (type, add) => addAction(build, state, node, type, add);
  if (given) givenActions(state, given, push);
  else if (owedBy(state) > 0) facingBet(build, state, push);
  else unopened(build, state, push);
  return node;
}

function addAction(build, state, node, type, add) {
  node.actions.push({ type, add });
  node.children.push(type === 'fold' ? terminal(state, 'fold', state.added, state.actor) : childOf(build, state, add, sizedAs(type)));
}

const sizedAs = (type) => (type === 'bet' || type === 'allin' ? 'raise' : type);
const terminal = (state, kind, added, folder = -1) => ({ terminal: kind, added: [...added], folder, dead: state.dead });

function childOf(build, state, add, type) {
  const added = [...state.added]; added[state.actor] += add;
  if (type === 'call' || (type === 'check' && state.acted >= 1)) return terminal(state, 'showdown', added);
  return decisionNode(build, nextState(state, add, type, added));
}

function nextState(state, add, type, added) {
  const wager = [...state.wager]; wager[state.actor] += add;
  const left = [...state.left]; left[state.actor] -= add;
  const raises = type === 'raise' ? state.raises + 1 : state.raises;
  return { actor: 1 - state.actor, wager, left, added, dead: state.dead, raises, acted: state.acted + 1 };
}

function givenActions(state, given, push) {
  const stack = state.left[state.actor];
  for (const action of given) {
    if (action.type === 'fold' || action.type === 'check') push(action.type, 0);
    else if (action.type === 'call') push('call', Math.min(owedBy(state), stack));
    else push('raise', Math.min(action.to - state.wager[state.actor], stack));
  }
}

function facingBet(build, state, push) {
  const { actor, left } = state;
  const owed = owedBy(state);
  push('fold', 0);
  push('call', Math.min(owed, left[actor]));
  const room = left[actor] - owed;
  if (room > 1e-9 && left[1 - actor] > 1e-9 && state.raises < build.maxRaises) pushSizes(raiseSizes(build.menu, state, room), push);
}

function raiseSizes(menu, state, room) {
  const { actor, wager, left } = state;
  const owed = owedBy(state);
  const potAfterCall = potOf(state) + owed;
  const to = menu.multiple * wager[1 - actor];
  let add = Math.min(to - wager[actor], left[actor]);
  add = shoveIfShort(add, left[actor], potAfterCall + 2 * (add - owed), menu);
  const sizes = new Set([cents(add)]);
  if (room <= menu.addAllIn * potAfterCall) sizes.add(cents(left[actor]));
  return sizes;
}

function unopened(build, state, push) {
  const { actor, left } = state;
  push('check', 0);
  if (left[actor] > 1e-9 && left[1 - actor] > 1e-9) pushSizes(betSizes(build.menu, state), push);
}

function betSizes(menu, state) {
  const total = potOf(state);
  const stack = state.left[state.actor];
  const sizes = new Set();
  for (const fraction of menu.fractions) {
    const add = Math.min(fraction * total, stack);
    sizes.add(cents(shoveIfShort(add, stack, total + 2 * add, menu)));
  }
  if (stack <= menu.addAllIn * total) sizes.add(cents(stack));
  return sizes;
}

const pushSizes = (sizes, push) => { for (const size of [...sizes].sort((x, y) => x - y)) push('raise', size); };
