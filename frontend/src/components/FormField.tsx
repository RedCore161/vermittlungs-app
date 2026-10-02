import { useId, type InputHTMLAttributes } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  errors?: string[];
}

export function FormField({ label, errors, ...inputProps }: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hasErrors = Boolean(errors?.length);

  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={hasErrors || undefined}
        aria-describedby={hasErrors ? errorId : undefined}
        {...inputProps}
      />
      {hasErrors && (
        <ul id={errorId} className="field-errors">
          {errors!.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
