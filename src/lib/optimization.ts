import type { Student, Constraint, HistoryPair, Layout, SeatingPlan } from '../types';

export function calculatePenaltyScore(
  plan: SeatingPlan,
  students: Student[],
  constraints: Constraint[],
  history: HistoryPair[],
  layout: Layout,
  options: { separateGenders?: boolean } = {}
): number {
  let score = 0;
  const assignments = plan.assignments;
  const studentMap = new Map(students.map(s => [s.id, s]));
  
  // Direct neighbors (touching: radius 1)
  const getDirectNeighbors = (row: number, col: number) => {
    const neighbors: string[] = [];
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        if (r === row && c === col) continue;
        const key = `${r}-${c}`;
        if (assignments[key]) neighbors.push(assignments[key]);
      }
    }
    return neighbors;
  };

  // Nearby students (influence: radius 2)
  const getNearbyStudents = (row: number, col: number) => {
    const nearby: string[] = [];
    for (let r = row - 2; r <= row + 2; r++) {
      for (let c = col - 2; c <= col + 2; c++) {
        if (r === row && c === col) continue;
        const key = `${r}-${c}`;
        if (assignments[key]) nearby.push(assignments[key]);
      }
    }
    return nearby;
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
    const directNeighbors = getDirectNeighbors(row, col);
    const nearbyStudents = getNearbyStudents(row, col);

    // 1. Blacklist (CRITICAL: +2000 per violation)
    // Blacklist is check in a radius of 2 (too close is bad anyway)
    for (const neighborId of nearbyStudents) {
      const isBlacklisted = constraints.some(c => 
        c.type === 'blacklist' && 
        ((c.student_a_id === studentId && c.student_b_id === neighborId) ||
         (c.student_a_id === neighborId && c.student_b_id === studentId))
      );
      if (isBlacklisted) score += 2000;
    }

    // 2. Bavards (SEVERE: +500)
    // Only penalty if they are DIRECT neighbors
    if (student.profil.bavard >= 4) {
      for (const neighborId of directNeighbors) {
        const neighbor = studentMap.get(neighborId);
        if (neighbor && neighbor.profil.bavard >= 4) {
          score += 500;
        }
      }
    }

    // 3. Ergonomie (ERGONOMIE: +300)
    const distanceFromFront = Math.abs(row - deskRow);
    if (student.profil.trouble_visuel && distanceFromFront > 1) {
      score += 300;
    }

    // 4. Mémoire (MÉMOIRE: +150 * N)
    for (const neighborId of directNeighbors) {
      const pastHistory = history.find(h => 
        (h.student_a_id === studentId && h.student_b_id === neighborId) ||
        (h.student_a_id === neighborId && h.student_b_id === studentId)
      );
      if (pastHistory) {
        score += 150 * pastHistory.count_sessions;
      }
    }

    // 5. Attention (ATTENTION: +200)
    if (student.profil.trouble_attention) {
      if (isNearType(row, col, ['window', 'door'])) {
        score += 200;
      }
      for (const neighborId of directNeighbors) {
        const neighbor = studentMap.get(neighborId);
        if (neighbor && neighbor.profil.bavard >= 4) {
          score += 200;
        }
      }
    }

    // 6. Bonus Pedago (BONUS: -100)
    if (student.profil.moteur) {
      for (const neighborId of directNeighbors) {
        const neighbor = studentMap.get(neighborId);
        if (neighbor && neighbor.profil.bavard < 3) {
          score -= 100;
        }
      }
    }

    // 7. Mixité Genre (OPTIONNEL: +250)
    // Only for DIRECT neighbors as requested
    if (options.separateGenders) {
      for (const neighborId of directNeighbors) {
        const neighbor = studentMap.get(neighborId);
        if (neighbor && neighbor.genre === student.genre) {
          score += 250;
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
  onProgress?: (progress: number, currentScore: number) => void,
  options: { separateGenders?: boolean } = {}
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

  let currentScore = calculatePenaltyScore(currentPlan, students, constraints, history, layout, options);

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
    const newScore = calculatePenaltyScore(newPlan, students, constraints, history, layout, options);

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
