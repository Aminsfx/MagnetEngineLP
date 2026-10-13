import React, { useState } from 'react';

type NativeProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'min' | 'max'
>;

interface NumberFieldProps extends NativeProps {
  value: number;
  /** Called once per edit, on blur or Enter, with the clamped whole number. */
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
}

/**
 * A whole-number input the Operator can clear and retype.
 *
 * The inputs this replaces were controlled `type="number"` fields that clamped
 * on every keystroke, so deleting "3" to type "10" read as 0, snapped straight
 * back to the minimum, and the box could never be emptied. Here the keystrokes
 * live in a local draft and the value is only clamped and handed up when the
 * Operator leaves the field or presses Enter. An emptied field that loses focus
 * keeps the value it had.
 *
 * `type="text"` + `inputMode="numeric"` rather than `type="number"`: the
 * number type accepts "e" and "-", and a scroll wheel over it changes the value.
 */
export const NumberField: React.FC<NumberFieldProps> = ({
  value, onCommit, min, max, onBlur, onKeyDown, ...rest
}) => {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    setDraft(null);
    if (draft === '') return;
    const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, Number(draft)));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={draft ?? String(value)}
      onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
      onBlur={(e) => { commit(); onBlur?.(e); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setDraft(null);
        onKeyDown?.(e);
      }}
    />
  );
};
