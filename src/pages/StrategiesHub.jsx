import { useMemo } from 'react'
import { money } from '@/data/AppData'
import InvestBanner from '@/components/wealth/InvestBanner'
import { xirr, xirrReady } from '@/data/xirr'
import { isoOf, monthKey } from '@/data/investCalendar'
import { useStrategies, useMarketHolidays, usePlanState } from '@/data/investCommonRepo'
import { useFunds, useFundAllotments } from '@/data/steady25Repo'
import { useFocusStocks, useStockAllotments } from '@/data/focus25Repo'
import { useEtfHoldings } from '@/data/metal25Repo'
import { useEeNgTrades, useEeNgSettings, eeAssetStats } from '@/data/eeNgRepo'
import { useEmaPositions, useEmaLots, bookTotals, ADD_DROP } from '@/data/emaSupportRepo'

/**
 * StrategiesHub.jsx — Investment Strategies hub (route /wealth/eva-ezaak).
 * Reads across all three plans; the strategy screens do the work.
 */
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0)
const RULE = 'Send one transfer by the 20th covering all strategies. Invest on the 25th (or next trading day). MF orders before 3 PM; ETF/stock orders mid-session. Quarterly stock review: Jan / Apr / Jul / Oct.'
const PnL = ({ v }) => <span className={(v >= 0 ? 'text-success' : 'text-danger') + ' fw-semibold'}>{v >= 0 ? '+' : ''}{money(v, 'INR')}</span>

const Tile = ({ label, value, sub, icon, tone }) => (
  <div className="col-md-3 col-6">
    <div className="card stat-card h-100 mb-0"><div className="card-body">
      <div className="d-flex align-items-center"><div className="flex-grow-1"><span className="stat-label">{label}</span></div><div className={`stat-icon bg-${tone}-subtle text-${tone}`}><i className={icon} /></div></div>
      <h4 className="stat-value mt-3 mb-0">{value}</h4>
      {sub && <span className="text-muted small">{sub}</span>}
    </div></div>
  </div>
)

export default function StrategiesHub() {
  const { holidays } = useMarketHolidays()
  const { strategies } = useStrategies()
  const { funds } = useFunds()
  const { allotments: fundAllots } = useFundAllotments()
  const { stocks } = useFocusStocks()
  const { allotments: focusAllots } = useStockAllotments('FOCUS25')
  const { holdings: etfs } = useEtfHoldings()
  const { allotments: metalAllots } = useStockAllotments('METAL25')
  const { state: focusState } = usePlanState('FOCUS25')
  const { state: metalState } = usePlanState('METAL25')
  const { trades: ngTrades } = useEeNgTrades()
  const { settings: ngSettings } = useEeNgSettings()
  const { positions: emaPositions } = useEmaPositions()
  const { lots: emaLots } = useEmaLots()

  const thisMonth = monthKey(new Date())
  const today = isoOf(new Date())

  // Per-strategy roll-up ------------------------------------------------------
  const activeStocks = stocks.filter((s) => s.active !== false)
  const steady = {
    invested: funds.reduce((s, f) => s + num(f.invested), 0),
    current: funds.reduce((s, f) => s + num(f.current_value), 0),
    flows: fundAllots.map((a) => ({ amount: -num(a.total_amount), date: a.invest_date })),
    recorded: fundAllots.some((a) => a.allotment_month === thisMonth),
  }
  const focus = {
    invested: activeStocks.reduce((s, x) => s + num(x.invested), 0),
    current: activeStocks.reduce((s, x) => s + num(x.ltp) * num(x.qty), 0) + num(focusState.cash_balance),
    flows: focusAllots.map((a) => ({ amount: -num(a.amount), date: a.invest_date })),
    recorded: focusAllots.some((a) => a.allotment_month === thisMonth && (a.type || 'monthly') === 'monthly'),
  }
  const metal = {
    invested: etfs.reduce((s, x) => s + num(x.invested), 0),
    current: etfs.reduce((s, x) => s + num(x.ltp) * num(x.qty), 0) + num(metalState.cash_balance),
    flows: metalAllots.map((a) => ({ amount: -num(a.amount), date: a.invest_date })),
    recorded: metalAllots.some((a) => a.allotment_month === thisMonth),
  }
  const perStrategy = { STEADY25: steady, FOCUS25: focus, METAL25: metal }

  const withValue = (st) => { const f = [...st.flows]; if (st.current > 0) f.push({ amount: st.current, date: today }); return f }
  const rateOf = (st) => { const f = withValue(st); return xirrReady(f) ? xirr(f) : null }

  const totalInvested = steady.invested + focus.invested + metal.invested
  const totalCurrent = steady.current + focus.current + metal.current
  const pnl = totalCurrent - totalInvested
  const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : null
  const allFlows = [...steady.flows, ...focus.flows, ...metal.flows]
  if (totalCurrent > 0) allFlows.push({ amount: totalCurrent, date: today })
  const householdRate = xirrReady(allFlows) ? xirr(allFlows) : null

  const transferTotal = strategies.reduce((s, st) => s + num(st.default_amount), 0)
  const anyPending = Object.values(perStrategy).some((p) => !p.recorded)

  // Nifty–Gold short-term rotation (signal-based, not a monthly plan).
  const ngNifty = eeAssetStats('nifty', ngTrades, ngSettings.niftyPrice)
  const ngGold = eeAssetStats('gold', ngTrades, ngSettings.goldPrice)
  const ng = {
    invested: ngNifty.invested + ngGold.invested,
    value: ngNifty.value + ngGold.value,
    realised: ngNifty.realised + ngGold.realised,
    unrealised: ngNifty.unrealised + ngGold.unrealised,
  }

  // 50 & 200 EMA Support — accumulation book, no monthly cycle.
  const ema = useMemo(() => bookTotals(emaPositions, emaLots), [emaPositions, emaLots])

  // Allocation monitor --------------------------------------------------------
  const fundCur = (code) => num(funds.find((f) => f.code === code)?.current_value)
  const etfCur = (sym) => { const e = etfs.find((x) => x.symbol === sym); return num(e?.ltp) * num(e?.qty) }
  const equity = focus.current + fundCur('NIFTY50') + fundCur('NEXT50')
  const gold = fundCur('GOLD') + etfCur('GOLDBEES')
  const silver = etfCur('SILVERBEES')
  const debt = fundCur('DEBT')
  const classTotal = equity + gold + silver + debt
  const classes = [
    { key: 'Equity', v: equity, tone: 'primary' },
    { key: 'Gold', v: gold, tone: 'warning' },
    { key: 'Silver', v: silver, tone: 'secondary' },
    { key: 'Debt', v: debt, tone: 'info' },
  ]

  // Metals ceiling of monthly *flows* (design keeps it ≈ 12–15%).
  const steadyDefault = num(strategies.find((s) => s.code === 'STEADY25')?.default_amount)
  const metalDefault = num(strategies.find((s) => s.code === 'METAL25')?.default_amount)
  const goldWeight = num(funds.find((f) => f.code === 'GOLD')?.target_weight)
  const metalsFlow = steadyDefault * goldWeight + metalDefault
  const metalsFlowPct = transferTotal > 0 ? (metalsFlow / transferTotal) * 100 : 0
  const metalsCurPct = classTotal > 0 ? ((gold + silver) / classTotal) * 100 : 0

  const cardMeta = {
    STEADY25: { icon: 'ri-scales-3-line', tone: 'primary' },
    FOCUS25: { icon: 'ri-focus-3-line', tone: 'success' },
    METAL25: { icon: 'ri-copper-coin-line', tone: 'warning' },
  }

  const ordered = useMemo(() => [...strategies].sort((a, b) => a.display_order - b.display_order), [strategies])

  return (
    <div className="strategies-hub">
      <div className="page-title-box d-flex align-items-center">
        <div className="flex-grow-1">
          <h4 className="mb-0">Investment Strategies</h4>
          <small className="text-muted">Eva &amp; Ezaak · one transfer, one day, three plans.</small>
        </div>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item active" aria-current="page">Eva &amp; Ezaak Portfolio</li>
          </ol>
        </nav>
      </div>

      <InvestBanner rule={RULE} holidays={holidays} monthRecorded={!anyPending}
        extra={<>Transfer this month: <strong>{money(transferTotal, 'INR')}</strong></>} />

      <div className="row g-3 mb-3">
        <Tile label="Total invested" value={money(totalInvested, 'INR')} icon="ri-wallet-3-line" tone="primary" />
        <Tile label="Current value" value={money(totalCurrent, 'INR')} sub={pnlPct == null ? '' : `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`} icon="ri-line-chart-line" tone="info" />
        <Tile label="Overall P&L" value={<PnL v={pnl} />} icon="ri-funds-line" tone={pnl >= 0 ? 'success' : 'danger'} />
        <Tile label="Household XIRR" value={householdRate == null ? '—' : `${(householdRate * 100).toFixed(1)}%`} sub="annualised" icon="ri-rhythm-line" tone="warning" />
      </div>

      {/* Allocation monitor */}
      <div className="card mb-3">
        <div className="card-header d-flex align-items-center">
          <h5 className="card-title mb-0 flex-grow-1">Allocation monitor</h5>
          {metalsFlowPct > 15 && <span className="badge bg-danger-subtle text-danger" title="Metals hedge, equity compounds. Design keeps metals ≈ 12–15% of flows.">Metals above household ceiling ({metalsFlowPct.toFixed(1)}% of flows)</span>}
        </div>
        <div className="card-body">
          {classTotal > 0 ? (
            <>
              <div className="progress mb-2" style={{ height: 22 }}>
                {classes.filter((c) => c.v > 0).map((c) => (
                  <div key={c.key} className={`progress-bar bg-${c.tone}`} style={{ width: `${(c.v / classTotal) * 100}%` }} title={`${c.key} ${((c.v / classTotal) * 100).toFixed(1)}%`}>
                    {(c.v / classTotal) * 100 >= 8 ? `${c.key} ${((c.v / classTotal) * 100).toFixed(0)}%` : ''}
                  </div>
                ))}
              </div>
              <div className="d-flex flex-wrap gap-3 small text-muted">
                {classes.map((c) => <span key={c.key}><i className={`ri-circle-fill text-${c.tone} me-1`} />{c.key}: {money(c.v, 'INR')} ({classTotal > 0 ? ((c.v / classTotal) * 100).toFixed(1) : 0}%)</span>)}
              </div>
              <div className="small text-muted mt-2">Metals of flows: <strong className={metalsFlowPct > 15 ? 'text-danger' : 'text-success'}>{metalsFlowPct.toFixed(1)}%</strong> · Metals of current value: {metalsCurPct.toFixed(1)}% <span className="ms-1">(design target ≈ 12–15% of flows)</span></div>
            </>
          ) : <p className="text-muted mb-0">Enter current values on the plan screens to see the allocation split.</p>}
        </div>
      </div>

      {/* Strategy cards */}
      <div className="row g-3">
        {ordered.map((st) => {
          const data = perStrategy[st.code] || { invested: 0, current: 0, recorded: false }
          const p = data.current - data.invested
          const pp = data.invested > 0 ? (p / data.invested) * 100 : null
          const r = rateOf(data)
          const meta = cardMeta[st.code] || { icon: 'ri-bar-chart-line', tone: 'secondary' }
          return (
            <div className="col-md-4" key={st.code}>
              <div className="card h-100">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex align-items-center mb-2">
                    <div className={`avatar-sm rounded bg-${meta.tone}-subtle text-${meta.tone} d-flex align-items-center justify-content-center me-2`} style={{ width: 40, height: 40 }}><i className={`${meta.icon} fs-18`} /></div>
                    <div className="flex-grow-1"><h5 className="mb-0">{st.name}</h5><small className="text-muted">{money(num(st.default_amount), 'INR')}/mo</small></div>
                    {data.recorded ? <span className="badge bg-success-subtle text-success">This month done</span> : <span className="badge bg-warning-subtle text-warning">Pending</span>}
                  </div>
                  <div className="row g-2 text-center my-2">
                    <div className="col-4"><div className="text-muted small">Invested</div><div className="fw-semibold">{money(data.invested, 'INR')}</div></div>
                    <div className="col-4"><div className="text-muted small">Current</div><div className="fw-semibold">{money(data.current, 'INR')}</div></div>
                    <div className="col-4"><div className="text-muted small">XIRR</div><div className="fw-semibold">{r == null ? '—' : `${(r * 100).toFixed(1)}%`}</div></div>
                  </div>
                  <div className="text-center mb-3">{data.invested > 0 || data.current > 0 ? <><PnL v={p} /> {pp != null && <span className={pp >= 0 ? 'text-success small' : 'text-danger small'}>({pp >= 0 ? '+' : ''}{pp.toFixed(1)}%)</span>}</> : <span className="text-muted small">No data yet</span>}</div>
                  <div className="mt-auto d-flex gap-2">
                    <a className="btn btn-soft-primary flex-grow-1" href={st.screen_route}><i className="ri-external-link-line me-1" />Open</a>
                    <a className="btn btn-primary flex-grow-1" href={`${st.screen_route}?allot=1`}><i className="ri-add-circle-line me-1" />Add Money</a>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Beyond the monthly SIPs — signal-based and accumulation books */}
      <h5 className="mt-4 mb-2">Tactical &amp; accumulation</h5>
      <div className="row g-3">
        <div className="col-md-6 col-lg-4">
          <div className="card h-100 border-start border-3 border-success">
            <div className="card-body d-flex flex-column">
              <div className="d-flex align-items-center mb-2">
                <div className="avatar-sm rounded bg-success-subtle text-success d-flex align-items-center justify-content-center me-2" style={{ width: 40, height: 40 }}><i className="ri-stack-line fs-18" /></div>
                <div className="flex-grow-1">
                  <h5 className="mb-0">50 &amp; 200 EMA Support</h5>
                  <small className="text-muted">Accumulation · add {(ADD_DROP * 100).toFixed(0)}% below last buy</small>
                </div>
                {ema.dueToAdd > 0 && <span className="badge bg-warning-subtle text-warning">{ema.dueToAdd} due to add</span>}
              </div>
              <div className="row g-2 text-center my-2">
                <div className="col-4"><div className="text-muted small">Invested</div><div className="fw-semibold">{money(ema.invested, 'INR')}</div></div>
                <div className="col-4"><div className="text-muted small">Current</div><div className="fw-semibold">{money(ema.value, 'INR')}</div></div>
                <div className="col-4"><div className="text-muted small">Realised</div><div className="fw-semibold"><PnL v={ema.realised} /></div></div>
              </div>
              <div className="text-center mb-3">
                {ema.n > 0
                  ? <span className="text-muted small">Unrealised <PnL v={ema.unrealised} /> · {ema.held} of {ema.n} held</span>
                  : <span className="text-muted small">No stocks yet</span>}
              </div>
              <div className="mt-auto"><a className="btn btn-soft-success w-100" href="/wealth/eva-ezaak/ema-support"><i className="ri-external-link-line me-1" />Open</a></div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-4">
          <div className="card h-100 border-start border-3 border-info">
            <div className="card-body d-flex flex-column">
              <div className="d-flex align-items-center mb-2">
                <div className="avatar-sm rounded bg-info-subtle text-info d-flex align-items-center justify-content-center me-2" style={{ width: 40, height: 40 }}><i className="ri-swap-line fs-18" /></div>
                <div className="flex-grow-1"><h5 className="mb-0">Nifty–Gold Ratio</h5><small className="text-muted">Short-term rotation · 20-day break</small></div>
              </div>
              <div className="row g-2 text-center my-2">
                <div className="col-4"><div className="text-muted small">Invested</div><div className="fw-semibold">{money(ng.invested, 'INR')}</div></div>
                <div className="col-4"><div className="text-muted small">Current</div><div className="fw-semibold">{money(ng.value, 'INR')}</div></div>
                <div className="col-4"><div className="text-muted small">Realised</div><div className="fw-semibold"><PnL v={ng.realised} /></div></div>
              </div>
              <div className="text-center mb-3">{ng.invested > 0 || ng.value > 0 || ng.realised !== 0 ? <span className="text-muted small">Unrealised <PnL v={ng.unrealised} /></span> : <span className="text-muted small">No trades yet</span>}</div>
              <div className="mt-auto"><a className="btn btn-soft-info w-100" href="/wealth/eva-ezaak/nifty-gold"><i className="ri-external-link-line me-1" />Open</a></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
