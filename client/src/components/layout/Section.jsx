import React from 'react';

/**
 * Canonical page section wrapper ensuring all content sections sit on the exact same
 * 1280px (max-w-7xl) grid with responsive horizontal padding (px-5 sm:px-6 lg:px-8).
 */
const Section = ({ as: Tag = 'div', className = '', children, ...props }) => (
  <Tag className={`max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 ${className}`} {...props}>
    {children}
  </Tag>
);

export default Section;
