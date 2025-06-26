
import { formatDistanceToNow } from 'date-fns';

export const formatRelativeTime = (date: Date) => {
  const distance = formatDistanceToNow(date, { addSuffix: true });
  return distance
    .replace('about ', '')
    .replace(' minutes ago', 'm')
    .replace(' minute ago', 'm')
    .replace(' hours ago', 'h')
    .replace(' hour ago', 'h')
    .replace(' days ago', 'd')
    .replace(' day ago', 'd')
    .replace(' weeks ago', 'w')
    .replace(' week ago', 'w')
    .replace(' months ago', 'mo')
    .replace(' month ago', 'mo');
};

export const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
