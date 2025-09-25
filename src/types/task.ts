export type Priority = "high" | "medium" | "low" | "none";
export type Quadrant = "Q1" | "Q2" | "Q3" | "Q4"; // 优先矩阵

export interface Task {
  id: string;
  title: string;
  notes?: string;
  dueAt?: string | null;        // ISO 字符串
  remindAt?: string | null;     // ISO 字符串（本地通知占位）
  priority: Priority;
  quadrant?: Quadrant;
  done: boolean;
  createdAt: string;            // ISO
  updatedAt: string;            // ISO
}
