import type { CompanionMessage as Message } from '../../lib/types';
import { Pip } from './Pip';

export function CompanionMessage({
  message,
  showPip = true,
  name = 'Pip',
  size = 40,
}: {
  message: Message;
  showPip?: boolean;
  name?: string;
  size?: 40 | 72;
}) {
  return (
    <div className="flex items-start gap-3" role="note" aria-label={`${name} says`}>
      {showPip && <Pip pose={message.pose} size={size} name={name} />}
      <p className="rounded-tile bg-accent-soft px-4 py-3 text-sm leading-relaxed text-text">
        {message.text}
      </p>
    </div>
  );
}
