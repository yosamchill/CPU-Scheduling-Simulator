/* ============================================================
   algorithms.js — Core CPU Scheduling Algorithms Engine
   ============================================================
   Implements 6 scheduling algorithms:
   1. FCFS (First-Come, First-Served) - Non-Preemptive
   2. SJF (Shortest Job First) - Non-Preemptive
   3. SRTF (Shortest Remaining Time First) - Preemptive
   4. Round Robin (RR) - Preemptive with Time Quantum
   5. Priority - Non-Preemptive
   6. Priority - Preemptive
   ============================================================ */

/**
 * Computes remaining burst time of a process at a specific time t from the Gantt chart.
 */
function computeRemaining(proc, gantt, atTime) {
  if (!proc) return 0;
  var used = 0;
  for (var i = 0; i < gantt.length; i++) {
    var b = gantt[i];
    if (b.pid === proc.id) {
      var bStart = Math.min(b.start, atTime);
      var bEnd = Math.min(b.end, atTime);
      if (bEnd > bStart) {
        used += (bEnd - bStart);
      }
    }
  }
  return Math.max(0, proc.burst - used);
}

/**
 * Merges consecutive blocks with the same PID.
 */
function mergeGantt(rawGantt) {
  var merged = [];
  for (var i = 0; i < rawGantt.length; i++) {
    var g = rawGantt[i];
    if (g.start === g.end) continue;
    if (merged.length > 0 && merged[merged.length - 1].pid === g.pid && merged[merged.length - 1].end === g.start) {
      merged[merged.length - 1].end = g.end;
    } else {
      merged.push({ pid: g.pid, start: g.start, end: g.end });
    }
  }
  return merged;
}

/**
 * Builds statistics, timeline snapshots, and summary metrics.
 */
function buildStatsAndTimeline(algoName, ps, mergedGantt, customTimeline) {
  var totalTime = 0;
  ps.forEach(function (p) {
    if (p.finishTime > totalTime) totalTime = p.finishTime;
  });
  if (mergedGantt.length > 0) {
    var lastBlockEnd = mergedGantt[mergedGantt.length - 1].end;
    if (lastBlockEnd > totalTime) totalTime = lastBlockEnd;
  }

  var busyTime = 0;
  mergedGantt.forEach(function (g) {
    if (g.pid !== 'idle') {
      busyTime += (g.end - g.start);
    }
  });

  var totalWaiting = 0;
  var totalTurnaround = 0;
  var totalResponse = 0;
  var stats = [];

  ps.forEach(function (p) {
    var finish = p.finishTime !== undefined && p.finishTime !== -1 ? p.finishTime : totalTime;
    var start = p.startTime !== undefined && p.startTime !== -1 ? p.startTime : finish;
    var turnaround = finish - p.arrival;
    var waiting = turnaround - p.burst;
    var response = start - p.arrival;

    totalWaiting += waiting;
    totalTurnaround += turnaround;
    totalResponse += response;

    stats.push({
      id: p.id,
      arrival: p.arrival,
      burst: p.burst,
      priority: p.priority,
      start: start,
      finish: finish,
      turnaround: turnaround,
      waiting: waiting,
      response: response
    });
  });

  var n = ps.length;
  var timeline = customTimeline || [];

  if (!customTimeline || customTimeline.length === 0) {
    timeline = [];
    for (var t = 0; t <= totalTime; t++) {
      var running = 'idle';
      for (var gi = 0; gi < mergedGantt.length; gi++) {
        var g = mergedGantt[gi];
        if (g.start <= t && g.end > t) {
          running = g.pid;
          break;
        }
      }

      var readyQueue = [];
      ps.forEach(function (p) {
        var rem = computeRemaining(p, mergedGantt, t);
        if (p.arrival <= t && rem > 0 && p.id !== running) {
          readyQueue.push(p.id);
        }
      });

      timeline.push({
        time: t,
        running: running,
        ready: readyQueue
      });
    }
  }

  return {
    algorithmName: algoName,
    gantt: mergedGantt,
    stats: stats,
    timeline: timeline,
    ps: ps,
    totalTime: totalTime,
    busyTime: busyTime,
    avgWaiting: n > 0 ? (totalWaiting / n) : 0,
    avgTurnaround: n > 0 ? (totalTurnaround / n) : 0,
    avgResponse: n > 0 ? (totalResponse / n) : 0,
    cpuUtilization: totalTime > 0 ? ((busyTime / totalTime) * 100) : 0,
    throughput: totalTime > 0 ? (n / totalTime) : 0
  };
}

/**
 * 1. FCFS (First-Come, First-Served)
 */
function runFCFS(procs) {
  var ps = procs.map(function (p) {
    return { id: p.id, arrival: p.arrival, burst: p.burst, priority: p.priority, remaining: p.burst, startTime: -1, finishTime: -1 };
  });
  ps.sort(function (a, b) {
    if (a.arrival !== b.arrival) return a.arrival - b.arrival;
    return a.id - b.id;
  });

  var rawGantt = [];
  var time = 0;

  ps.forEach(function (p) {
    if (time < p.arrival) {
      rawGantt.push({ pid: 'idle', start: time, end: p.arrival });
      time = p.arrival;
    }
    p.startTime = time;
    p.finishTime = time + p.burst;
    rawGantt.push({ pid: p.id, start: time, end: p.finishTime });
    time = p.finishTime;
    p.remaining = 0;
  });

  var merged = mergeGantt(rawGantt);
  return buildStatsAndTimeline('First-Come, First-Served (FCFS)', ps, merged);
}

/**
 * 2. SJF (Shortest Job First - Non-Preemptive)
 */
function runSJF(procs) {
  var ps = procs.map(function (p) {
    return { id: p.id, arrival: p.arrival, burst: p.burst, priority: p.priority, remaining: p.burst, startTime: -1, finishTime: -1 };
  });
  var n = ps.length;
  var done = 0;
  var time = 0;
  var maxT = 0;
  ps.forEach(function (p) { maxT += p.burst + p.arrival; });
  maxT += 100;

  var rawGantt = [];

  while (done < n && time < maxT) {
    var ready = [];
    for (var i = 0; i < n; i++) {
      if (ps[i].arrival <= time && ps[i].remaining > 0) {
        ready.push(ps[i]);
      }
    }

    if (ready.length === 0) {
      var nextArrival = Infinity;
      ps.forEach(function (p) {
        if (p.arrival > time && p.remaining > 0) {
          nextArrival = Math.min(nextArrival, p.arrival);
        }
      });
      if (nextArrival === Infinity) break;
      rawGantt.push({ pid: 'idle', start: time, end: nextArrival });
      time = nextArrival;
      continue;
    }

    ready.sort(function (a, b) {
      if (a.burst !== b.burst) return a.burst - b.burst;
      return a.arrival - b.arrival;
    });

    var p = ready[0];
    p.startTime = time;
    p.finishTime = time + p.burst;
    rawGantt.push({ pid: p.id, start: time, end: p.finishTime });
    p.remaining = 0;
    time = p.finishTime;
    done++;
  }

  var merged = mergeGantt(rawGantt);
  return buildStatsAndTimeline('Shortest Job First (SJF)', ps, merged);
}

/**
 * 3. SRTF (Shortest Remaining Time First - Preemptive)
 */
function runSRTF(procs) {
  var ps = procs.map(function (p) {
    return { id: p.id, arrival: p.arrival, burst: p.burst, priority: p.priority, remaining: p.burst, startTime: -1, finishTime: -1 };
  });
  var n = ps.length;
  var done = 0;
  var time = 0;
  var maxT = 0;
  ps.forEach(function (p) { maxT += p.burst + p.arrival; });
  maxT += 100;

  var rawGantt = [];

  while (done < n && time < maxT) {
    var ready = [];
    for (var i = 0; i < n; i++) {
      if (ps[i].arrival <= time && ps[i].remaining > 0) {
        ready.push(ps[i]);
      }
    }

    if (ready.length === 0) {
      var nextArrival = Infinity;
      ps.forEach(function (p) {
        if (p.arrival > time && p.remaining > 0) {
          nextArrival = Math.min(nextArrival, p.arrival);
        }
      });
      if (nextArrival === Infinity) break;
      rawGantt.push({ pid: 'idle', start: time, end: nextArrival });
      time = nextArrival;
      continue;
    }

    ready.sort(function (a, b) {
      if (a.remaining !== b.remaining) return a.remaining - b.remaining;
      return a.arrival - b.arrival;
    });

    var p = ready[0];
    if (p.startTime === -1) {
      p.startTime = time;
    }

    // Run until next arrival or completion
    var nextArrival = Infinity;
    ps.forEach(function (x) {
      if (x.arrival > time && x.remaining > 0) {
        nextArrival = Math.min(nextArrival, x.arrival);
      }
    });

    var runUntil = nextArrival !== Infinity ? Math.min(time + p.remaining, nextArrival) : time + p.remaining;
    rawGantt.push({ pid: p.id, start: time, end: runUntil });
    p.remaining -= (runUntil - time);
    time = runUntil;

    if (p.remaining === 0) {
      p.finishTime = time;
      done++;
    }
  }

  var merged = mergeGantt(rawGantt);
  return buildStatsAndTimeline('Shortest Remaining Time First (SRTF)', ps, merged);
}

/**
 * 4. Round Robin (RR)
 */
function runRoundRobin(procs, quantum) {
  quantum = parseInt(quantum, 10) || 2;
  if (quantum <= 0) quantum = 1;

  var ps = procs.map(function (p) {
    return { id: p.id, arrival: p.arrival, burst: p.burst, priority: p.priority, remaining: p.burst, startTime: -1, finishTime: -1 };
  });
  var n = ps.length;
  var done = 0;
  var time = 0;
  var maxT = 0;
  ps.forEach(function (p) { maxT += p.burst + p.arrival; });
  maxT += 100;

  var sorted = ps.slice().sort(function (a, b) {
    if (a.arrival !== b.arrival) return a.arrival - b.arrival;
    return a.id - b.id;
  });

  var q = [];
  var arrived = {};
  var rawGantt = [];

  sorted.forEach(function (p) {
    if (p.arrival <= 0) {
      q.push(p);
      arrived[p.id] = true;
    }
  });

  while (done < n && time < maxT) {
    if (q.length === 0) {
      var nextP = null;
      for (var i = 0; i < sorted.length; i++) {
        if (!arrived[sorted[i].id] && sorted[i].remaining > 0) {
          nextP = sorted[i];
          break;
        }
      }
      if (!nextP) break;

      rawGantt.push({ pid: 'idle', start: time, end: nextP.arrival });
      time = nextP.arrival;

      sorted.forEach(function (p) {
        if (p.arrival <= time && !arrived[p.id]) {
          q.push(p);
          arrived[p.id] = true;
        }
      });
      continue;
    }

    var p = q.shift();
    if (p.startTime === -1) {
      p.startTime = time;
    }

    var run = Math.min(quantum, p.remaining);
    rawGantt.push({ pid: p.id, start: time, end: time + run });
    p.remaining -= run;
    time += run;

    if (p.remaining === 0) {
      p.finishTime = time;
      done++;
    }

    // Add newly arrived processes while p was running
    sorted.forEach(function (x) {
      if (x.arrival > time - run && x.arrival <= time && !arrived[x.id]) {
        q.push(x);
        arrived[x.id] = true;
      }
    });

    // If p is not finished, place it at the back of the queue
    if (p.remaining > 0) {
      q.push(p);
    }
  }

  var merged = mergeGantt(rawGantt);
  return buildStatsAndTimeline('Round Robin (RR, Quantum = ' + quantum + ')', ps, merged);
}

/**
 * 5. Priority (Non-Preemptive)
 */
function runPriorityNP(procs) {
  var ps = procs.map(function (p) {
    return { id: p.id, arrival: p.arrival, burst: p.burst, priority: p.priority, remaining: p.burst, startTime: -1, finishTime: -1 };
  });
  var n = ps.length;
  var done = 0;
  var time = 0;
  var maxT = 0;
  ps.forEach(function (p) { maxT += p.burst + p.arrival; });
  maxT += 100;

  var rawGantt = [];

  while (done < n && time < maxT) {
    var ready = [];
    for (var i = 0; i < n; i++) {
      if (ps[i].arrival <= time && ps[i].remaining > 0) {
        ready.push(ps[i]);
      }
    }

    if (ready.length === 0) {
      var nextArrival = Infinity;
      ps.forEach(function (p) {
        if (p.arrival > time && p.remaining > 0) {
          nextArrival = Math.min(nextArrival, p.arrival);
        }
      });
      if (nextArrival === Infinity) break;
      rawGantt.push({ pid: 'idle', start: time, end: nextArrival });
      time = nextArrival;
      continue;
    }

    ready.sort(function (a, b) {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.arrival - b.arrival;
    });

    var p = ready[0];
    p.startTime = time;
    p.finishTime = time + p.burst;
    rawGantt.push({ pid: p.id, start: time, end: p.finishTime });
    p.remaining = 0;
    time = p.finishTime;
    done++;
  }

  var merged = mergeGantt(rawGantt);
  return buildStatsAndTimeline('Priority Scheduling (Non-Preemptive)', ps, merged);
}

/**
 * 6. Priority (Preemptive)
 */
function runPriorityP(procs) {
  var ps = procs.map(function (p) {
    return { id: p.id, arrival: p.arrival, burst: p.burst, priority: p.priority, remaining: p.burst, startTime: -1, finishTime: -1 };
  });
  var n = ps.length;
  var done = 0;
  var time = 0;
  var maxT = 0;
  ps.forEach(function (p) { maxT += p.burst + p.arrival; });
  maxT += 100;

  var rawGantt = [];

  while (done < n && time < maxT) {
    var ready = [];
    for (var i = 0; i < n; i++) {
      if (ps[i].arrival <= time && ps[i].remaining > 0) {
        ready.push(ps[i]);
      }
    }

    if (ready.length === 0) {
      var nextArrival = Infinity;
      ps.forEach(function (p) {
        if (p.arrival > time && p.remaining > 0) {
          nextArrival = Math.min(nextArrival, p.arrival);
        }
      });
      if (nextArrival === Infinity) break;
      rawGantt.push({ pid: 'idle', start: time, end: nextArrival });
      time = nextArrival;
      continue;
    }

    ready.sort(function (a, b) {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.arrival - b.arrival;
    });

    var p = ready[0];
    if (p.startTime === -1) {
      p.startTime = time;
    }

    var nextArrival = Infinity;
    ps.forEach(function (x) {
      if (x.arrival > time && x.remaining > 0) {
        nextArrival = Math.min(nextArrival, x.arrival);
      }
    });

    var runUntil = nextArrival !== Infinity ? Math.min(time + p.remaining, nextArrival) : time + p.remaining;
    rawGantt.push({ pid: p.id, start: time, end: runUntil });
    p.remaining -= (runUntil - time);
    time = runUntil;

    if (p.remaining === 0) {
      p.finishTime = time;
      done++;
    }
  }

  var merged = mergeGantt(rawGantt);
  return buildStatsAndTimeline('Priority Scheduling (Preemptive)', ps, merged);
}

/**
 * Main dispatcher: builds full timeline given algorithm id and processes.
 */
function buildTimeline(algoId, processes, quantum) {
  switch (algoId) {
    case 'fcfs':
      return runFCFS(processes);
    case 'sjf':
      return runSJF(processes);
    case 'srtf':
      return runSRTF(processes);
    case 'rr':
      return runRoundRobin(processes, quantum);
    case 'priority':
      return runPriorityNP(processes);
    case 'priorityp':
      return runPriorityP(processes);
    default:
      return runFCFS(processes);
  }
}
