import type { SVGProps } from 'react';

/**
 * Símbolo do Helix. Inline em vez de <img src="logo.svg"> porque um arquivo
 * carregado como imagem não enxerga as variáveis de tema da página — ficaria
 * preso numa cor só.
 *
 * O fundo usa a cor da própria navegação, então o quadrado some no painel e
 * só a hélice aparece. Os traços seguem `currentColor`, que na marca é a cor
 * de texto do tema ativo.
 */
export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={31}
      height={31}
      fill="none"
      role="img"
      aria-label="Helix"
      {...props}
    >
      <path d="M100 0H0V100H100V0Z" fill="var(--surface)" />
      <g
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M32.5 25V47.5C32.5 47.5 40 40 50 40C60 40 67.5 47.5 67.5 47.5V25" />
        <path d="M32.5 52.5C32.5 52.5 40 60 50 60C60 60 67.5 52.5 67.5 52.5V75" />
        <path d="M32.5 52.5V75" />
      </g>
      <circle cx="50" cy="50" r="2" fill="currentColor" />
    </svg>
  );
}
