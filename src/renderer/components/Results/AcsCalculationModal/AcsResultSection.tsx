import { useTranslation } from 'react-i18next';
import { GridRow } from './GridRow';

export interface AcsDetails {
  rtZ: number;
  dPrimeZ: number;
  variabilityZ: number;
  constant: number;
  result: number;
}

interface AcsResultSectionProps {
  acs: AcsDetails;
}

/**
 * Final ACS calculation section showing formula breakdown.
 */
export function AcsResultSection({ acs }: AcsResultSectionProps) {
  const { t } = useTranslation();
  
  return (
    <div className="bg-blue-900/50 p-4 rounded-lg mb-6">
      <h3 className="text-blue-400 font-medium mb-2">
        {t('results.acs.finalAcs')}
      </h3>
      <div className="space-y-2 text-sm">
        <GridRow 
          label={t('results.acs.rtZFormula')} 
          value={acs.rtZ.toFixed(2)}
          labelClassName="text-gray-300"
          valueClassName="text-white text-right"
        />
        <GridRow 
          label={t('results.acs.dPrimeZFormula')} 
          value={acs.dPrimeZ.toFixed(2)}
          labelClassName="text-gray-300"
          valueClassName="text-white text-right"
        />
        <GridRow 
          label={t('results.acs.variabilityZFormula')} 
          value={acs.variabilityZ.toFixed(2)}
          labelClassName="text-gray-300"
          valueClassName="text-white text-right"
        />
        <GridRow 
          label={t('results.acs.constantFormula')} 
          value={`+${acs.constant.toFixed(2)}`}
          labelClassName="text-gray-300"
          valueClassName="text-white text-right"
        />
        <hr className="border-blue-700 my-3" />
        <div className="grid grid-cols-2 gap-2">
          <span className="text-white font-bold text-lg">{t('results.acs.finalResult')}:</span>
          <span className="text-green-400 font-bold text-2xl text-right">
            {acs.result.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
