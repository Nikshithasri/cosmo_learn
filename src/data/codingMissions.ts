export type Difficulty = "easy" | "medium" | "hard";

export type Position = { x: number; y: number };

export type Mission = {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  gridSize: { width: number; height: number };
  start: Position;
  goal: Position;
  obstacles: Position[];
  // Expected commands to complete the mission, just as a hint/validation if needed
  // For basic block coding, it might be an exact sequence.
  // For text coding, we just evaluate if they reached the goal.
  optimalSteps?: number;
};

export const codingMissions: Record<number, Mission[]> = {
  // Grades 1-3
  1: [
    {
      id: "g1-easy",
      title: "Reboot the Core",
      description: "Move the robot to the glowing core to reboot the system.",
      difficulty: "easy",
      gridSize: { width: 4, height: 4 },
      start: { x: 0, y: 0 },
      goal: { x: 3, y: 0 },
      obstacles: [],
      optimalSteps: 3,
    },
    {
      id: "g1-medium",
      title: "Bypass the Firewall",
      description: "Navigate around the firewalls to reach the data node.",
      difficulty: "medium",
      gridSize: { width: 5, height: 5 },
      start: { x: 0, y: 0 },
      goal: { x: 4, y: 4 },
      obstacles: [{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }],
    },
    {
      id: "g1-hard",
      title: "Maze of Logic",
      description: "Find the winding path to the exit.",
      difficulty: "hard",
      gridSize: { width: 6, height: 6 },
      start: { x: 0, y: 5 },
      goal: { x: 5, y: 0 },
      obstacles: [
        { x: 1, y: 5 }, { x: 1, y: 4 }, { x: 1, y: 3 },
        { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 2 },
      ],
    },
  ],
  // Grades 4-6
  4: [
    {
      id: "g4-easy",
      title: "Condition Check",
      description: "Use an 'If' block to avoid the trap.",
      difficulty: "easy",
      gridSize: { width: 5, height: 5 },
      start: { x: 0, y: 2 },
      goal: { x: 4, y: 2 },
      obstacles: [{ x: 2, y: 2 }],
    },
    {
      id: "g4-medium",
      title: "Loop the Loop",
      description: "Use a loop to cross the long corridor.",
      difficulty: "medium",
      gridSize: { width: 8, height: 3 },
      start: { x: 0, y: 1 },
      goal: { x: 7, y: 1 },
      obstacles: [],
    },
    {
      id: "g4-hard",
      title: "Security Patrol",
      description: "Navigate past the moving security drones.",
      difficulty: "hard",
      gridSize: { width: 6, height: 6 },
      start: { x: 0, y: 0 },
      goal: { x: 5, y: 5 },
      obstacles: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 4, y: 4 }],
    },
  ],
  // Grades 7-10
  7: [
    {
      id: "g7-easy",
      title: "Initialize Protocol",
      description: "Write code to move the agent to the endpoint.",
      difficulty: "easy",
      gridSize: { width: 5, height: 5 },
      start: { x: 0, y: 0 },
      goal: { x: 4, y: 4 },
      obstacles: [],
    },
    {
      id: "g7-medium",
      title: "Algorithm Optimization",
      description: "Write an efficient function to find the shortest path.",
      difficulty: "medium",
      gridSize: { width: 7, height: 7 },
      start: { x: 0, y: 0 },
      goal: { x: 6, y: 6 },
      obstacles: [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 4 }, { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 }],
    },
    {
      id: "g7-hard",
      title: "System Overload",
      description: "Navigate a complex maze with dynamic variables.",
      difficulty: "hard",
      gridSize: { width: 8, height: 8 },
      start: { x: 0, y: 7 },
      goal: { x: 7, y: 0 },
      obstacles: [
        { x: 1, y: 7 }, { x: 1, y: 6 }, { x: 1, y: 5 },
        { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 4 },
        { x: 5, y: 7 }, { x: 5, y: 6 }, { x: 5, y: 5 },
      ],
    },
  ],
};

// Fallbacks for other grades
codingMissions[2] = codingMissions[1];
codingMissions[3] = codingMissions[1];
codingMissions[5] = codingMissions[4];
codingMissions[6] = codingMissions[4];
codingMissions[8] = codingMissions[7];
codingMissions[9] = codingMissions[7];
codingMissions[10] = codingMissions[7];
