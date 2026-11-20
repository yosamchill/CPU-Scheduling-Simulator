/* ============================================================
   config.js — Constants and Configuration
   ============================================================
   This file defines:
   - The list of supported scheduling algorithms
   - Color palette for processes
   - Global application state variables
   ============================================================ */

// All 6 scheduling algorithms supported by this simulator
const ALGORITHMS = [
  { id: 'fcfs',      name: 'FCFS',          desc: 'First Come First Served' },
  { id: 'sjf',       name: 'SJF',           desc: 'Shortest Job First' },
  { id: 'srtf',      name: 'SRTF',          desc: 'Shortest Remaining Time' },
  { id: 'rr',        name: 'Round Robin',   desc: 'Time-sliced scheduling' },
  { id: 'priority',  name: 'Priority (NP)', desc: 'Priority Non-Preemptive' },
  { id: 'priorityp', name: 'Priority (P)',  desc: 'Priority Preemptive' },
];

// Colors assigned to processes (P1 = color[0], P2 = color[1], ...)
const COLORS = [
  '#6366f1', // indigo
  '#22c55e', // green
  '#eab308', // yellow
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#e879f9', // pink
  '#fb923c', // light orange
  '#34d399', // emerald
  '#60a5fa', // blue
  '#f472b6', // rose
  '#a78bfa', // violet
];

// ---- Global State ----
let processes = [];           // Array of process objects: { id, arrival, burst, priority }
let selectedAlgo = 'fcfs';    // Currently selected algorithm ID
let pidCounter = 1;           // Auto-incrementing process ID counter

// Animation state object — tracks the entire playback
let anim = {
  playing: false,       // Is the animation currently playing?
  timer: null,          // setTimeout reference for the next frame
  speed: 1,             // Playback speed multiplier (0.5, 1, 2, 5)
  currentTime: 0,       // Current simulation time unit
  totalTime: 0,         // Total time of the simulation
  timeline: [],         // Array of per-time-unit snapshots
  gantt: [],            // Merged Gantt chart blocks
  stats: [],            // Per-process statistics
  ps: [],               // Process state array from simulation
  finished: false,      // Has the simulation reached the end?
};

