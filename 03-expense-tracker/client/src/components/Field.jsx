import { cloneElement, useId } from 'react';

// Label + input + error/hint text, wired up with ids for screen readers.
export default function Field({ label, error, hint, children, className = '' }) {
  const id = useId();
  const msgId = `${id}-msg`;
  const input = cloneElement(children, {
    id,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': error || hint ? msgId : undefined,
  });

  return (
    <div className={`field ${error ? 'invalid' : ''} ${className}`}>
      <label htmlFor={id}>{label}</label>
      {input}
      {(error || hint) && (
        <p id={msgId} className={error ? 'field-error' : 'field-hint'}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
