// ---- CONFIG AND INITIALISATION ---

const PHASER_CONFIG = {
    type: Phaser.AUTO,
    width: Math.min(window.innerWidth, window.innerHeight),
    height: Math.min(window.innerWidth, window.innerHeight),
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: {
                y: 0
            } // Top down game, so no gravity
        }
    },
    pixelArt: false,
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var GAME = new Phaser.Game(PHASER_CONFIG);

const SNAKE_GAME_CONFIG = {
    coreImages: [
        "assets/matchingGame/whiteSquare64.png",
    ],
    gridSize: {width: 20, height: 20},
    playerDefs: [
        {colour: 0xFF0000, deadColour: 0x880000, controls: {up: 'r1', down: 'r2', left: 'r3', right: 'r4'}},
        {colour: 0x0000FF, deadColour: 0x000088, controls: {up: 'b1', down: 'b2', left: 'b3', right: 'b4'}},
    ],
    powerUpColour: 0xFFFFFF,
    emptyTileColour: 0x000000,
    moveSpeed: 3,
    startLength: 3,
    lengthPerPowerUp: 2,
    powerUpSpawnPeriod: [5, 15],
}

function preload() {
    // Keep track of every loaded image ID
    this.loadedImages = [];

    for (const imagePath of SNAKE_GAME_CONFIG.coreImages) {
        const imageHandle = getImageIdFromPath(imagePath);
        this.load.image(imageHandle, imagePath);
        this.loadedImages.push(imageHandle);
    }
}

/*
    Converts an image path to a short string to access it by. For example
    "path/to/foler/file_name.png" --> "file_name"
 */
function getImageIdFromPath(imagePath) {
    const filePathAsArray = imagePath.split('/');
    const imageFileName = filePathAsArray[filePathAsArray.length - 1];
    const imageHandle = imageFileName.split('.')[0];
    return imageHandle
}


/*
    Called by Phaser to initialise the game after preload
 */
function create() {
    this.moveTime = 0;

    this.powerUps = [];

    resetPlayers.call(this);
    generateGrid.call(this);
    resetPowerUpTimer.call(this);

    this.cameras.main.setBounds(0, 0, 800, 600);
    this.cameras.main.setBackgroundColor(0x888888);

    // Using bind, we ensure that "this" refers to GAME.scene
    document.addEventListener("barcodeRead", onBarcodeRead.bind(this));
}

function resetPlayers() {
    this.playerStates = [];
    const usedPositions = [];
    for (const player of SNAKE_GAME_CONFIG.playerDefs) {
        let randomPosition = null;
        while (!randomPosition) {
            randomPosition = {
                x: randomInteger(0, SNAKE_GAME_CONFIG.gridSize.width),
                y: randomInteger(0, SNAKE_GAME_CONFIG.gridSize.height),
            };
            for (const position of usedPositions) {
                if (position.x === randomPosition.x || position.y === randomPosition.y) {
                    randomPosition = null;
                    break;
                }
            }
        }
        this.playerStates.push({
            direction: null,
            score: 0,
            length: SNAKE_GAME_CONFIG.startLength,
            positions: [randomPosition],
            alive: true
        });
    }
}

function resetPowerUpTimer() {
    this.nextPowerUpTime = randomInteger(
        SNAKE_GAME_CONFIG.powerUpSpawnPeriod[0],
        SNAKE_GAME_CONFIG.powerUpSpawnPeriod[1]
    );
}

function generateGrid() {
    const tileWidth = PHASER_CONFIG.width / SNAKE_GAME_CONFIG.gridSize.width;
    const tileHeight = PHASER_CONFIG.height / SNAKE_GAME_CONFIG.gridSize.height;

    this.spriteGrid = [];
    for (let x = 0; x < SNAKE_GAME_CONFIG.gridSize.width; x++) {
        for (let y = 0; y < SNAKE_GAME_CONFIG.gridSize.height; y++) {
            const sprite = this.physics.add.sprite((x + 0.5) * tileWidth, (y + 0.5) * tileHeight, 'whiteSquare64');
            sprite.displayWidth = tileWidth * 0.9;
            sprite.displayHeight = tileHeight * 0.9;
            sprite.tint = SNAKE_GAME_CONFIG.emptyTileColour;
            this.spriteGrid.push({gridPos: {x, y}, sprite});
        }
    }
}

function update(time, delta) {
    // Currently the game just halts once all but 1 player is left alive
    if (!gameIsEnded.call(this)) {
        this.moveTime += delta * 0.001 * SNAKE_GAME_CONFIG.moveSpeed;
        if (this.moveTime >= 1) {
            this.moveTime -= 1;
            moveAllPlayers.call(this);

            // check for collisions!
            checkForPlayerCollisions.call(this);
            checkForPowerUpCollisions.call(this);
        }

        if (allPlayersMoving.call(this)) {
            this.nextPowerUpTime -= delta * 0.001;
            if (this.nextPowerUpTime <= 0) {
                spawnPowerUp.call(this);
                resetPowerUpTimer.call(this);
            }
        }

        // update visuals!
        updateGrid.call(this);
    }
}

function gameIsEnded() {
    const livingPlayers = this.playerStates.filter(player => player.alive);
    if (livingPlayers.length <= 1) {
        return true;
    }
}

function spawnPowerUp() {
    const spawnPos = getUnoccupiedPosition.call(this);
    if (spawnPos) {
        this.powerUps.push(spawnPos);
    }
}

function getUnoccupiedPosition() {
    let attemptCount = 0;
    let position = null;
    while (!position && attemptCount < 100) {
        position = {
            x: randomInteger(0, SNAKE_GAME_CONFIG.gridSize.width),
            y: randomInteger(0, SNAKE_GAME_CONFIG.gridSize.height)
        };
        if (positionIsOccupied.call(this, position)) {
            position = null;
        }
    }

    return position;
}

function positionIsOccupied(position) {
    for (const player of this.playerStates) {
        for (const tailPos of player.positions) {
            if (tailPos.x === position.x && tailPos.y === position.y) {
                return true;
            }
        }
    }

    for (const powerUpPos of this.powerUps) {
        if (powerUpPos.x === position.x && powerUpInPos.y === position.y) {
            return true;
        }
    }

    return false;
}


function allPlayersMoving() {
    for (const player of this.playerStates) {
        if (!player.direction) {
            return false;
        }
    }
    return true;
}

function updateGrid() {
    for (const gridRef of this.spriteGrid) {
        const playerInPos = playerInGridPosition.call(this, gridRef.gridPos);
        const powerUpInPos = powerUpInGridPosition.call(this, gridRef.gridPos);

        if (playerInPos !== null) {
            const playerDef = SNAKE_GAME_CONFIG.playerDefs[playerInPos];
            const playerState = this.playerStates[playerInPos];
            if (playerState.alive) {
                gridRef.sprite.tint = playerDef.colour;
            } else {
                gridRef.sprite.tint = playerDef.deadColour;
            }
        } else if (powerUpInPos) {
            gridRef.sprite.tint = SNAKE_GAME_CONFIG.powerUpColour;
        } else {
            gridRef.sprite.tint = SNAKE_GAME_CONFIG.emptyTileColour;
        }
    }
}

function playerInGridPosition(position) {
    for (let i = 0; i < this.playerStates.length; i++) {
        const player = this.playerStates[i];
        for (const tailPos of player.positions) {
            if (tailPos.x === position.x && tailPos.y === position.y) {
                return i;
            }
        }
    }
    return null;
}

function powerUpInGridPosition(position) {
    for (const powerUp of this.powerUps) {
        if (powerUp.x === position.x && powerUp.y === position.y) {
            return true;
        }
    }
    return false;
}

function moveAllPlayers() {
    for (const player of this.playerStates) {
        if (player.direction && player.alive) {
            const oldPositions = player.positions.slice();
            player.positions[0] = {
                x: player.positions[0].x + player.direction.x,
                y: player.positions[0].y + player.direction.y
            };

            if (player.positions[0].x < 0) {
                player.positions[0].x += SNAKE_GAME_CONFIG.gridSize.width;
            }
            if (player.positions[0].x >= SNAKE_GAME_CONFIG.gridSize.width) {
                player.positions[0].x -= SNAKE_GAME_CONFIG.gridSize.width;
            }
            if (player.positions[0].y < 0) {
                player.positions[0].y += SNAKE_GAME_CONFIG.gridSize.height;
            }
            if (player.positions[0].y >= SNAKE_GAME_CONFIG.gridSize.height) {
                player.positions[0].y -= SNAKE_GAME_CONFIG.gridSize.height;
            }

            for (let i = 1; i < player.positions.length; i++) {
                player.positions[i] = oldPositions[i - 1];
            }
            if (player.positions.length < player.length) {
                player.positions.push(oldPositions[oldPositions.length - 1]);
            }
        }
    }
}

function checkForPlayerCollisions() {
    for (let i = 0; i < this.playerStates.length; i++) {
        const player = this.playerStates[i];
        const headPos = player.positions[0];

        for (let j = 0; j < this.playerStates.length; j++) {
            const otherPlayer = this.playerStates[j];
            for (let index = 0; index < otherPlayer.positions.length; index++) {
                // Don't check the snake head's position against itself.
                // Only against its tail or other snakes!
                if (i == j && index == 0) {
                    continue;
                }
                const position = otherPlayer.positions[index];
                if (headPos.x === position.x && headPos.y === position.y) {
                    killPlayer.call(this, i);
                    break;
                }
            }
        }
    }
}

function killPlayer(index) {
    this.playerStates[index].alive = false;
}

function checkForPowerUpCollisions() {
    for (let i = 0; i < this.playerStates.length; i++) {
        const player = this.playerStates[i];
        const headPos = player.positions[0];
        const powerUpsToCollect = [];
        for (const powerUp of this.powerUps) {
            if (powerUp.x === headPos.x && powerUp.y === headPos.y) {
                powerUpsToCollect.push(powerUp);
            }
        }

        player.length += powerUpsToCollect.length * SNAKE_GAME_CONFIG.lengthPerPowerUp;
        this.powerUps = this.powerUps.filter(powerUp => powerUpsToCollect.indexOf(powerUp) === -1);
    }
}


function onBarcodeRead(event) {
    const barcode = event.detail.barcode;
    console.log("Processing barcode ", barcode);
    for (let i = 0; i < SNAKE_GAME_CONFIG.playerDefs.length ; i++) {
        const player = SNAKE_GAME_CONFIG.playerDefs[i];
        const controlIds = Object.keys(player.controls);
        for (const directionName of controlIds) {
            if (player.controls[directionName] === barcode) {
                changePlayerDirection.call(this, i, directionName);
            }
        }
    }
}

function changePlayerDirection(playerIndex, directionName) {
    let direction = null;
    switch (directionName) {
        case "up":
            direction = {x: 0, y: -1};
            break;
        case "down":
            direction = {x: 0, y: 1};
            break;
        case "left":
            direction = {x: -1, y: 0};
            break;
        case "right":
            direction = {x: 1, y: 0};
            break;
    }
    // Check to make sure the snake is not doubling back on itself
    const existingDirection = this.playerStates[playerIndex] || {x: 0, y: 0};
    if (existingDirection.x !== direction.x && existingDirection.y !== direction.y) {
        this.playerStates[playerIndex].direction = direction;
    }
}

function randomElementFromArray(array) {
    return array[Math.floor(Math.random()*array.length)];
}

function randomInteger(min, max) {
    return min + Math.floor(Math.random()*(max - min));
}

/*
    Returns a copy of the array with the elements in a random order
 */
function shuffledArray(array) {
    const srcArray = array.slice();
    const destArray = [];
    while (srcArray.length > 0) {
        const index = randomInteger(0, srcArray.length);
        destArray.push(srcArray[index]);
        srcArray.splice(index, 1);
    }
    return destArray;
}