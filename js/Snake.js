

////// ///////// /////////////////////////////////////////////////////////////////////////////////
////// SnakeMenu /////////////////////////////////////////////////////////////////////////////////
////// ///////// /////////////////////////////////////////////////////////////////////////////////

function SnakeMenu() {

}

SnakeMenu.prototype.showMainMenu = function() {

    VIEW_MENU.innerHTML =
        "<h1 id='gameover_h1'>Vegetarian Snake Wants Grass</h1>" +
        "<h2 id='gameover_h2'>arrow keys guide the snake</h2>";
};

SnakeMenu.prototype.showGameOverMenu = function(finalScore) {

    VIEW_MENU.innerHTML =
        "<h1 id='gameover_h1'>GAME OVER!</h1>" +
        "<h2 id='gameover_h2'>You crashed!</h2>" +
        "<h3 id='gameover_retry'>Press ANY to try again.</h3>" +
        "<h4 id='gameover_score'>You scored: "+finalScore+"</h3>";

    VIEW_MENU.className = "overlay_gameover";

};

SnakeMenu.prototype.hideAllMenus = function() {
    VIEW_MENU.innerHTML = "";
    VIEW_MENU.className = "";
};



////// ///////// /////////////////////////////////////////////////////////////////////////////////
////// SnakeGame /////////////////////////////////////////////////////////////////////////////////
////// ///////// /////////////////////////////////////////////////////////////////////////////////

function SnakeGame(tileSideLength,mapWidth,mapHeight)            {

    var scrWidth  = (tileSideLength * mapWidth);
    var scrHeight = (tileSideLength * mapHeight);
    VIEW_CANVAS.width      = scrWidth;
    VIEW_CANVAS.height     = scrHeight;
    VIEW_MENU.style.width  = scrWidth +'px';
    VIEW_MENU.style.height = scrHeight+'px';

    this._tileSideLength  = tileSideLength;
    this._mapWidth        = mapWidth;
    this._mapHeight       = mapHeight;

    this._score           = 0;
    this._isGameOver      = false;

    this._snake           = [];             // A series of coordinates marking each segment of the snake.
    this._snakeTurnQueue  = [];             // Necessary for rapid succession keyDowns.
    this._snakeFacing     = '';             // The direction in which the snake will travel.
    this._snakeHeadIndex  = 0;              // Points to a ._snake index representing the snake's head.
    this._snakeNeckIndex  = -1;             // Necessary to prevent 180 degree head-to-neck collisions.

    this._foods           = [];             // Coordinates for each piece of food on the map.

    CONTROLLER_MENU.showMainMenu();
    this._spawnSnake();
    this._spawnFood();
    this.drawGame();
}

// Convenience
SnakeGame.prototype._getRandomMapIndex = function()               {
    return Math.round(Math.random()*this._mapWidth*this._mapHeight);
};


// Input
SnakeGame.prototype.handleKeyDown    = function(dir)         {
    if(this._snakeTurnQueue.length > 2) {
        return; // Limit length of turn queue, otherwise player can overload it and lose control.
    }
    this._snakeTurnQueue.push(dir);
};


// Output
SnakeGame.prototype.drawGame         = function()                {
    //** Draws the current game state to the VIEW_CANVAS element.

    for (var mapIndex = 0; mapIndex < this._mapWidth*this._mapHeight; mapIndex++) {
        var x = mapIndex % this._mapWidth;
        var y = (mapIndex - x) / this._mapWidth;
        if (this._snake.indexOf(mapIndex) !== -1) {
            VIEW_CTX.fillStyle = "#FFFFFF";
        } else if (this._foods.indexOf(mapIndex) !== -1) {
            VIEW_CTX.fillStyle = "#00FF00";
        } else {
            VIEW_CTX.fillStyle = "#000000";
        }
        VIEW_CTX.fillRect(x*this._tileSideLength, y*this._tileSideLength, (x+1)*this._tileSideLength, (y+1)*this._tileSideLength);
    }
};


// Game loop
SnakeGame.prototype.onUpdate         = function()                {

    var newHeadCoord;

    // If there's any turns on queue, execute the next...
    if (this._snakeTurnQueue.length > 0) {
        var newDir = this._snakeTurnQueue.shift();

        // If we turn into the wall, game over.
        try {
            newHeadCoord = this._nudgeCoord(newDir, this._snake[this._snakeHeadIndex]);
        }
        catch (outOfBoundsTurn) {
            // We've hit a wall! Game over!
            this._gameOver();
            return;
        }

        // ...that is, ONLY if the next turn doesn't cause a 180 head-to-neck collision. If it does, toss it.
        if (newHeadCoord === this._snake[this._snakeNeckIndex]) {
            newHeadCoord = undefined;
        } else {
            this._snakeFacing = newDir;
        }
    }

    // Get new head coordinate
    try {
        if (newHeadCoord === undefined) {
            newHeadCoord = this._nudgeCoord(this._snakeFacing,this._snake[this._snakeHeadIndex]);
        }
    } catch (outOfBoundsError) {
        // We've hit a wall! Game over!
        this._gameOver();
        return;
    }

    // If the new head coordinate is part of the snake, we've collided with ourselves, game over!
    if (this._snake.indexOf(newHeadCoord) !== -1) {
        this._gameOver();
        return;
    }

    // Push head index forward one so that it points to current tailmost coordinate
    this._snakeNeckIndex = this._snakeHeadIndex;
    this._snakeHeadIndex = (this._snakeHeadIndex+1) % this._snake.length;

    // If there's no food in the new head coordinate, we 'move forward' by removing the tailmost
    //   snake part and adding a new head part. If there IS food, we just keep the tail too.
    var foodsIndex = this._foods.indexOf(newHeadCoord);
    if (foodsIndex === -1) {
        this._snake[this._snakeHeadIndex] = newHeadCoord;
    } else {
        this._snake.splice(this._snakeHeadIndex,0,newHeadCoord);
        this._foods.splice(foodsIndex,1,this._getRandomMapIndex());
        this._score++
    }

    this.drawGame();
};


// Game functions
SnakeGame.prototype._spawnSnake      = function()                {

    var spawnPoint = this._getRandomMapIndex();
    this._snake.push(spawnPoint);

    // Start the snake facing away from the nearest left/right wall.
    if (spawnPoint % this._mapWidth > this._mapWidth/2) {
        this._snakeFacing = 'left';
    } else {
        this._snakeFacing = 'right';
    }
};

SnakeGame.prototype._spawnFood       = function()                {
    //** Spawns a piece of food at a random map location that is not occupied by the snake.

    var spawnSite = undefined;
    while (spawnSite === undefined || this._snake.indexOf(spawnSite) !== -1) {
        spawnSite = this._getRandomMapIndex();
    }

    this._foods.push(spawnSite);
};

SnakeGame.prototype._nudgeCoord      = function(direction,coord) {

    switch (direction) {
        case 'left':

            // Enforce map boundaries
            if (coord % this._mapWidth === 0) {
                throw new Error("Cannot go left at left barrier!")
            }

            else return coord - 1;

        case 'up':

            // Enforce map boundaries
            if (coord < this._mapWidth) {
                throw new Error("Cannot go up at top barrier!")
            }

            else return coord - this._mapWidth;

        case 'right':

            // Enforce map boundaries
            if (coord % this._mapWidth === this._mapWidth - 1) {
                throw new Error("Cannot go right at right barrier!")
            }

            else return coord + 1;

        case 'down':

            // Enforce map boundaries
            if (coord + this._mapWidth >= this._mapWidth * this._mapHeight) {
                throw new Error("Cannot go down at bottom barrier!")
            }

            else return coord + this._mapWidth;

    }
};

SnakeGame.prototype._gameOver        = function()                {
    clearInterval(HEARTBEAT);

    var that = this;
    setTimeout(function() {that._isGameOver = true;}, 1000);

    CONTROLLER_MENU.showGameOverMenu(this._score);
};



////// ///////// /////////////////////////////////////////////////////////////////////////////////
////// SnakeCore /////////////////////////////////////////////////////////////////////////////////
////// ///////// /////////////////////////////////////////////////////////////////////////////////

// Constants
function defaultNewGame() { return new SnakeGame(25,30,30); }
function defaultHeartbeat() { return setInterval(function() {CONTROLLER_GAME.onUpdate();},75); }
var DIRECTIONS = ['left','up','right','down'];

// View
var VIEW_MENU      = document.getElementById('_menu');
var VIEW_CANVAS    = document.getElementById('_canvas');
var VIEW_CTX       = VIEW_CANVAS.getContext('2d');

// Controller
var CONTROLLER_MENU = new SnakeMenu();
var CONTROLLER_GAME = defaultNewGame();
var HEARTBEAT       = -1;

//
function startNewGame() {
    CONTROLLER_GAME = defaultNewGame();
    HEARTBEAT       = -1;
}


document.onkeydown = function(e) {

    if (CONTROLLER_GAME._isGameOver === true) {
        CONTROLLER_MENU.hideAllMenus();
        startNewGame();
    }

    else if (e.keyCode >= 37 && e.keyCode <= 40) {

        if (HEARTBEAT === -1) {
            CONTROLLER_MENU.hideAllMenus();
            HEARTBEAT = defaultHeartbeat();
        }

        // Convert keycode to DIRECTIONS index. (37-40 are arrow keyCodes)
        var dir = DIRECTIONS[e.keyCode-37];

        CONTROLLER_GAME.handleKeyDown(dir);
    }
};
