import { useEffect, useRef } from 'react';

// Wraps <dialog> so we get focus trapping and Esc-to-close from the browser.
export default function Modal({ open, title, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dlg = ref.current;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="modal-title"
    >
      <div className="modal-inner">
        <header className="modal-head">
          <h2 id="modal-title">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </header>
        {open && children}
      </div>
    </dialog>
  );
}
