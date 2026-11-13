//! Line-delimited JSON bridge to postflop-solver.
//!
//! Reads one JSON request per line on stdin and writes one JSON response per line on stdout:
//! `{"ok": true, ...}` or `{"ok": false, "error": "..."}`. See `src/solver/SolverBridge.js`.

use postflop_solver::*;
use serde_json::{json, Value};
use std::io::{self, BufRead, Write};

type Snapshot = Vec<(Vec<usize>, Vec<f32>)>;

struct Bridge {
    game: Option<PostFlopGame>,
    config: Option<(CardConfig, TreeConfig)>,
    snapshots: [Snapshot; 2],
}

fn str_of<'a>(v: &'a Value, key: &str, default: &'a str) -> &'a str {
    v.get(key).and_then(Value::as_str).unwrap_or(default)
}

fn f64_of(v: &Value, key: &str, default: f64) -> f64 {
    v.get(key).and_then(Value::as_f64).unwrap_or(default)
}

fn history_of(v: &Value) -> Vec<usize> {
    v.get("history")
        .and_then(Value::as_array)
        .map(|a| a.iter().filter_map(Value::as_u64).map(|x| x as usize).collect())
        .unwrap_or_default()
}

fn action_json(action: &Action) -> Value {
    match *action {
        Action::Fold => json!({"type": "fold"}),
        Action::Check => json!({"type": "check"}),
        Action::Call => json!({"type": "call"}),
        Action::Bet(a) => json!({"type": "bet", "to": a}),
        Action::Raise(a) => json!({"type": "raise", "to": a}),
        Action::AllIn(a) => json!({"type": "allin", "to": a}),
        Action::Chance(c) => json!({"type": "chance", "card": c}),
        Action::None => json!({"type": "none"}),
    }
}

/// Bet sizes for one street: `{"oop": {"bet": "50%", "raise": "2.5x"}, "ip": {...}}`.
fn sizes_of(v: &Value, street: &str) -> Result<[BetSizeOptions; 2], String> {
    let mut out = [BetSizeOptions::default(), BetSizeOptions::default()];
    let street_cfg = v.get("bet_sizes").and_then(|b| b.get(street));
    for (i, who) in ["oop", "ip"].iter().enumerate() {
        if let Some(p) = street_cfg.and_then(|s| s.get(*who)) {
            out[i] = BetSizeOptions::try_from((str_of(p, "bet", ""), str_of(p, "raise", "")))?;
        }
    }
    Ok(out)
}

impl Bridge {
    fn game(&mut self) -> Result<&mut PostFlopGame, String> {
        self.game.as_mut().ok_or_else(|| "init has not been called".to_string())
    }

    fn init(&mut self, req: &Value) -> Result<Value, String> {
        let board = str_of(req, "board", "");
        let n = board.len() / 2;
        if board.len() % 2 != 0 || !(3..=5).contains(&n) {
            return Err("board must hold 3, 4 or 5 cards, e.g. \"Td9d6hQc\"".into());
        }
        let card_config = CardConfig {
            range: [str_of(req, "oop_range", "").parse()?, str_of(req, "ip_range", "").parse()?],
            flop: flop_from_str(&board[0..6])?,
            turn: if n >= 4 { card_from_str(&board[6..8])? } else { NOT_DEALT },
            river: if n == 5 { card_from_str(&board[8..10])? } else { NOT_DEALT },
        };
        let tree_config = TreeConfig {
            initial_state: [BoardState::Flop, BoardState::Turn, BoardState::River][n - 3],
            starting_pot: f64_of(req, "starting_pot", 0.0) as i32,
            effective_stack: f64_of(req, "effective_stack", 0.0) as i32,
            rake_rate: 0.0,
            rake_cap: 0.0,
            flop_bet_sizes: sizes_of(req, "flop")?,
            turn_bet_sizes: sizes_of(req, "turn")?,
            river_bet_sizes: sizes_of(req, "river")?,
            turn_donk_sizes: None,
            river_donk_sizes: None,
            add_allin_threshold: f64_of(req, "add_allin_threshold", 1.5),
            force_allin_threshold: f64_of(req, "force_allin_threshold", 0.15),
            merging_threshold: f64_of(req, "merging_threshold", 0.1),
        };
        let starting_pot = tree_config.starting_pot;
        let effective_stack = tree_config.effective_stack;
        self.config = Some((card_config.clone(), tree_config.clone()));
        let action_tree = ActionTree::new(tree_config)?;
        let mut game = PostFlopGame::with_config(card_config, action_tree)?;
        let (memory, _) = game.memory_usage();
        game.allocate_memory(false);

        let mut hands = Vec::new();
        let mut weights = Vec::new();
        for player in 0..2 {
            // each hand as a pair of card ids (rank * 4 + suit; suits are c, d, h, s)
            let cards: Vec<[u8; 2]> = game.private_cards(player).iter().map(|&(a, b)| [a, b]).collect();
            hands.push(cards);
            weights.push(game.initial_weights(player).to_vec());
        }
        self.game = Some(game);
        self.snapshots = [Vec::new(), Vec::new()];
        Ok(json!({
            "hands": hands, "weights": weights, "memory": memory,
            "starting_pot": starting_pot, "effective_stack": effective_stack,
        }))
    }

    /// Moves to the node at `history` and describes it.
    fn node(&mut self, req: &Value) -> Result<Value, String> {
        let history = history_of(req);
        let game = self.game()?;
        game.apply_history(&history);
        let terminal = game.is_terminal_node();
        let chance = !terminal && game.is_chance_node();
        let actions: Vec<Value> = if terminal {
            Vec::new()
        } else {
            game.available_actions().iter().map(action_json).collect()
        };
        Ok(json!({
            "terminal": terminal,
            "chance": chance,
            "player": if terminal || chance { Value::Null } else { json!(game.current_player()) },
            "actions": actions,
            "bets": game.total_bet_amount(),
            "board": game.current_board(),
        }))
    }

    fn lock(&mut self, req: &Value) -> Result<Value, String> {
        let history = history_of(req);
        let strategy: Vec<f32> = req
            .get("strategy")
            .and_then(Value::as_array)
            .ok_or("strategy is required")?
            .iter()
            .map(|x| x.as_f64().unwrap_or(0.0) as f32)
            .collect();
        let game = self.game()?;
        game.apply_history(&history);
        if game.is_terminal_node() || game.is_chance_node() {
            return Err("cannot lock a terminal or chance node".into());
        }
        let expected = game.available_actions().len() * game.private_cards(game.current_player()).len();
        if strategy.len() != expected {
            return Err(format!("strategy has {} entries, expected {}", strategy.len(), expected));
        }
        game.lock_current_strategy(&strategy);
        Ok(json!({}))
    }

    /// The acting player's strategy at `history`, with both players' reach weights.
    fn strategy(&mut self, req: &Value) -> Result<Value, String> {
        let history = history_of(req);
        let game = self.game()?;
        game.apply_history(&history);
        if game.is_terminal_node() || game.is_chance_node() {
            return Err("no strategy at a terminal or chance node".into());
        }
        // With `evs`: the expected value of each action for each hand of the acting player, in
        // chips, laid out like the strategy. Only the differences between actions mean anything.
        let evs = if req.get("evs").and_then(Value::as_bool).unwrap_or(false) {
            game.cache_normalized_weights();
            Some(game.expected_values_detail(game.current_player()))
        } else {
            None
        };
        Ok(json!({
            "player": game.current_player(),
            "strategy": game.strategy(),
            "weights": [game.weights(0).to_vec(), game.weights(1).to_vec()],
            "evs": evs,
        }))
    }

    fn solve(&mut self, req: &Value) -> Result<Value, String> {
        let iterations = f64_of(req, "iterations", 1000.0) as u32;
        let game = self.game()?;
        let pot = game.tree_config().starting_pot as f32;
        let target = pot * f64_of(req, "target", 0.003) as f32;
        let exploitability = solve(game, iterations, target, false);
        Ok(json!({"exploitability": exploitability}))
    }

    /// Clears every lock and any solution. The game is built again: re-allocating its memory
    /// alone keeps the locks, and a best response then treats the responder's locked nodes as fixed.
    fn reset(&mut self) -> Result<Value, String> {
        let (card_config, tree_config) = self.config.clone().ok_or("init has not been called")?;
        let mut game = PostFlopGame::with_config(card_config, ActionTree::new(tree_config)?)?;
        game.allocate_memory(false);
        self.game = Some(game);
        Ok(json!({}))
    }

    /// Expected value of each player (OOP, IP) under the current strategies, in chips.
    fn current_ev(&mut self) -> Result<Value, String> {
        let game = self.game()?;
        game.back_to_root();
        let bias = game.tree_config().starting_pot as f32 * 0.5;
        let ev = compute_current_ev(game);
        Ok(json!({"ev": [ev[0] + bias, ev[1] + bias]}))
    }

    /// Expected value each player would get by best-responding to the other's current strategy.
    fn best_response_ev(&mut self) -> Result<Value, String> {
        let game = self.game()?;
        game.back_to_root();
        let bias = game.tree_config().starting_pot as f32 * 0.5;
        let ev = compute_mes_ev(game);
        Ok(json!({"ev": [ev[0] + bias, ev[1] + bias]}))
    }

    /// Remembers `player`'s current strategy at every one of their nodes.
    fn snapshot(&mut self, req: &Value) -> Result<Value, String> {
        let player = f64_of(req, "player", 0.0) as usize;
        let game = self.game()?;
        let mut out = Vec::new();
        game.back_to_root();
        collect(game, player, &mut Vec::new(), &mut out);
        game.back_to_root();
        let nodes = out.len();
        self.snapshots[player] = out;
        Ok(json!({"nodes": nodes}))
    }

    /// Locks `player` to the strategy saved by `snapshot`.
    fn restore(&mut self, req: &Value) -> Result<Value, String> {
        let player = f64_of(req, "player", 0.0) as usize;
        let snapshot = std::mem::take(&mut self.snapshots[player]);
        let game = self.game()?;
        for (history, strategy) in &snapshot {
            game.apply_history(history);
            // a hand with no positive entry is left unlocked, so keep every hand locked
            let locked: Vec<f32> = strategy.iter().map(|&x| x.max(1e-9)).collect();
            game.lock_current_strategy(&locked);
        }
        game.back_to_root();
        let nodes = snapshot.len();
        self.snapshots[player] = snapshot;
        Ok(json!({"nodes": nodes}))
    }

    fn handle(&mut self, req: &Value) -> Result<Value, String> {
        match str_of(req, "cmd", "") {
            "init" => self.init(req),
            "node" => self.node(req),
            "lock" => self.lock(req),
            "strategy" => self.strategy(req),
            "solve" => self.solve(req),
            "reset" => self.reset(),
            "current_ev" => self.current_ev(),
            "best_response_ev" => self.best_response_ev(),
            "snapshot" => self.snapshot(req),
            "restore" => self.restore(req),
            other => Err(format!("unknown command: {other}")),
        }
    }
}

fn collect(game: &mut PostFlopGame, player: usize, history: &mut Vec<usize>, out: &mut Snapshot) {
    if game.is_terminal_node() {
        return;
    }
    let actions = game.available_actions();
    let chance = game.is_chance_node();
    if !chance && game.current_player() == player {
        out.push((history.clone(), game.strategy()));
    }
    for (i, action) in actions.iter().enumerate() {
        let step = match *action {
            Action::Chance(card) => card as usize,
            _ => i,
        };
        history.push(step);
        game.apply_history(history);
        collect(game, player, history, out);
        history.pop();
    }
    game.apply_history(history);
}

fn main() {
    let mut bridge = Bridge { game: None, config: None, snapshots: [Vec::new(), Vec::new()] };
    let stdin = io::stdin();
    let mut stdout = io::stdout().lock();
    for line in stdin.lock().lines() {
        let Ok(line) = line else { break };
        if line.trim().is_empty() {
            continue;
        }
        let response = match serde_json::from_str::<Value>(&line) {
            Err(e) => json!({"ok": false, "error": format!("bad request: {e}")}),
            Ok(req) => match bridge.handle(&req) {
                Ok(mut v) => {
                    v["ok"] = json!(true);
                    v
                }
                Err(e) => json!({"ok": false, "error": e}),
            },
        };
        if writeln!(stdout, "{response}").is_err() || stdout.flush().is_err() {
            break;
        }
    }
}
