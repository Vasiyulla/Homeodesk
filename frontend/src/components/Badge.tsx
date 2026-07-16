import React from 'react';

interface BadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ variant = 'primary', children, className = '' }) => {
  return (
    <span className={`badge-${variant} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
