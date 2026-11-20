/* ============================================================
   config.js — Constants and Configuration (Paper Theme)
   ============================================================
   This file defines:
   - The list of supported scheduling algorithms
   - Rich fountain pen / ink color palette for processes
   - Global application state variables
   ============================================================ */

// All 6 scheduling algorithms supported by this simulator
var ALGORITHMS = [
  { id: 'fcfs',      name: 'FCFS',          desc: 'First Come First Served' },
  { id: 'sjf',       name: 'SJF',           desc: 'Shortest Job First' },
  { id: 'srtf',      name: 'SRTF',          desc: 'Shortest Remaining Time' },
  { id: 'rr',        name: 'Round Robin',   desc: 'Time-sliced scheduling' },
  { id: 'priority',  name: 'Priority (NP)', desc: 'Priority Non-Preemptive' },
  { id: 'priorityp', name: 'Priority (P)',  desc: 'Priority Preemptive' },
];

// Rich fountain pen ink & stamp palette for processes on paper
var COLORS = [
  '#2563eb', // Fountain Pen Blue
  '#059669', // Emerald Ink
  '#d97706', // Warm Amber Ochre
  '#7c3aed', // Royal Violet Ink
  '#0891b2', // Deep Cyan / Peacock
  '#ea580c', // Terracotta Orange
  '#db2777', // Crimson Rose
  '#4f46e5', // Deep Indigo
  '#16a34a', // Forest Green
  '#dc2626', // Scarlet Stamp Red
  '#ca8a04', // Golden Ochre
  '#9333ea', // Mulberry Purple
];

// ---- Global State ----
var processes = [];           // Array of process objects: { id, arrival, burst, priority }
var selectedAlgo = 'fcfs';    // Currently selected algorithm ID
var pidCounter = 1;           // Auto-incrementing process ID counter

// Animation state object — tracks the entire playback
var anim = {
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
