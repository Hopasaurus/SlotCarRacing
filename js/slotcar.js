if (BABYLON.Engine.isSupported()) {
    var canvas = document.getElementById("renderCanvas");
    var engine = new BABYLON.Engine(canvas, true);

    BABYLON.SceneLoader.Load("", "BlenderFiles/SlotCar.babylon", engine, function (newScene) {
	
console.log(newScene);
var car1 = _.find(newScene.meshes, function(mesh) { return mesh.name === "Car1"; });
var newCar = car1.clone(car1.name);
newCar.position.x += 2;
newScene.meshes.push(newCar);

        newScene.executeWhenReady(function () {
		
            newScene.activeCamera.attachControl(canvas);

            engine.runRenderLoop(function() {
		//fiddle with cars here...
		//newScene.meshes[0].position.x += .001;
		if(newScene.meshes[2].position.x < 1) {
			newScene.meshes[2].position.x += .005;
		}
car1.rotation.y += .1;
		newScene.meshes[2].rotation.y += .005;
                newScene.render();
            });
        });
    }, function (progress) {
        // To do: give progress feedback to user
    });
}
