// No product photos in this project, so each product gets a simple drawing:
// a shape for its category, coloured by the product's hue.

const shapes = {
  Kitchen: (fg, accent) => (
    <>
      <path d="M70 70h50v55a14 14 0 0 1-14 14H84a14 14 0 0 1-14-14z" fill={fg} />
      <path d="M120 82h8a12 12 0 0 1 0 24h-8" fill="none" stroke={fg} strokeWidth="7" />
      <path d="M84 52c0-8 8-8 8-16M100 52c0-8 8-8 8-16" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  Desk: (fg, accent) => (
    <>
      <rect x="62" y="44" width="76" height="100" rx="6" fill={fg} />
      <rect x="62" y="44" width="12" height="100" rx="3" fill={accent} />
      <path d="M86 70h38M86 84h38M86 98h26" stroke={accent} strokeWidth="4" strokeLinecap="round" />
      <path d="M124 40v30l6-6 6 6V40" fill={accent} />
    </>
  ),
  Home: (fg, accent) => (
    <>
      <path d="M88 64h24c0 12 16 22 16 46 0 22-12 34-28 34s-28-12-28-34c0-24 16-34 16-46z" fill={fg} />
      <rect x="86" y="54" width="28" height="10" rx="3" fill={fg} />
      <path d="M100 54c0-14 4-24 12-30M100 54c-2-12-8-18-16-20" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" />
      <circle cx="113" cy="23" r="6" fill={accent} />
    </>
  ),
  Outdoors: (fg, accent) => (
    <>
      <path d="M30 150l45-62 25 30 22-26 48 58z" fill={fg} />
      <path d="M75 88l12 16-12-4-10 8z" fill={accent} opacity=".7" />
      <circle cx="140" cy="56" r="14" fill={accent} />
    </>
  ),
};

export default function ProductArt({ hue = 200, category, className = '', label }) {
  const bg = `hsl(${hue} 42% 88%)`;
  const fg = `hsl(${hue} 38% 38%)`;
  const accent = `hsl(${(hue + 40) % 360} 60% 55%)`;
  const draw = shapes[category] ?? shapes.Home;
  return (
    <svg viewBox="0 0 200 180" className={`product-art ${className}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <rect width="200" height="180" fill={bg} />
      <ellipse cx="100" cy="150" rx="56" ry="7" fill={fg} opacity=".12" />
      {draw(fg, accent)}
    </svg>
  );
}
