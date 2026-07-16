import React from 'react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  helperText,
  icon,
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
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
            {icon}
          </div>
        )}
        <input
          id={fieldId}
          className={`
            input-field
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-400 bg-red-50/50 focus:ring-red-100 focus:border-red-400' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-red-500 text-xs mt-1.5 font-medium">{error}</p>}
      {helperText && !error && (
        <p className="text-surface-400 text-xs mt-1.5">{helperText}</p>
      )}
    </div>
  );
};

export default InputField;
