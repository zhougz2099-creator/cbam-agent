import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Task, TaskDraft } from '../types';
import {
  REMINDER_OPTIONS,
  TITLE_MAX,
  addDays,
  countTitleCharacters,
  dueMoment,
  formatMoment,
  normalizeTitle,
  toDateKey,
  todayKey,
  validateTitle,
} from '../lib/tasks';
import { CheckIcon, CloseIcon, TrashIcon } from './Icon';

interface TaskSheetProps {
  mode: 'create' | 'edit';
  task: Task | null;
  now: Date;
  onCreate: (draft: TaskDraft) => void;
  onUpdate: (id: string, draft: TaskDraft) => void;
  onDelete: (task: Task) => void;
  onClose: () => void;
}

function emptyDraft(): TaskDraft {
  return { title: '', dueDate: null, dueTime: null, reminder: 'none' };
}

function draftFromTask(task: Task): TaskDraft {
  return {
    title: task.title,
    dueDate: task.dueDate,
    dueTime: task.dueTime,
    reminder: task.reminder,
  };
}

function normalizeDraft(draft: TaskDraft): TaskDraft {
  return {
    title: normalizeTitle(draft.title),
    dueDate: draft.dueDate,
    dueTime: draft.dueDate ? draft.dueTime : null,
    reminder: draft.dueDate ? draft.reminder : 'none',
  };
}

export function TaskSheet({ mode, task, now, onCreate, onUpdate, onDelete, onClose }: TaskSheetProps) {
  const editing = mode === 'edit' && task !== null;
  const [draft, setDraft] = useState<TaskDraft>(() =>
    editing && task ? draftFromTask(task) : emptyDraft(),
  );
  const [touched, setTouched] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [customOpen, setCustomOpen] = useState(() => {
    if (!task?.dueDate) return false;
    const today = todayKey(now);
    const tomorrow = toDateKey(addDays(now, 1));
    return task.dueDate !== today && task.dueDate !== tomorrow;
  });

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const initialized = useRef(false);
  const taskId = task?.id ?? null;

  const error = validateTitle(draft.title);
  const length = countTitleCharacters(draft.title);
  const showError = Boolean(error && (touched || length > TITLE_MAX || editing));
  const today = todayKey(now);
  const tomorrow = toDateKey(addDays(now, 1));
  const due = dueMoment({ dueDate: draft.dueDate, dueTime: draft.dueTime });
  const isPast = Boolean(due && due.getTime() < now.getTime() && !task?.completedAt);

  useEffect(() => {
    if (mode === 'create') titleRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        requestClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, mode, taskId]);

  useEffect(() => {
    if (!editing || !taskId) return;
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    if (validateTitle(draft.title)) return;
    const timer = window.setTimeout(() => {
      onUpdateRef.current(taskId, normalizeDraft(draft));
      setSavedAt(Date.now());
    }, 300);
    return () => window.clearTimeout(timer);
    // taskId is stable for the lifetime of the sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, editing, taskId]);

  function requestClose() {
    if (editing && taskId && !validateTitle(draft.title)) {
      onUpdateRef.current(taskId, normalizeDraft(draft));
    }
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (validateTitle(draft.title)) return;
    onCreate(normalizeDraft(draft));
  }

  function handleDelete() {
    if (!task) return;
    if (validateTitle(draft.title)) {
      onDelete(task);
      return;
    }
    // Keep the latest edits in the undo snapshot even if the auto-save
    // debounce has not fired yet.
    onDelete({
      ...task,
      ...normalizeDraft(draft),
      updatedAt: new Date().toISOString(),
    });
  }

  function setDueDate(value: string | null) {
    setDraft((current) => ({
      ...current,
      dueDate: value,
      dueTime: value ? current.dueTime : null,
      reminder: value ? current.reminder : 'none',
    }));
  }

  function chooseQuickDay(day: 'today' | 'tomorrow') {
    setCustomOpen(false);
    setDueDate(day === 'today' ? today : tomorrow);
  }

  function clearDate() {
    setCustomOpen(false);
    setDueDate(null);
  }

  return (
    <div
      className="sheet-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
      >
        <div className="sheet__grabber" aria-hidden="true" />

        <header className="sheet__header">
          <h2 id="sheet-title">{editing ? '任务详情' : '新任务'}</h2>
          <div className="sheet__header-actions">
            {editing && savedAt ? (
              <span key={savedAt} className="save-hint">
                <CheckIcon size={13} /> 已保存
              </span>
            ) : null}
            <button type="button" className="icon-button" aria-label="关闭" onClick={requestClose}>
              <CloseIcon size={21} />
            </button>
          </div>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="task-title">
              标题
            </label>
            <textarea
              id="task-title"
              ref={titleRef}
              className="title-input"
              rows={2}
              value={draft.title}
              placeholder="记下一件小事"
              onChange={(event) => {
                setTouched(true);
                setDraft((current) => ({ ...current, title: event.target.value }));
              }}
              onBlur={() => setTouched(true)}
            />
            <div className="field__feedback">
              <span className={`field__error${showError ? ' is-visible' : ''}`} role="alert">
                {showError ? error : ''}
              </span>
              <span className={`title-counter${length > TITLE_MAX ? ' is-over' : ''}`}>
                {length}/{TITLE_MAX}
              </span>
            </div>
          </div>

          <div className="field">
            <span className="field__label">截止日期</span>
            <div className="chips">
              <button
                type="button"
                className={`chip${!customOpen && draft.dueDate === today ? ' is-active' : ''}`}
                onClick={() => chooseQuickDay('today')}
              >
                今天
              </button>
              <button
                type="button"
                className={`chip${!customOpen && draft.dueDate === tomorrow ? ' is-active' : ''}`}
                onClick={() => chooseQuickDay('tomorrow')}
              >
                明天
              </button>
              <button
                type="button"
                className={`chip${customOpen ? ' is-active' : ''}`}
                onClick={() => setCustomOpen(true)}
              >
                自定义
              </button>
              {draft.dueDate ? (
                <button type="button" className="text-button chips__clear" onClick={clearDate}>
                  不设日期
                </button>
              ) : null}
            </div>

            {customOpen ? (
              <label className="input-row">
                <span className="input-row__label">日期</span>
                <input
                  type="date"
                  className="text-input"
                  value={draft.dueDate ?? ''}
                  onChange={(event) => setDueDate(event.target.value || null)}
                />
              </label>
            ) : null}

            {draft.dueDate ? (
              <div className="field-grid">
                <label className="input-row">
                  <span className="input-row__label">时间</span>
                  <span className="input-with-clear">
                    <input
                      type="time"
                      className="text-input"
                      value={draft.dueTime ?? ''}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          dueTime: event.target.value || null,
                        }))
                      }
                    />
                    {draft.dueTime ? (
                      <button
                        type="button"
                        className="text-button input-with-clear__button"
                        onClick={() =>
                          setDraft((current) => ({ ...current, dueTime: null }))
                        }
                      >
                        清除
                      </button>
                    ) : null}
                  </span>
                </label>

                <label className="input-row">
                  <span className="input-row__label">提醒</span>
                  <span className="select-wrap">
                    <select
                      className="text-input"
                      value={draft.reminder}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          reminder: event.target.value as TaskDraft['reminder'],
                        }))
                      }
                    >
                      {REMINDER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </span>
                </label>
              </div>
            ) : (
              <p className="field__hint">设置截止日期后，可添加时间和提醒。</p>
            )}

            {isPast ? <p className="field__hint is-warning">该时间已过，任务会标记为逾期。</p> : null}
          </div>

          {editing && task ? (
            <div className="task-facts">
              <span>创建于 {formatMoment(task.createdAt, now)}</span>
              {task.completedAt ? <span>完成于 {formatMoment(task.completedAt, now)}</span> : null}
            </div>
          ) : null}

          {editing ? (
            <div className="sheet__footer">
              <p className="sheet__footnote">修改会自动保存</p>
              <button type="button" className="delete-link" onClick={handleDelete}>
                <TrashIcon size={16} />
                删除任务
              </button>
            </div>
          ) : (
            <button type="submit" className="primary-button sheet__submit" disabled={Boolean(error)}>
              添加任务
            </button>
          )}
        </form>
      </section>
    </div>
  );
}
