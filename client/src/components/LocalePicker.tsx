import { useState, useRef, useEffect } from 'react';
import { LANGUAGES, COUNTRIES, type LocaleOption } from '../lib/geoOptions';
import './LocalePicker.css';

interface Props {
  lang: string;
  country: string;
  disabled: boolean;
  onLangChange: (code: string) => void;
  onCountryChange: (code: string) => void;
}

function DropdownPicker({
  options,
  value,
  onChange,
  disabled,
  label,
}: {
  options: LocaleOption[];
  value: string;
  onChange: (code: string) => void;
  disabled: boolean;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find((o) => o.code === value) || options[0];

  const buttonText = selected.code
    ? `${selected.flag} ${selected.code.toUpperCase()}`
    : `${selected.flag} ${label}`;

  return (
    <div className="locale-dropdown" ref={ref} role="listbox" aria-label={label}>
      <button
        className="locale-btn"
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {buttonText}
      </button>
      {open && (
        <div className="locale-menu" role="presentation">
          <div className="locale-menu-label">{label}</div>
          {options.map((o) => (
            <button
              key={o.code}
              className={`locale-option${o.code === value ? ' active' : ''}`}
              type="button"
              role="option"
              aria-selected={o.code === value}
              onClick={() => {
                onChange(o.code);
                setOpen(false);
              }}
            >
              {o.code
                ? `${o.flag} ${o.code.toUpperCase()} — ${o.nativeName}`
                : `🌐 ${o.name}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function LocalePicker({
  lang,
  country,
  disabled,
  onLangChange,
  onCountryChange,
}: Props) {
  return (
    <div className="locale-picker">
      <DropdownPicker
        options={LANGUAGES}
        value={lang}
        onChange={onLangChange}
        disabled={disabled}
        label="Language"
      />
      <DropdownPicker
        options={COUNTRIES}
        value={country}
        onChange={onCountryChange}
        disabled={disabled}
        label="Country"
      />
    </div>
  );
}
