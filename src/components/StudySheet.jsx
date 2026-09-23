import React, { useEffect, useRef } from "react";

// Native modal: focus stays inside, Escape closes, and focus returns to the opener.
export default function StudySheet({ open, onClose, title, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const node = dialog.current;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="study-sheet"
      onCancel={onClose}
      onClose={onClose}
      aria-label={title}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="study-sheet-content">
        <header className="flex items-center justify-between gap-3 mb-5">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold"
          >
            Listo
          </button>
        </header>
        {open && children}
      </div>
    </dialog>
  );
}
