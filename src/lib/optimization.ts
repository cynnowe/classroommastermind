import type { Student, Constraint, HistoryPair, Layout, SeatingPlan } from '../types';

export function calculatePenaltyScore(
  plan: SeatingPlan,
  students: Student[],
  constraints: Constraint[],
  history: HistoryPair[],
  layout: Layout
): number {
  let score = 0;
  const assignments = plan.assignments;
  const studentMap = new Map(students.map(s => [s.id, s]));
  
  // Helper to get neighbors of a cell
  const getNeighbors = (row: number, col: number) => {
    const neighbors: string[] = [];
    for (let r = row - 2; r <= row + 2; r++) {
      for (let c = col - 2; c <= col + 2; c++) {
        if (r === row && c === col) continue;
        const key = `${r}-${c}`;
        if (assignments[key]) {
          neighbors.push(assignments[key]);
        }
      }
    }
    return neighbors;
  };

  // Helper to check if a cell is near a specific type (window/door)
  const isNearType = (row: number, col: number, types: string[]) => {
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        const key = `${r}-${c}`;
        const cell = layout.grid_config.cells[key];
        if (cell && types.includes(cell.type)) return true;
      }
    }
    return false;
  };

  // Find the professor's desk row to define the "front"
  const deskCell = Object.values(layout.grid_config.cells).find(c => c.type === 'desk');
  const deskRow = deskCell ? deskCell.row : 0;

  for (const [cellKey, studentId] of Object.entries(assignments)) {
    const student = studentMap.get(studentId);
    if (!student) continue;

    const [row, col] = cellKey.split('-').map(Number);
    const neighbors = getNeighbors(row, col);

    // 1. Blacklist (CRITICAL: +5000)
    for (const neighborId of neighbors) {
      const isBlacklisted = constraints.some(c => 
        c.type === 'blacklist' && 
        ((c.student_a_id === studentId && c.student_b_id === neighborId) ||
         (c.student_a_id === neighborId && c.student_b_id === studentId))
      );
      if (isBlacklisted) score += 5000;
    }

    // 2. Bavards (SEVERE: +1000)
    if (student.profil.bavard >= 4) {
      for (const neighborId of neighbors) {
        const neighbor = studentMap.get(neighborId);
        if (neighbor && neighbor.profil.bavard >= 4) {
          score += 1000;
        }
      }
    }

    // 3. Ergonomie (ERGONOMIE: +800)
    // "trouble_visuel" placed more than 2 rows away from the desk
    const distanceFromFront = Math.abs(row - deskRow);
    if (student.profil.trouble_visuel && distanceFromFront > 1) {
      score += 800;
    }

    // 4. Mémoire (MÉMOIRE: +300 * N)
    for (const neighborId of neighbors) {
      const pastHistory = history.find(h => 
        (h.student_a_id === studentId && h.student_b_id === neighborId) ||
        (h.student_a_id === neighborId && h.student_b_id === studentId)
      );
      if (pastHistory) {
        score += 300 * pastHistory.count_sessions;
      }
    }

    // 5. Attention (ATTENTION: +400)
    // near window, door OR talkative student
    if (student.profil.trouble_attention) {
      if (isNearType(row, col, ['window', 'door'])) {
        score += 400;
      }
      for (const neighborId of neighbors) {
        const neighbor = studentMap.get(neighborId);
        if (neighbor && neighbor.profil.bavard >= 4) {
          score += 400;
        }
      }
    }

    // 6. Bonus Pedago (BONUS: -200)
    // "Moteur" neighbor to low "bavardage" student (< 3)
    if (student.profil.moteur) {
      for (const neighborId of neighbors) {
        const neighbor = studentMap.get(neighborId);
        if (neighbor && neighbor.profil.bavard < 3) {
          score -= 200;
        }
      }
    }
  }

  return score;
}

export function runOptimization(
  students: Student[],
  constraints: Constraint[],
  history: HistoryPair[],
  layout: Layout,
  iterations: number = 5000,
  onProgress?: (progress: number, currentScore: number) => void
): SeatingPlan {
  // Get all available seats
  const seatKeys = Object.entries(layout.grid_config.cells)
    .filter(([_, cell]) => cell.type === 'seat')
    .map(([key]) => key);

  if (students.length > seatKeys.length) {
    throw new Error("Not enough seats for all students");
  }

  // Initial random assignment
  let currentPlan: SeatingPlan = { assignments: {} };
  const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
  seatKeys.forEach((key, index) => {
    if (shuffledStudents[index]) {
      currentPlan.assignments[key] = shuffledStudents[index].id;
    }
  });

  let currentScore = calculatePenaltyScore(currentPlan, students, constraints, history, layout);

  for (let i = 0; i < iterations; i++) {
    // Pick two random seats and swap them (or move to empty seat)
    const idx1 = Math.floor(Math.random() * seatKeys.length);
    const idx2 = Math.floor(Math.random() * seatKeys.length);
    if (idx1 === idx2) continue;

    const key1 = seatKeys[idx1];
    const key2 = seatKeys[idx2];

    const newAssignments = { ...currentPlan.assignments };
    const s1 = newAssignments[key1];
    const s2 = newAssignments[key2];

    if (s2) newAssignments[key1] = s2; else delete newAssignments[key1];
    if (s1) newAssignments[key2] = s1; else delete newAssignments[key2];

    const newPlan = { assignments: newAssignments };
    const newScore = calculatePenaltyScore(newPlan, students, constraints, history, layout);

    if (newScore < currentScore) {
      currentPlan = newPlan;
      currentScore = newScore;
    }

    if (i % 100 === 0 && onProgress) {
      onProgress(i / iterations, currentScore);
    }
  }

  return currentPlan;
}
