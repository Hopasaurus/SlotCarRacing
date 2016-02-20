if (BABYLON.Engine.isSupported()) {
    var canvas = document.getElementById("renderCanvas");
    var engine = new BABYLON.Engine(canvas, true);

    BABYLON.SceneLoader.Load("", "BlenderFiles/SlotCar.babylon", engine, function (newScene) {
	
console.log(newScene);
var car1 = _.find(newScene.meshes, function(mesh) { return mesh.name === "Car1"; });
var car2 = _.find(newScene.meshes, function(mesh) { return mesh.name === "Car2"; });

var straightTrack = _.find(newScene.meshes, function(mesh) { return mesh.name === "Track1"; });
var curveTrack = _.find(newScene.meshes, function(mesh) { return mesh.name === "Curve1"; });

var buildStraight = function(rotation) {
	return {
		"type": "straight",
		"rotation": rotation
	}
}

var buildCurve = function(rotation) {
	return {
		"type": "curve",
		"rotation": rotation
	}
}

var trackLayout = [[buildCurve(3), buildStraight(1), buildCurve(0)],[buildCurve(2), buildStraight(1), buildCurve(1)]];
var startTile = { x: 1, y: 0 };

var placeTrack = function(origin, trackSpec, x, y) {

    var rot = trackSpec.rotation * Math.PI /2;
	if(trackSpec.type === "straight") {
		var track = straightTrack.clone(straightTrack.name);
		track.rotation.y = rot;
		track.position.x = origin.x + x * 1.5 + 0.75;
		track.position.z = origin.y + y * 1.5 + 0.75;
		track.position.y = origin.z;
	}

	if(trackSpec.type === "curve") {
		var track = curveTrack.clone(curveTrack.name);
        var yoffset = 0;
        var xoffset = 0;
		if(trackSpec.rotation === 0) { xoffset = 1.5; yoffset = 0; }
		if(trackSpec.rotation === 2) { xoffset = 0; yoffset = 1.5; }
		if(trackSpec.rotation === 3) { xoffset = 1.5; yoffset = 1.5; }
		track.rotation.y = rot;
		track.position.x = origin.x + x * 1.5 + xoffset;
		track.position.y = origin.z ;
		track.position.z = origin.y + y * 1.5 + yoffset;
	}
}

var buildTrack = function(trackLayout, origin) {
	_.each(trackLayout, function(element, xindex, list) {
		_.each(element, function(trackSpec, yindex) {
			placeTrack(origin, trackSpec, xindex, yindex);
		});
	});
}

buildTrack(trackLayout, { x: -0, y: -4, z: 0.1});
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
			//newScene.meshes[2].position.y += .005;
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
