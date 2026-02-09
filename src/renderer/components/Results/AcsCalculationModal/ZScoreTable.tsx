import { useTranslation } from 'react-i18next';
import { ZScoreRow } from './ZScoreRow';

export interface ZScoreDetails {
  responseTime: {
    subjectValue: number;
    normMean: number | null;
    normSD: number | null;
    result: number | null;
  };
  dPrime: {
    subjectValue: number;
    normMean: number | null;
    normSD: number | null;
    result: number | null;
  };
  variability: {
    subjectValue: number;
    normMean: number | null;
    normSD: number | null;
    result: number | null;
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
          <ZScoreRow 
            label={t('results.acs.responseTime')}
            subjectValue={zScores.responseTime.subjectValue}
            normMean={zScores.responseTime.normMean}
            normSD={zScores.responseTime.normSD}
            result={zScores.responseTime.result}
            unit=" ms"
          />
          <ZScoreRow 
            label={t('results.acs.dPrime')}
            subjectValue={zScores.dPrime.subjectValue}
            normMean={zScores.dPrime.normMean}
            normSD={zScores.dPrime.normSD}
            result={zScores.dPrime.result}
          />
          <ZScoreRow 
            label={t('results.acs.variability')}
            subjectValue={zScores.variability.subjectValue}
            normMean={zScores.variability.normMean}
            normSD={zScores.variability.normSD}
            result={zScores.variability.result}
            unit=" ms"
          />
        </tbody>
      </table>
    </div>
  );
}
