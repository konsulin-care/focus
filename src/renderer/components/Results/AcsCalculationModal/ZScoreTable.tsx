import { useTranslation } from 'react-i18next';

export interface ZScoreDetails {
  responseTime: {
    subjectValue: number;
    normMean: number;
    normSD: number;
    result: number;
  };
  dPrime: {
    subjectValue: number;
    normMean: number;
    normSD: number;
    result: number;
  };
  variability: {
    subjectValue: number;
    normMean: number;
    normSD: number;
    result: number;
  };
}

interface ZScoreTableProps {
  zScores: ZScoreDetails;
}

/**
 * Z-score comparison table showing subject values vs normative data.
 */
export function ZScoreTable({ zScores }: ZScoreTableProps) {
  const { t } = useTranslation();
  
  return (
    <div className="bg-gray-800 p-4 rounded-lg mb-6">
      <h3 className="text-blue-400 font-medium mb-2">
        {t('results.acs.zScoreComparison')}
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-2">{t('results.acs.metric')}</th>
            <th className="text-right py-2">{t('results.acs.yourValue')}</th>
            <th className="text-right py-2">{t('results.acs.normMean')}</th>
            <th className="text-right py-2">{t('results.acs.normSD')}</th>
            <th className="text-right py-2">{t('results.acs.zScore')}</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-700">
            <td className="py-2 text-white">{t('results.acs.responseTime')}</td>
            <td className="text-right text-gray-300">{zScores.responseTime.subjectValue.toFixed(2)} ms</td>
            <td className="text-right text-gray-400">{zScores.responseTime.normMean.toFixed(2)}</td>
            <td className="text-right text-gray-400">{zScores.responseTime.normSD.toFixed(2)}</td>
            <td className="text-right text-green-400 font-medium">{zScores.responseTime.result.toFixed(2)}</td>
          </tr>
          <tr className="border-b border-gray-700">
            <td className="py-2 text-white">{t('results.acs.dPrime')}</td>
            <td className="text-right text-gray-300">{zScores.dPrime.subjectValue.toFixed(2)}</td>
            <td className="text-right text-gray-400">{zScores.dPrime.normMean.toFixed(2)}</td>
            <td className="text-right text-gray-400">{zScores.dPrime.normSD.toFixed(2)}</td>
            <td className="text-right text-green-400 font-medium">{zScores.dPrime.result.toFixed(2)}</td>
          </tr>
          <tr>
            <td className="py-2 text-white">{t('results.acs.variability')}</td>
            <td className="text-right text-gray-300">{zScores.variability.subjectValue.toFixed(2)} ms</td>
            <td className="text-right text-gray-400">{zScores.variability.normMean.toFixed(2)}</td>
            <td className="text-right text-gray-400">{zScores.variability.normSD.toFixed(2)}</td>
            <td className="text-right text-green-400 font-medium">{zScores.variability.result.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
