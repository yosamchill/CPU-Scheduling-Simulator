/* ============================================================
   ui.js — User Interface Rendering Functions
   ============================================================
   This file handles all DOM updates:
   - Algorithm selection grid
   - Process input table (add, remove, render)
   - Preset data loading
   - Gantt chart drawing
   - Ready queue display
   - Process state table
   - Live statistics display
   ============================================================ */


/* ──────────── Algorithm Selection Grid ──────────── */

/**
 * Renders the algorithm selection cards in the grid.
 */
function renderAlgoGrid() {
  var grid = document.getElementById('algoGrid');
  grid.innerHTML = ALGORITHMS.map(function (a) {
    return '<div class="algo-card border border-gray-700 rounded-xl p-3 text-center '
      + (a.id === selectedAlgo ? 'selected' : '')
      + '" onclick="selectAlgo(\'' + a.id + '\')" id="algo-' + a.id + '">'
      + '<div class="text-sm font-semibold">' + a.name + '</div>'
      + '<div class="text-[10px] text-gray-400 mt-1 leading-tight">' + a.desc + '</div>'
      + '</div>';
  }).join('');
}

/**
 * Handles clicking on an algorithm card.
 */
function selectAlgo(id) {
  selectedAlgo = id;
  document.querySelectorAll('.algo-card').forEach(function (c) {
    c.classList.remove('selected');
  });
  document.getElementById('algo-' + id).classList.add('selected');

  // Show quantum input only for Round Robin
  document.getElementById('rrConfig').classList.toggle('hidden', id !== 'rr');
  updatePriorityVisibility();
}

/**
 * Shows/hides the Priority column based on selected algorithm.
 */
function updatePriorityVisibility() {
  var show = (selectedAlgo === 'priority' || selectedAlgo === 'priorityp');
  document.getElementById('priHead').style.display = show ? '' : 'none';
  document.querySelectorAll('.pri-cell').forEach(function (c) {
    c.style.display = show ? '' : 'none';
  });
}


/* ──────────── Process Table ──────────── */

/**
 * Adds a new process to the list.
 * If no arguments given, generates random values.
 */
function addProcess(arrivalTime, burstTime, priority) {
  var p = {
    id: pidCounter++,
    arrival: arrivalTime !== undefined ? arrivalTime : Math.floor(Math.random() * 6),
    burst: burstTime || Math.floor(Math.random() * 8 + 1),
    priority: priority || Math.floor(Math.random() * 5 + 1)
  };
  // First process always arrives at time 0
  if (processes.length === 0 && arrivalTime === undefined) {
    p.arrival = 0;
  }
  processes.push(p);
  renderProcessTable();
}

/**
 * Removes a process by its ID.
 */
function removeProcess(id) {
  processes = processes.filter(function (p) { return p.id !== id; });
  renderProcessTable();
}

/**
 * Renders the process input table rows.
 */
function renderProcessTable() {
  var tbody = document.getElementById('processTable');
  tbody.innerHTML = processes.map(function (p, i) {
    var color = COLORS[i % COLORS.length];
    return '<tr class="process-row border-b border-gray-800" id="prow-' + p.id + '">'
      + '<td class="px-4 py-2"><div class="flex items-center gap-2">'
      + '<span class="w-3 h-3 rounded-full" style="background:' + color + '"></span>'
      + '<span class="font-medium">P' + p.id + '</span></div></td>'
      + '<td class="px-4 py-2"><input type="number" min="0" max="100" value="' + p.arrival + '" onchange="processes[' + i + '].arrival=+this.value" class="input-field w-20 text-sm"/></td>'
      + '<td class="px-4 py-2"><input type="number" min="1" max="100" value="' + p.burst + '" onchange="processes[' + i + '].burst=+this.value" class="input-field w-20 text-sm"/></td>'
      + '<td class="px-4 py-2 pri-cell"><input type="number" min="0" max="100" value="' + p.priority + '" onchange="processes[' + i + '].priority=+this.value" class="input-field w-20 text-sm"/></td>'
      + '<td class="px-4 py-2 text-center"><button onclick="removeProcess(' + p.id + ')" class="delete-btn">✕</button></td>'
      + '</tr>';
  }).join('');
  updatePriorityVisibility();
}

/**
 * Loads a preset example with 5 processes.
 */
function loadPreset() {
  processes = [];
  pidCounter = 1;
  var presetData = [
    [0, 6, 2],  // [arrival, burst, priority]
    [1, 8, 1],
    [2, 7, 3],
    [3, 3, 4],
    [5, 4, 5]
  ];
  presetData.forEach(function (data) {
    processes.push({
      id: pidCounter++,
      arrival: data[0],
      burst: data[1],
      priority: data[2]
    });
  });
  renderProcessTable();
}

/**
 * Clears everything and resets to initial state.
 */
function clearAll() {
  stopAnim();
  processes = [];
  pidCounter = 1;
  document.getElementById('simView').classList.add('hidden');
  document.getElementById('comparison').classList.add('hidden');
  addProcess();
  addProcess();
  addProcess();
}


/* ──────────── Gantt Chart Skeleton ──────────── */

/**
 * Draws the empty Gantt chart with time markers and playhead.
 * Called once when simulation starts.
 */
function renderGanttSkeleton() {
  var area = document.getElementById('ganttArea');
  var total = anim.totalTime;
  var scale = Math.min(50, 760 / Math.max(total, 1));

  var html = '<div class="relative" style="height:76px; margin-top:24px; min-width:' + (total * scale + 20) + 'px;">';

  // Time markers along the top
  for (var t = 0; t <= total; t++) {
    html += '<div class="absolute text-[10px] text-gray-500" style="left:' + (t * scale) + 'px; top:-18px; transform:translateX(-50%)">' + t + '</div>';
  }

  // Vertical grid lines
  for (var t = 0; t <= total; t++) {
    html += '<div class="absolute" style="left:' + (t * scale) + 'px; top:0; width:1px; height:48px; background:#374151; opacity:0.2;"></div>';
  }

  // The red playhead cursor (moves during animation)
  html += '<div id="playhead" class="absolute playhead-glow" style="left:0; top:-4px; width:2px; height:56px; background:#ef4444; border-radius:2px; transition: left 0.3s ease; z-index:20;">'
    + '<div style="position:absolute;top:-8px;left:-4px;width:10px;height:10px;border-radius:50%;background:#ef4444;"></div>'
    + '</div>';

  // Container for the animated blocks
  html += '<div id="ganttBlocks" class="absolute inset-0" style="top:4px; height:40px;"></div>';
  html += '</div>';
  area.innerHTML = html;
}


/* ──────────── Render a Single Animation Frame ──────────── */

/**
 * Updates ALL visual elements for a given time `t`.
 * Called every animation step.
 */
function renderFrame(t) {
  var total = anim.totalTime;
  var scale = Math.min(50, 760 / Math.max(total, 1));
  var frame = anim.timeline[Math.min(t, anim.timeline.length - 1)];

  // ---- Progress Bar ----
  document.getElementById('pbProgress').style.width = (t / total * 100) + '%';
  document.getElementById('pbTime').textContent = 't = ' + t + ' / ' + total;

  // ---- Playhead Position ----
  var ph = document.getElementById('playhead');
  if (ph) ph.style.left = (t * scale) + 'px';

  // ---- Gantt Blocks (grow as time advances) ----
  var container = document.getElementById('ganttBlocks');
  var bhtml = '';
  anim.gantt.forEach(function (g) {
    if (g.start > t) return; // Not yet visible
    var visEnd = Math.min(g.end, t);
    var w = (visEnd - g.start) * scale;
    var left = g.start * scale;
    var pIdx = processes.findIndex(function (p) { return p.id === g.pid; });
    var color = g.pid === 'idle' ? '#374151' : COLORS[pIdx % COLORS.length];
    var label = g.pid === 'idle' ? 'idle' : 'P' + g.pid;
    var isActive = g.start <= t && g.end > t && g.pid !== 'idle';

    bhtml += '<div class="gantt-block tooltip absolute rounded-lg flex items-center justify-center text-xs font-bold"'
      + ' style="left:' + left + 'px; width:' + Math.max(w, 2) + 'px; height:40px; top:0;'
      + ' background:' + color + '; color:' + (g.pid === 'idle' ? '#9ca3af' : '#fff') + ';'
      + ' opacity:' + (g.pid === 'idle' ? 0.35 : isActive ? 1 : 0.8) + ';'
      + (isActive ? ' box-shadow:0 0 12px ' + color + ';' : '')
      + ' transition: width 0.3s ease, opacity 0.3s ease;">'
      + (w > 24 ? label : '')
      + '<span class="tip">' + label + ' (' + g.start + '→' + g.end + ')</span>'
      + '</div>';
  });
  container.innerHTML = bhtml;

  // ---- CPU Status Indicator ----
  var cpuDot = document.getElementById('cpuDot');
  var cpuLabel = document.getElementById('cpuLabel');
  if (frame.running === 'idle') {
    cpuDot.style.background = '#6b7280';
    cpuDot.className = 'w-3 h-3 rounded-full';
    cpuLabel.textContent = 'Idle';
    cpuLabel.style.color = '#9ca3af';
  } else {
    var idx = processes.findIndex(function (p) { return p.id === frame.running; });
    cpuDot.style.background = COLORS[idx % COLORS.length];
    cpuDot.className = 'w-3 h-3 rounded-full pulse-dot';
    cpuLabel.textContent = 'Running P' + frame.running;
    cpuLabel.style.color = COLORS[idx % COLORS.length];
  }

  // ---- Ready Queue Pills ----
  var rqDiv = document.getElementById('readyQueueLive');
  if (frame.ready.length === 0) {
    rqDiv.innerHTML = '<span class="text-xs text-gray-400">' +
      (frame.running === 'idle' ? 'No processes in queue' : 'Queue empty — CPU busy') +
      '</span>';
  } else {
    rqDiv.innerHTML = frame.ready.map(function (pid) {
      var idx = processes.findIndex(function (p) { return p.id === pid; });
      var c = COLORS[idx % COLORS.length];
      return '<span class="ready-queue-pill pop-in" style="background:' + c + '22; color:' + c + ';">P' + pid + '</span>';
    }).join('');
  }

  // ---- Completed Count ----
  var completedIds = new Set();
  anim.gantt.forEach(function (g) {
    if (g.pid !== 'idle' && g.end <= t) {
      var proc = anim.ps.find(function (p) { return p.id === g.pid; });
      if (proc && computeRemaining(proc, anim.gantt, t) === 0) {
        completedIds.add(g.pid);
      }
    }
  });
  document.getElementById('completedCount').textContent = completedIds.size + ' / ' + processes.length;

  // ---- Process State Table ----
  var stBody = document.getElementById('stateTable');
  stBody.innerHTML = processes.map(function (p, i) {
    var c = COLORS[i % COLORS.length];
    var procData = anim.ps.find(function (x) { return x.id === p.id; });
    var rem = computeRemaining(procData, anim.gantt, t);

    // Determine process state
    var state, stateClass;
    if (p.arrival > t) {
      state = 'New'; stateClass = 'state-new';
    } else if (completedIds.has(p.id)) {
      state = 'Completed'; stateClass = 'state-completed';
    } else if (frame.running === p.id) {
      state = 'Running'; stateClass = 'state-running';
    } else {
      state = 'Ready'; stateClass = 'state-ready';
    }

    // Calculate live waiting time
    var waitSoFar = 0;
    if (p.arrival <= t) {
      var timeInSystem = t - p.arrival;
      var burstUsed = p.burst - rem;
      waitSoFar = timeInSystem - burstUsed;
    }

    var st = anim.stats.find(function (s) { return s.id === p.id; });
    var respTime = (st && st.start <= t) ? st.response : '—';
    var isRunning = frame.running === p.id;

    // Pulsing dot for currently running process
    var dotHtml = isRunning
      ? '<span class="pulse-dot" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:currentColor;"></span>'
      : '';

    return '<tr class="process-row border-b border-gray-800 ' + (isRunning ? 'running-row' : '') + '">'
      + '<td class="px-4 py-2"><div class="flex items-center gap-2">'
      + '<span class="w-3 h-3 rounded-full ' + (isRunning ? 'pulse-dot' : '') + '" style="background:' + c + '"></span>'
      + '<span class="font-medium">P' + p.id + '</span></div></td>'
      + '<td class="px-4 py-2"><span class="state-badge ' + stateClass + '">' + dotHtml + state + '</span></td>'
      + '<td class="px-4 py-2 font-mono">' + rem + '</td>'
      + '<td class="px-4 py-2 font-mono text-blue-400">' + (p.arrival <= t ? waitSoFar : '—') + '</td>'
      + '<td class="px-4 py-2 font-mono text-yellow-400">' + respTime + '</td>'
      + '</tr>';
  }).join('');

  // ---- Live Statistics ----
  updateLiveStats(t, total, completedIds);
}


/**
 * Updates the 4 statistics cards with live values.
 */
function updateLiveStats(t, total) {
  if (t >= total) {
    // Show final averages
    var n = processes.length;
    var avgW = anim.stats.reduce(function (s, p) { return s + p.waiting; }, 0) / n;
    var avgT = anim.stats.reduce(function (s, p) { return s + p.turnaround; }, 0) / n;
    var avgR = anim.stats.reduce(function (s, p) { return s + p.response; }, 0) / n;
    var busy = anim.gantt.filter(function (g) { return g.pid !== 'idle'; })
                         .reduce(function (s, g) { return s + (g.end - g.start); }, 0);

    document.getElementById('sWait').textContent = avgW.toFixed(2);
    document.getElementById('sTAT').textContent = avgT.toFixed(2);
    document.getElementById('sResp').textContent = avgR.toFixed(2);
    document.getElementById('sUtil').textContent = (busy / total * 100).toFixed(1) + '%';
  } else {
    // Show running averages during simulation
    var arrived = processes.filter(function (p) { return p.arrival <= t; });
    if (arrived.length > 0 && t > 0) {
      var totalWait = 0, totalResp = 0, respCount = 0;
      arrived.forEach(function (p) {
        var procData = anim.ps.find(function (x) { return x.id === p.id; });
        var rem = computeRemaining(procData, anim.gantt, t);
        totalWait += (t - p.arrival) - (p.burst - rem);
        var st = anim.stats.find(function (s) { return s.id === p.id; });
        if (st && st.start <= t) { totalResp += st.response; respCount++; }
      });
      var busy = anim.gantt.filter(function (g) { return g.pid !== 'idle'; })
                           .reduce(function (s, g) { return s + (Math.min(g.end, t) - Math.min(g.start, t)); }, 0);

      document.getElementById('sWait').textContent = (totalWait / arrived.length).toFixed(2);
      document.getElementById('sTAT').textContent = '—';
      document.getElementById('sResp').textContent = respCount > 0 ? (totalResp / respCount).toFixed(2) : '—';
      document.getElementById('sUtil').textContent = (busy / t * 100).toFixed(1) + '%';
    } else {
      document.getElementById('sWait').textContent = '—';
      document.getElementById('sTAT').textContent = '—';
      document.getElementById('sResp').textContent = '—';
      document.getElementById('sUtil').textContent = '—';
    }
  }
}

