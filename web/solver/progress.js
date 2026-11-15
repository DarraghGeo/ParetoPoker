// How far along a solve is, for the bars: a figure that closes in on its target by ratio, on a log scale, 0 to 1.
export const along = (from, now, to) => (now < Infinity ? Math.min(1, Math.max(0, Math.log(from / now) / Math.log(from / to))) : 0);
export const pause = () => new Promise((resolve) => setTimeout(resolve));
