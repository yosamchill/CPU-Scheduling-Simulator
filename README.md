# CPU Scheduling Simulator

An interactive, animated web-based simulator that demonstrates how different CPU scheduling algorithms work in an Operating System.

---

## 📂 Project Structure

```
CPU-Scheduler/
│
├── cpp/
│   ├── algorithms.h        ← C++ Header (data structures & algorithm declarations)
│   └── algorithms.cpp      ← Core CPU scheduling implementations in C++ (★ main logic)
│
├── index.html              ← Main HTML page (the layout & structure)
│
├── css/
│   └── styles.css          ← All styling (colors, buttons, animations)
│
├── js/
│   ├── config.js           ← Constants & global state variables
│   ├── algorithms.js       ← Core CPU scheduling algorithms in JavaScript
│   ├── ui.js               ← Renders the UI (tables, Gantt chart, states)
│   ├── animation.js        ← Playback engine (play, pause, step, speed)
│   ├── comparison.js       ← Compare all algorithms + bar chart
│   └── app.js              ← App initialization (entry point)
│
└── README.md               ← This file
```

---

## 🧠 Algorithms Implemented

| # | Algorithm | Type | How It Works |
|---|-----------|------|--------------|
| 1 | **FCFS** (First Come First Served) | Non-Preemptive | Processes run in the order they arrive. Simple but can cause long waiting times (convoy effect). |
| 2 | **SJF** (Shortest Job First) | Non-Preemptive | Picks the process with the shortest burst time. Optimal for average waiting time, but requires knowing burst times in advance. |
| 3 | **SRTF** (Shortest Remaining Time First) | Preemptive | Like SJF, but can interrupt a running process if a new one arrives with a shorter remaining time. |
| 4 | **Round Robin** | Preemptive | Each process gets a fixed time slice (quantum). After its slice, it goes to the back of the queue. Fair but adds context-switch overhead. |
| 5 | **Priority (Non-Preemptive)** | Non-Preemptive | Runs the highest-priority process first (lower number = higher priority). Once started, it runs to completion. |
| 6 | **Priority (Preemptive)** | Preemptive | Like Priority NP, but can interrupt a running process if a higher-priority process arrives. |

---

## 📊 Metrics Explained

| Metric | Formula | What It Means |
|--------|---------|---------------|
| **Waiting Time** | Turnaround − Burst | Time a process spent waiting in the ready queue |
| **Turnaround Time** | Finish − Arrival | Total time from arrival to completion |
| **Response Time** | First Run − Arrival | Time from arrival until the process first gets the CPU |
| **CPU Utilization** | (Busy Time / Total Time) × 100 | Percentage of time the CPU was doing useful work |
| **Throughput** | Processes / Total Time | How many processes completed per unit time |

---

## 🗂 File-by-File Explanation

### `index.html`
- The main page structure
- Contains the layout: header, algorithm cards, process table, buttons, simulation view, comparison view
- Links to the CSS and all JavaScript files in the correct order

### `css/styles.css`
- Visual styling for all components
- Defines animations: fade-in, pop-in, pulse, confetti
- Button styles, card styles, table row highlighting
- Gantt chart block hover effects and tooltips

### `cpp/algorithms.h` & `cpp/algorithms.cpp` ⭐ (Core C++ Scheduling Engine)
- Full C++ implementation of all 6 CPU scheduling algorithms
- Implements:
  - **FCFS** (First Come First Served)
  - **SJF** (Shortest Job First - Non-Preemptive)
  - **SRTF** (Shortest Remaining Time First - Preemptive)
  - **Round Robin** (with configurable time quantum)
  - **Priority Scheduling** (Non-Preemptive)
  - **Priority Scheduling** (Preemptive)
- Features:
  - Generates detailed ASCII Gantt charts
  - Computes per-process metrics: Start, Finish, Waiting, Turnaround, Response Time
  - Calculates summary statistics: Average Waiting, Average Turnaround, CPU Utilization, Throughput
  - Interactive CLI to run individual algorithms, input custom processes, or compare all 6 side-by-side

### `js/config.js`
- Configuration, process colors (paper & fountain pen ink palette), and global state

### `js/algorithms.js`
- Full JavaScript implementations of all 6 CPU scheduling algorithms (FCFS, SJF, SRTF, Round Robin, Priority Non-Preemptive, Priority Preemptive)
- Computes timeline snapshots, remaining burst tracking, and scheduling metrics for simulation and comparison

### `js/ui.js`
- Renders the algorithm selection grid
- Handles the process input table (add, remove, edit)
- Renders the animated Gantt chart, ready queue, process states
- Updates live statistics during simulation

### `js/animation.js`
- Controls the step-by-step playback
- Play, Pause, Step Forward, Reset buttons
- Speed control (0.5×, 1×, 2×, 5×)
- Confetti celebration when simulation completes

### `js/comparison.js`
- Runs all 6 algorithms on the same data
- Builds a comparison table (highlights best values in green)
- Draws an animated bar chart using HTML Canvas

### `js/app.js`
- Simple initialization: renders the UI and adds 3 starter processes

---

## 🚀 How to Run the C++ Program

1. Open a terminal or command prompt in the project directory.
2. Compile the C++ program using `g++`:
   ```bash
   g++ -std=c++17 cpp/algorithms.cpp -o scheduler
   ```
3. Run the compiled executable:
   - On Windows:
     ```cmd
     scheduler.exe
     ```
   - On Linux / macOS:
     ```bash
     ./scheduler
     ```
4. You will see an interactive menu where you can:
   - Run any specific scheduling algorithm (FCFS, SJF, SRTF, RR, Priority NP, Priority P)
   - View the generated ASCII Gantt chart and statistics table
   - Run option `7` to compare all 6 algorithms side-by-side
   - Input custom processes and quantum values

---

## 🎮 How to Use

1. **Select an algorithm** from the top cards
2. **Add processes** with arrival time, burst time, and priority
3. Click **▶ Simulate** to watch the animated step-by-step execution
4. Use **⏮ ⏭ ⏸** to control playback, and **speed buttons** to go faster/slower
5. Click **📊 Compare All** to see all 6 algorithms side by side

---

## 💡 Key Concepts for Viva / Exam

- **Preemptive** = CPU can be taken away from a running process
- **Non-Preemptive** = Once a process starts, it runs to completion
- **Convoy Effect** = In FCFS, short processes wait behind long ones
- **Starvation** = In Priority scheduling, low-priority processes may never run
- **Time Quantum** = The fixed time slice in Round Robin
- **Context Switch** = Saving/loading process state when switching (adds overhead)

