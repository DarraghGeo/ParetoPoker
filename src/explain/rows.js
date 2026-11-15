// A decision's hands as rows (`row.hand.weight`, `row.hand.strategy`): their weight, what they do, and their averages.

/** The rows' weight in all. */
export const weightOf = (rows) => rows.reduce((t, r) => t + r.hand.weight, 0);

/** The weight of the rows' play that takes action `a`. */
export const actionWeight = (rows, a) => rows.reduce((t, r) => t + r.hand.weight * r.hand.strategy[a], 0);

/** A figure of each row, averaged by the rows' weights. */
export const weightedMean = (rows, figure) => rows.reduce((t, r) => t + r.hand.weight * figure(r), 0) / weightOf(rows);

/** A figure of each row, averaged with every row counted once. */
export const meanOf = (rows, figure) => rows.reduce((t, r) => t + figure(r), 0) / rows.length;
