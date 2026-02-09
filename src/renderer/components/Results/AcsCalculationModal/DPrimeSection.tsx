import { useTranslation } from 'react-i18next';
import { GridRow } from './GridRow';

export interface DPrimeDetails {
  hitRate: number;
  falseAlarmRate: number;
  adjustedHitRate: number;
  adjustedFARate: number;
  zHit: number;
  zFA: number;
  result: number;
}

interface DPrimeSectionProps {
  dPrime: DPrimeDetails;
}

/**
 * D' calculation breakdown section showing signal detection metrics.
 */
export function DPrimeSection({ dPrime }: DPrimeSectionProps) {
  const { t } = useTranslation();
  
  return (
    <div className="bg-gray-800 p-4 rounded-lg mb-6">
      <h3 className="text-blue-400 font-medium mb-2">
        {t('results.acs.dPrimeCalculation')}
      </h3>
      <div className="space-y-2 text-sm">
        <GridRow 
          label={`${t('results.acs.hitRate')}:`} 
          value={`${(dPrime.hitRate * 100).toFixed(2)}%`}
          labelClassName="text-gray-400"
          valueClassName="text-white"
        />
        <GridRow 
          label={`${t('results.acs.falseAlarmRate')}:`} 
          value={`${(dPrime.falseAlarmRate * 100).toFixed(2)}%`}
          labelClassName="text-gray-400"
          valueClassName="text-white"
        />
        <hr className="border-gray-700 my-2" />
        <div className="text-blue-300">{t('results.acs.adjustedRates')}</div>
        <div className="ml-4">
          <GridRow 
            label={`${t('results.acs.hitRateAdjusted')}:`} 
            value={`${(dPrime.adjustedHitRate * 100).toFixed(4)}%`}
            labelClassName="text-gray-400"
            valueClassName="text-blue-300"
          />
          <GridRow 
            label={`${t('results.acs.falseAlarmAdjusted')}:`} 
            value={`${(dPrime.adjustedFARate * 100).toFixed(4)}%`}
            labelClassName="text-gray-400"
            valueClassName="text-blue-300"
          />
        </div>
        <hr className="border-gray-700 my-2" />
        <GridRow 
          label="zHit:" 
          value={dPrime.zHit.toFixed(2)}
          labelClassName="text-gray-400"
          valueClassName="text-white"
        />
        <GridRow 
          label="zFA:" 
          value={dPrime.zFA.toFixed(2)}
          labelClassName="text-gray-400"
          valueClassName="text-white"
        />
        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-700">
          <span className="text-gray-300 font-medium">{t('results.acs.dPrimeResult')}:</span>
          <span className="text-green-400 font-bold text-right">{dPrime.result.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
