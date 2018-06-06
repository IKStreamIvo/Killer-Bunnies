var scoreScreenState = new Phaser.Class({
    // Define scene
    Extends: Phaser.Scene,
    initialize:
        function ScoreScreen(){
            Phaser.Scene.call(this, {key: 'ScoreScreen'});
        },
  
    preload: function() {

    },  

    create: function() {      
        this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 1)');

        let delay = this.time.addEvent({
            delay: 5000,
            callback: () => {
                game.scene.start('GamePlay');
            },
            callbackScope: this
        });
    },

    update: function() {
        
    }
});

// Add scene to list of scenes
gameConfig.scenes.push(scoreScreenState);