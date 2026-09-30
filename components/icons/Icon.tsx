import { Icon as MdsIcon, type IconProps } from '@/components/mds';
import type { IconName } from './glyphs';

/** MDS Icon, narrowed to names the registry can draw. */
export function Icon({ name, ...rest }: Omit<IconProps, 'name'> & { name: IconName }) {
  return <MdsIcon name={name} {...rest} />;
}
