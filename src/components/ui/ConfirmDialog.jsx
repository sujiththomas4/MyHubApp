import Modal from './Modal'

/**
 * ConfirmDialog.jsx
 * -----------------------------------------------------------------------------
 * Reusable confirmation popup (replaces window.confirm). Built on <Modal />.
 *
 *   <ConfirmDialog
 *     open={Boolean(target)}
 *     title="Delete trade log?"
 *     message="This can't be undone."
 *     confirmLabel="Delete"
 *     tone="danger"
 *     onConfirm={doDelete}
 *     onCancel={() => setTarget(null)}
 *   />
 */
export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger', // maps to btn-<tone> + the icon colour
  onConfirm,
  onCancel,
}) {
  return (
    <Modal open={open} size="sm" title={title} onClose={onCancel}>
      <div className="text-center py-2">
        <i className={`ri-error-warning-line d-block mb-3 text-${tone}`} style={{ fontSize: '2.75rem', lineHeight: 1 }} />
        {message && <p className="text-muted mb-4">{message}</p>}
        <div className="d-flex justify-content-center gap-2">
          <button className="btn btn-light btn-sm" onClick={onCancel}>{cancelLabel}</button>
          <button className={`btn btn-sm btn-${tone}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </Modal>
  )
}
