/* ============================================================
   animation.js — Animation & Playback Engine
   ============================================================
   This file controls the animated simulation:
   - startSimulation() — Runs the algorithm and starts playback
   - stopAnim()        — Stops the timer
   - pbToggle()        — Play / Pause toggle
   - pbStep()          — Advance one time unit
   - pbReset()         — Reset to t = 0
   - setSpeed()        — Change playback speed
   - onComplete()      — Confetti celebration on completion
   ============================================================ */


/**
 * Main entry point: runs the selected algorithm and starts the animation.
 */
function startSimulation() {
  if (processes.length === 0) return;

  // Stop any currently running animation
  stopAnim();

  // Get the quantum value (only matters for Round Robin)
  var quantum = parseInt(document.getElementById('quantum').value) || 2;

  // Run the scheduling algorithm to get the full timeline
  var result = buildTimeline(selectedAlgo, processes, quantum);

  // Set up the animation state
  anim = {
    playing: true,
    timer: null,
    speed: 1,
    currentTime: 0,
    totalTime: result.totalTime,
    timeline: result.timeline,
    gantt: result.gantt,
    stats: result.stats,
    ps: result.ps,
    finished: false
  };

  // Show the simulation view, hide comparison
  document.getElementById('simView').classList.remove('hidden');
  document.getElementById('comparison').classList.add('hidden');

  // Reset speed buttons to 1×
  document.querySelectorAll('.speed-btn').forEach(function (b) {
    b.classList.toggle('active', b.dataset.speed === '1');
  });

  // Set play button to "pause" icon
  document.getElementById('pbPlay').innerHTML = '⏸';
  document.getElementById('pbPlay').classList.add('active');

  // Draw the empty Gantt chart skeleton
  renderGanttSkeleton();

  // Show the first frame
  renderFrame(0);

  // Start the animation loop
  scheduleNextFrame();
}


/**
 * Stops the animation timer.
 */
function stopAnim() {
  anim.playing = false;
  if (anim.timer) {
    clearTimeout(anim.timer);
    anim.timer = null;
  }
}


/**
 * Schedules the next animation frame based on current speed.
 * Each frame advances the simulation by 1 time unit.
 */
function scheduleNextFrame() {
  if (!anim.playing || anim.currentTime >= anim.totalTime) return;

  // Higher speed = shorter delay between frames
  var delay = Math.max(60, 600 / anim.speed);

  anim.timer = setTimeout(function () {
    anim.currentTime++;
    renderFrame(anim.currentTime);

    if (anim.currentTime >= anim.totalTime) {
      // Simulation complete!
      anim.playing = false;
      anim.finished = true;
      document.getElementById('pbPlay').innerHTML = '▶';
      document.getElementById('pbPlay').classList.remove('active');
      onComplete();
    } else {
      // Schedule the next frame
      scheduleNextFrame();
    }
  }, delay);
}


/**
 * Play / Pause toggle button handler.
 */
function pbToggle() {
  if (anim.finished && !anim.playing) {
    // Restart from the beginning
    anim.currentTime = 0;
    anim.finished = false;
    anim.playing = true;
    document.getElementById('pbPlay').innerHTML = '⏸';
    document.getElementById('pbPlay').classList.add('active');
    renderFrame(0);
    scheduleNextFrame();
    return;
  }

  // Toggle play/pause
  anim.playing = !anim.playing;
  document.getElementById('pbPlay').innerHTML = anim.playing ? '⏸' : '▶';
  document.getElementById('pbPlay').classList.toggle('active', anim.playing);

  if (anim.playing) {
    scheduleNextFrame();
  } else if (anim.timer) {
    clearTimeout(anim.timer);
    anim.timer = null;
  }
}


/**
 * Step forward by exactly one time unit.
 * Pauses the animation if it was playing.
 */
function pbStep() {
  if (anim.currentTime >= anim.totalTime) return;

  // Pause the animation
  anim.playing = false;
  if (anim.timer) { clearTimeout(anim.timer); anim.timer = null; }
  document.getElementById('pbPlay').innerHTML = '▶';
  document.getElementById('pbPlay').classList.remove('active');

  // Advance by 1
  anim.currentTime++;
  renderFrame(anim.currentTime);

  if (anim.currentTime >= anim.totalTime) {
    anim.finished = true;
    onComplete();
  }
}


/**
 * Reset the simulation to t = 0.
 */
function pbReset() {
  stopAnim();
  anim.currentTime = 0;
  anim.finished = false;
  document.getElementById('pbPlay').innerHTML = '▶';
  document.getElementById('pbPlay').classList.remove('active');
  renderFrame(0);
}


/**
 * Changes the playback speed.
 * @param {number} speed — Multiplier (0.5, 1, 2, or 5)
 * @param {HTMLElement} btn — The speed button that was clicked
 */
function setSpeed(speed, btn) {
  anim.speed = speed;

  // Update active button styling
  document.querySelectorAll('.speed-btn').forEach(function (b) {
    b.classList.remove('active');
  });
  btn.classList.add('active');

  // If currently playing, restart the timer with new speed
  if (anim.playing) {
    clearTimeout(anim.timer);
    scheduleNextFrame();
  }
}


/**
 * Called when the simulation finishes.
 * Shows a confetti burst and highlights the stats cards.
 */
function onComplete() {
  var box = document.getElementById('confettiBox');
  var confettiColors = ['#6366f1', '#22c55e', '#eab308', '#a855f7', '#06b6d4', '#f97316', '#ef4444', '#ec4899'];

  var html = '';
  for (var i = 0; i < 40; i++) {
    var x = Math.random() * 100;                             // Random horizontal position
    var delay = Math.random() * 0.5;                         // Random start delay
    var size = 4 + Math.random() * 6;                        // Random particle size
    var color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
    var shape = Math.random() > 0.5
      ? 'border-radius:50%;'
      : 'border-radius:2px; transform:rotate(' + (Math.random() * 360) + 'deg);';

    html += '<div class="confetti-particle" style="left:' + x + '%; bottom:0; width:' + size
      + 'px; height:' + size + 'px; background:' + color + '; animation-delay:' + delay + 's; ' + shape + '"></div>';
  }

  box.innerHTML = html;

  // Clean up confetti after animation
  setTimeout(function () { box.innerHTML = ''; }, 2000);

  // Flash the stats cards
  document.querySelectorAll('.stat-card').forEach(function (card) {
    card.classList.add('highlight');
    setTimeout(function () { card.classList.remove('highlight'); }, 1500);
  });
}

