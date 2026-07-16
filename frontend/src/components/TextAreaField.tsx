import React from 'react';

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const TextAreaField: React.FC<TextAreaFieldProps> = ({
  label,
  error,
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
      <textarea
        id={fieldId}
        className={`
          input-field resize-none
          ${error ? 'border-red-400 bg-red-50/50' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-red-500 text-xs mt-1.5 font-medium">{error}</p>}
    </div>
  );
};

export default TextAreaField;
