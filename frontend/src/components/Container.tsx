import React from 'react';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
}

const Container: React.FC<ContainerProps> = ({ children, className = '', narrow = false }) => {
  return (
    <div className={`${narrow ? 'max-w-3xl' : 'max-w-7xl'} mx-auto px-6 py-8 ${className}`}>
      {children}
    </div>
  );
};

export default Container;
