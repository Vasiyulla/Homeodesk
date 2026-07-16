import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
  noPadding?: boolean;
}

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  icon,
  children,
  className = '',
  interactive = false,
  onClick,
  noPadding = false,
}) => {
  const Wrapper = interactive ? motion.div : 'div';
  const wrapperProps = interactive
    ? { whileHover: { y: -2 }, transition: { duration: 0.2 } }
    : {};

  return (
    <Wrapper
      className={`
        ${interactive ? 'glass-card-interactive' : 'glass-card'}
        ${noPadding ? '' : 'p-6'}
        ${className}
      `}
      onClick={onClick}
      {...(wrapperProps as Record<string, unknown>)}
    >
      {(title || subtitle || icon) && (
        <div className="flex items-start gap-3 mb-4">
          {icon && (
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600">
              {icon}
            </div>
          )}
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-surface-900">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-surface-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      )}
      {children}
    </Wrapper>
  );
};

export default Card;
