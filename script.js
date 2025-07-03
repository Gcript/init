// 게임 상태 관리
class GameState {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.startTime = 0;
        this.gameTime = 0;
        this.score = 0;
        this.enemiesKilled = 0;
    }

    start() {
        this.isRunning = true;
        this.isPaused = false;
        this.startTime = Date.now();
    }

    update() {
        if (this.isRunning && !this.isPaused) {
            this.gameTime = Math.floor((Date.now() - this.startTime) / 1000);
        }
    }

    formatTime() {
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = this.gameTime % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// 플레이어 클래스
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.speed = 3;
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.level = 1;
        this.exp = 0;
        this.expToNext = 100;
        this.lastAttackTime = 0;
        this.attackCooldown = 500;
        this.lastFireballTime = 0;
        this.lastLightningTime = 0;
        this.shieldAngle = 0;
        this.upgrades = {
            fireball: 0,
            lightning: 0,
            shield: 0
        };
    }

    update() {
        // 기본 자동 공격
        if (Date.now() - this.lastAttackTime > this.attackCooldown) {
            this.attack();
            this.lastAttackTime = Date.now();
        }

        // 특수 공격들
        this.useSpecialAttacks();
        
        // 보호막 회전
        if (this.upgrades.shield > 0) {
            this.shieldAngle += 0.05;
        }
    }

    attack() {
        const nearestEnemy = this.findNearestEnemy();
        if (nearestEnemy) {
            projectiles.push(new Projectile(this.x, this.y, nearestEnemy.x, nearestEnemy.y, 'basic'));
        }
    }

    useSpecialAttacks() {
        // 화염구 공격
        if (this.upgrades.fireball > 0) {
            const fireballCooldown = Math.max(1000, 2000 - this.upgrades.fireball * 300);
            if (Date.now() - this.lastFireballTime > fireballCooldown) {
                this.fireballAttack();
                this.lastFireballTime = Date.now();
            }
        }

        // 번개 공격
        if (this.upgrades.lightning > 0) {
            const lightningCooldown = Math.max(1500, 3000 - this.upgrades.lightning * 400);
            if (Date.now() - this.lastLightningTime > lightningCooldown) {
                this.lightningAttack();
                this.lastLightningTime = Date.now();
            }
        }
    }

    fireballAttack() {
        const nearestEnemies = this.findNearestEnemies(3 + this.upgrades.fireball);
        nearestEnemies.forEach((enemy, index) => {
            setTimeout(() => {
                if (enemy && enemies.includes(enemy)) {
                    projectiles.push(new Projectile(this.x, this.y, enemy.x, enemy.y, 'fireball'));
                }
            }, index * 100);
        });
    }

    lightningAttack() {
        const lightningCount = this.upgrades.lightning;
        for (let i = 0; i < lightningCount; i++) {
            const angle = (Math.PI * 2 / lightningCount) * i;
            const targetX = this.x + Math.cos(angle) * 300;
            const targetY = this.y + Math.sin(angle) * 300;
            projectiles.push(new Projectile(this.x, this.y, targetX, targetY, 'lightning'));
        }
    }

    findNearestEnemy() {
        let nearest = null;
        let minDistance = Infinity;
        
        enemies.forEach(enemy => {
            const distance = Math.sqrt(
                Math.pow(enemy.x - this.x, 2) + Math.pow(enemy.y - this.y, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                nearest = enemy;
            }
        });
        
        return nearest;
    }

    findNearestEnemies(count) {
        const sortedEnemies = enemies.slice().sort((a, b) => {
            const distA = Math.sqrt(Math.pow(a.x - this.x, 2) + Math.pow(a.y - this.y, 2));
            const distB = Math.sqrt(Math.pow(b.x - this.x, 2) + Math.pow(b.y - this.y, 2));
            return distA - distB;
        });
        return sortedEnemies.slice(0, count);
    }

    move(dx, dy) {
        this.x += dx * this.speed;
        this.y += dy * this.speed;
        
        // 화면 경계 체크
        this.x = Math.max(this.width/2, Math.min(canvas.width - this.width/2, this.x));
        this.y = Math.max(this.height/2, Math.min(canvas.height - this.height/2, this.y));
    }

    gainExp(amount) {
        this.exp += amount;
        if (this.exp >= this.expToNext) {
            this.levelUp();
        }
        updateUI();
    }

    levelUp() {
        this.level++;
        this.exp = 0;
        this.expToNext = Math.floor(this.expToNext * 1.5);
        this.maxHealth += 20;
        this.health = this.maxHealth;
        
        // 레벨업 모달 표시
        showLevelUpModal();
    }

    takeDamage(damage) {
        // 보호막이 있으면 데미지 감소
        if (this.upgrades.shield > 0) {
            damage = Math.max(1, damage - this.upgrades.shield * 5);
        }
        
        this.health -= damage;
        if (this.health <= 0) {
            this.health = 0;
            gameOver();
        }
        updateUI();
    }

    draw(ctx) {
        ctx.fillStyle = '#3498db';
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        
        // 보호막 그리기
        if (this.upgrades.shield > 0) {
            const shieldCount = this.upgrades.shield;
            const radius = 40;
            for (let i = 0; i < shieldCount; i++) {
                const angle = this.shieldAngle + (Math.PI * 2 / shieldCount) * i;
                const shieldX = this.x + Math.cos(angle) * radius;
                const shieldY = this.y + Math.sin(angle) * radius;
                
                ctx.fillStyle = 'rgba(52, 152, 219, 0.7)';
                ctx.beginPath();
                ctx.arc(shieldX, shieldY, 8, 0, Math.PI * 2);
                ctx.fill();
                
                // 보호막 데미지 체크
                enemies.forEach(enemy => {
                    const distance = Math.sqrt(
                        Math.pow(enemy.x - shieldX, 2) + Math.pow(enemy.y - shieldY, 2)
                    );
                    if (distance < 15) {
                        enemy.takeDamage(15);
                    }
                });
            }
        }
        
        // 체력바 표시
        if (this.health < this.maxHealth) {
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x - this.width/2, this.y - this.height/2 - 10, this.width, 4);
            ctx.fillStyle = 'green';
            ctx.fillRect(this.x - this.width/2, this.y - this.height/2 - 10, 
                        this.width * (this.health / this.maxHealth), 4);
        }
    }
}

// 적 클래스
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 15;
        this.height = 15;
        this.speed = 1 + Math.random() * 0.5;
        this.health = 30;
        this.maxHealth = 30;
        this.damage = 10;
        this.expValue = 25;
        this.lastDamageTime = 0;
    }

    update() {
        // 플레이어를 향해 이동
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }

        // 플레이어와 충돌 체크
        if (this.checkCollision(player)) {
            if (Date.now() - this.lastDamageTime > 1000) {
                player.takeDamage(this.damage);
                this.lastDamageTime = Date.now();
            }
        }
    }

    checkCollision(target) {
        return Math.abs(this.x - target.x) < (this.width + target.width) / 2 &&
               Math.abs(this.y - target.y) < (this.height + target.height) / 2;
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        // 경험치 드롭
        expOrbs.push(new ExpOrb(this.x, this.y, this.expValue));
        gameState.enemiesKilled++;
        
        // 적 배열에서 제거
        const index = enemies.indexOf(this);
        if (index > -1) {
            enemies.splice(index, 1);
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        
        // 체력바
        if (this.health < this.maxHealth) {
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x - this.width/2, this.y - this.height/2 - 8, this.width, 3);
            ctx.fillStyle = 'green';
            ctx.fillRect(this.x - this.width/2, this.y - this.height/2 - 8, 
                        this.width * (this.health / this.maxHealth), 3);
        }
    }
}

// 투사체 클래스
class Projectile {
    constructor(x, y, targetX, targetY, type = 'basic') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = type === 'fireball' ? 8 : type === 'lightning' ? 6 : 5;
        this.height = this.width;
        this.speed = type === 'lightning' ? 12 : type === 'fireball' ? 6 : 8;
        this.damage = type === 'fireball' ? 40 : type === 'lightning' ? 25 : 20;
        this.piercing = type === 'lightning' ? 3 : 0;
        this.hitEnemies = [];
        this.lifeTime = type === 'lightning' ? 1000 : 2000;
        this.createTime = Date.now();
        
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.vx = distance > 0 ? (dx / distance) * this.speed : 0;
        this.vy = distance > 0 ? (dy / distance) * this.speed : 0;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        // 생존 시간 체크
        if (Date.now() - this.createTime > this.lifeTime) {
            this.destroy();
            return;
        }
        
        // 화면 밖으로 나가면 제거
        if (this.x < -50 || this.x > canvas.width + 50 || this.y < -50 || this.y > canvas.height + 50) {
            this.destroy();
            return;
        }
        
        // 적과 충돌 체크
        enemies.forEach(enemy => {
            if (this.checkCollision(enemy) && !this.hitEnemies.includes(enemy)) {
                enemy.takeDamage(this.damage);
                this.hitEnemies.push(enemy);
                
                // 관통 효과가 없거나 관통 한계에 도달하면 투사체 제거
                if (this.piercing <= 0 || this.hitEnemies.length >= this.piercing) {
                    this.destroy();
                }
            }
        });
    }

    checkCollision(target) {
        return Math.abs(this.x - target.x) < (this.width + target.width) / 2 &&
               Math.abs(this.y - target.y) < (this.height + target.height) / 2;
    }

    destroy() {
        const index = projectiles.indexOf(this);
        if (index > -1) {
            projectiles.splice(index, 1);
        }
    }

    draw(ctx) {
        switch(this.type) {
            case 'fireball':
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.width/2, 0, Math.PI * 2);
                ctx.fill();
                
                // 화염 효과
                ctx.fillStyle = 'rgba(241, 196, 15, 0.7)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.width/3, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'lightning':
                ctx.strokeStyle = '#f1c40f';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(this.x - this.vx, this.y - this.vy);
                ctx.lineTo(this.x + this.vx, this.y + this.vy);
                ctx.stroke();
                
                // 번개 효과
                ctx.fillStyle = 'rgba(241, 196, 15, 0.8)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.width/2, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            default:
                ctx.fillStyle = '#f39c12';
                ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
                break;
        }
    }
}

// 경험치 구슬 클래스
class ExpOrb {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.width = 8;
        this.height = 8;
        this.magnetRange = 80;
        this.speed = 2;
    }

    update() {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 플레이어와 가까우면 자석 효과
        if (distance < this.magnetRange) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
        
        // 플레이어와 충돌하면 경험치 획득
        if (this.checkCollision(player)) {
            player.gainExp(this.value);
            this.destroy();
        }
    }

    checkCollision(target) {
        return Math.abs(this.x - target.x) < (this.width + target.width) / 2 &&
               Math.abs(this.y - target.y) < (this.height + target.height) / 2;
    }

    destroy() {
        const index = expOrbs.indexOf(this);
        if (index > -1) {
            expOrbs.splice(index, 1);
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
    }
}

// 게임 변수들
let canvas, ctx;
let gameState;
let player;
let enemies = [];
let projectiles = [];
let expOrbs = [];
let keys = {};
let lastEnemySpawn = 0;
let enemySpawnRate = 2000;

// 게임 초기화
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    gameState = new GameState();
    player = new Player(canvas.width / 2, canvas.height / 2);
    
    setupEventListeners();
    updateUI();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 키보드 이벤트
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });
    
    // 버튼 이벤트
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('restartButton').addEventListener('click', restartGame);
    
    // 업그레이드 선택 이벤트
    document.querySelectorAll('.upgrade-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const upgradeType = e.currentTarget.dataset.upgrade;
            selectUpgrade(upgradeType);
        });
    });
}

// 게임 시작
function startGame() {
    document.getElementById('startScreen').classList.add('hidden');
    gameState.start();
    gameLoop();
}

// 게임 재시작
function restartGame() {
    document.getElementById('gameOverScreen').classList.remove('active');
    
    // 게임 상태 초기화
    gameState = new GameState();
    player = new Player(canvas.width / 2, canvas.height / 2);
    enemies = [];
    projectiles = [];
    expOrbs = [];
    keys = {};
    lastEnemySpawn = 0;
    
    updateUI();
    startGame();
}

// 업그레이드 선택
function selectUpgrade(upgradeType) {
    player.upgrades[upgradeType]++;
    
    // 업그레이드 효과 적용
    switch(upgradeType) {
        case 'fireball':
            // 화염구 레벨 업: 더 많은 화염구, 더 짧은 쿨다운
            player.attackCooldown = Math.max(200, player.attackCooldown - 30);
            break;
        case 'lightning':
            // 번개 레벨 업: 더 많은 번개, 더 강한 데미지
            break;
        case 'shield':
            // 보호막 레벨 업: 더 많은 보호막, 더 강한 방어력
            player.maxHealth += 25;
            player.health = Math.min(player.health + 25, player.maxHealth);
            break;
    }
    
    document.getElementById('levelUpModal').classList.remove('active');
    gameState.isPaused = false;
    updateUI();
}

// 레벨업 모달 표시
function showLevelUpModal() {
    gameState.isPaused = true;
    document.getElementById('levelUpModal').classList.add('active');
    
    // 업그레이드 레벨 표시 업데이트
    document.querySelectorAll('.upgrade-option').forEach(option => {
        const upgradeType = option.dataset.upgrade;
        const levelSpan = option.querySelector('.upgrade-level span');
        levelSpan.textContent = player.upgrades[upgradeType] + 1;
    });
}

// 적 생성
function spawnEnemy() {
    if (Date.now() - lastEnemySpawn > enemySpawnRate) {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        switch(side) {
            case 0: // 위쪽
                x = Math.random() * canvas.width;
                y = -20;
                break;
            case 1: // 오른쪽
                x = canvas.width + 20;
                y = Math.random() * canvas.height;
                break;
            case 2: // 아래쪽
                x = Math.random() * canvas.width;
                y = canvas.height + 20;
                break;
            case 3: // 왼쪽
                x = -20;
                y = Math.random() * canvas.height;
                break;
        }
        
        enemies.push(new Enemy(x, y));
        lastEnemySpawn = Date.now();
        
        // 시간이 지날수록 적 생성 속도 증가
        enemySpawnRate = Math.max(500, 2000 - gameState.gameTime * 10000);
    }
}

// 입력 처리
function handleInput() {
    let dx = 0, dy = 0;
    
    if (keys['w'] || keys['arrowup']) dy = -1;
    if (keys['s'] || keys['arrowdown']) dy = 1;
    if (keys['a'] || keys['arrowleft']) dx = -1;
    if (keys['d'] || keys['arrowright']) dx = 1;
    
    // 대각선 이동 시 속도 정규화
    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }
    
    if (dx !== 0 || dy !== 0) {
        player.move(dx, dy);
    }
}

// UI 업데이트
function updateUI() {
    // 레벨 표시
    document.querySelector('.level').textContent = `레벨 ${player.level}`;
    
    // 경험치 바
    const expPercent = (player.exp / player.expToNext) * 100;
    document.querySelector('.exp-fill').style.width = `${expPercent}%`;
    document.querySelector('.exp-text').textContent = `${player.exp} / ${player.expToNext}`;
    
    // 체력 바
    const healthPercent = (player.health / player.maxHealth) * 100;
    document.querySelector('.health-fill').style.width = `${healthPercent}%`;
    document.querySelector('.health-text').textContent = `${player.health} / ${player.maxHealth}`;
    
    // 게임 정보
    document.querySelector('.timer').textContent = `시간: ${gameState.formatTime()}`;
    document.querySelector('.enemy-count').textContent = `적: ${enemies.length}`;
}

// 게임 오버
function gameOver() {
    gameState.isRunning = false;
    
    // 최종 스탯 표시
    document.getElementById('finalTime').textContent = gameState.formatTime();
    document.getElementById('finalLevel').textContent = player.level;
    document.getElementById('finalEnemies').textContent = gameState.enemiesKilled;
    
    document.getElementById('gameOverScreen').classList.add('active');
}

// 렌더링
function render() {
    // 화면 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 배경 그리드 그리기
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // 게임 객체들 그리기
    player.draw(ctx);
    enemies.forEach(enemy => enemy.draw(ctx));
    projectiles.forEach(projectile => projectile.draw(ctx));
    expOrbs.forEach(orb => orb.draw(ctx));
}

// 메인 게임 루프
function gameLoop() {
    if (!gameState.isRunning) return;
    
    if (!gameState.isPaused) {
        gameState.update();
        handleInput();
        
        player.update();
        enemies.forEach(enemy => enemy.update());
        projectiles.forEach(projectile => projectile.update());
        expOrbs.forEach(orb => orb.update());
        
        spawnEnemy();
        updateUI();
    }
    
    render();
    requestAnimationFrame(gameLoop);
}

// 게임 초기화
document.addEventListener('DOMContentLoaded', init);