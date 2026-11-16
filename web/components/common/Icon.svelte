<!-- The small line icons the pages use, drawn in the current colour. -->
<script>
  let { name, size = 16 } = $props();
  const PATHS = {
    tick: 'M3.5 8.5l3 3 6-7', cross: 'M4 4l8 8M12 4l-8 8', copy: 'M5.5 5.5v-3h8v8h-3M2.5 5.5h8v8h-8z',
    study: 'M9 3h4v4M13 3L7.5 8.5M11 9.5V13H3V5h3.5',
    curve: 'M2 13c3 0 3-4 6-5s3-5 6-5', ladder: 'M2 5.5h6M10.5 5.5H14M2 10.5h2.5M7 10.5h7',
    grid: 'M2.5 2.5h11v11h-11zM6.2 2.5v11M9.8 2.5v11M2.5 6.2h11M2.5 9.8h11',
    ranges: 'M2.5 2.5h4.5v11H2.5zM9 2.5h4.5v11H9zM2.5 9h4.5M9 6.5h4.5',
    back: 'M10 3L5 8l5 5', forward: 'M6 3l5 5-5 5', pen: 'M3 13l.6-2.8L10.9 3a1.1 1.1 0 0 1 1.6 0l.5.5a1.1 1.1 0 0 1 0 1.6L5.8 12.4z',
    seats: 'M2 8a6 3.6 0 1 0 12 0a6 3.6 0 1 0 -12 0M3.2 3.1v1M12.8 3.1v1M8 13.1v1',
    villain: 'M5.4 5.2a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0M2.8 13.6c.6-2.6 2.6-4 5.2-4s4.6 1.4 5.2 4',
    split: 'M2 3h12M2 6.3h9M2 9.7h12M2 13h6', bar: 'M2 6.5h12v3H2z',
    lines: 'M2 11.5c2.2-.6 3-5.5 5-5.5s2.6 3 7-2.5M2 13.5h12',
    butterfly: 'M6.6 3H5M6.6 6.3H2.5M6.6 9.7H4M6.6 13H1.5M9.4 3h1.6M9.4 6.3h3M9.4 9.7h4.6M9.4 13h5.1',
    settings: 'M2 4h8M13 4h1M2 8h2M7 8h7M2 12h6M11 12h3M10 4a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M4 8a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M8 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0',
  };
</script>
<svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true"><path d={PATHS[name]} fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
