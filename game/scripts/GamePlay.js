/// <reference path="../../defs/phaser.d.ts" />

var gameConfig = {
    scenes: [],
    frameRate: 10,

    moveSpeed: 150,
    jumpForce: 375
};

var music;
var p1;
var playerWidth;
var platforms;
var DEBUG = !false;
var bullets;
var winner;
var p1score;
var p2score;
var gameRunning;

var gamePlayState = new Phaser.Class({
    // Define scene
    Extends: Phaser.Scene,
    initialize: function GamePlay(){
        Phaser.Scene.call(this, {key: 'GamePlay'});
    },
    preload: function() {
        this.load.baseURL = './assets/';
        this.load.image('rabbit1', "rabbit1.png");
        this.load.image('rabbit2', "rabbit2.png");

        this.load.tilemapTiledJSON('grassymap', 'grassymap.json');
        this.load.spritesheet('grassytilemap','grassytilemap.png', {frameWidth: 14, frameHeight: 10});
        this.load.spritesheet('trees','trees.png', {frameWidth: 14, frameHeight: 10});  
        this.load.spritesheet('pedestal', 'pedestal.png', {frameWidth: 14, frameHeight: 10});
        this.load.image('pedestal_', "pedestal.png");
        this.load.image('gun1', "gun.png");
        this.load.image('bullet1', "bullet.png");

        this.load.audio('main', [
            'audio/Jump Up.ogg',
            'audio/Jump Up.mp3'
        ]);


    },

    create: function() {
        //Tilemap
        var map = this.make.tilemap({key: 'grassymap'});
        var groundImage = map.addTilesetImage('grassytilemap');
        var treesImage = map.addTilesetImage('trees');
        var pedestalImage = map.addTilesetImage('pedestal');

        var groundLayer = map.createDynamicLayer(0, groundImage);
        var extrasLayer = map.createDynamicLayer(1, treesImage);
        var leavesLayer = map.createDynamicLayer(3, treesImage);
        var oneWayLayer = map.createDynamicLayer(2, treesImage);
        var pedestals = map.createFromObjects('Pedestals', 30, {key: 'pedestal_'});

        //Players
        p1spr = this.add.sprite(0, 0, 'rabbit1');
        p1spr.name = "p1spr";
        p1 = this.add.container(400, 200, [p1spr]);
        p1.offsets = [];
        p1.offsets.push([0,0]);
        let bunnyBounds = p1spr.getBounds();
        p1.setSize(bunnyBounds.width, bunnyBounds.height);
        p1.name = "Player1";
        this.physics.world.enable(p1);
        p1.cooldown = 0;
        playerWidth = p1.width;

        p2spr = this.add.sprite(0, 0, 'rabbit2');
        p2spr.name = "p2spr";
        p2 = this.add.container(200, 50, [p2spr]);
        p2.offsets = [];
        p2.offsets.push([0,0]);
        p2.setSize(bunnyBounds.width, bunnyBounds.height);
        p2.name = "Player2";
        this.physics.world.enable(p2);
        p2.cooldown = 0;

        bullets = this.physics.add.group();

        //Collision
        groundLayer.setCollisionByExclusion([-1], true);
        oneWayLayer.setCollisionByExclusion([-1], true);

        this.physics.add.collider(p1, groundLayer);
        this.oneWayColl1 = this.physics.add.collider(p1, oneWayLayer, this.oneWayCollide, undefined, this);
        this.physics.add.collider(p2, groundLayer);
        this.oneWayColl2 = this.physics.add.collider(p2, oneWayLayer, this.oneWayCollide, undefined, this);

        this.physics.add.collider(bullets, groundLayer, this.destroyOnHit);
        this.physics.add.collider(bullets, oneWayLayer, this.destroyOnHit);
        bullets.collideWorldBounds = true;

        this.physics.add.collider(bullets, p1, function(a, b){
            b.destroy();
            this.hitPlayer(a);
        }, null, this);
        this.physics.add.collider(bullets, p2, function(a, b){
            b.destroy();
            this.hitPlayer(a);
        }, null, this);

        oneWayLayer.forEachTile(function(tile){
            tile.collideUp = true;
            tile.collideDown = false;
            tile.collideLeft = false;
            tile.collideRight = false;
        });       

        //Controls & Camera
        input1 = this.input.keyboard.addKeys(
            { 
                'up': Phaser.Input.Keyboard.KeyCodes.W, 
                'down': Phaser.Input.Keyboard.KeyCodes.S,
                'left': Phaser.Input.Keyboard.KeyCodes.A,
                'right': Phaser.Input.Keyboard.KeyCodes.D,
                'jump': Phaser.Input.Keyboard.KeyCodes.SPACE,
                'interact': Phaser.Input.Keyboard.KeyCodes.TAB,
                'use': Phaser.Input.Keyboard.KeyCodes.SHIFT
            }
        );
        input2 = this.input.keyboard.addKeys(
            {
                'up': Phaser.Input.Keyboard.KeyCodes.UP, 
                'down': Phaser.Input.Keyboard.KeyCodes.DOWN,
                'left': Phaser.Input.Keyboard.KeyCodes.LEFT,
                'right': Phaser.Input.Keyboard.KeyCodes.RIGHT,
                'jump': Phaser.Input.Keyboard.KeyCodes.ENTER,
                'interact': Phaser.Input.Keyboard.KeyCodes.FORWARD_SLASH,
                'use': Phaser.Input.Keyboard.KeyCodes.CTRL
            }
        );
        
        //Object to follow with the camera
        midRabbit = this.add.sprite(0, 0, 'rabbit1');
        midRabbit.visible = false;

        //Camera
        camera = this.cameras.main;
        camera.setZoom(4);
        camera.startFollow(midRabbit);

        //Pedestal items
        pedestals.forEach((pedestal) => {
            let rarity = Number(pedestal.name.replace("Pedestal_", ""));
            let weapon = this.physics.add.sprite(pedestal.x, pedestal.y-5, 'gun1');
            weapon.body.allowGravity = false;
            weapon.name = "Pistol";
            weapon.bullet = "bullet1";
            weapon.shootSpeed = 5;
            //save pedestal for respawning
            //weapon.pedestal = pedestal;

            //Interactions
            weapon.p1coll = this.physics.add.overlap(weapon, p1, overlap, undefined, this);
            weapon.p2coll = this.physics.add.overlap(weapon, p2, overlap, undefined, this);
            function overlap(a, b){
                if(b == p1){
                    if(input1.interact.isDown){
                        weapon.p1coll.destroy();
                        weapon.p2coll.destroy();
                        let weaponSpr;
                        if(p1.scaleX === -1){
                            weaponSpr = this.add.sprite(-playerWidth + 4, 5, weapon.texture.key);
                        }else{
                            weaponSpr = this.add.sprite(4, 5, weapon.texture.key);
                        }
                        weaponSpr.setScale(.8);
                        p1.add(weaponSpr);
                        p1.offsets.push([4, 5]);
                        
                        p1.weapon = {"name": weapon.name, "bullet": weapon.bullet, "speed": weapon.shootSpeed};
                        weapon.destroy();
                        p1.cooldown = 0;
                    }
                }else if(b == p2){
                    if(input2.interact.isDown){
                        weapon.p1coll.destroy();
                        weapon.p2coll.destroy();
                        let weaponSpr;
                        if(p2.scaleX === -1){
                            weaponSpr = this.add.sprite(-playerWidth + 4, 5, weapon.texture.key);
                        }else{
                            weaponSpr = this.add.sprite(4, 5, weapon.texture.key);
                        }
                        weaponSpr.setScale(.8);
                        p2.add(weaponSpr);
                        p2.offsets.push([4, 5]);
                        
                        p2.weapon = {"name": weapon.name, "bullet": weapon.bullet, "speed": weapon.shootSpeed};
                        weapon.destroy();
                        p2.cooldown = 0;
                    }
                }
            }
        }, this);

        //Sorting layers
        this.children.bringToTop(p1);
        this.children.bringToTop(p2);
        this.children.bringToTop(leavesLayer);

        //DEBUG
        if(DEBUG){
            let p1debug = this.add.text(0, -25, "", {font: '52px Arial', fill: '#ffffff', align: 'center'});
            p1debug.setScale(.2, .2);
            p1.add(p1debug);
            p1.offsets.push([0, -25]);
        }
        
        gameRunning = true;

        if(music === undefined){
            music = this.sound.add('main');
            music.play();
        }
    },

    update: function(time, delta) {
        //Player 1
        if(p1 !== undefined){
            if(p1.body === undefined) return;
            if (input1.left.isDown)
            {
                p1.body.setVelocityX(-gameConfig.moveSpeed);
                if(p1.scaleX !== -1){
                    p1.iterate(function(child){
                        let index = p1.getIndex(child);
                        child.setPosition(-playerWidth + p1.offsets[index][0], p1.offsets[index][1]);
                    });
                    p1.scaleX = -1;    
                    p1.x -= playerWidth;            
                }
            }
            else if (input1.right.isDown)
            {
                p1.body.setVelocityX(gameConfig.moveSpeed);
                if(p1.scaleX !== 1){
                    p1.iterate(function(child){
                        let index = p1.getIndex(child);
                        child.setPosition(p1.offsets[index][0], p1.offsets[index][1]);
                    });
                    p1.scaleX = 1;    
                    p1.x += playerWidth;            
                }
            }
            else
            {
                p1.body.setVelocityX(0);
            }

            if ((input1.jump.isDown || input1.up.isDown) && p1.body.onFloor())
            {
                p1.body.setVelocityY(-gameConfig.jumpForce);
            }

            ///Shoot
            if(input1.use.isDown && p1.weapon !== undefined && p1.cooldown <= 0){
                p1.cooldown = 1500;
                let bullet = this.physics.add.sprite(p1.x, p1.y, p1.weapon.bullet);
                bullets.add(bullet);
                bullet.body.allowGravity = false;
                bullet.body.setVelocityX(700 * p1.scaleX);
            }else if(p1.cooldown > 0){
                p1.cooldown -= delta;
            }

            //Kill if falling
            if(p1.y > 350){
                this.hitPlayer(p1);
            }
        }

        //Player 2
        if(p2 !== undefined){
            if(p2.body === undefined) return;
            if (input2.left.isDown)
            {
                p2.body.setVelocityX(-gameConfig.moveSpeed);
                if(p2.scaleX !== -1){
                    p2.iterate(function(child){
                        let index = p2.getIndex(child);
                        child.setPosition(-playerWidth + p2.offsets[index][0], p2.offsets[index][1]);
                    });
                    p2.scaleX = -1;    
                    p2.x -= playerWidth;            
                }
            }
            else if (input2.right.isDown)
            {
                p2.body.setVelocityX(gameConfig.moveSpeed);
                if(p2.scaleX !== 1){
                    p2.iterate(function(child){
                        let index = p2.getIndex(child);
                        child.setPosition(p2.offsets[index][0], p2.offsets[index][1]);
                    });
                    p2.scaleX = 1;    
                    p2.x += playerWidth;            
                }
            }
            else
            {
                p2.body.setVelocityX(0);
            }

            if ((input2.jump.isDown || input2.up.isDown) && p2.body.onFloor())
            {
                p2.body.setVelocityY(-gameConfig.jumpForce);
            }

            ///Shoot
            if(input2.use.isDown && p2.weapon !== undefined && p2.cooldown <= 0){
                p2.cooldown = 1500;
                let bullet = this.physics.add.sprite(p2.x, p2.y, p2.weapon.bullet);
                bullets.add(bullet);
                bullet.body.allowGravity = false;
                bullet.body.setVelocityX(700 * p2.scaleX);
            }else if(p2.cooldown > 0){
                p2.cooldown -= delta;
            }   
            //Kill if falling
            if(p2.y > 350){
                this.hitPlayer(p2);
            }
        }

        //Update camera position
        if(gameRunning){
            let line = new Phaser.Geom.Line(p1.x, p1.y, p2.x, p2.y);
            var mid = Phaser.Geom.Line.GetMidPoint(line);
            midRabbit.x = mid.x;
            midRabbit.y = mid.y;

            //Update camera zoom
            var dist = Phaser.Geom.Line.Length(line);
            var zoom = this.remapNrs(dist, 0, 350, 3, 1.5);
            camera.setZoom(Phaser.Math.Linear(camera.zoom, zoom, delta/100));
        }else{
            //Keep following the winning player
            this.tweens.add({
                targets: camera,
                ease: 'Power1',
                duration: 500,
                zoom: 3,
            });
            console.log(winner);
            if(winner){
                this.tweens.add({
                    targets: midRabbit,
                    x: p1.x,
                    y: p1.y,
                    ease: 'Power1',
                    duration: 800,
                });
            }else{
                this.tweens.add({
                    targets: midRabbit,
                    x: p2.x,
                    y: p2.y,
                    ease: 'Power1',
                    duration: 800,
                });
            }
        }
        if(DEBUG){
            p1.getAt(1).setText(gameRunning);
        }
    },

    oneWayCollide: function(a, b){
        if(a == p1){
            if(input1.down.isDown){
                this.oneWayColl1.active = false;
                let delay = this.time.addEvent({
                    delay: 200,
                    callback: () => {
                        this.oneWayColl1.active = true;
                    },
                    callbackScope: this
                });
            }
        }else if(a == p2){
            if(input2.down.isDown){
                this.oneWayColl2.active = false;
                let delay = this.time.addEvent({
                    delay: 200,
                    callback: () => {
                        this.oneWayColl2.active = true;
                    },
                    callbackScope: this
                });
            }
        }
    },

    destroyOnHit: function(a, b){
        if(a !== undefined){
            a.destroy();
        }
    },

    hitPlayer: function(player){
        console.log(player.name);
        gameRunning = false;
        if(player === p1){
            p2score++;
            winner = false;
            p1.destroy();
        }else{
            p1score++;
            winner = true;
            p2.destroy();
        }
        
        let delay = this.time.addEvent({
            delay: 3000,
            callback: function(){
                this.cameras.main.fadeOut(500, 0, 0, 0, function(){
                    game.scene.start('ScoreScreen');
                });
            },
            callbackScope: this
        });
    },

    //https://www.arduino.cc/reference/en/language/functions/math/map/
    remapNrs: function(x, in_min, in_max, out_min, out_max){
        return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
    }
});

gameConfig.scenes.push(gamePlayState);