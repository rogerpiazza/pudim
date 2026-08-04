// Modal de confirmação reutilizável — resolve `true` (confirmou) ou `false`
// (cancelou/fechou). Usado antes de qualquer exclusão no app.
export function confirmDialog({ title = 'Confirmar exclusão', message, confirmLabel = 'Excluir' } = {}) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('confirm-modal-overlay');
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const btnCancel = document.getElementById('confirm-modal-cancel');
    const btnConfirm = document.getElementById('confirm-modal-confirm');

    titleEl.textContent = title;
    msgEl.textContent = message || 'Essa ação não pode ser desfeita.';
    btnConfirm.textContent = confirmLabel;
    overlay.classList.add('show');

    function cleanup(result) {
      overlay.classList.remove('show');
      btnCancel.removeEventListener('click', onCancel);
      btnConfirm.removeEventListener('click', onConfirm);
      overlay.removeEventListener('click', onOverlayClick);
      document.removeEventListener('keydown', onKeydown);
      resolve(result);
    }
    function onCancel() { cleanup(false); }
    function onConfirm() { cleanup(true); }
    function onOverlayClick(e) { if (e.target === overlay) cleanup(false); }
    function onKeydown(e) { if (e.key === 'Escape') cleanup(false); }

    btnCancel.addEventListener('click', onCancel);
    btnConfirm.addEventListener('click', onConfirm);
    overlay.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onKeydown);
    btnConfirm.focus();
  });
}
