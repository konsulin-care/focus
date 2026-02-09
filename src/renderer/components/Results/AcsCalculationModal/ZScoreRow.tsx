interface ZScoreRowProps {
  label: string;
  subjectValue: number;
  normMean: number | null;
  normSD: number | null;
  result: number | null;
  unit?: string;
}

/**
 * Z-score table row component displaying a single metric comparison.
 */
export function ZScoreRow({ label, subjectValue, normMean, normSD, result, unit = '' }: ZScoreRowProps) {
  const formatValue = (value: number | null, suffix = '') => {
    if (value === null) return <span className="text-gray-500">—</span>;
    return `${value.toFixed(2)}${suffix}`;
  };

  return (
    <tr className="border-b border-gray-700">
      <td className="py-2 text-white">{label}</td>
      <td className="text-right text-gray-300">{subjectValue.toFixed(2)}{unit}</td>
      <td className="text-right text-gray-400">{formatValue(normMean)}</td>
      <td className="text-right text-gray-400">{formatValue(normSD)}</td>
      <td className="text-right text-green-400 font-medium">{formatValue(result)}</td>
    </tr>
  );
}
