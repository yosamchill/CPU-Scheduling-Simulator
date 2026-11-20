#include "algorithms.h"
#include <iostream>
#include <iomanip>
#include <algorithm>
#include <sstream>

// Helper to compute remaining time of a process at a specific time t from the Gantt chart
static int computeRemainingAt(const Process& proc, const std::vector<GanttBlock>& gantt, int atTime) {
    int used = 0;
    for (const auto& block : gantt) {
        if (block.pid == proc.id) {
            int blockStart = std::min(block.start, atTime);
            int blockEnd = std::min(block.end, atTime);
            used += (blockEnd - blockStart);
        }
    }
    return std::max(0, proc.burst - used);
}

// Merge consecutive blocks with the same PID
std::vector<GanttBlock> mergeGantt(const std::vector<GanttBlock>& rawGantt) {
    std::vector<GanttBlock> merged;
    for (const auto& g : rawGantt) {
        if (g.start == g.end) continue; // skip 0-duration blocks if any
        if (!merged.empty() && merged.back().pid == g.pid && merged.back().end == g.start) {
            merged.back().end = g.end;
        } else {
            merged.push_back(g);
        }
    }
    return merged;
}

// Build statistics, timeline snapshots, and averages
ScheduleResult buildStatsAndTimeline(const std::string& algoName,
                                     const std::vector<Process>& ps,
                                     const std::vector<GanttBlock>& mergedGantt) {
    ScheduleResult res;
    res.algorithmName = algoName;
    res.gantt = mergedGantt;

    int totalTime = 0;
    for (const auto& p : ps) {
        if (p.finishTime > totalTime) {
            totalTime = p.finishTime;
        }
    }
    res.totalTime = totalTime;

    int busyTime = 0;
    for (const auto& g : mergedGantt) {
        if (g.pid != -1) {
            busyTime += (g.end - g.start);
        }
    }
    res.busyTime = busyTime;

    double totalWaiting = 0;
    double totalTurnaround = 0;
    double totalResponse = 0;

    for (const auto& p : ps) {
        ProcessStats stat;
        stat.id = p.id;
        stat.arrival = p.arrival;
        stat.burst = p.burst;
        stat.priority = p.priority;
        stat.start = p.startTime;
        stat.finish = p.finishTime;
        stat.turnaround = p.finishTime - p.arrival;
        stat.waiting = stat.turnaround - p.burst;
        stat.response = p.startTime - p.arrival;

        totalWaiting += stat.waiting;
        totalTurnaround += stat.turnaround;
        totalResponse += stat.response;

        res.stats.push_back(stat);
    }

    int n = ps.size();
    res.avgWaiting = (n > 0) ? (totalWaiting / n) : 0.0;
    res.avgTurnaround = (n > 0) ? (totalTurnaround / n) : 0.0;
    res.avgResponse = (n > 0) ? (totalResponse / n) : 0.0;
    res.cpuUtilization = (totalTime > 0) ? ((double)busyTime / totalTime * 100.0) : 0.0;
    res.throughput = (totalTime > 0) ? ((double)n / totalTime) : 0.0;

    // Build timeline snapshots
    for (int t = 0; t <= totalTime; ++t) {
        int running = -1;
        for (const auto& g : mergedGantt) {
            if (g.start <= t && g.end > t) {
                running = g.pid;
                break;
            }
        }

        std::vector<int> readyQueue;
        for (const auto& p : ps) {
            int rem = computeRemainingAt(p, mergedGantt, t);
            if (p.arrival <= t && rem > 0 && p.id != running) {
                readyQueue.push_back(p.id);
            }
        }

        TimelineSnapshot snap;
        snap.time = t;
        snap.runningPid = running;
        snap.readyQueue = readyQueue;
        res.timeline.push_back(snap);
    }

    return res;
}

/* ──────────── 1. FCFS: First-Come, First-Served ──────────── */
ScheduleResult runFCFS(std::vector<Process> procs) {
    std::vector<Process> ps = procs;
    std::sort(ps.begin(), ps.end(), [](const Process& a, const Process& b) {
        if (a.arrival != b.arrival) return a.arrival < b.arrival;
        return a.id < b.id;
    });

    std::vector<GanttBlock> rawGantt;
    int time = 0;

    for (auto& p : ps) {
        if (time < p.arrival) {
            rawGantt.push_back(GanttBlock(-1, time, p.arrival));
            time = p.arrival;
        }
        p.startTime = time;
        p.started = true;
        p.finishTime = time + p.burst;
        rawGantt.push_back(GanttBlock(p.id, time, p.finishTime));
        time = p.finishTime;
        p.remaining = 0;
    }

    std::vector<GanttBlock> merged = mergeGantt(rawGantt);
    return buildStatsAndTimeline("First-Come, First-Served (FCFS)", ps, merged);
}

/* ──────────── 2. SJF: Shortest Job First (Non-Preemptive) ──────────── */
ScheduleResult runSJF(std::vector<Process> procs) {
    std::vector<Process> ps = procs;
    int n = ps.size();
    int done = 0;
    int time = 0;
    int maxT = 0;
    for (const auto& p : ps) maxT += p.burst + p.arrival;
    maxT += 100;

    std::vector<GanttBlock> rawGantt;

    while (done < n && time < maxT) {
        // Find ready processes
        std::vector<int> readyIndices;
        for (int i = 0; i < n; ++i) {
            if (ps[i].arrival <= time && ps[i].remaining > 0) {
                readyIndices.push_back(i);
            }
        }

        if (readyIndices.empty()) {
            // Find next arriving process
            int nextArrival = INT_MAX;
            for (const auto& p : ps) {
                if (p.arrival > time && p.remaining > 0) {
                    nextArrival = std::min(nextArrival, p.arrival);
                }
            }
            if (nextArrival == INT_MAX) break;
            rawGantt.push_back(GanttBlock(-1, time, nextArrival));
            time = nextArrival;
            continue;
        }

        // Sort ready processes by burst, tie-break by arrival
        std::sort(readyIndices.begin(), readyIndices.end(), [&](int a, int b) {
            if (ps[a].burst != ps[b].burst) return ps[a].burst < ps[b].burst;
            return ps[a].arrival < ps[b].arrival;
        });

        int best = readyIndices[0];
        Process& p = ps[best];

        if (!p.started) {
            p.startTime = time;
            p.started = true;
        }
        p.finishTime = time + p.burst;
        rawGantt.push_back(GanttBlock(p.id, time, p.finishTime));
        p.remaining = 0;
        time = p.finishTime;
        done++;
    }

    std::vector<GanttBlock> merged = mergeGantt(rawGantt);
    return buildStatsAndTimeline("Shortest Job First (SJF - Non-Preemptive)", ps, merged);
}

/* ──────────── 3. SRTF: Shortest Remaining Time First (Preemptive) ──────────── */
ScheduleResult runSRTF(std::vector<Process> procs) {
    std::vector<Process> ps = procs;
    int n = ps.size();
    int done = 0;
    int time = 0;
    int maxT = 0;
    for (const auto& p : ps) maxT += p.burst + p.arrival;
    maxT += 100;

    std::vector<GanttBlock> rawGantt;

    while (done < n && time < maxT) {
        std::vector<int> readyIndices;
        for (int i = 0; i < n; ++i) {
            if (ps[i].arrival <= time && ps[i].remaining > 0) {
                readyIndices.push_back(i);
            }
        }

        if (readyIndices.empty()) {
            int nextArrival = INT_MAX;
            for (const auto& p : ps) {
                if (p.arrival > time && p.remaining > 0) {
                    nextArrival = std::min(nextArrival, p.arrival);
                }
            }
            if (nextArrival == INT_MAX) break;
            rawGantt.push_back(GanttBlock(-1, time, nextArrival));
            time = nextArrival;
            continue;
        }

        // Sort by remaining time, then arrival
        std::sort(readyIndices.begin(), readyIndices.end(), [&](int a, int b) {
            if (ps[a].remaining != ps[b].remaining) return ps[a].remaining < ps[b].remaining;
            return ps[a].arrival < ps[b].arrival;
        });

        int best = readyIndices[0];
        Process& p = ps[best];

        if (!p.started) {
            p.startTime = time;
            p.started = true;
        }

        // Run until next process arrives or current completes
        int nextArrival = INT_MAX;
        for (const auto& x : ps) {
            if (x.arrival > time && x.remaining > 0) {
                nextArrival = std::min(nextArrival, x.arrival);
            }
        }

        int runUntil = (nextArrival != INT_MAX) ? std::min(time + p.remaining, nextArrival)
                                                : time + p.remaining;

        rawGantt.push_back(GanttBlock(p.id, time, runUntil));
        p.remaining -= (runUntil - time);
        time = runUntil;

        if (p.remaining == 0) {
            p.finishTime = time;
            done++;
        }
    }

    std::vector<GanttBlock> merged = mergeGantt(rawGantt);
    return buildStatsAndTimeline("Shortest Remaining Time First (SRTF - Preemptive)", ps, merged);
}

/* ──────────── 4. Round Robin (RR) ──────────── */
ScheduleResult runRoundRobin(std::vector<Process> procs, int quantum) {
    if (quantum <= 0) quantum = 1;
    std::vector<Process> ps = procs;
    int n = ps.size();
    int done = 0;
    int time = 0;
    int maxT = 0;
    for (const auto& p : ps) maxT += p.burst + p.arrival;
    maxT += 100;

    std::vector<Process*> sortedPtrs;
    for (auto& p : ps) sortedPtrs.push_back(&p);
    std::sort(sortedPtrs.begin(), sortedPtrs.end(), [](Process* a, Process* b) {
        return a->arrival < b->arrival;
    });

    std::queue<Process*> q;
    std::set<int> arrived;
    std::vector<GanttBlock> rawGantt;

    // Enqueue processes arriving at time <= 0
    for (auto* p : sortedPtrs) {
        if (p->arrival <= 0) {
            q.push(p);
            arrived.insert(p->id);
        }
    }

    while (done < n && time < maxT) {
        if (q.empty()) {
            // Find next arrival
            Process* nx = nullptr;
            for (auto* p : sortedPtrs) {
                if (arrived.find(p->id) == arrived.end() && p->remaining > 0) {
                    nx = p;
                    break;
                }
            }
            if (!nx) break;

            rawGantt.push_back(GanttBlock(-1, time, nx->arrival));
            time = nx->arrival;

            for (auto* p : sortedPtrs) {
                if (p->arrival <= time && arrived.find(p->id) == arrived.end()) {
                    q.push(p);
                    arrived.insert(p->id);
                }
            }
            continue;
        }

        Process* p = q.front();
        q.pop();

        if (!p->started) {
            p->startTime = time;
            p->started = true;
        }

        int run = std::min(quantum, p->remaining);
        rawGantt.push_back(GanttBlock(p->id, time, time + run));
        p->remaining -= run;
        time += run;

        if (p->remaining == 0) {
            p->finishTime = time;
            done++;
        }

        // Add newly arrived processes during this time interval before re-adding current process
        for (auto* x : sortedPtrs) {
            if (x->arrival > time - run && x->arrival <= time && arrived.find(x->id) == arrived.end()) {
                q.push(x);
                arrived.insert(x->id);
            }
        }

        // If current process still has work, push to back of queue
        if (p->remaining > 0) {
            q.push(p);
        }
    }

    std::vector<GanttBlock> merged = mergeGantt(rawGantt);
    std::ostringstream ss;
    ss << "Round Robin (RR, Quantum = " << quantum << ")";
    return buildStatsAndTimeline(ss.str(), ps, merged);
}

/* ──────────── 5. Priority (Non-Preemptive) ──────────── */
ScheduleResult runPriorityNP(std::vector<Process> procs) {
    std::vector<Process> ps = procs;
    int n = ps.size();
    int done = 0;
    int time = 0;
    int maxT = 0;
    for (const auto& p : ps) maxT += p.burst + p.arrival;
    maxT += 100;

    std::vector<GanttBlock> rawGantt;

    while (done < n && time < maxT) {
        std::vector<int> readyIndices;
        for (int i = 0; i < n; ++i) {
            if (ps[i].arrival <= time && ps[i].remaining > 0) {
                readyIndices.push_back(i);
            }
        }

        if (readyIndices.empty()) {
            int nextArrival = INT_MAX;
            for (const auto& p : ps) {
                if (p.arrival > time && p.remaining > 0) {
                    nextArrival = std::min(nextArrival, p.arrival);
                }
            }
            if (nextArrival == INT_MAX) break;
            rawGantt.push_back(GanttBlock(-1, time, nextArrival));
            time = nextArrival;
            continue;
        }

        // Lower number = higher priority; tie-break by arrival
        std::sort(readyIndices.begin(), readyIndices.end(), [&](int a, int b) {
            if (ps[a].priority != ps[b].priority) return ps[a].priority < ps[b].priority;
            return ps[a].arrival < ps[b].arrival;
        });

        int best = readyIndices[0];
        Process& p = ps[best];

        if (!p.started) {
            p.startTime = time;
            p.started = true;
        }
        p.finishTime = time + p.burst;
        rawGantt.push_back(GanttBlock(p.id, time, p.finishTime));
        p.remaining = 0;
        time = p.finishTime;
        done++;
    }

    std::vector<GanttBlock> merged = mergeGantt(rawGantt);
    return buildStatsAndTimeline("Priority Scheduling (Non-Preemptive)", ps, merged);
}

/* ──────────── 6. Priority (Preemptive) ──────────── */
ScheduleResult runPriorityP(std::vector<Process> procs) {
    std::vector<Process> ps = procs;
    int n = ps.size();
    int done = 0;
    int time = 0;
    int maxT = 0;
    for (const auto& p : ps) maxT += p.burst + p.arrival;
    maxT += 100;

    std::vector<GanttBlock> rawGantt;

    while (done < n && time < maxT) {
        std::vector<int> readyIndices;
        for (int i = 0; i < n; ++i) {
            if (ps[i].arrival <= time && ps[i].remaining > 0) {
                readyIndices.push_back(i);
            }
        }

        if (readyIndices.empty()) {
            int nextArrival = INT_MAX;
            for (const auto& p : ps) {
                if (p.arrival > time && p.remaining > 0) {
                    nextArrival = std::min(nextArrival, p.arrival);
                }
            }
            if (nextArrival == INT_MAX) break;
            rawGantt.push_back(GanttBlock(-1, time, nextArrival));
            time = nextArrival;
            continue;
        }

        // Lower number = higher priority
        std::sort(readyIndices.begin(), readyIndices.end(), [&](int a, int b) {
            if (ps[a].priority != ps[b].priority) return ps[a].priority < ps[b].priority;
            return ps[a].arrival < ps[b].arrival;
        });

        int best = readyIndices[0];
        Process& p = ps[best];

        if (!p.started) {
            p.startTime = time;
            p.started = true;
        }

        // Run until next process arrives or current completes
        int nextArrival = INT_MAX;
        for (const auto& x : ps) {
            if (x.arrival > time && x.remaining > 0) {
                nextArrival = std::min(nextArrival, x.arrival);
            }
        }

        int runUntil = (nextArrival != INT_MAX) ? std::min(time + p.remaining, nextArrival)
                                                : time + p.remaining;

        rawGantt.push_back(GanttBlock(p.id, time, runUntil));
        p.remaining -= (runUntil - time);
        time = runUntil;

        if (p.remaining == 0) {
            p.finishTime = time;
            done++;
        }
    }

    std::vector<GanttBlock> merged = mergeGantt(rawGantt);
    return buildStatsAndTimeline("Priority Scheduling (Preemptive)", ps, merged);
}

/* ──────────── ASCII Display Helpers ──────────── */

void printGanttChart(const ScheduleResult& res) {
    if (res.gantt.empty()) {
        std::cout << "[Gantt Chart is empty]\n";
        return;
    }

    std::cout << "\n================ Gantt Chart ================\n";
    
    // Top border
    std::cout << "+";
    for (const auto& b : res.gantt) {
        int width = std::max(6, (b.end - b.start) * 3);
        std::cout << std::string(width, '-') << "+";
    }
    std::cout << "\n";

    // Process labels
    std::cout << "|";
    for (const auto& b : res.gantt) {
        int width = std::max(6, (b.end - b.start) * 3);
        std::string label = (b.pid == -1) ? "IDLE" : ("P" + std::to_string(b.pid));
        int padLeft = (width - (int)label.size()) / 2;
        int padRight = width - (int)label.size() - padLeft;
        std::cout << std::string(padLeft, ' ') << label << std::string(padRight, ' ') << "|";
    }
    std::cout << "\n";

    // Bottom border
    std::cout << "+";
    for (const auto& b : res.gantt) {
        int width = std::max(6, (b.end - b.start) * 3);
        std::cout << std::string(width, '-') << "+";
    }
    std::cout << "\n";

    // Time timeline
    std::cout << res.gantt[0].start;
    for (const auto& b : res.gantt) {
        int width = std::max(6, (b.end - b.start) * 3);
        std::string endStr = std::to_string(b.end);
        int spaces = width + 1 - (int)endStr.size();
        if (spaces < 1) spaces = 1;
        std::cout << std::string(spaces, ' ') << endStr;
    }
    std::cout << "\n=============================================\n";
}

void printStatsTable(const ScheduleResult& res) {
    std::cout << "\nAlgorithm: " << res.algorithmName << "\n";
    std::cout << "----------------------------------------------------------------------------------\n";
    std::cout << std::left 
              << std::setw(6)  << "PID" 
              << std::setw(10) << "Arrival" 
              << std::setw(8)  << "Burst" 
              << std::setw(10) << "Priority"
              << std::setw(8)  << "Start" 
              << std::setw(8)  << "Finish" 
              << std::setw(10) << "Wait" 
              << std::setw(12) << "Turnaround" 
              << std::setw(10) << "Response" << "\n";
    std::cout << "----------------------------------------------------------------------------------\n";

    for (const auto& s : res.stats) {
        std::cout << std::left 
                  << std::setw(6)  << ("P" + std::to_string(s.id))
                  << std::setw(10) << s.arrival
                  << std::setw(8)  << s.burst
                  << std::setw(10) << s.priority
                  << std::setw(8)  << s.start
                  << std::setw(8)  << s.finish
                  << std::setw(10) << s.waiting
                  << std::setw(12) << s.turnaround
                  << std::setw(10) << s.response << "\n";
    }
    std::cout << "----------------------------------------------------------------------------------\n";
    std::cout << std::fixed << std::setprecision(2);
    std::cout << "Average Waiting Time    : " << res.avgWaiting << " time units\n";
    std::cout << "Average Turnaround Time : " << res.avgTurnaround << " time units\n";
    std::cout << "Average Response Time   : " << res.avgResponse << " time units\n";
    std::cout << "CPU Utilization         : " << res.cpuUtilization << " %\n";
    std::cout << "Throughput              : " << res.throughput << " processes/unit time\n";
    std::cout << "----------------------------------------------------------------------------------\n";
}

void printComparison(const std::vector<ScheduleResult>& results) {
    std::cout << "\n====================================================================================================\n";
    std::cout << "                                  ALGORITHM COMPARISON SUMMARY\n";
    std::cout << "====================================================================================================\n";
    std::cout << std::left
              << std::setw(42) << "Algorithm"
              << std::setw(14) << "Avg Waiting"
              << std::setw(16) << "Avg Turnaround"
              << std::setw(14) << "Avg Response"
              << std::setw(16) << "CPU Utilization"
              << std::setw(12) << "Throughput"
              << "\n";
    std::cout << "----------------------------------------------------------------------------------------------------\n";

    for (const auto& r : results) {
        std::cout << std::left
                  << std::setw(42) << r.algorithmName
                  << std::setw(14) << r.avgWaiting
                  << std::setw(16) << r.avgTurnaround
                  << std::setw(14) << r.avgResponse
                  << (std::to_string((int)r.cpuUtilization) + "%") 
                  << std::string(16 - (std::to_string((int)r.cpuUtilization) + "%").length(), ' ')
                  << std::setw(12) << r.throughput
                  << "\n";
    }
    std::cout << "====================================================================================================\n";
}

/* ──────────── Interactive / Demo CLI Main ──────────── */
int main() {
    std::vector<Process> defaultProcs = {
        Process(1, 0, 5, 2),  // P1: Arrival=0, Burst=5, Priority=2
        Process(2, 1, 3, 1),  // P2: Arrival=1, Burst=3, Priority=1
        Process(3, 2, 8, 3),  // P3: Arrival=2, Burst=8, Priority=3
        Process(4, 3, 6, 4)   // P4: Arrival=3, Burst=6, Priority=4
    };

    int rrQuantum = 2;
    std::vector<Process> procs = defaultProcs;

    std::cout << "===================================================\n";
    std::cout << "          CPU SCHEDULER SIMULATOR (C++)\n";
    std::cout << "===================================================\n\n";

    while (true) {
        std::cout << "\nCurrent Processes:\n";
        std::cout << "PID\tArrival\tBurst\tPriority\n";
        for (const auto& p : procs) {
            std::cout << "P" << p.id << "\t" << p.arrival << "\t" << p.burst << "\t" << p.priority << "\n";
        }
        std::cout << "Round Robin Time Quantum: " << rrQuantum << "\n\n";

        std::cout << "Select an Option:\n";
        std::cout << " 1. Run First-Come First-Served (FCFS)\n";
        std::cout << " 2. Run Shortest Job First (SJF - Non-Preemptive)\n";
        std::cout << " 3. Run Shortest Remaining Time First (SRTF - Preemptive)\n";
        std::cout << " 4. Run Round Robin (RR)\n";
        std::cout << " 5. Run Priority (Non-Preemptive)\n";
        std::cout << " 6. Run Priority (Preemptive)\n";
        std::cout << " 7. Compare ALL 6 Algorithms\n";
        std::cout << " 8. Enter Custom Processes & Quantum\n";
        std::cout << " 9. Reset to Default Processes\n";
        std::cout << " 0. Exit\n";
        std::cout << "Enter choice (0-9): ";

        int choice;
        if (!(std::cin >> choice)) {
            break;
        }

        if (choice == 0) {
            std::cout << "Exiting CPU Scheduler.\n";
            break;
        }

        switch (choice) {
            case 1: {
                ScheduleResult res = runFCFS(procs);
                printStatsTable(res);
                printGanttChart(res);
                break;
            }
            case 2: {
                ScheduleResult res = runSJF(procs);
                printStatsTable(res);
                printGanttChart(res);
                break;
            }
            case 3: {
                ScheduleResult res = runSRTF(procs);
                printStatsTable(res);
                printGanttChart(res);
                break;
            }
            case 4: {
                ScheduleResult res = runRoundRobin(procs, rrQuantum);
                printStatsTable(res);
                printGanttChart(res);
                break;
            }
            case 5: {
                ScheduleResult res = runPriorityNP(procs);
                printStatsTable(res);
                printGanttChart(res);
                break;
            }
            case 6: {
                ScheduleResult res = runPriorityP(procs);
                printStatsTable(res);
                printGanttChart(res);
                break;
            }
            case 7: {
                std::vector<ScheduleResult> results;
                results.push_back(runFCFS(procs));
                results.push_back(runSJF(procs));
                results.push_back(runSRTF(procs));
                results.push_back(runRoundRobin(procs, rrQuantum));
                results.push_back(runPriorityNP(procs));
                results.push_back(runPriorityP(procs));

                for (const auto& r : results) {
                    printStatsTable(r);
                    printGanttChart(r);
                }
                printComparison(results);
                break;
            }
            case 8: {
                int count;
                std::cout << "Enter number of processes: ";
                if (std::cin >> count && count > 0) {
                    procs.clear();
                    for (int i = 1; i <= count; ++i) {
                        int arr, bst, pri;
                        std::cout << "Process P" << i << " -> Arrival Time: ";
                        std::cin >> arr;
                        std::cout << "Process P" << i << " -> Burst Time: ";
                        std::cin >> bst;
                        std::cout << "Process P" << i << " -> Priority (1 is high): ";
                        std::cin >> pri;
                        procs.push_back(Process(i, arr, bst, pri));
                    }
                    std::cout << "Enter Time Quantum for Round Robin: ";
                    std::cin >> rrQuantum;
                }
                break;
            }
            case 9: {
                procs = defaultProcs;
                rrQuantum = 2;
                std::cout << "Reset to default processes.\n";
                break;
            }
            default:
                std::cout << "Invalid choice. Please try again.\n";
                break;
        }
        std::cout << "\n---------------------------------------------------\n";
    }

    return 0;
}
