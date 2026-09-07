'use client';

import { useRef, useState } from 'react';
import * as Primitive from '@radix-ui/react-select';

type Option = { value: string | number; label: string };
interface Props {
  value: string | number;
  onValueChange: (value: string) => void;
  options: readonly Option[];
  'aria-label': string;
  disabled?: boolean;
  placeholder?: string;
}
const EMPTY = '__helix_empty__';

export function Select({ value, onValueChange, options, disabled, placeholder = 'Selecione', 'aria-label': label }: Props) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [container, setContainer] = useState<HTMLElement | undefined>();
  return <Primitive.Root value={String(value) || EMPTY} disabled={disabled} onValueChange={(next) => onValueChange(next === EMPTY ? '' : next)}
    onOpenChange={(open) => { if (open) setContainer(trigger.current?.closest('dialog') ?? undefined); }}>
    <Primitive.Trigger ref={trigger} className="select-trigger" aria-label={label}>
      <Primitive.Value placeholder={placeholder} />
      <Primitive.Icon className="select-chevron"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" /></svg></Primitive.Icon>
    </Primitive.Trigger>
    <Primitive.Portal container={container}>
      <Primitive.Content className="select-content" position="popper" sideOffset={5} collisionPadding={12}>
        <Primitive.ScrollUpButton className="select-scroll">⌃</Primitive.ScrollUpButton>
        <Primitive.Viewport className="select-viewport">
          {options.map((option) => <Primitive.Item key={option.value} value={String(option.value) || EMPTY} className="select-option">
            <Primitive.ItemText>{option.label}</Primitive.ItemText>
            <Primitive.ItemIndicator className="select-check"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true"><path d="m3 8 3 3 7-7" stroke="currentColor" strokeWidth="1.5" /></svg></Primitive.ItemIndicator>
          </Primitive.Item>)}
        </Primitive.Viewport>
        <Primitive.ScrollDownButton className="select-scroll">⌄</Primitive.ScrollDownButton>
      </Primitive.Content>
    </Primitive.Portal>
  </Primitive.Root>;
}
