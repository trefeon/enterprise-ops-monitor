import React from 'react';

export default function Divider({ className = '' }) {
  return <hr className={`border-t border-border w-full my-4 ${className}`.trim()} />;
}
