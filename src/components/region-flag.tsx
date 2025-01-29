import clsx from 'clsx';

import { useRegion } from 'src/api/hooks/catalog';
import af from 'src/icons/flags/AF.png';
import de from 'src/icons/flags/DE.png';
import eu from 'src/icons/flags/EU.png';
import fr from 'src/icons/flags/FR.png';
import jp from 'src/icons/flags/JP.png';
import na from 'src/icons/flags/NA.png';
import nea from 'src/icons/flags/NEA.png';
import sa from 'src/icons/flags/SA.png';
import sea from 'src/icons/flags/SEA.png';
import sg from 'src/icons/flags/SG.png';
import us from 'src/icons/flags/US.png';

type RegionFlagProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  identifier?: string;
};

export function RegionFlag({ identifier, className, ...props }: RegionFlagProps) {
  const region = useRegion(identifier);
  const flag = region?.identifier ? map[region.identifier] : undefined;

  if (!flag) {
    return null;
  }

  return (
    <img
      src={flag}
      className={clsx(className, 'shadow-badge', {
        'rounded-full': region?.scope === 'metropolitan',
        rounded: region?.scope === 'continental',
      })}
      {...props}
    />
  );
}

const map: Record<string, string> = {
  na,
  sa,
  nea,
  sea,
  af,
  eu,
  fra: de,
  par: fr,
  sfo: us,
  sin: sg,
  tyo: jp,
  was: us,
  'aws-us-east-1': us,
};
