/*
 * Simple Myanmar farming game
 *
 * The game uses a 20×15 tile map (each tile is 32×32 pixels).
 * Players can walk around the village, plant rice on their fields and harvest
 * once it has grown. This is not a full Stardew‑style simulation but a
 * lightweight demo that demonstrates the basic ideas. Assets are located in
 * the `assets` folder and were generated using a pixel‑art generator.
 */

(() => {
  const tileSize = 32;
  const rows = 15;
  const cols = 20;
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const messageEl = document.getElementById('message');

  // Map definitions: each tile type corresponds to an image key defined below.
  // We start with a blank grass map and then overlay paths, fields, houses, trees, etc.
  const map = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 'grass'));
  // Field state: 0 = uncultivated (dry), 1 = planted (growing), 2 = ready to harvest
  const fieldState = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
  const fieldAge = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));

  // Define a few zones on the map
  function initMap() {
    // Main path across the village
    const pathRow = 7;
    for (let c = 0; c < cols; c++) {
      map[pathRow][c] = 'path';
    }
    // Player's house occupies a 2×2 area
    const houseRow = 4;
    const houseCol = 1;
    map[houseRow][houseCol] = 'house';
    map[houseRow][houseCol + 1] = 'house';
    map[houseRow + 1][houseCol] = 'house';
    map[houseRow + 1][houseCol + 1] = 'house';
    // A palm tree occupies one tile
    map[12][2] = 'tree';
    // Define a small field (3×3) near the centre for the player
    for (let r = 9; r <= 11; r++) {
      for (let c = 9; c <= 11; c++) {
        map[r][c] = 'field';
      }
    }
    // Add a small side path connecting house to main path
    for (let r = houseRow + 2; r <= pathRow; r++) {
      map[r][houseCol + 1] = 'path';
    }
  }

  // Player state
  // Start the player near the centre field so players can immediately plant
  // The field is defined at rows 9–11 and cols 9–11 in initMap().
  // Place the player at the top‑left corner of the field to make it easy
  // to plant and harvest right away.
  const player = {
    row: 9,
    col: 9,
    dir: 'down'
  };
  const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

  // Asset loading
  const imgSources = {
    grass: 'assets/grass_tile.png',
    path: 'assets/path_tile.png',
    field: 'assets/farmland_tile.png',
    house: 'assets/house_64.png',
    tree: 'assets/palm_64.png',
    farmer: 'assets/farmer32.png'
  };
  const images = {};
  function loadImages() {
    return Promise.all(
      Object.entries(imgSources).map(([key, src]) => {
        return new Promise(resolve => {
          const img = new Image();
          img.onload = () => resolve({ key, img });
          img.src = src;
        });
      })
    ).then(results => {
      results.forEach(({ key, img }) => {
        images[key] = img;
      });
    });
  }

  // Input handlers
  document.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
      keys[e.key] = true;
    }
    if (e.key === ' ') {
      // Plant or harvest on space
      const { row, col } = player;
      if (map[row][col] === 'field') {
        if (fieldState[row][col] === 0) {
          fieldState[row][col] = 1;
          fieldAge[row][col] = 0;
          showMessage('You planted rice. It will take a little while to grow.');
        } else if (fieldState[row][col] === 2) {
          fieldState[row][col] = 0;
          fieldAge[row][col] = 0;
          showMessage('You harvested rice!');
        } else {
          showMessage('The rice is still growing…');
        }
      }
    }
  });
  document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
      keys[e.key] = false;
    }
  });

  // Display message helper
  let messageTimeout;
  function showMessage(msg) {
    messageEl.textContent = msg;
    clearTimeout(messageTimeout);
    messageTimeout = setTimeout(() => {
      messageEl.textContent = 'Use arrow keys to move. Press Space to plant or harvest.';
    }, 3000);
  }

  function updatePlayerPosition() {
    const move = { row: 0, col: 0 };
    if (keys.ArrowUp) move.row -= 1;
    if (keys.ArrowDown) move.row += 1;
    if (keys.ArrowLeft) move.col -= 1;
    if (keys.ArrowRight) move.col += 1;
    // Update direction for drawing
    if (move.row < 0) player.dir = 'up';
    if (move.row > 0) player.dir = 'down';
    if (move.col < 0) player.dir = 'left';
    if (move.col > 0) player.dir = 'right';
    if (move.row === 0 && move.col === 0) return;
    const newRow = player.row + move.row;
    const newCol = player.col + move.col;
    // Bounds check
    if (newRow < 0 || newRow >= rows || newCol < 0 || newCol >= cols) return;
    // Collision: cannot walk into house or tree
    const tile = map[newRow][newCol];
    if (tile === 'house' || tile === 'tree') return;
    player.row = newRow;
    player.col = newCol;
  }

  // Update field growth each second
  function updateFields() {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (fieldState[r][c] === 1) {
          fieldAge[r][c]++;
          if (fieldAge[r][c] >= 10) {
            fieldState[r][c] = 2;
            fieldAge[r][c] = 0;
          }
        }
      }
    }
  }
  setInterval(updateFields, 1000);

  // Main game loop
  function gameLoop() {
    // Update
    updatePlayerPosition();
    // Draw
    drawScene();
    requestAnimationFrame(gameLoop);
  }

  function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw tiles
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tileType = map[r][c];
        let imgKey = tileType;
        if (tileType === 'field') {
          // Use field image for all states; in the future you could draw a different image
          imgKey = 'field';
        }
        const img = images[imgKey];
        if (img) {
          // Some objects (house/tree) are bigger than one tile (64×64), so adjust draw size
          const drawSize = (tileType === 'house' || tileType === 'tree') ? 64 : tileSize;
          ctx.drawImage(img, c * tileSize, r * tileSize, drawSize, drawSize);
        } else {
          // fallback: draw colored rect
          ctx.fillStyle = '#666';
          ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
        }
        // If field is planted or ready, overlay a simple green/golden rectangle
        if (tileType === 'field' && fieldState[r][c] > 0) {
          ctx.fillStyle = fieldState[r][c] === 1 ? 'rgba(0, 255, 0, 0.4)' : 'rgba(255, 215, 0, 0.6)';
          ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
        }
      }
    }
    // Draw player
    const px = player.col * tileSize;
    const py = player.row * tileSize;
    ctx.drawImage(images.farmer, px, py, tileSize, tileSize);
  }

  // Initialize game
  initMap();
  loadImages().then(() => {
    // Start loop after images loaded
    gameLoop();
  });
})();