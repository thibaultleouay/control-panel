import { DocumentTitle } from 'src/components/document-title';
import { Translate } from 'src/intl/translate';
import { ServiceCreation } from 'src/modules/service-creation/service-creation';

const T = Translate.prefix('pages.createService');

export function CreateServicePage() {
  const t = T.useTranslate();

  return (
    <>
      <DocumentTitle title={t('documentTitle')} />
      <ServiceCreation />
    </>
  );
}
