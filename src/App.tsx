
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity, Archive, BarChart3, Bell, CalendarDays, Check, CheckCircle2, ChevronLeft, Cloud, CloudOff,
  ChevronRight, Circle, Clock3, Download, Flame, LayoutDashboard, List, ListTodo,
  MoreHorizontal, Pencil, Plus, Search, Settings, Target, Trash2, Upload, Wifi, X
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts';
import { loadData, replaceData, saveData } from './lib/db';
import { connectCloudSync, disconnectCloudSync, getStoredSyncKey, type CloudSyncStatus } from './lib/cloud';
import type { Activity as ActivityItem, AppData, Habit, HabitLog, Priority, Task, TaskStatus } from './types';

type Page = 'Dashboard' | 'Tasks' | 'Habits' | 'Calendar' | 'Statistics' | 'History' | 'Archive' | 'Settings';
type TaskDraft = Pick<Task, 'title' | 'description' | 'category' | 'priority' | 'status' | 'dueDate' | 'dueTime'>;
type HabitDraft = Pick<Habit, 'name' | 'description' | 'type' | 'days' | 'weeklyTarget' | 'goalValue' | 'unit' | 'color'>;
const EMPTY: AppData = { tasks: [], habits: [], logs: [], activities: [], settings: { notifications: false, quietHours: false } };
const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];
const STATUSES: TaskStatus[] = ['Todo', 'In Progress', 'Completed'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COLORS = ['#9b83f6', '#34c98a', '#f4b45f', '#e879a6', '#5da9f6', '#d28b54'];
const uid = () => crypto.randomUUID();
const today = (date = new Date()) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
const shift = (value: string, days: number) => { const d = new Date(value + 'T12:00:00'); d.setDate(d.getDate() + days); return today(d); };
const formatDate = (value: string) => value ? new Date(value + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date';
const activity = (type: string, title: string, detail = ''): ActivityItem => ({ id: uid(), type, title, detail, date: new Date().toISOString() });
const taskDefaults = (): TaskDraft => ({ title: '', description: '', category: 'Personal', priority: 'Medium', status: 'Todo', dueDate: '', dueTime: '' });
const habitDefaults = (): HabitDraft => ({ name: '', description: '', type: 'Daily', days: [0,1,2,3,4,5,6], weeklyTarget: 3, goalValue: 1, unit: 'times', color: COLORS[0] });

const NAV: { page: Page; icon: typeof LayoutDashboard }[] = [
  { page: 'Dashboard', icon: LayoutDashboard }, { page: 'Tasks', icon: ListTodo },
  { page: 'Habits', icon: Target }, { page: 'Calendar', icon: CalendarDays },
  { page: 'Statistics', icon: BarChart3 }, { page: 'History', icon: Activity },
  { page: 'Archive', icon: Archive }, { page: 'Settings', icon: Settings }
];

function TaskModal({ initial, close, save }: { initial: Task | null; close: () => void; save: (draft: TaskDraft) => void }) {
  const [draft, setDraft] = useState<TaskDraft>(initial ? {
    title: initial.title, description: initial.description, category: initial.category,
    priority: initial.priority, status: initial.status, dueDate: initial.dueDate, dueTime: initial.dueTime
  } : taskDefaults());
  const change = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) => setDraft(old => ({ ...old, [key]: value }));
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
    <form className="modal-card" onSubmit={e => { e.preventDefault(); save(draft); }}>
      <div className="modal-heading"><div><span className="eyebrow">TASK DETAILS</span><h2>{initial ? 'Edit task' : 'Create a task'}</h2></div><button type="button" className="icon-button" onClick={close}><X size={18}/></button></div>
      <label className="field">Task name<input autoFocus required maxLength={120} value={draft.title} onChange={e => change('title', e.target.value)} placeholder="What needs to get done?"/></label>
      <label className="field">Description<textarea rows={3} value={draft.description} onChange={e => change('description', e.target.value)} placeholder="Add a few details…"/></label>
      <div className="form-grid">
        <label className="field">Category<input value={draft.category} onChange={e => change('category', e.target.value)} /></label>
        <label className="field">Priority<select value={draft.priority} onChange={e => change('priority', e.target.value as Priority)}>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></label>
        <label className="field">Due date<input type="date" value={draft.dueDate} onChange={e => change('dueDate', e.target.value)}/></label>
        <label className="field">Due time<input type="time" value={draft.dueTime} onChange={e => change('dueTime', e.target.value)}/></label>
        {initial && <label className="field full-width">Status<select value={draft.status} onChange={e => change('status', e.target.value as TaskStatus)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></label>}
      </div>
      <div className="modal-actions"><button type="button" className="button secondary" onClick={close}>Cancel</button><button className="button primary">{initial ? 'Save changes' : 'Create task'}</button></div>
    </form>
  </div>;
}

function HabitModal({ close, save }: { close: () => void; save: (draft: HabitDraft) => void }) {
  const [draft, setDraft] = useState<HabitDraft>(habitDefaults());
  const change = <K extends keyof HabitDraft>(key: K, value: HabitDraft[K]) => setDraft(old => ({ ...old, [key]: value }));
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
    <form className="modal-card" onSubmit={e => { e.preventDefault(); save(draft); }}>
      <div className="modal-heading"><div><span className="eyebrow">BUILD A ROUTINE</span><h2>Create a habit</h2></div><button type="button" className="icon-button" onClick={close}><X size={18}/></button></div>
      <label className="field">Habit name<input autoFocus required maxLength={80} value={draft.name} onChange={e => change('name', e.target.value)} placeholder="e.g. Read for 20 minutes"/></label>
      <label className="field">Description<textarea rows={2} value={draft.description} onChange={e => change('description', e.target.value)} placeholder="Why does this habit matter?"/></label>
      <label className="field">Schedule<select value={draft.type} onChange={e => change('type', e.target.value as Habit['type'])}><option>Daily</option><option>Weekdays</option><option>Weekly target</option><option>Goal</option></select></label>
      {(draft.type === 'Daily' || draft.type === 'Weekdays') && <div className="field"><span>Days</span><div className="day-picker">{WEEKDAYS.map((day, i) => <button type="button" key={day} className={draft.days.includes(i) ? 'day-chip selected' : 'day-chip'} onClick={() => change('days', draft.days.includes(i) ? draft.days.filter(x => x !== i) : [...draft.days, i])}>{day[0]}</button>)}</div></div>}
      {draft.type === 'Weekly target' && <label className="field">Target days per week<input type="number" min={1} max={7} value={draft.weeklyTarget} onChange={e => change('weeklyTarget', Number(e.target.value))}/></label>}
      {draft.type === 'Goal' && <div className="form-grid"><label className="field">Target value<input type="number" min={1} value={draft.goalValue} onChange={e => change('goalValue', Number(e.target.value))}/></label><label className="field">Unit<input value={draft.unit} onChange={e => change('unit', e.target.value)}/></label></div>}
      <div className="field"><span>Color</span><div className="color-picker">{COLORS.map(color => <button key={color} type="button" className={draft.color === color ? 'color-swatch chosen' : 'color-swatch'} style={{ background: color }} onClick={() => change('color', color)}/>)}</div></div>
      <div className="modal-actions"><button type="button" className="button secondary" onClick={close}>Cancel</button><button className="button primary">Create habit</button></div>
    </form>
  </div>;
}

function App() {
  const [data, setData] = useState<AppData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState<Page>('Dashboard');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'board'>('list');
  const [statusFilter, setStatusFilter] = useState<'All' | TaskStatus>('All');
  const [priorityFilter, setPriorityFilter] = useState<'All' | Priority>('All');
  const [taskModal, setTaskModal] = useState<Task | 'new' | null>(null);
  const [habitModal, setHabitModal] = useState(false);
  const [toast, setToast] = useState('');
  const [syncKeyDraft, setSyncKeyDraft] = useState('');
  const [cloudConnected, setCloudConnected] = useState(Boolean(getStoredSyncKey()));
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>(getStoredSyncKey() ? 'syncing' : 'disconnected');
  const [online, setOnline] = useState(navigator.onLine);
  const [menuTask, setMenuTask] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  useEffect(() => {
    let alive = true;
    loadData().then(saved => { if (alive) { setData(saved); setLoaded(true); } }).catch(err => { console.error(err); if (alive) setLoaded(true); });
    const on = () => setOnline(true); const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    const onCloudStatus = (event: Event) => setCloudStatus((event as CustomEvent<CloudSyncStatus>).detail);
    window.addEventListener('momentum-cloud-status', onCloudStatus);
    return () => { alive = false; window.removeEventListener('online', on); window.removeEventListener('offline', off); window.removeEventListener('momentum-cloud-status', onCloudStatus); };
  }, []);
  useEffect(() => { if (loaded) saveData(data).catch(console.error); }, [data, loaded]);

  const flash = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2400); };
  const connectCloud = async () => {
    try {
      const merged = await connectCloudSync(syncKeyDraft, data);
      await replaceData(merged);
      setData(merged);
      setCloudConnected(true);
      setSyncKeyDraft('');
      flash('Cloud sync connected');
    } catch (error) {
      setCloudStatus('error');
      flash(error instanceof Error ? error.message : 'Could not connect to cloud sync');
    }
  };
  const disconnectCloud = () => {
    disconnectCloudSync();
    setCloudConnected(false);
    setCloudStatus('disconnected');
    flash('Cloud sync disconnected on this device');
  };
  const cloudStatusLabel = cloudStatus === 'synced'
    ? 'Connected · all changes synced'
    : cloudStatus === 'syncing'
      ? 'Syncing workspace…'
      : cloudStatus === 'offline'
        ? 'Offline · changes will sync when online'
        : cloudStatus === 'error'
          ? 'Sync issue · check the key or connection'
          : 'Not connected on this device';
  const activeTasks = useMemo(() => data.tasks.filter((t: Task) => !t.archivedAt), [data.tasks]);
  const filteredTasks = useMemo(() => activeTasks.filter((t: Task) => {
    const words = (t.title + ' ' + t.description + ' ' + t.category).toLowerCase();
    return words.includes(search.toLowerCase()) && (statusFilter === 'All' || t.status === statusFilter) && (priorityFilter === 'All' || t.priority === priorityFilter);
  }), [activeTasks, search, statusFilter, priorityFilter]);
  const habits = data.habits.filter((h: Habit) => h.active);
  const todayLogs = data.logs.filter((l: HabitLog) => l.date === today() && l.completed);
  const completed = activeTasks.filter((t: Task) => t.status === 'Completed').length;
  const pending = activeTasks.length - completed;
  const overdue = activeTasks.filter((t: Task) => t.status !== 'Completed' && t.dueDate && t.dueDate < today()).length;
  const dueToday = activeTasks.filter((t: Task) => t.dueDate === today());
  const rate = activeTasks.length ? Math.round(completed / activeTasks.length * 100) : 0;

  const saveTask = (draft: TaskDraft) => {
    const now = new Date().toISOString();
    if (taskModal && taskModal !== 'new') {
      const updated: Task = { ...taskModal, ...draft, updatedAt: now, completedAt: draft.status === 'Completed' ? (taskModal.completedAt || now) : undefined };
      setData(old => ({ ...old, tasks: old.tasks.map((t: Task) => t.id === updated.id ? updated : t), activities: [activity('Task updated', updated.title), ...old.activities] }));
      flash('Task updated');
    } else {
      const task: Task = { id: uid(), ...draft, createdAt: now, updatedAt: now, completedAt: draft.status === 'Completed' ? now : undefined };
      setData(old => ({ ...old, tasks: [task, ...old.tasks], activities: [activity('Task created', task.title), ...old.activities] }));
      flash('Task created');
    }
    setTaskModal(null);
  };
  const changeStatus = (task: Task, status: TaskStatus) => {
    const now = new Date().toISOString();
    setData(old => ({ ...old, tasks: old.tasks.map((t: Task) => t.id === task.id ? { ...t, status, updatedAt: now, completedAt: status === 'Completed' ? now : undefined } : t), activities: [activity('Task status changed', task.title, status), ...old.activities] }));
  };
  const toggleTask = (task: Task) => changeStatus(task, task.status === 'Completed' ? 'Todo' : 'Completed');
  const archiveTask = (task: Task) => {
    setData(old => ({ ...old, tasks: old.tasks.map((t: Task) => t.id === task.id ? { ...t, archivedAt: new Date().toISOString() } : t), activities: [activity('Task archived', task.title), ...old.activities] }));
    setMenuTask(null); flash('Task archived');
  };
  const deleteTask = (task: Task) => {
    if (!window.confirm('Delete "' + task.title + '" permanently?')) return;
    setData(old => ({ ...old, tasks: old.tasks.filter((t: Task) => t.id !== task.id), activities: [activity('Task deleted', task.title), ...old.activities] }));
    setMenuTask(null); flash('Task deleted');
  };
  const saveHabit = (draft: HabitDraft) => {
    const habit: Habit = { ...draft, id: uid(), active: true, createdAt: new Date().toISOString() };
    setData(old => ({ ...old, habits: [habit, ...old.habits], activities: [activity('Habit created', habit.name), ...old.activities] }));
    setHabitModal(false); flash('Habit created');
  };
  const toggleHabit = (habit: Habit) => {
    const date = today();
    const existing = data.logs.find((l: HabitLog) => l.habitId === habit.id && l.date === date);
    if (existing) {
      setData(old => ({ ...old, logs: old.logs.map((l: HabitLog) => l.id === existing.id ? { ...l, completed: !l.completed, value: l.completed ? 0 : habit.goalValue } : l), activities: [activity(existing.completed ? 'Habit unchecked' : 'Habit completed', habit.name), ...old.activities] }));
    } else {
      const log: HabitLog = { id: uid(), habitId: habit.id, date, value: habit.goalValue, completed: true, createdAt: new Date().toISOString() };
      setData(old => ({ ...old, logs: [log, ...old.logs], activities: [activity('Habit completed', habit.name), ...old.activities] }));
    }
  };
  const streak = (habit: Habit) => {
    let cursor = today(); let count = 0;
    if (!data.logs.some((l: HabitLog) => l.habitId === habit.id && l.date === cursor && l.completed)) cursor = shift(cursor, -1);
    for (let i = 0; i < 366; i += 1) {
      const weekday = new Date(cursor + 'T12:00:00').getDay();
      const scheduled = habit.type === 'Daily' || habit.type === 'Goal' || (habit.type === 'Weekdays' && habit.days.includes(weekday));
      if (!scheduled) { cursor = shift(cursor, -1); continue; }
      if (!data.logs.some((l: HabitLog) => l.habitId === habit.id && l.date === cursor && l.completed)) break;
      count += 1; cursor = shift(cursor, -1);
    }
    return count;
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ ...data, backupVersion: 1, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'momentum-backup-' + today() + '.json'; a.click(); URL.revokeObjectURL(url); flash('Backup exported');
  };
  const exportCsv = () => {
    const q = (v: string) => '"' + String(v).replace(/"/g, '""') + '"';
    const rows = [['Title','Description','Category','Priority','Status','Due date','Due time'], ...data.tasks.map((t: Task) => [t.title,t.description,t.category,t.priority,t.status,t.dueDate,t.dueTime])];
    const blob = new Blob([rows.map(row => row.map(v => q(String(v))).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'momentum-tasks-' + today() + '.csv'; a.click(); URL.revokeObjectURL(url); flash('CSV exported');
  };
  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as AppData;
      if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.habits) || !Array.isArray(parsed.logs) || !Array.isArray(parsed.activities) || !parsed.settings) throw new Error('Invalid backup');
      await replaceData(parsed); setData(parsed); flash('Backup restored');
    } catch { flash('Invalid Momentum backup file'); }
  };
  const restoreTask = (task: Task) => setData(old => ({ ...old, tasks: old.tasks.map((t: Task) => t.id === task.id ? { ...t, archivedAt: undefined } : t), activities: [activity('Task restored', task.title), ...old.activities] }));
  const requestNotifications = async () => {
    if (!('Notification' in window)) { flash('Notifications are not supported'); return; }
    const permission = await Notification.requestPermission();
    setData(old => ({ ...old, settings: { ...old.settings, notifications: permission === 'granted' } }));
    flash(permission === 'granted' ? 'Notification permission granted' : 'Permission not granted');
  };

  const weekData = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = shift(today(), index - 6);
    return {
      day: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
      tasks: data.tasks.filter((t: Task) => t.completedAt?.slice(0, 10) === date && !t.archivedAt).length,
      habits: data.logs.filter((l: HabitLog) => l.date === date && l.completed).length
    };
  }), [data.tasks, data.logs]);
  const categoryData = useMemo(() => {
    const counts = new Map<string, number>();
    activeTasks.forEach((t: Task) => counts.set(t.category || 'Uncategorized', (counts.get(t.category || 'Uncategorized') || 0) + 1));
    return Array.from(counts, ([name, value]) => ({ name, value }));
  }, [activeTasks]);
  const monthDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first); start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => { const d = new Date(start); d.setDate(start.getDate() + index); return today(d); });
  }, [month]);

  const TaskRows = ({ tasks }: { tasks: Task[] }) => <>{tasks.map(task => <article className="task-row" key={task.id}>
    <button className={task.status === 'Completed' ? 'task-check checked' : 'task-check'} onClick={() => toggleTask(task)} aria-label="Toggle task">{task.status === 'Completed' && <Check size={13}/>}</button>
    <button className="task-main" onClick={() => setTaskModal(task)}><strong className={task.status === 'Completed' ? 'task-completed' : ''}>{task.title}</strong><span>{task.category || 'Personal'}{task.dueDate ? ' · ' + formatDate(task.dueDate) : ''}{task.dueTime ? ' at ' + task.dueTime : ''}</span></button>
    <span className={'priority-tag ' + task.priority.toLowerCase()}><i/>{task.priority}</span>
    <select className="status-select" aria-label="Task status" value={task.status} onChange={e => changeStatus(task, e.target.value as TaskStatus)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
    <div className="task-menu-wrap"><button className="icon-button small" onClick={() => setMenuTask(menuTask === task.id ? null : task.id)}><MoreHorizontal size={17}/></button>{menuTask === task.id && <div className="dropdown-menu"><button onClick={() => { setTaskModal(task); setMenuTask(null); }}><Pencil size={13}/> Edit</button><button onClick={() => archiveTask(task)}><Archive size={13}/> Archive</button><button className="danger-text" onClick={() => deleteTask(task)}><Trash2 size={13}/> Delete</button></div>}</div>
  </article>)}</>;

  const heading = (title: string, subtitle: string, action?: ReactNode) => <div className="page-heading"><div><span className="eyebrow">YOUR PERSONAL WORKSPACE</span><h1>{title}</h1><p>{subtitle}</p></div>{action && <div className="heading-actions">{action}</div>}</div>;

  if (!loaded) return <div className="loading-screen"><div className="brand-mark">M</div><span>Preparing your workspace…</span></div>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">M</div><span>momentum</span></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="main-nav">{NAV.map(item => { const Icon = item.icon; return <button key={item.page} className={page === item.page ? 'nav-item active' : 'nav-item'} onClick={() => setPage(item.page)}><Icon size={17}/><span>{item.page}</span>{item.page === 'Tasks' && pending > 0 && <small>{pending}</small>}</button>; })}</nav>
      <div className="sidebar-bottom"><div className="offline-card"><i className="online-indicator"/><div><b>{online ? 'Local workspace ready' : 'Working offline'}</b><small>Your data stays on this device</small></div></div><div className="profile-row"><div className="avatar">T</div><div><b>Personal workspace</b><small>Local account</small></div></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><i>/</i><b>{page}</b></div><div className="topbar-right"><button className="cloud-shortcut" onClick={() => setPage('Settings')} title="Open cloud sync settings"><Cloud size={14}/><span>Cloud sync</span></button><button className="icon-button" onClick={() => setPage('Settings')} aria-label="Settings"><Settings size={17}/></button><div className="avatar small-avatar">T</div></div></header>
      <div className="page-content">
        {page === 'Dashboard' && <>
          {heading('Good to see you.', 'A little progress today goes a long way.', <button className="button primary" onClick={() => setTaskModal('new')}><Plus size={15}/> New task</button>)}
          <section className="stat-grid">
            <div className="stat-card"><div className="stat-top"><span>Active tasks</span><span className="stat-icon purple"><ListTodo size={17}/></span></div><strong>{activeTasks.length}</strong><small>{pending} still to do</small></div>
            <div className="stat-card"><div className="stat-top"><span>Completed</span><span className="stat-icon green"><CheckCircle2 size={17}/></span></div><strong>{completed}</strong><small>{rate}% completion rate</small></div>
            <div className="stat-card"><div className="stat-top"><span>Overdue</span><span className="stat-icon orange"><Clock3 size={17}/></span></div><strong>{overdue}</strong><small>Past their due date</small></div>
            <div className="stat-card"><div className="stat-top"><span>Habit check-ins</span><span className="stat-icon pink"><Flame size={17}/></span></div><strong>{todayLogs.length}/{habits.length}</strong><small>Completed today</small></div>
          </section>
          <section className="dashboard-grid">
            <div className="panel"><div className="panel-heading"><div><h2>Today's focus</h2><p>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p></div><button className="text-button" onClick={() => setPage('Tasks')}>View all ›</button></div>
              {dueToday.length ? <TaskRows tasks={dueToday.slice(0, 6)}/> : <div className="empty-state compact"><div className="empty-icon"><CheckCircle2 size={20}/></div><b>A clear day ahead</b><span>No tasks due today. Enjoy the breathing room.</span></div>}
              <button className="add-inline" onClick={() => setTaskModal('new')}><Plus size={14}/> Add a task</button>
            </div>
            <div className="panel"><div className="panel-heading"><div><h2>Daily habits</h2><p>Small actions, repeated consistently.</p></div><button className="text-button" onClick={() => setPage('Habits')}>See all ›</button></div>
              {habits.slice(0, 6).map(h => { const done = todayLogs.some((l: HabitLog) => l.habitId === h.id); return <div className="habit-check-row" key={h.id}><i className="habit-color-dot" style={{ background: h.color }}/><div className="habit-check-copy"><b>{h.name}</b><small>{streak(h)} day streak</small></div><button className={done ? 'round-check done' : 'round-check'} onClick={() => toggleHabit(h)}>{done ? <Check size={14}/> : <Plus size={14}/>}</button></div>; })}
              {!habits.length && <div className="empty-state compact"><div className="empty-icon"><Target size={20}/></div><b>Start a small routine</b><span>Add a habit to track your progress.</span><button className="text-button" onClick={() => setHabitModal(true)}>Create habit +</button></div>}
            </div>
          </section>
          <section className="panel week-panel"><div className="panel-heading"><div><h2>Weekly activity</h2><p>Completed tasks and habits over the last 7 days.</p></div><button className="text-button" onClick={() => setPage('Statistics')}>View insights ›</button></div><div className="chart-wrap"><ResponsiveContainer width="100%" height={210}><BarChart data={weekData} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}><CartesianGrid stroke="#292832" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="day" tick={{ fill: '#858194', fontSize: 11 }} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{ fill: '#858194', fontSize: 10 }} axisLine={false} tickLine={false}/><Tooltip contentStyle={{ background: '#1b1923', border: '1px solid #393545', borderRadius: 9, color: '#f7f5fb', fontSize: 12 }}/><Legend wrapperStyle={{ fontSize: 11, color: '#9995a6' }}/><Bar dataKey="tasks" name="Tasks completed" fill="#9b83f6" radius={[5,5,0,0]}/><Bar dataKey="habits" name="Habit check-ins" fill="#45c994" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></section>
        </>}

        {page === 'Tasks' && <>
          {heading('Tasks', 'Organize your workload and keep important things moving.', <button className="button primary" onClick={() => setTaskModal('new')}><Plus size={15}/> New task</button>)}
          <section className="panel"><div className="toolbar"><div className="filter-group"><label className="select-wrap">Status <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'All' | TaskStatus)}><option>All</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></label><label className="select-wrap">Priority <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as 'All' | Priority)}><option>All</option>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></label></div><div className="view-toggle"><button className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')} aria-label="List view"><List size={16}/></button><button className={view === 'board' ? 'selected' : ''} onClick={() => setView('board')} aria-label="Board view"><LayoutDashboard size={16}/></button></div></div>
          {view === 'list' ? <div className="task-list"><div className="task-list-header"><span>TASK</span><span>PRIORITY</span><span>STATUS</span><span/></div><TaskRows tasks={filteredTasks}/>{!filteredTasks.length && <div className="empty-state"><div className="empty-icon"><ListTodo size={21}/></div><b>No tasks match your filters</b><span>Try another search or create a task.</span></div>}</div> :
          <div className="kanban-grid">{STATUSES.map(status => <div className="kanban-column" key={status}><div className="kanban-heading"><i className={'status-dot ' + status.toLowerCase().replace(' ', '-')}/><b>{status}</b><small>{filteredTasks.filter((t: Task) => t.status === status).length}</small></div>{filteredTasks.filter((t: Task) => t.status === status).map(t => <article className="kanban-card" key={t.id}><span className={'priority-line ' + t.priority.toLowerCase()}/><button className="kanban-title" onClick={() => setTaskModal(t)}>{t.title}</button><span className="kanban-category">{t.category}</span><div className="kanban-footer"><span className={'priority-tag ' + t.priority.toLowerCase()}><i/>{t.priority}</span><small>{t.dueDate ? formatDate(t.dueDate) : ''}</small></div><select value={t.status} onChange={e => changeStatus(t, e.target.value as TaskStatus)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></article>)}{status === 'Todo' && <button className="kanban-add" onClick={() => setTaskModal('new')}><Plus size={14}/> Add task</button>}</div>)}</div>}
          </section>
        </>}

        {page === 'Habits' && <>
          {heading('Habits', 'Make space for the small actions that add up.', <button className="button primary" onClick={() => setHabitModal(true)}><Plus size={15}/> New habit</button>)}
          <div className="habit-intro"><div className="intro-icon"><Flame size={21}/></div><div><b>Consistency over intensity.</b><span>Check in when you complete a habit. Your history and streak build automatically.</span></div><div className="intro-today"><b>{todayLogs.length}/{habits.length}</b><small>Done today</small></div></div>
          <section className="habits-grid">{habits.map(h => { const done = todayLogs.some((l: HabitLog) => l.habitId === h.id); const dates = Array.from({ length: 7 }, (_, i) => shift(today(), i - 6)); const weekCount = dates.filter(d => data.logs.some((l: HabitLog) => l.habitId === h.id && l.date === d && l.completed)).length; return <article className="habit-card" key={h.id}><div className="habit-card-head"><div className="habit-card-icon" style={{ background: h.color + '22', color: h.color }}><Target size={18}/></div><span className="habit-schedule">{h.type === 'Weekly target' ? h.weeklyTarget + 'x / week' : h.type}</span><button className="icon-button small" onClick={() => setData(old => ({ ...old, habits: old.habits.map((x: Habit) => x.id === h.id ? { ...x, active: false } : x), activities: [activity('Habit archived', h.name), ...old.activities] }))}><MoreHorizontal size={16}/></button></div><h3>{h.name}</h3><p>{h.description || 'Keep showing up for yourself.'}</p><div className="habit-metrics"><div><Flame size={14}/><b>{streak(h)}</b><small>day streak</small></div><div><b>{weekCount}/7</b><small>this week</small></div></div><div className="habit-week">{dates.map(d => { const checked = data.logs.some((l: HabitLog) => l.habitId === h.id && l.date === d && l.completed); return <div className="habit-week-day" key={d}><span>{WEEKDAYS[new Date(d + 'T12:00:00').getDay()][0]}</span><i className={checked ? 'filled' : ''} style={checked ? { background: h.color } : undefined}/></div>; })}</div><button className={done ? 'habit-check-button completed' : 'habit-check-button'} onClick={() => toggleHabit(h)}>{done ? <><CheckCircle2 size={15}/> Completed today</> : <><Circle size={15}/> Mark as complete</>}</button></article>; })}{!habits.length && <div className="empty-state wide-empty"><div className="empty-icon"><Target size={22}/></div><b>Your habits start here</b><span>Create a routine and track your consistency.</span><button className="button primary" onClick={() => setHabitModal(true)}><Plus size={14}/> Create your first habit</button></div>}</section>
        </>}

        {page === 'Calendar' && <>
          {heading('Calendar', 'See what is coming up and plan your next steps.')}
          <section className="calendar-layout"><div className="panel calendar-panel"><div className="calendar-toolbar"><div><h2>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2><span>Monthly overview</span></div><div className="calendar-nav"><button className="icon-button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={18}/></button><button className="button secondary compact-button" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</button><button className="icon-button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={18}/></button></div></div><div className="calendar-grid">{WEEKDAYS.map(d => <div className="calendar-weekday" key={d}>{d}</div>)}{monthDays.map(date => { const d = new Date(date + 'T12:00:00'); const tasks = activeTasks.filter((t: Task) => t.dueDate === date); return <div className={'calendar-cell ' + (d.getMonth() !== month.getMonth() ? 'outside ' : '') + (date === today() ? 'today' : '')} key={date}><span className="calendar-date">{d.getDate()}</span>{tasks.slice(0, 2).map(t => <button key={t.id} className={'calendar-task ' + (t.status === 'Completed' ? 'is-done' : '')} onClick={() => setTaskModal(t)} title={t.title}>{t.title}</button>)}{tasks.length > 2 && <small className="more-tasks">+{tasks.length - 2} more</small>}</div>; })}</div></div>
          <aside className="panel upcoming-panel"><div className="panel-heading"><div><h2>Upcoming</h2><p>Tasks with a due date</p></div></div>{activeTasks.filter((t: Task) => t.dueDate && t.status !== 'Completed').sort((a: Task, b: Task) => a.dueDate.localeCompare(b.dueDate)).slice(0, 10).map(t => <button className="upcoming-row" key={t.id} onClick={() => setTaskModal(t)}><div className="upcoming-date"><b>{new Date(t.dueDate + 'T12:00:00').getDate()}</b><small>{new Date(t.dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}</small></div><div><b>{t.title}</b><small>{t.category}</small></div></button>)}{!activeTasks.some((t: Task) => t.dueDate && t.status !== 'Completed') && <div className="empty-state compact"><CalendarDays size={20}/><span>No upcoming due dates.</span></div>}</aside></section>
        </>}

        {page === 'Statistics' && <>
          {heading('Statistics', 'Understand your patterns and celebrate your progress.')}
          <section className="stat-grid"><div className="stat-card"><div className="stat-top"><span>Tasks created</span><ListTodo size={17}/></div><strong>{data.tasks.length}</strong><small>Including archived</small></div><div className="stat-card"><div className="stat-top"><span>Completion rate</span><CheckCircle2 size={17}/></div><strong>{rate}%</strong><small>Across active tasks</small></div><div className="stat-card"><div className="stat-top"><span>Habit check-ins</span><Flame size={17}/></div><strong>{data.logs.filter((l: HabitLog) => l.completed).length}</strong><small>All-time completions</small></div><div className="stat-card"><div className="stat-top"><span>Active habits</span><Target size={17}/></div><strong>{habits.length}</strong><small>Current routines</small></div></section>
          <section className="statistics-grid"><div className="panel"><div className="panel-heading"><div><h2>Weekly activity</h2><p>Completed tasks and habit check-ins</p></div></div><div className="chart-wrap tall"><ResponsiveContainer width="100%" height={260}><BarChart data={weekData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid stroke="#292832" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="day" tick={{ fill: '#858194', fontSize: 11 }} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{ fill: '#858194', fontSize: 10 }} axisLine={false} tickLine={false}/><Tooltip/><Legend wrapperStyle={{ color: '#9995a6', fontSize: 11 }}/><Bar dataKey="tasks" name="Tasks completed" fill="#9b83f6" radius={[5,5,0,0]}/><Bar dataKey="habits" name="Habit check-ins" fill="#45c994" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></div>
          <div className="panel"><div className="panel-heading"><div><h2>Tasks by category</h2><p>Distribution of active tasks</p></div></div>{categoryData.length ? <div className="category-chart"><ResponsiveContainer width="100%" height={225}><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={3}>{categoryData.map((item, i) => <Cell key={item.name} fill={COLORS[i % COLORS.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div className="category-legend">{categoryData.map((item, i) => <div key={item.name}><i style={{ background: COLORS[i % COLORS.length] }}/><span>{item.name}</span><b>{item.value}</b></div>)}</div></div> : <div className="empty-state compact"><span>No task categories to chart yet.</span></div>}</div></section>
        </>}

        {page === 'History' && <>{heading('Activity history', 'A timeline of the work you have done in Momentum.')}<section className="panel history-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>{data.activities.length} recorded actions</p></div></div>{data.activities.length ? data.activities.slice(0, 120).map(a => <div className="activity-row" key={a.id}><div className="activity-symbol"><Activity size={16}/></div><div className="activity-copy"><b>{a.type}</b><span>{a.title}{a.detail ? ' · ' + a.detail : ''}</span><small>{new Date(a.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</small></div></div>) : <div className="empty-state"><div className="empty-icon"><Activity size={20}/></div><b>Your activity will appear here</b><span>Create a task or check off a habit to get started.</span></div>}</section></>}

        {page === 'Archive' && <>{heading('Archive', 'Keep completed or inactive work out of the way.')}<section className="panel history-panel"><div className="panel-heading"><div><h2>Archived tasks</h2><p>{data.tasks.filter((t: Task) => t.archivedAt).length} items</p></div></div>{data.tasks.filter((t: Task) => t.archivedAt).map(t => <div className="archive-row" key={t.id}><div><b>{t.title}</b><small>Archived {formatDate((t.archivedAt || '').slice(0, 10))}</small></div><button className="button secondary compact-button" onClick={() => restoreTask(t)}>Restore</button><button className="icon-button danger-icon" onClick={() => deleteTask(t)}><Trash2 size={15}/></button></div>)}{!data.tasks.some((t: Task) => t.archivedAt) && <div className="empty-state"><div className="empty-icon"><Archive size={20}/></div><b>Nothing in the archive</b><span>Tasks you archive will appear here.</span></div>}</section></>}

        {page === 'Settings' && <>
          {heading('Settings', 'Manage your workspace, data and preferences.')}
          <div className="settings-layout"><section className="panel settings-panel">
            <div className="settings-section"><div className="settings-icon"><Cloud size={18}/></div><div className="settings-copy"><h3>Cloud sync</h3><p>Keep tasks, habits, logs and activity in sync across your devices. Momentum also keeps a local offline copy in this browser.</p>
              {cloudConnected ? <div className="settings-actions"><span className={cloudStatus === 'synced' ? 'storage-note' : 'permission-status'}><Cloud size={14}/> {cloudStatusLabel}</span><button className="button secondary" onClick={disconnectCloud}><CloudOff size={14}/> Disconnect on this device</button></div> : <>
                <label className="field cloud-key-field">Private sync key<input type="password" autoComplete="off" spellCheck={false} value={syncKeyDraft} onChange={e => setSyncKeyDraft(e.target.value)} placeholder="Paste your private sync key"/></label>
                <div className="settings-actions"><button className="button primary" disabled={!loaded || syncKeyDraft.trim().length < 32} onClick={() => void connectCloud()}><Cloud size={14}/> Connect & sync current workspace</button></div>
              </>}
              <p className="cloud-security-note">Use the same key on each device. Anyone with this key can access and edit your workspace, so keep it private.</p>
            </div></div>
            <div className="settings-section"><div className="settings-icon"><Download size={18}/></div><div className="settings-copy"><h3>Data & backups</h3><p>Export a copy of your tasks, habits, logs and activity. Restore it on this device later.</p><div className="settings-actions"><button className="button secondary" onClick={exportJson}><Download size={14}/> Export JSON backup</button><button className="button secondary" onClick={exportCsv}><Download size={14}/> Export tasks CSV</button><label className="button secondary upload-button"><Upload size={14}/> Restore backup<input type="file" accept="application/json,.json" onChange={e => { const file = e.target.files?.[0]; if (file) void importJson(file); e.currentTarget.value = ''; }}/></label></div></div></div>
            <div className="settings-section"><div className="settings-icon"><Bell size={18}/></div><div className="settings-copy"><h3>Notifications</h3><p>Request browser notification permission. Scheduled notifications while the browser is fully closed are not guaranteed.</p><div className="settings-actions"><button className="button secondary" onClick={() => void requestNotifications()}>Request permission</button><span className="permission-status">{data.settings.notifications ? 'Permission granted' : ('Notification' in window ? Notification.permission : 'Not supported')}</span></div></div></div>
            <div className="settings-section"><div className="settings-icon"><Wifi size={18}/></div><div className="settings-copy"><h3>Privacy & storage</h3><p>Your data is cached in IndexedDB for offline use and synced to private cloud storage when connected. Clearing browser data removes the local copy, but your cloud workspace remains available with your sync key.</p><div className="storage-note"><CheckCircle2 size={15}/> Local cache + private cloud</div></div></div>
            <div className="settings-section danger-zone"><div className="settings-icon"><Trash2 size={18}/></div><div className="settings-copy"><h3>Reset workspace</h3><p>Permanently remove all tasks, habits, logs and activity from this device and the connected cloud workspace.</p><button className="button danger" onClick={async () => { if (window.confirm('Permanently delete all Momentum data from this device and, when connected, the cloud workspace? Export a backup first if needed.')) { const fresh: AppData = { ...EMPTY, settings: { notifications: false, quietHours: false } }; await replaceData(fresh); setData(fresh); flash('Workspace reset'); } }}>Delete all workspace data</button></div></div>
          </section><aside className="panel about-panel"><div className="about-logo">M</div><h3>Momentum</h3><span>Personal productivity workspace</span><p>Version 1.0.0</p><div className="about-divider"/><div><small>STORAGE</small><b>IndexedDB + private cloud</b></div><div><small>APP MODE</small><b>Progressive Web App</b></div><div><small>SYNC</small><b>Private key sync</b></div></aside></div>
        </>}
      </div>
    </main>
    {taskModal !== null && <TaskModal initial={taskModal === 'new' ? null : taskModal} close={() => setTaskModal(null)} save={saveTask}/>}
    {habitModal && <HabitModal close={() => setHabitModal(false)} save={saveHabit}/>}
    {toast && <div className="toast-message"><CheckCircle2 size={15}/>{toast}</div>}
  </div>;
}

export default App;
