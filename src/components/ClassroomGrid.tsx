import React from 'react';
import { useDraggable, useDroppable, DndContext } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import type { Student, Layout, SeatingPlan, Constraint, HistoryPair } from '../types';
import { calculatePenaltyScore } from '../lib/optimization';
import { User, AlertTriangle, ShieldCheck, Monitor, Wind, DoorOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StudentCardProps {
  student: Student;
  cellKey: string;
  hasViolation: boolean;
}

const StudentCard: React.FC<StudentCardProps> = ({ student, cellKey, hasViolation }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: student.id,
    data: { student, cellKey }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "relative w-full h-full rounded-lg shadow-sm flex flex-col items-center justify-center p-1 cursor-grab active:cursor-grabbing z-20 student-card",
        isDragging ? "opacity-50" : "opacity-100",
        hasViolation 
          ? "bg-orange-100 border-2 border-orange-500 text-orange-900" 
          : "bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
      )}
    >
      <User className={cn("w-5 h-5", student.profil.bavard >= 4 ? "text-red-500" : student.profil.trouble_visuel ? "text-blue-500" : "text-zinc-400")} />
      <span className="text-[10px] font-bold truncate w-full text-center">{student.prenom}</span>
      {hasViolation && (
        <div className="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full p-0.5 alert-icon">
          <AlertTriangle className="w-2 h-2" />
        </div>
      )}
    </motion.div>
  );
};

interface GridCellProps {
  cellKey: string;
  type: string;
  children?: React.ReactNode;
}

const DroppableCell: React.FC<GridCellProps> = ({ cellKey, type, children }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: cellKey,
  });

  const isSeat = type === 'seat';

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-14 h-14 rounded-lg flex items-center justify-center transition-colors relative",
        isSeat 
          ? "bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 shadow-sm" 
          : "bg-zinc-100/50 dark:bg-zinc-900/30 border-2 border-transparent",
        isOver && isSeat && "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-400 border-dashed"
      )}
    >
      {children}
    </div>
  );
};

interface Props {
  layout: Layout;
  students: Student[];
  constraints: Constraint[];
  history: HistoryPair[];
  plan: SeatingPlan;
  onPlanChange: (plan: SeatingPlan) => void;
}

export const ClassroomGrid: React.FC<Props & { separateGenders?: boolean }> = ({ layout, students, constraints, history, plan, onPlanChange, separateGenders }) => {
  const studentMap = new Map(students.map(s => [s.id, s]));
  const score = calculatePenaltyScore(plan, students, constraints, history, layout, { separateGenders });

  // Find the professor's desk row
  const deskCell = Object.values(layout.grid_config.cells).find(c => c.type === 'desk');
  const deskRow = deskCell ? deskCell.row : 0;

  // Determine violations per student
  const violations = new Set<string>();
  Object.entries(plan.assignments).forEach(([key, studentId]) => {
     // A simple way to check if a specific student is part of a penalty
     // In a real app, we'd break down calculatePenaltyScore to return per-student penalties
     // For now, let's just mark students who are part of the most common violations
     const student = studentMap.get(studentId);
     if (!student) return;

     const [row, col] = key.split('-').map(Number);
     // Extended radius check (2 cells)
     for (let r = row - 2; r <= row + 2; r++) {
       for (let c = col - 2; c <= col + 2; c++) {
         if (r === row && c === col) continue;
         const nKey = `${r}-${c}`;
         const nId = plan.assignments[nKey];
         if (!nId) continue;

         // Blacklist check
         const isBlacklisted = constraints.some(ct => 
           ct.type === 'blacklist' && 
           ((ct.student_a_id === studentId && ct.student_b_id === nId) ||
            (ct.student_a_id === nId && ct.student_b_id === studentId))
         );
         if (isBlacklisted) violations.add(studentId);

         // Bavards check
         const nStudent = studentMap.get(nId);
         if (student.profil.bavard >= 4 && nStudent && nStudent.profil.bavard >= 4) {
           violations.add(studentId);
         }
       }
     }

     // Visual/Ergonomie check
     const distanceFromFront = Math.abs(row - deskRow);
     if (student.profil.trouble_visuel && distanceFromFront > 1) {
       violations.add(studentId);
     }

     if (student.profil.trouble_attention) {
        // Near window or door
        const isNearDistraction = Array.from({length: 5}, (_, i) => row - 2 + i).some(r => 
          Array.from({length: 5}, (_, i) => col - 2 + i).some(c => {
            const cell = layout.grid_config.cells[`${r}-${c}`];
            return cell && (cell.type === 'window' || cell.type === 'door');
          })
        );
        if (isNearDistraction) violations.add(studentId);

        // Near talkative student (radius 2)
        for (let r = row - 2; r <= row + 2; r++) {
          for (let c = col - 2; c <= col + 2; c++) {
            if (r === row && c === col) continue;
            const nId = plan.assignments[`${r}-${c}`];
            const nStudent = nId ? studentMap.get(nId) : null;
            if (nStudent && nStudent.profil.bavard >= 4) {
              violations.add(studentId);
            }
          }
        }
     }
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const studentId = active.id as string;
    const oldKey = active.data.current?.cellKey;
    const newKey = over.id as string;

    const cell = layout.grid_config.cells[newKey];
    if (!cell || cell.type !== 'seat') return;

    const newAssignments = { ...plan.assignments };
    const studentAtNewPos = newAssignments[newKey];

    if (studentAtNewPos) {
      // Swap
      if (oldKey) newAssignments[oldKey] = studentAtNewPos;
    } else {
      if (oldKey) delete newAssignments[oldKey];
    }
    
    newAssignments[newKey] = studentId;
    onPlanChange({ assignments: newAssignments });
  };

  return (
    <div className="flex flex-col gap-6">
      <DndContext onDragEnd={handleDragEnd}>
        <div 
          className="grid gap-3 p-6 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-inner overflow-auto"
          style={{ 
            gridTemplateColumns: `repeat(${layout.grid_config.cols}, minmax(56px, 1fr))`,
            width: 'fit-content',
            margin: '0 auto'
          }}
        >
          {Array.from({ length: layout.grid_config.rows }).map((_, r) => (
            Array.from({ length: layout.grid_config.cols }).map((_, c) => {
              const key = `${r}-${c}`;
              const cell = layout.grid_config.cells[key];
              const studentId = plan.assignments[key];
              const student = studentId ? studentMap.get(studentId) : null;

              if (cell?.type === 'seat' || !cell) {
                return (
                  <DroppableCell key={key} cellKey={key} type={cell?.type || 'empty'}>
                    {student && (
                      <StudentCard 
                        student={student} 
                        cellKey={key} 
                        hasViolation={violations.has(student.id)} 
                      />
                    )}
                  </DroppableCell>
                );
              }

              // Display other types as static obstacles
              return (
                <div key={key} className={cn(
                  "w-14 h-14 rounded-lg flex items-center justify-center border-2",
                  cell.type === 'desk' ? "bg-emerald-50 border-emerald-200 text-emerald-600" :
                  cell.type === 'window' ? "bg-sky-50 border-sky-200 text-sky-600" :
                  cell.type === 'door' ? "bg-amber-50 border-amber-200 text-amber-600" :
                  "bg-zinc-100 border-transparent text-zinc-300"
                )}>
                  {cell.type === 'desk' && <Monitor className="w-5 h-5" />}
                  {cell.type === 'window' && <Wind className="w-5 h-5" />}
                  {cell.type === 'door' && <DoorOpen className="w-5 h-5" />}
                </div>
              );
            })
          ))}
        </div>
      </DndContext>
    </div>
  );
};
