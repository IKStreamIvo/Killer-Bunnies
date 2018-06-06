var preloadState = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function Preload(){
        Phaser.Scene.call(this, {key: 'Preload'});
    },
    
    preload: function() {
        
    },

    create: function() {
        console.log("Create Preload");
        game.scene.start('GamePlay');
    },
    update: function() {
        
    }
});

gameConfig.scenes.push(preloadState);