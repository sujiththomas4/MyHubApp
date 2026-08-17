-- Swing 50 — expand the watchlist to the full A/B/C/H universe and record the
-- thesis ("why this bucket") for every name.
--
-- New: MAZDOCK, COALINDIA (A) · DIVISLAB, DMART, CUMMINSIND (B) ·
--      BAJAJ-AUTO, POLYCAB (C). Existing 16 get their rationale backfilled.
-- LTP is not stored on the watchlist — it lives on the trade when planned.
--
-- Run once in: Supabase -> SQL Editor -> New query -> Run. Safe to re-run.

alter table swing50_watchlist add column if not exists rationale text;

insert into swing50_watchlist (id, ticker, name, bucket, sector, rationale) values
  -- Bucket A — escalation beneficiaries (max 30% deployed)
  ('wl-ongc',       'ONGC',       'Oil & Natural Gas Corp', 'A', 'Upstream oil',        'Higher crude = higher realizations'),
  ('wl-oil',        'OIL',        'Oil India',              'A', 'Upstream oil',        'Same driver as ONGC, smaller float'),
  ('wl-hal',        'HAL',        'Hindustan Aeronautics',  'A', 'Defence',             'Conflict narrative + order book'),
  ('wl-bel',        'BEL',        'Bharat Electronics',     'A', 'Defence electronics', 'Same narrative, more liquid, lower price/ATR'),
  ('wl-hindalco',   'HINDALCO',   'Hindalco Industries',    'A', 'Metals',              'Supply-tightness commodity play'),
  ('wl-coalindia',  'COALINDIA',  'Coal India',             'A', 'Mining/energy',       'Energy-price spillover winner'),
  ('wl-mazdock',    'MAZDOCK',    'Mazagon Dock',           'A', 'Shipbuilding/defence','Naval narrative — high ATR, will often fail the feasibility check; trade only when it passes'),
  -- Bucket B — oil-neutral / rupee winners (40-50%, the core)
  ('wl-infy',       'INFY',       'Infosys',                'B', 'IT',                  'Dollar earner, weak-rupee winner'),
  ('wl-hcltech',    'HCLTECH',    'HCL Technologies',       'B', 'IT',                  'Dollar earner, weak-rupee winner'),
  ('wl-sunpharma',  'SUNPHARMA',  'Sun Pharma',             'B', 'Pharma',              'Export earner, crude-indifferent'),
  ('wl-cipla',      'CIPLA',      'Cipla',                  'B', 'Pharma',              'Export earner, crude-indifferent'),
  ('wl-divislab',   'DIVISLAB',   'Divi''s Laboratories',   'B', 'Pharma/API',          'Debt-free exporter'),
  ('wl-hindunilvr', 'HINDUNILVR', 'Hindustan Unilever',     'B', 'FMCG',                'Defensive domestic demand'),
  ('wl-dmart',      'DMART',      'Avenue Supermarts',      'B', 'Retail',              'Domestic defensive, debt-free'),
  ('wl-muthootfin', 'MUTHOOTFIN', 'Muthoot Finance',        'B', 'Gold NBFC',           'Gold rally = collateral value up'),
  ('wl-cumminsind', 'CUMMINSIND', 'Cummins India',          'B', 'Engines/industrials', 'Domestic capex cycle, debt-free'),
  -- Bucket C — de-escalation / relief-rally plays (max 30%, tightest stops)
  ('wl-indigo',     'INDIGO',     'InterGlobe Aviation',    'C', 'Aviation',            'Purest oil-loser -> biggest peace winner'),
  ('wl-maruti',     'MARUTI',     'Maruti Suzuki',          'C', 'Auto',                'Fuel cost + sentiment recovery'),
  ('wl-bajajauto',  'BAJAJ-AUTO', 'Bajaj Auto',             'C', 'Auto',                'Fuel cost + sentiment recovery; exports add a B-flavour'),
  ('wl-asianpaint', 'ASIANPAINT', 'Asian Paints',           'C', 'Paints',              'Crude-derivative inputs ease'),
  ('wl-bpcl',       'BPCL',       'Bharat Petroleum',       'C', 'OMC',                 'Marketing margin recovery on crude fall'),
  ('wl-polycab',    'POLYCAB',    'Polycab India',          'C', 'Cables',              'Polymer inputs + capex sentiment'),
  -- Bucket H — hedge sleeve (fixed ~10%), no stop, not counted in the 8 positions
  ('wl-goldbees',   'GOLDBEES',   'Nippon Gold BeES',       'H', 'Hedge',               'Fixed hedge sleeve — no stop, outside the 8-position count')
on conflict (id) do update set
  ticker    = excluded.ticker,
  name      = excluded.name,
  bucket    = excluded.bucket,
  sector    = excluded.sector,
  rationale = excluded.rationale;

notify pgrst, 'reload schema';
