import type { SVGProps } from 'react';

const PATHS = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  explore: 'm21 3-6 18-4-8-8-4 18-6Z M11 13 21 3',
  leads: 'M8 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8 M3 3h5v18H3z M12 8h5 M12 12h5 M12 16h3',
  pipeline: 'M3 3h18v18H3z M9 3v18 M15 3v18 M5.5 7h1 M11.5 7h1 M17.5 7h1',
  settings: 'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
  collapse: 'M3 4h18v16H3z M8 4v16 M16 9l-3 3 3 3',
  expand: 'M3 4h18v16H3z M8 4v16 M13 9l3 3-3 3',
  arrow: 'M4 12h16 M14 6l6 6-6 6',
  filter: 'M4 5h16 M7 12h10 M10 19h4',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z M20 20l-4-4',
  close: 'M6 6l12 12 M18 6 6 18',
} as const;
export type IconName = keyof typeof PATHS;
export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={PATHS[name]} /></svg>;
}
