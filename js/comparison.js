/* ============================================================
   comparison.js — Compare All Algorithms Side by Side (Paper Theme)
   ============================================================
   This file handles:
   - Running all 6 algorithms on the same process data
   - Building the comparison table
   - Drawing the animated bar chart on a paper canvas
   ============================================================ */


/**
 * Runs all 6 algorithms and displays comparison results.
 */
function compareAll() {
  if (processes.length === 0) return;
  stopAnim();

  var quantum = parseInt(document.getElementById('quantum').value) || 2;
  var n = processes.length;

  // Run every algorithm and collect results
  var results = {};
  ALGORITHMS.forEach(function (a) {
    var r = buildTimeline(a.id, processes, quantum);
    var busyTime = r.gantt
      .filter(function (g) { return g.pid !== 'idle'; })
      .reduce(function (s, g) { return s + (g.end - g.start); }, 0);

    results[a.id] = {
      avgWait:     r.stats.reduce(function (s, p) { return s + p.waiting; }, 0) / n,
      avgTAT:      r.stats.reduce(function (s, p) { return s + p.turnaround; }, 0) / n,
      avgResponse: r.stats.reduce(function (s, p) { return s + p.response; }, 0) / n,
      throughput:  n / r.totalTime,
      cpuUtil:     (busyTime / r.totalTime) * 100
    };
  });

  // Show comparison view, hide simulation view
  document.getElementById('simView').classList.add('hidden');
  document.getElementById('comparison').classList.remove('hidden');

  // Find best (lowest) values for highlighting
  var bestWait = Infinity, bestTAT = Infinity, bestResp = Infinity;
  ALGORITHMS.forEach(function (a) {
    var r = results[a.id];
    if (r.avgWait < bestWait)     bestWait = r.avgWait;
    if (r.avgTAT < bestTAT)       bestTAT = r.avgTAT;
    if (r.avgResponse < bestResp) bestResp = r.avgResponse;
  });

  // Build comparison table rows (best values highlighted in green stamp style)
  var tbody = document.getElementById('cmpTable');
  tbody.innerHTML = ALGORITHMS.map(function (a) {
    var r = results[a.id];
    var wBest = r.avgWait === bestWait ? 'font-bold font-mono text-emerald-700 bg-emerald-50/50' : 'font-mono text-stone-700';
    var tBest = r.avgTAT === bestTAT ? 'font-bold font-mono text-emerald-700 bg-emerald-50/50' : 'font-mono text-stone-700';
    var rBest = r.avgResponse === bestResp ? 'font-bold font-mono text-emerald-700 bg-emerald-50/50' : 'font-mono text-stone-700';

    return '<tr class="border-b border-[#ede7db] hover:bg-[#faf8f4]">'
      + '<td class="px-4 py-2.5 font-medium font-mono text-[#1c1917]">' + a.name + '</td>'
      + '<td class="px-4 py-2.5 ' + wBest + '">' + r.avgWait.toFixed(2) + '</td>'
      + '<td class="px-4 py-2.5 ' + tBest + '">' + r.avgTAT.toFixed(2) + '</td>'
      + '<td class="px-4 py-2.5 ' + rBest + '">' + r.avgResponse.toFixed(2) + '</td>'
      + '<td class="px-4 py-2.5 font-mono text-stone-700">' + r.throughput.toFixed(3) + '</td>'
      + '<td class="px-4 py-2.5 font-mono text-stone-700">' + r.cpuUtil.toFixed(1) + '%</td>'
      + '</tr>';
  }).join('');

  // Draw animated bar chart
  drawAnimatedBarChart(results);
}


/**
 * Draws a bar chart comparing all algorithms.
 * Bars animate from 0 to full height using requestAnimationFrame.
 *
 * @param {Object} results — Object with algorithm results
 */
function drawAnimatedBarChart(results) {
  var canvas = document.getElementById('cmpCanvas');
  var ctx = canvas.getContext('2d');

  // High-DPI canvas support
  var dpr = window.devicePixelRatio || 1;
  var rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 260 * dpr;
  ctx.scale(dpr, dpr);

  var W = rect.width;
  var H = 260;

  // Chart ink colors for the 3 metrics (Paper palette: Fountain Blue, Emerald Green, Amber Ochre)
  var barColors = ['#2563eb', '#059669', '#d97706'];

  // The 3 metrics to compare
  var metrics = ['avgWait', 'avgTAT', 'avgResponse'];
  var metricLabels = ['Avg Wait', 'Avg Turnaround', 'Avg Response'];

  var n = ALGORITHMS.length;              // 6 algorithms
  var groupW = (W - 80) / n;             // Width per algorithm group
  var barW = groupW / 4.5;               // Width of each bar
  var chartTop = 32;
  var chartBottom = H - 42;
  var chartH = chartBottom - chartTop;

  // Find the maximum value for scaling
  var maxVal = 1;
  ALGORITHMS.forEach(function (a) {
    metrics.forEach(function (m) {
      if (results[a.id][m] > maxVal) maxVal = results[a.id][m];
    });
  });

  // Animation progress (0 to 1)
  var progress = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Draw horizontal grid lines and Y-axis labels (pencil ledger styling)
    for (var i = 0; i <= 4; i++) {
      var y = chartTop + (chartH / 4) * i;
      ctx.strokeStyle = '#dfd8cb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(W - 10, y);
      ctx.stroke();

      ctx.fillStyle = '#78716c';
      ctx.font = '10px "Space Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText((maxVal * (1 - i / 4)).toFixed(1), 44, y + 3.5);
    }

    // Easing function: cubic ease-out for smooth animation
    var ease = 1 - Math.pow(1 - Math.min(progress, 1), 3);

    // Draw bars for each algorithm
    ALGORITHMS.forEach(function (algo, ai) {
      var groupX = 56 + ai * groupW + groupW / 2;

      metrics.forEach(function (m, mi) {
        var val = results[algo.id][m];
        var barH = (val / maxVal) * chartH * ease; // Animated height
        var x = groupX + (mi - 1) * (barW + 2);

        // Draw clean rounded-top paper bar with subtle shadow
        ctx.fillStyle = barColors[mi];
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        var r = 3; // border radius
        ctx.moveTo(x - barW / 2 + r, chartBottom - barH);
        ctx.arcTo(x + barW / 2, chartBottom - barH, x + barW / 2, chartBottom, r);
        ctx.arcTo(x + barW / 2, chartBottom, x - barW / 2, chartBottom, 0);
        ctx.arcTo(x - barW / 2, chartBottom, x - barW / 2, chartBottom - barH, 0);
        ctx.arcTo(x - barW / 2, chartBottom - barH, x + barW / 2, chartBottom - barH, r);
        ctx.fill();

        // Subtle bar border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      // Algorithm name label below bars
      ctx.fillStyle = '#1c1917';
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(algo.name, groupX, chartBottom + 18);
    });

    // Draw legend at top right
    var legendX = W - 250;
    metricLabels.forEach(function (label, i) {
      ctx.fillStyle = barColors[i];
      ctx.fillRect(legendX + i * 86, 8, 9, 9);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.strokeRect(legendX + i * 86, 8, 9, 9);
      ctx.fillStyle = '#57534e';
      ctx.font = '10px "Space Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(label, legendX + 13 + i * 86, 16);
    });

    // Continue animation until progress reaches 1
    if (progress < 1) {
      progress += 0.04;
      requestAnimationFrame(draw);
    }
  }

  draw();
}
