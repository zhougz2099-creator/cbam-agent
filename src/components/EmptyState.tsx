import type { View } from '../types';
import { EmptyIllustration } from './Icon';

const COPY: Record<View, { title: string; body: string }> = {
  today: {
    title: '今天还没有任务',
    body: '点右下角的 + 添加一件小事吧',
  },
  all: {
    title: '还没有待办',
    body: '3 秒记下一件事，开始吧',
  },
  done: {
    title: '还没有完成的任务',
    body: '完成一件，就轻一点',
  },
};

export function EmptyState({ view }: { view: View }) {
  const copy = COPY[view];
  return (
    <div className="empty-state">
      <EmptyIllustration className="empty-state__art" />
      <h2>{copy.title}</h2>
      <p>{copy.body}</p>
    </div>
  );
}
