#ifndef ALGORITHMS_H
#define ALGORITHMS_H

#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <iomanip>
#include <queue>
#include <set>
#include <climits>

// Represents an input/scheduled Process
struct Process {
    int id;             // Process ID (1, 2, 3...)
    int arrival;        // Arrival Time
    int burst;          // Total CPU Burst Time
    int priority;       // Priority (lower value = higher priority)
    
    // Tracking fields during simulation
    int remaining;      // Remaining Burst Time
    bool started;       // Has the process started running?
    int startTime;      // Time when process first acquired the CPU
    int finishTime;     // Time when process completed execution

    Process(int id = 0, int arrival = 0, int burst = 0, int priority = 0)
        : id(id), arrival(arrival), burst(burst), priority(priority),
          remaining(burst), started(false), startTime(-1), finishTime(-1) {}
};

// Represents a block in the Gantt chart
struct GanttBlock {
    int pid;            // Process ID, or -1 for idle
    int start;          // Start time
    int end;            // End time

    GanttBlock(int pid = -1, int start = 0, int end = 0)
        : pid(pid), start(start), end(end) {}
};

// Computed statistics for each process
struct ProcessStats {
    int id;
    int arrival;
    int burst;
    int priority;
    int start;
    int finish;
    int waiting;        // Turnaround - Burst
    int turnaround;     // Finish - Arrival
    int response;       // Start - Arrival
};

// Per-time-unit snapshot (useful for step-by-step simulations/animations)
struct TimelineSnapshot {
    int time;
    int runningPid;     // Currently running process ID (-1 for idle)
    std::vector<int> readyQueue; // IDs of processes waiting in ready queue
};

// Result of running a scheduling algorithm
struct ScheduleResult {
    std::string algorithmName;
    std::vector<GanttBlock> gantt;
    std::vector<ProcessStats> stats;
    std::vector<TimelineSnapshot> timeline;
    int totalTime;
    int busyTime;
    double avgWaiting;
    double avgTurnaround;
    double avgResponse;
    double cpuUtilization; // Percentage [0 - 100%]
    double throughput;     // Completed processes per unit time
};

// Helper functions
std::vector<GanttBlock> mergeGantt(const std::vector<GanttBlock>& rawGantt);
ScheduleResult buildStatsAndTimeline(const std::string& algoName,
                                     const std::vector<Process>& ps,
                                     const std::vector<GanttBlock>& mergedGantt);

// Algorithm implementations
ScheduleResult runFCFS(std::vector<Process> procs);
ScheduleResult runSJF(std::vector<Process> procs);
ScheduleResult runSRTF(std::vector<Process> procs);
ScheduleResult runRoundRobin(std::vector<Process> procs, int quantum);
ScheduleResult runPriorityNP(std::vector<Process> procs);
ScheduleResult runPriorityP(std::vector<Process> procs);

// Display helpers
void printGanttChart(const ScheduleResult& res);
void printStatsTable(const ScheduleResult& res);
void printComparison(const std::vector<ScheduleResult>& results);

#endif // ALGORITHMS_H
