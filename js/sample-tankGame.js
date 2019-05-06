
// config
var config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
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
var game = new Phaser.Game(config);


var player, enemyTanks = [], maxEnemies = 5, bullets, enemyBullets, explosions;
function preload() {
  this.load.atlas('tank', 'assets/tanks/tanks.png', 'assets/tanks/tanks.json');
  this.load.atlas('enemy', 'assets/tanks/enemy-tanks.png', 'assets/tanks/tanks.json');
  this.load.image('earth', 'assets/tanks/scorched_earth.png');
  this.load.image('bullet', 'assets/tanks/bullet.png');
  this.load.spritesheet('kaboom', 'assets/tanks/explosion.png', { frameWidth: 64, frameHeight: 64 });
  this.load.image('tileset', 'assets/tanks/landscape-tileset.png');
  this.load.tilemapTiledJSON("tilemap", "assets/tanks/level1.json");
}

function create() {
  this.physics.world.on('worldbounds',function(body){
    killBullet(body.gameObject)
  }, this);

  //Load in the tilemap and enable collision for the destructable layer
  this.map = this.make.tilemap({key: "tilemap"});
  var landscape = this.map.addTilesetImage("landscape-tileset", "tileset");
  this.map.createStaticLayer('floor', landscape, 0, 0);
  var destructLayer = this.map.createDynamicLayer('destructable', landscape, 0, 0);
  destructLayer.setCollisionByProperty({ collides: true });
  this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
  this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

    var w = game.config.width;
    var h = game.config.height;
    player = new PlayerTank(this, w*0.5, h*0.5, 'tank', 'tank1');
    player.enableCollision(destructLayer);
    var outerFrame = new Phaser.Geom.Rectangle(0,0,w, h);
    var innerFrame = new Phaser.Geom.Rectangle(w*0.25,h*0.25,w*0.5, h*0.5);
    enemyBullets = this.physics.add.group({
      defaultKey: 'bullet',
      maxSize: 10
    })
    var enemyTank, loc;
    for(var i = 0; i < maxEnemies; i++){
      loc = Phaser.Geom.Rectangle.RandomOutside(outerFrame,innerFrame)
      enemyTank = new EnemyTank(this, loc.x, loc.y, 'enemy', 'tank1', player);
      enemyTank.enableCollision(destructLayer);
      enemyTank.setBullets(enemyBullets);
      enemyTanks.push(enemyTank);
      this.physics.add.collider(enemyTank.hull, player.hull);
      if(i > 0){
        for(var j = 0; j < enemyTanks.length - 1; j++){
          this.physics.add.collider(enemyTank.hull, enemyTanks[j].hull);
        }
      }
    }
    bullets = this.physics.add.group({
      defaultKey: 'bullet',
      maxSize: 1
    })
    this.anims.create({
          key: 'explode',
          frames: this.anims.generateFrameNumbers('kaboom', { start: 0, end: 23, first: 23 }),
          frameRate: 24
      });
    explosions = this.physics.add.group({
        defaultKey: 'kaboom',
        maxSize: maxEnemies +1
      });
    this.input.on('pointerdown', tryShoot, this);
    this.cameras.main.startFollow(player.hull, true, 0.5, 0.5);
}
function update(time, delta) {
    player.update();
    for(var i=0;i<enemyTanks.length; i++ ){
      enemyTanks[i].update(time, delta);
    }
}
function tryShoot(pointer){
  var bullet = bullets.get(player.turret.x, player.turret.y);
  if(bullet){
    fireBullet.call(this, bullet, player.turret.rotation, enemyTanks);
  }
}
function fireBullet(bullet, rotation, target){
  bullet.setDepth(3);
  bullet.body.collideWorldBounds = true;
  bullet.body.onWorldBounds = true;
  bullet.enableBody(false);
  bullet.setActive(true);
  bullet.setVisible(true);
  bullet.rotation = rotation;
  this.physics.velocityFromRotation(bullet.rotation, 500, bullet.body.velocity);

  var destructLayer = this.map.getLayer("destructable").tilemapLayer;
  this.physics.add.collider(bullet, destructLayer, damageWall, null, this);

  if(target === player){
    this.physics.add.overlap(player.hull, bullet, bulletHitPlayer, null, this)
  }else{
    for(var i = 0 ; i < enemyTanks.length; i++){
      this.physics.add.overlap(enemyTanks[i].hull, bullet, bulletHitEnemy, null, this);
    }
  }
}
function bulletHitPlayer(hull, bullet){
  killBullet(bullet);
  player.damage();
  if(player.isDestroyed()){
    this.input.enabled = false;
    enemyTanks = [];
    this.physics.pause();
    var explosion = explosions.get(hull.x, hull.y);
    if(explosion){
      activateExplosion(explosion);
      explosion.play('explode')
    }
  }
}
function killBullet(bullet){
  bullet.disableBody(true, true);
  bullet.setActive(false);
  bullet.setVisible(false);

}
function bulletHitEnemy(hull, bullet){
  var enemy;
  var index;
  for(var i = 0; i<enemyTanks.length; i++){
    if(enemyTanks[i].hull === hull){
      enemy = enemyTanks[i];
      index = i;
      break;
    }
  }
  killBullet(bullet);
  enemy.damage();
  // anticipates one hit will disable enemy
  var explosion = explosions.get(hull.x, hull.y);
  if(explosion){
    activateExplosion(explosion);
    explosion.on('animationcomplete', animComplete, this);
    explosion.play('explode')
  }
  if(enemy.isDestroyed()){
    // remove from enemyTanks list
    enemyTanks.splice(index, 1);
  }
}

function damageWall(bullet, tile){
  killBullet(bullet);
  var destructLayer = this.map.getLayer("destructable").tilemapLayer;

  var index = tile.index + 1;
  var tileProperties = destructLayer.tileset[0].tileProperties[index-1];
  var checkColl = false;

  if(tileProperties){
    if(tileProperties.collides){
      checkColl = true;
    }
  }

  const newTile = destructLayer.putTileAt(index,tile.x,tile.y);
  if(checkColl){
    newTile.setCollision(true);
  }
}
function animComplete(animation, frame, gameObject){
  gameObject.disableBody(true, true); // return to pool
}
function activateExplosion(explosion){
  explosion.setDepth(5);
  explosion.setActive(true);
  explosion.setVisible(true);
}
