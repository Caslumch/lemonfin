import * as React from 'react';

export interface AvatarProps {
  src?: string;
  /** Used for initials fallback. */
  name?: string;
  /** @default "md" */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Dark ring for overlapping stacks on dark cards. @default false */
  ring?: boolean;
  dimmed?: boolean;
  style?: React.CSSProperties;
}

/** Circular user avatar with photo or initials fallback. */
export function Avatar(props: AvatarProps): JSX.Element;
