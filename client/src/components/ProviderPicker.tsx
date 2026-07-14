import type { AIProviderName, ProviderOption } from '@matchmind/shared';

interface ProviderPickerProps {
  providers: ProviderOption[];
  value: AIProviderName;
  disabled?: boolean;
  onChange: (provider: AIProviderName) => void;
}

export function ProviderPicker({ providers, value, disabled, onChange }: ProviderPickerProps) {
  return (
    <div className="provider-picker" role="radiogroup" aria-label="AI provider">
      {providers.map((provider) => {
        const selected = provider.id === value;
        const unavailable = !provider.available;

        return (
          <button
            key={provider.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled || unavailable}
            className={[
              'provider-option',
              selected ? 'provider-option--selected' : '',
              unavailable ? 'provider-option--unavailable' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onChange(provider.id)}
          >
            <span className="provider-option__label">{provider.label}</span>
            <span className="provider-option__hint">
              {unavailable ? 'API key not configured' : 'Embeddings and analysis'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
