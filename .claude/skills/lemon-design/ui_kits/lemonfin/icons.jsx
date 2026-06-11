/* Shared line-icon set for the LemonFin UI kit. Stroke icons, 1.9 weight,
   matching the reference. Exported to window for the babel screen scripts. */
const I = (paths, opts = {}) => (props = {}) => React.createElement(
  'svg',
  {
    width: props.size || 22, height: props.size || 22, viewBox: '0 0 24 24',
    fill: opts.fill ? 'currentColor' : 'none',
    stroke: opts.fill ? 'none' : 'currentColor',
    strokeWidth: opts.sw || 1.9, strokeLinecap: 'round', strokeLinejoin: 'round',
    ...props,
  },
  paths,
);
const p = (d, k) => React.createElement('path', { d, key: k });
const el = (type, attrs, k) => React.createElement(type, { ...attrs, key: k });

const LFIcons = {
  home:     I([p('M3 10.5 12 3l9 7.5', 'a'), p('M5 9.5V21h14V9.5', 'b')]),
  swap:     I([p('M7 4 3 8l4 4', 'a'), p('M3 8h14', 'b'), p('M17 20l4-4-4-4', 'c'), p('M21 16H7', 'd')]),
  layers:   I([p('M12 3 2 8l10 5 10-5-10-5Z', 'a'), p('M2 13l10 5 10-5', 'b'), p('M2 18l10 5 10-5', 'c')]),
  card:     I([el('rect', { x: 2.5, y: 5, width: 19, height: 14, rx: 3 }, 'a'), p('M2.5 10h19', 'b')]),
  target:   I([el('circle', { cx: 12, cy: 12, r: 9 }, 'a'), el('circle', { cx: 12, cy: 12, r: 5 }, 'b'), el('circle', { cx: 12, cy: 12, r: 1.4 }, 'c')]),
  bulb:     I([p('M9 18h6', 'a'), p('M10 21h4', 'b'), p('M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0 0 12 3Z', 'c')]),
  gear:     I([el('circle', { cx: 12, cy: 12, r: 3.2 }, 'a'), p('M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z', 'b')]),
  bell:     I([p('M6 9a6 6 0 0 1 12 0c0 7 2 8 2 8H4s2-1 2-8', 'a'), p('M10 21a2 2 0 0 0 4 0', 'b')]),
  plus:     I([p('M12 5v14M5 12h14', 'a')], { sw: 2.4 }),
  arrowUR:  I([p('M7 17 17 7', 'a'), p('M9 7h8v8', 'b')], { sw: 2.1 }),
  arrowDL:  I([p('M17 7 7 17', 'a'), p('M15 17H7V9', 'b')], { sw: 2.1 }),
  wallet:   I([el('rect', { x: 3, y: 6, width: 18, height: 13, rx: 3 }, 'a'), p('M3 10h18', 'b'), el('circle', { cx: 16.5, cy: 13.5, r: 1.3, fill: 'currentColor', stroke: 'none' }, 'c')]),
  trendUp:  I([p('M4 17l6-6 4 4 6-7', 'a'), p('M20 8v5h-5', 'b')], { sw: 2 }),
  trendDn:  I([p('M4 7l6 6 4-4 6 7', 'a'), p('M20 16v-5h-5', 'b')], { sw: 2 }),
  receipt:  I([p('M5 3v18l2-1.4L9 21l2-1.4L13 21l2-1.4L17 21l2-1.4V3l-2 1.4L15 3l-2 1.4L11 3 9 4.4 7 3 5 4.4Z', 'a'), p('M8 8h8', 'b'), p('M8 12h8', 'c')]),
  piggy:    I([p('M19 11a5 5 0 0 0-5-4H9a5 5 0 0 0-5 5 4 4 0 0 0 2 3.5V19h3v-2h3v2h3v-3a5 5 0 0 0 1-3Z', 'a'), p('M19 11h1.5a1 1 0 0 1 0 2H19', 'b'), el('circle', { cx: 8, cy: 11, r: 1, fill: 'currentColor', stroke: 'none' }, 'c')]),
  search:   I([el('circle', { cx: 11, cy: 11, r: 7 }, 'a'), p('M21 21l-4-4', 'b')]),
  calendar: I([el('rect', { x: 3, y: 4.5, width: 18, height: 16, rx: 3 }, 'a'), p('M3 9h18M8 3v4M16 3v4', 'b')]),
  kebab:    I([el('circle', { cx: 12, cy: 5, r: 1.4, fill: 'currentColor', stroke: 'none' }, 'a'), el('circle', { cx: 12, cy: 12, r: 1.4, fill: 'currentColor', stroke: 'none' }, 'b'), el('circle', { cx: 12, cy: 19, r: 1.4, fill: 'currentColor', stroke: 'none' }, 'c')]),
  chevron:  I([p('M6 9l6 6 6-6', 'a')], { sw: 2.1 }),
  sun:      I([el('circle', { cx: 12, cy: 12, r: 4 }, 'a'), p('M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19', 'b')]),
  logout:   I([p('M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3', 'a'), p('M10 17l5-5-5-5', 'b'), p('M15 12H3', 'c')]),
  bot:      I([el('rect', { x: 4, y: 8, width: 16, height: 12, rx: 4 }, 'a'), p('M12 8V4M9 4h6', 'b'), el('circle', { cx: 9.5, cy: 14, r: 1.2, fill: 'currentColor', stroke: 'none' }, 'c'), el('circle', { cx: 14.5, cy: 14, r: 1.2, fill: 'currentColor', stroke: 'none' }, 'd')]),
};

window.LFIcons = LFIcons;
