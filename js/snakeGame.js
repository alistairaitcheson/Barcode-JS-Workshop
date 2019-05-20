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
        this.playerStates.push({direction: null, score: 0, length: 3, positions: [randomPosition], alive: true});
    }
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
    this.moveTime += delta * 0.001 * SNAKE_GAME_CONFIG.moveSpeed;
    if (this.moveTime >= 1) {
        this.moveTime -= 1;
        moveAllPlayers.call(this);

        // check for collisions!
    }

    // update visuals!
    updateGrid.call(this);
}

function updateGrid() {
    for (const gridRef of this.spriteGrid) {
        const playerInPos = playerInGridPosition.call(this, gridRef.gridPos);
        const powerUpInPos = powerUpInGridPosition.call(this, gridRef.gridPos);

        if (playerInPos !== null) {
            const playerDef = SNAKE_GAME_CONFIG.playerDefs[playerInPos];
            gridRef.sprite.tint = playerDef.colour;
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
            for (let i = 1; i < player.positions.length; i++) {
                player.positions[i] = oldPositions[i - 1];
            }
            if (player.positions.length < player.length) {
                player.positions.push(oldPositions[oldPositions.length - 1]);
            }
        }
    }
}

function onBarcodeRead(barcode) {
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
    this.playerStates[i].direction = direction;
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