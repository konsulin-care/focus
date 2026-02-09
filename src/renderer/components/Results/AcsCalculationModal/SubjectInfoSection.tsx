import { useTranslation } from 'react-i18next';
import { GridRow } from './GridRow';

interface SubjectInfoSectionProps {
  age: number;
  gender: string;
  normativeGroup: string;
}

/**
 * Subject information section displaying age, gender, and normative group.
 */
export function SubjectInfoSection({ age, gender, normativeGroup }: SubjectInfoSectionProps) {
  const { t } = useTranslation();
  
  return (
    <div className="grid grid-cols-2 gap-4 text-sm mb-6">
      <GridRow 
        label={`${t('results.acs.age')}:`} 
        value={age}
        labelClassName="text-gray-400"
        valueClassName="text-white ml-2"
      />
      <GridRow 
        label={`${t('results.acs.gender')}:`} 
        value={gender}
        labelClassName="text-gray-400"
        valueClassName="text-white ml-2"
      />
      <GridRow 
        label={`${t('results.acs.normativeGroup')}:`} 
        value={normativeGroup}
        labelClassName="text-gray-400"
        valueClassName="text-white ml-2"
      />
    </div>
  );
}
