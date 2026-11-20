import { money, shortMonth, thisMonth, today } from '../format.js';

// rounds the axis max up to a "nice" number like 500, 1000, 2500
function niceMax(v) {
  if (v <= 0) return 100;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= v);
  return step * pow;
}

function TrendChart({ trend, currency }) {
  const W = 640, H = 240, pad = { l: 56, r: 12, t: 12, b: 28 };
  const max = niceMax(Math.max(...trend.flatMap((t) => [t.income, t.expense])));
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const slot = plotW / trend.length;
  const barW = Math.min(22, slot / 3);
  const y = (v) => pad.t + plotH - (v / max) * plotH;
  // fifths, because niceMax always returns something that divides cleanly by 5
  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => f * max);
  const compact = (c) => money(c, currency, { notation: 'compact', maximumFractionDigits: 1 });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Income and expenses for the last six months">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" />
          <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="axis">{compact(t)}</text>
        </g>
      ))}
      {trend.map((t, i) => {
        const cx = pad.l + slot * i + slot / 2;
        return (
          <g key={t.month}>
            <rect x={cx - barW - 2} y={y(t.income)} width={barW} height={Math.max(0, y(0) - y(t.income))} rx="3" className="bar-in">
              <title>{`${shortMonth(t.month)} income: ${money(t.income, currency)}`}</title>
            </rect>
            <rect x={cx + 2} y={y(t.expense)} width={barW} height={Math.max(0, y(0) - y(t.expense))} rx="3" className="bar-out">
              <title>{`${shortMonth(t.month)} expenses: ${money(t.expense, currency)}`}</title>
            </rect>
            <text x={cx} y={H - 8} textAnchor="middle" className="axis">{shortMonth(t.month)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Breakdown({ rows, total, currency, kind }) {
  if (!rows.length) return <p className="muted small">No {kind} recorded this month.</p>;
  return (
    <ul className="breakdown">
      {rows.map((r) => {
        const pct = total ? (r.total / total) * 100 : 0;
        return (
          <li key={r.category}>
            <div className="breakdown-top">
              <span>{r.category}</span>
              <span>
                {money(r.total, currency)} <span className="muted">{pct.toFixed(0)}%</span>
              </span>
            </div>
            <div className="meter">
              <span className={kind === 'income' ? 'in' : 'out'} style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function Reports({ state, month, currency, onRetry }) {
  const { loading, error, data } = state;

  if (error) {
    return (
      <section className="panel empty">
        <h3>Couldn't load the report</h3>
        <p>{error}</p>
        <button className="btn btn-ghost" onClick={onRetry}>Try again</button>
      </section>
    );
  }
  if (!data) {
    return <section className="panel empty"><div className="spinner big" /></section>;
  }

  const { totals, byCategory, incomeByCategory, trend, largest } = data;
  const savingsRate = totals.income ? ((totals.income - totals.expense) / totals.income) * 100 : null;

  // average daily spend: for the current month divide by days so far, not the full month
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const days = month === thisMonth() ? Number(today().slice(8)) : month > thisMonth() ? 0 : daysInMonth;
  const perDay = days ? totals.expense / days : 0;

  return (
    <div className={`reports ${loading ? 'dim' : ''}`}>
      <section className="cards cards-3">
        <div className="stat-card">
          <span className="label">Savings rate</span>
          <strong className={savingsRate !== null && savingsRate < 0 ? 'neg' : ''}>{savingsRate === null ? '-' : `${savingsRate.toFixed(0)}%`}</strong>
          <span className="sub">of income kept</span>
        </div>
        <div className="stat-card">
          <span className="label">Average daily spend</span>
          <strong>{money(perDay, currency)}</strong>
          <span className="sub">over {days} day{days === 1 ? '' : 's'}</span>
        </div>
        <div className="stat-card">
          <span className="label">Largest expense</span>
          <strong>{largest ? money(largest.amount_cents, currency) : '-'}</strong>
          <span className="sub">{largest ? `${largest.category}${largest.note ? ` · ${largest.note}` : ''}` : 'nothing yet'}</span>
        </div>
      </section>

      <section className="panel pad">
        <div className="panel-title">
          <h3>Last six months</h3>
          <div className="legend">
            <span><i className="in" /> Income</span>
            <span><i className="out" /> Expenses</span>
          </div>
        </div>
        <TrendChart trend={trend} currency={currency} />
      </section>

      <div className="split">
        <section className="panel pad">
          <h3>Spending by category</h3>
          <Breakdown rows={byCategory} total={totals.expense} currency={currency} kind="expenses" />
        </section>
        <section className="panel pad">
          <h3>Income sources</h3>
          <Breakdown rows={incomeByCategory} total={totals.income} currency={currency} kind="income" />
        </section>
      </div>
    </div>
  );
}
