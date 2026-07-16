import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  helperText?: string;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  error,
  options,
  placeholder = 'Select...',
  helperText,
  className = '',
  id,
  ...props
}) => {
  const fieldId = id || props.name || label?.toLowerCase().replace(/\s+/g, '_');

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-surface-700 mb-1.5">
          {label}
          {props.required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <select
        id={fieldId}
        className={`
          input-field appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:1.25rem] bg-[right_0.75rem_center] pr-10
          ${error ? 'border-red-400 bg-red-50/50' : ''}
          ${className}
        `}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-xs mt-1.5 font-medium">{error}</p>}
      {helperText && !error && (
        <p className="text-surface-400 text-xs mt-1.5">{helperText}</p>
      )}
    </div>
  );
};

export default SelectField;
