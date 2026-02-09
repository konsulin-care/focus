import React from 'react';

interface GridRowProps {
  label: string;
  value: React.ReactNode;
  labelClassName?: string;
  valueClassName?: string;
}

/**
 * Reusable grid row component for consistent label-value display.
 * Reduces nesting from div > div > span > span to a single component.
 */
export function GridRow({ label, value, labelClassName = '', valueClassName = '' }: GridRowProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <span className={labelClassName}>{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}
