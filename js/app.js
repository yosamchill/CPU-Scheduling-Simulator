/* ============================================================
   app.js — Application Entry Point
   ============================================================
   This file initializes the application:
   - Renders the algorithm grid
   - Adds 3 starter processes
   - Sets up the UI
   ============================================================ */

/**
 * Initialize the simulator when the page loads.
 */
function init() {
  // 1. Render algorithm selection cards
  renderAlgoGrid();

  // 2. Add 3 starter processes so the table isn't empty
  addProcess();
  addProcess();
  addProcess();

  // 3. Set correct priority column visibility
  updatePriorityVisibility();
}

// Run initialization
init();

