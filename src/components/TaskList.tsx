import type { Task } from '../types';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  now: Date;
  completing: Record<string, boolean>;
  onOpen: (id: string) => void;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskList({ tasks, now, completing, onOpen, onToggle, onDelete }: TaskListProps) {
  return (
    <ul className="task-list" aria-label="任务列表">
      {tasks.map((task, index) => (
        <TaskItem
          key={task.id}
          task={task}
          index={index}
          now={now}
          completing={Boolean(completing[task.id])}
          onOpen={onOpen}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
