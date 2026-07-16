const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 400;

// Game states
let gameRunning = true;
let score = 0;
let baseSpeed = 6;
let currentSpeed = baseSpeed;

// Player object
const player = {
    x: 50,
    y: 0,
    width: 30,
    height: 40,
    velocityY: 0,
    jumping: false,
    jumpCount: 0,
    maxJumps: 1,
    canDoubleJump: false,
    groundLevel: canvas.height - 60,
    jumpPower: 12,
    maxJumpPower: 12,
    isShiftPressed: false,
    lastJumpTime: 0,
    doubleJumpTimeout: 200,
    animationFrame: 0,
    animationTimer: 0,
    invincible: false,
    superJump: false
};

// Obstacles and power-ups arrays
let obstacles = [];
let powerUps = [];

let highScore = Number(localStorage.getItem('runningGameHighScore') || 0);
const activePower = {
    type: null,
    endTime: 0
};

// Input handling
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;

    if (e.key === 'Shift') {
        player.isShiftPressed = true;
        player.maxJumpPower = 18;
    }

    // Jump with up arrow or space
    if ((e.key === 'ArrowUp' || e.key === ' ') && gameRunning) {
        e.preventDefault();
        
        const currentTime = Date.now();
        
        // First jump or ground jump
        if (player.jumpCount === 0 && !player.jumping) {
            player.jumping = true;
            player.jumpCount = 1;
            player.velocityY = -player.jumpPower;
            player.lastJumpTime = currentTime;
            player.canDoubleJump = true;
        }
        // Double jump with E key
        else if (player.canDoubleJump && player.jumpCount === 1) {
            player.jumpCount = 2;
            player.velocityY = -player.maxJumpPower * 0.8;
            player.canDoubleJump = false;
        }
    }

    // Double jump with E key
    if (e.key === 'e' && gameRunning && player.jumpCount === 1) {
        const currentTime = Date.now();
        if (currentTime - player.lastJumpTime < player.doubleJumpTimeout) {
            player.jumpCount = 2;
            player.velocityY = -player.maxJumpPower * 0.8;
            player.canDoubleJump = false;
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;

    if (e.key === 'Shift') {
        player.isShiftPressed = false;
        player.maxJumpPower = player.maxJumpPower === 18 ? 12 : player.maxJumpPower;
        player.jumpPower = 12;
    }
});

// Obstacle class
class Obstacle {
    constructor() {
        this.x = canvas.width + Math.random() * 200;
        this.y = canvas.height - 60;

        // Random obstacle width and height
        this.width = getRandomInt(18, 48);
        this.height = getRandomInt(20, 58);

        const palette = ['#929090', '#afbd1785', '#ff4444', '#ff0303', '#0d1955', '#23e48d'];
        this.color = palette[Math.floor(Math.random() * palette.length)];

        this.scored = false;
    }

    update() {
        this.x -= currentSpeed;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y - this.height, this.width, this.height);
        
        // Add a border
        ctx.strokeStyle = '#cc0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y - this.height, this.width, this.height);
    }

    isOffScreen() {
        return this.x + this.width < 0;
    }
}

class PowerUp {
    constructor() {
        this.type = Math.random() < 0.5 ? 'highJump' : 'invincible';
        this.width = 24;
        this.height = 24;
        this.x = canvas.width + Math.random() * 220;
        this.y = player.groundLevel - this.height - getRandomInt(10, 80);
        this.color = this.type === 'highJump' ? '#ffc107' : '#4b9bff';
        this.scored = false;
    }

    update() {
        this.x -= currentSpeed;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        ctx.fillStyle = '#ffffff';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type === 'highJump' ? '^' : 'O', this.x + this.width / 2, this.y + this.height / 2);
    }

    isOffScreen() {
        return this.x + this.width < 0;
    }
}

// Utility: random integer between min and max
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Check collision
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Update score and speed
function updateScore(points) {
    score += points;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('runningGameHighScore', String(highScore));
    }
    updateHud();
    
    // Increase speed every 5 points
    if (score % 5 === 0) {
        currentSpeed = baseSpeed + (score / 5) * 1.5;
        document.getElementById('speed').textContent = (currentSpeed / baseSpeed).toFixed(2);
    }
}

function updateHud() {
    document.getElementById('score').textContent = score;
    document.getElementById('highScore').textContent = highScore;

    if (activePower.type && Date.now() < activePower.endTime) {
        const remaining = Math.ceil((activePower.endTime - Date.now()) / 1000);
        const label = activePower.type === 'highJump' ? 'Super Jump' : 'Invincible';
        document.getElementById('activePower').textContent = `${label} (${remaining}s)`;
    } else {
        document.getElementById('activePower').textContent = 'None';
    }
}

function spawnObstacle() {
    if (obstacles.length >= 3) return;
    obstacles.push(new Obstacle());
}

let spawnTimer = 0;
const spawnIntervalMin = 70;
const spawnIntervalMax = 140;
let nextSpawnInterval = getRandomInt(spawnIntervalMin, spawnIntervalMax);

let powerUpTimer = 0;
const powerUpIntervalMin = 240;
const powerUpIntervalMax = 380;
let nextPowerUpInterval = getRandomInt(powerUpIntervalMin, powerUpIntervalMax);

function activatePowerUp(powerUp) {
    activePower.type = powerUp.type;
    activePower.endTime = Date.now() + 10000;
    if (powerUp.type === 'highJump') {
        player.superJump = true;
        player.jumpPower = 24;
        player.maxJumpPower = 24;
    } else if (powerUp.type === 'invincible') {
        player.invincible = true;
    }
    updateHud();
}

function deactivatePowerUp() {
    activePower.type = null;
    activePower.endTime = 0;
    player.superJump = false;
    player.invincible = false;
    player.jumpPower = 12;
    player.maxJumpPower = player.isShiftPressed ? 18 : 12;
    updateHud();
}

// Main update function
function update() {
    if (!gameRunning) return;

    // Spawn obstacles with randomized timing and a cap on active obstacles
    spawnTimer++;
    if (spawnTimer > nextSpawnInterval) {
        spawnObstacle();
        spawnTimer = 0;
        nextSpawnInterval = getRandomInt(spawnIntervalMin, spawnIntervalMax);
    }

    // Spawn power-ups around the map
    powerUpTimer++;
    if (powerUpTimer > nextPowerUpInterval) {
        if (powerUps.length < 2) {
            powerUps.push(new PowerUp());
        }
        powerUpTimer = 0;
        nextPowerUpInterval = getRandomInt(powerUpIntervalMin, powerUpIntervalMax);
    }

    // Expire active power-up
    if (activePower.type && Date.now() > activePower.endTime) {
        deactivatePowerUp();
    }

    // Update player
    player.velocityY += 0.6; // Gravity
    player.y += player.velocityY;

    // Ground collision
    if (player.y + player.height >= player.groundLevel) {
        player.y = player.groundLevel - player.height;
        player.jumping = false;
        player.jumpCount = 0;
        player.canDoubleJump = false;
    }

    // Animate the runner
    player.animationTimer++;
    if (player.animationTimer > 5) {
        player.animationFrame = (player.animationFrame + 1) % 2;
        player.animationTimer = 0;
    }

    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();

        // Check if passed obstacle
        if (!obstacles[i].scored && obstacles[i].x + obstacles[i].width < player.x) {
            obstacles[i].scored = true;
            updateScore(1);
        }

        // Check collision
        if (!player.invincible && checkCollision(player, {
            x: obstacles[i].x,
            y: obstacles[i].y - obstacles[i].height,
            width: obstacles[i].width,
            height: obstacles[i].height
        })) {
            gameRunning = false;
            showGameOver();
        }

        // Remove off-screen obstacles
        if (obstacles[i].isOffScreen()) {
            obstacles.splice(i, 1);
        }
    }
}

// Draw function
function draw() {
    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw ground
    ctx.fillStyle = '#90EE90';
    ctx.fillRect(0, player.groundLevel, canvas.width, canvas.height - player.groundLevel);

    // Draw grass line
    ctx.strokeStyle = '#228B22';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, player.groundLevel);
    ctx.lineTo(canvas.width, player.groundLevel);
    ctx.stroke();

    // Update power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
        powerUps[i].update();

        if (checkCollision(player, {
            x: powerUps[i].x,
            y: powerUps[i].y,
            width: powerUps[i].width,
            height: powerUps[i].height
        })) {
            activatePowerUp(powerUps[i]);
            powerUps.splice(i, 1);
            continue;
        }

        if (powerUps[i].isOffScreen()) {
            powerUps.splice(i, 1);
        }
    }

    // Draw player
    const runnerX = player.x + 2;
    const runnerY = player.y + 4;
    const bobOffset = player.jumping ? -3 : (player.animationFrame === 0 ? -2 : 2);
    const strideOffset = player.jumping ? 0 : (player.animationFrame === 0 ? -7 : 7);

    ctx.save();
    ctx.translate(runnerX, runnerY + bobOffset);

    ctx.fillStyle = '#f4b183';
    ctx.beginPath();
    ctx.arc(14, 8, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#d9534f';
    ctx.fillRect(10, 15, 8, 16);

    ctx.fillStyle = '#f4b183';
    ctx.beginPath();
    ctx.arc(14, 8, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(11.5, 7.5, 1.2, 0, Math.PI * 2);
    ctx.arc(16.5, 7.5, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(11.5, 7.5, 0.6, 0, Math.PI * 2);
    ctx.arc(16.5, 7.5, 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(14, 10.5, 3.5, 0.15, 0.95 * Math.PI);
    ctx.stroke();

    ctx.lineCap = 'round';

    // Arms match the face color and appear a bit thicker
    ctx.strokeStyle = '#f4b183';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(14, 18);
    ctx.lineTo(6, 24);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(14, 18);
    ctx.lineTo(22, 24);
    ctx.stroke();

    // Legs are black with a longer stride
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(14, 31);
    ctx.lineTo(8 + strideOffset, 46);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(14, 31);
    ctx.lineTo(20 - strideOffset, 46);
    ctx.stroke();

    ctx.restore();

    // Draw power-ups
    powerUps.forEach(powerUp => powerUp.draw());

    // Draw obstacles
    obstacles.forEach(obstacle => obstacle.draw());
}

function showGameOver() {
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOverScreen').style.display = 'block';
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

updateHud();

