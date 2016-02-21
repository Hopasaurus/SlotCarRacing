

var TRACK_TILE_SIZE = 1.5;
var STRAIGHT_TILE_OFFSET = 0.75;
var CURVE_DOWN_LEFT = 0;
var CURVE_UP_LEFT = 1;
var CURVE_UP_RIGHT = 2;
var CURVE_DOWN_RIGHT = 3;
var STRAIGHT_LEFT_RIGHT = 1;
var STRAIGHT_UP_DOWN = 0;
var CAR_RIDE_HEIGHT = 0.012;

var buildStraight = function(rotation) {
	return {
		"type": "straight",
        "orientation": rotation,
		"rotation": rotation * Math.PI/2
	}
}

var buildCurve = function(rotation) {
	return {
		"type": "curve",
        "orientation": rotation,
		"rotation": rotation * Math.PI/2
	}
}

var track = {
    Layout: [[buildCurve(CURVE_DOWN_RIGHT), buildStraight(CURVE_UP_LEFT), buildCurve(CURVE_DOWN_LEFT)],
             [buildCurve(CURVE_UP_RIGHT), buildStraight(STRAIGHT_LEFT_RIGHT), buildCurve(CURVE_UP_LEFT)]],
    Start: { x: 0, z: 1 },
    Cars: [],
    Origin: { x: -0, z: -4, y: 0.1}
};


var placeTrack = function(scene, origin, trackSpec, x, z) {

	if(trackSpec.type === "straight") {
        var straightTrack = _.find(scene.meshes, function(mesh) { return mesh.name === "Track1"; });
		var track = straightTrack.clone(straightTrack.name);
		track.rotation.y = trackSpec.rotation;
		track.position.x = origin.x + x * 1.5 + 0.75;
		track.position.z = origin.z + z * 1.5 + 0.75;
		track.position.y = origin.y;
	}

	if(trackSpec.type === "curve") {
        var curveTrack = _.find(scene.meshes, function(mesh) { return mesh.name === "Curve1"; });
		var track = curveTrack.clone(curveTrack.name);
        var yoffset = 0;
        var xoffset = 0;
		if(trackSpec.orientation === 0) { xoffset = 1.5; yoffset = 0; }
		if(trackSpec.orientation === 2) { xoffset = 0; yoffset = 1.5; }
		if(trackSpec.orientation === 3) { xoffset = 1.5; yoffset = 1.5; }
		track.rotation.y = trackSpec.rotation;
		track.position.x = origin.x + x * 1.5 + xoffset;
		track.position.z = origin.z + z * 1.5 + yoffset;
		track.position.y = origin.y ;
	}
}

var buildTrack = function(scene, trackLayout, origin) {
	_.each(trackLayout, function(element, xindex, list) {
		_.each(element, function(trackSpec, zindex) {
			placeTrack(scene, origin, trackSpec, xindex, zindex);
		});
	});
}

var initCar = function(scene, track, lane, car) {
    var newCar = car.clone(car.name);

    var laneOffset = -0.1;
    if(lane === 2) {
        laneOffset = 0.1;
    }

    var heading = track.Layout[track.Start.x][track.Start.z].rotation;
    newCar.rotation.y = heading;
    newCar.position.x = track.Origin.x + track.Start.x * TRACK_TILE_SIZE + STRAIGHT_TILE_OFFSET + laneOffset;
    newCar.position.z = track.Origin.z + track.Start.z * TRACK_TILE_SIZE + STRAIGHT_TILE_OFFSET;
    newCar.position.y = track.Origin.y + CAR_RIDE_HEIGHT;

    track.Cars[lane] = { mesh: newCar, lane: lane, speed: 0, velocity: {x: 0, z: 0, y: 0}, throttle: 0, heading: heading, position: {x: track.Start.x, z: track.Start.z}};
}


if (BABYLON.Engine.isSupported()) {
    var canvas = document.getElementById("renderCanvas");
    var engine = new BABYLON.Engine(canvas, true);

    BABYLON.SceneLoader.Load("", "BlenderFiles/SlotCar.babylon", engine, function (newScene) {
	
//console.log(newScene);
        var car1 = _.find(newScene.meshes, function(mesh) { return mesh.name === "Car1"; });
        var car2 = _.find(newScene.meshes, function(mesh) { return mesh.name === "Car2"; });



        buildTrack(newScene, track.Layout, track.Origin);
        initCar(newScene, track, 1, car1); 
        initCar(newScene, track, 2, car2); 

//var newCar = car1.clone(car1.name);
//newCar.position.x += 2;
//newScene.meshes.push(newCar);

        newScene.executeWhenReady(function () {
		
            newScene.activeCamera.attachControl(canvas);

            engine.runRenderLoop(function() {
		//fiddle with cars here...
		//newScene.meshes[0].position.x += .001;
//		if(newScene.meshes[2].position.x < 1) {
//			newScene.meshes[2].position.x += .005;
			//newScene.meshes[2].position.y += .005;
//		}
//car1.rotation.y += .1;
//		newScene.meshes[2].rotation.y += .005;

                //track.Cars[1].rotation.y += .1;

                newScene.render();
            });
        });
    }, function (progress) {
        // To do: give progress feedback to user
    });
}
