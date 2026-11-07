export type Priority='Low'|'Medium'|'High'|'Urgent';
export type TaskStatus='Todo'|'In Progress'|'Completed';
export interface Task {id:string;title:string;description:string;category:string;priority:Priority;status:TaskStatus;dueDate:string;dueTime:string;createdAt:string;updatedAt:string;completedAt?:string;archivedAt?:string;}
export interface Habit {id:string;name:string;description:string;type:'Daily'|'Weekdays'|'Weekly target'|'Goal';days:number[];weeklyTarget:number;goalValue:number;unit:string;color:string;active:boolean;createdAt:string;}
export interface HabitLog {id:string;habitId:string;date:string;value:number;completed:boolean;createdAt:string;}
export interface Activity {id:string;type:string;title:string;detail:string;date:string;}
export interface AppSettings {notifications:boolean;quietHours:boolean;}
export interface AppData {tasks:Task[];habits:Habit[];logs:HabitLog[];activities:Activity[];settings:AppSettings;}
