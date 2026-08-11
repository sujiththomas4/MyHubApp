import { useState } from 'react'
import { fmtDate } from '@/data/AppData'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import PasteImage from '@/components/ui/PasteImage'
import { useMyTrades, addMyTrade, editMyTrade, removeMyTrade, OUTLOOK, OUTLOOK_MAP } from '@/data/myTradesRepo'

/**
 * MyTrades.jsx — a simple trade observation log (route /my-trades). Add an
 * observation (date+time, BIAS / VIX / CRUDE, note + screenshot), then later add
 * the result (screenshot, justification, key takeaway).
 */
const rid = () => Math.random().toString(36).slice(2, 8)
const todayISO = () => new Date().toISOString().slice(0, 10)
const nowTime = () => new Date().toTimeString().slice(0, 5)

const OutlookSelect = ({ label, value, onChange }) => (
  <div className="col-md-4">
    <label className="form-label small mb-1">{label}</label>
    <select className="form-select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      {OUTLOOK.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
)
const Chip = ({ label, value }) => {
  const o = OUTLOOK_MAP[value]
  if (!o) return null
  return <span className={`badge fw-normal bg-${o.tone}-subtle text-${o.tone}`}>{label}: {o.short}</span>
}

// --- Observation form -------------------------------------------------------
function ObservationForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const save = async () => {
    setErr(null); setSaving(true)
    try { await onSave(f) } catch (e) { setErr(e.message || 'Could not save.'); setSaving(false) }
  }
  return (
    <>
      <div className="row g-2">
        <div className="col-md-4"><label className="form-label small mb-1">Date</label><input type="date" className="form-control" value={f.obsDate} onChange={(e) => set('obsDate', e.target.value)} /></div>
        <div className="col-md-4"><label className="form-label small mb-1">Time</label><input type="time" className="form-control" value={f.obsTime} onChange={(e) => set('obsTime', e.target.value)} /></div>
        <div className="col-12"><hr className="my-1" /><div className="small text-muted mb-1">Overall outlook</div></div>
        <OutlookSelect label="BIAS" value={f.bias} onChange={(v) => set('bias', v)} />
        <OutlookSelect label="VIX" value={f.vix} onChange={(v) => set('vix', v)} />
        <OutlookSelect label="CRUDE" value={f.crude} onChange={(v) => set('crude', v)} />
        <div className="col-12"><label className="form-label small mb-1">Observation</label><textarea className="form-control" rows={3} placeholder="What you are seeing / your read…" value={f.observation} onChange={(e) => set('observation', e.target.value)} /></div>
        <div className="col-12"><label className="form-label small mb-1">Screenshot</label><PasteImage value={f.obsImage} onChange={(v) => set('obsImage', v)} folder="trades/obs" label="chart screenshot" /></div>
      </div>
      {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}><i className="ri-save-3-line me-1" />{saving ? 'Saving…' : f.id ? 'Update' : 'Save observation'}</button>
      </div>
    </>
  )
}

// --- Result form ------------------------------------------------------------
function ResultForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const save = async () => {
    setErr(null); setSaving(true)
    try { await onSave(f) } catch (e) { setErr(e.message || 'Could not save.'); setSaving(false) }
  }
  return (
    <>
      <div className="row g-2">
        <div className="col-12"><label className="form-label small mb-1">Result screenshot</label><PasteImage value={f.resultImage} onChange={(v) => set('resultImage', v)} folder="trades/result" label="result screenshot" /></div>
        <div className="col-12"><label className="form-label small mb-1">Justification</label><textarea className="form-control" rows={3} placeholder="Why did it play out this way?" value={f.justification} onChange={(e) => set('justification', e.target.value)} /></div>
        <div className="col-12"><label className="form-label small mb-1">Key takeaway</label><textarea className="form-control" rows={2} placeholder="What will you do differently / remember?" value={f.keyTakeaway} onChange={(e) => set('keyTakeaway', e.target.value)} /></div>
      </div>
      {err && <div className="alert alert-danger py-2 mt-3 mb-0">{err}</div>}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button className="btn btn-light" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}><i className="ri-save-3-line me-1" />{saving ? 'Saving…' : 'Save result'}</button>
      </div>
    </>
  )
}

export default function MyTrades() {
  const { trades, reload } = useMyTrades()
  const [obsModal, setObsModal] = useState(null)   // { initial }
  const [resModal, setResModal] = useState(null)   // trade being resulted
  const [del, setDel] = useState(null)

  const openAdd = () => setObsModal({ initial: { obsDate: todayISO(), obsTime: nowTime(), bias: '', vix: '', crude: '', observation: '', obsImage: '' } })
  const saveObs = async (f) => {
    if (f.id) await editMyTrade(f)
    else await addMyTrade({ ...f, id: 'trd-' + rid() })
    await reload(); setObsModal(null)
  }
  const saveResult = async (f) => { await editMyTrade(f); await reload(); setResModal(null) }
  const confirmDelete = async () => { const t = del; setDel(null); await removeMyTrade(t.id); await reload() }

  const hasResult = (t) => t.resultImage || t.justification || t.keyTakeaway

  return (
    <div className="option-buying">
      <div className="page-title-box d-flex align-items-center">
        <h4 className="flex-grow-1 mb-0">My Trades</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item"><a href="/">Hub</a></li>
            <li className="breadcrumb-item">Trading Challenge</li>
            <li className="breadcrumb-item active" aria-current="page">My Trades</li>
          </ol>
        </nav>
      </div>

      <div className="d-flex align-items-center mb-3">
        <span className="text-muted small flex-grow-1">{trades.length} observation{trades.length === 1 ? '' : 's'}</span>
        <button className="btn btn-primary btn-sm" onClick={openAdd}><i className="ri-add-line me-1" />Add observation</button>
      </div>

      {trades.length === 0 ? (
        <div className="card"><div className="card-body text-center text-muted py-5">No observations yet. Log your first trade read. 📝</div></div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {trades.map((t) => (
            <div className="card mb-0" key={t.id}>
              <div className="card-body">
                <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
                  <span className="badge bg-primary-subtle text-primary"><i className="ri-calendar-2-line me-1" />{t.obsDate ? fmtDate(t.obsDate) : '—'}{t.obsTime ? ` · ${t.obsTime}` : ''}</span>
                  <Chip label="BIAS" value={t.bias} />
                  <Chip label="VIX" value={t.vix} />
                  <Chip label="CRUDE" value={t.crude} />
                  <span className="flex-grow-1" />
                  <button className="btn btn-sm btn-ghost-secondary p-1" title="Edit observation" onClick={() => setObsModal({ initial: { ...t } })}><i className="ri-pencil-line" /></button>
                  <button className="btn btn-sm btn-ghost-danger p-1" title="Delete" onClick={() => setDel(t)}><i className="ri-delete-bin-line" /></button>
                </div>

                <div className="row g-3">
                  {/* Observation */}
                  <div className="col-md-6">
                    <h6 className="small text-muted mb-1"><i className="ri-eye-line me-1" />Observation</h6>
                    {t.observation && <div className="mb-2" style={{ whiteSpace: 'pre-wrap' }}>{t.observation}</div>}
                    {t.obsImage && <a href={t.obsImage} target="_blank" rel="noreferrer"><img src={t.obsImage} alt="" style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, border: '1px solid var(--bs-border-color)' }} /></a>}
                  </div>
                  {/* Result */}
                  <div className="col-md-6 border-start">
                    <div className="d-flex align-items-center mb-1">
                      <h6 className="small text-muted mb-0 flex-grow-1"><i className="ri-flag-2-line me-1" />Result</h6>
                      <button className="btn btn-sm btn-soft-primary py-0" onClick={() => setResModal({ ...t })}><i className={(hasResult(t) ? 'ri-pencil-line' : 'ri-add-line') + ' me-1'} />{hasResult(t) ? 'Edit' : 'Add result'}</button>
                    </div>
                    {!hasResult(t) ? (
                      <div className="text-muted small fst-italic">No result yet. Add what happened next.</div>
                    ) : (
                      <>
                        {t.resultImage && <a href={t.resultImage} target="_blank" rel="noreferrer"><img src={t.resultImage} alt="" className="mb-2" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid var(--bs-border-color)' }} /></a>}
                        {t.justification && <div className="small mb-1"><span className="text-muted">Justification: </span>{t.justification}</div>}
                        {t.keyTakeaway && <div className="small"><span className="badge bg-success-subtle text-success me-1"><i className="ri-lightbulb-line me-1" />Takeaway</span>{t.keyTakeaway}</div>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={Boolean(obsModal)} size="lg" title={<><i className="ri-eye-line me-2 text-primary" />{obsModal?.initial?.id ? 'Edit observation' : 'New observation'}</>} onClose={() => setObsModal(null)}>
        {obsModal && <ObservationForm initial={obsModal.initial} onSave={saveObs} onCancel={() => setObsModal(null)} />}
      </Modal>

      <Modal open={Boolean(resModal)} size="lg" title={<><i className="ri-flag-2-line me-2 text-primary" />Trade result</>} onClose={() => setResModal(null)}>
        {resModal && <ResultForm initial={resModal} onSave={saveResult} onCancel={() => setResModal(null)} />}
      </Modal>

      <ConfirmDialog open={Boolean(del)} title="Delete observation?" message="This trade observation and its result will be removed." confirmLabel="Delete" onConfirm={confirmDelete} onCancel={() => setDel(null)} />
    </div>
  )
}
