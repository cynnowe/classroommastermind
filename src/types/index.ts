export interface StudentProfile {
  bavard: number; // 1-5
  moteur: boolean;
  trouble_visuel: boolean;
  trouble_attention: boolean;
}

export interface Student {
  id: string;
  nom: string;
  prenom: string;
  genre: string;
  profil: StudentProfile;
}

export type ConstraintType = 'blacklist' | 'tutorat';

export interface Constraint {
  id: string;
  type: ConstraintType;
  student_a_id: string;
  student_b_id: string;
}

export type CellType = 'seat' | 'desk' | 'obstacle' | 'window' | 'door';

export interface GridCell {
  type: CellType;
  row: number;
  col: number;
}

export interface Layout {
  id: string;
  name: string;
  grid_config: {
    rows: number;
    cols: number;
    cells: Record<string, GridCell>; // key is "row-col"
  };
}

export interface HistoryPair {
  id?: string;
  student_a_id: string;
  student_b_id: string;
  count_sessions: number;
}

export interface SeatingPlan {
  // mapping of "row-col" to studentId
  assignments: Record<string, string>;
}
