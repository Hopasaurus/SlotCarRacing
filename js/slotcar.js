

var TRACK_TILE_SIZE = 1.5;
var STRAIGHT_TILE_OFFSET = 0.75;
var CURVE_DOWN_LEFT = 0;
var CURVE_UP_LEFT = 1;
var CURVE_UP_RIGHT = 2;
var CURVE_DOWN_RIGHT = 3;
var STRAIGHT_LEFT_RIGHT = 1;
var STRAIGHT_UP_DOWN = 0;
var CAR_RIDE_HEIGHT = 0.012;
var CAR_PIN_OFFSET = 0.14;

var degToRad = function(deg) { return deg*(Math.PI/180); }
var radToDeg = function(rad) { return rad*(180/Math.PI); }

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
		track.position.x = origin.x + x * TRACK_TILE_SIZE + STRAIGHT_TILE_OFFSET;
		track.position.z = origin.z + z * TRACK_TILE_SIZE + STRAIGHT_TILE_OFFSET;
		track.position.y = origin.y;
	}

	if(trackSpec.type === "curve") {
        var curveTrack = _.find(scene.meshes, function(mesh) { return mesh.name === "Curve1"; });
		var track = curveTrack.clone(curveTrack.name);
        var yoffset = 0;
        var xoffset = 0;
		if(trackSpec.orientation === 0) { xoffset = TRACK_TILE_SIZE; yoffset = 0; }
		if(trackSpec.orientation === 2) { xoffset = 0; yoffset = TRACK_TILE_SIZE; }
		if(trackSpec.orientation === 3) { xoffset = TRACK_TILE_SIZE; yoffset = TRACK_TILE_SIZE; }
		track.rotation.y = trackSpec.rotation;
		track.position.x = origin.x + x * TRACK_TILE_SIZE + xoffset;
		track.position.z = origin.z + z * TRACK_TILE_SIZE + yoffset;
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

var initCar = function(track, lane, car) {
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

    var velocity = {x: 0, y: 0, z: 0};
    track.Cars[lane] = { mesh: newCar, lane: lane, velocity: velocity, throttle: 0, heading: heading };
    console.log(track.Cars[lane]);
}

var rectToPolar = function(rect) {
    return {
        r: Math.sqrt(Math.pow(rect.x, 2) + Math.pow(rect.y, 2)),
        a: Math.atan2(rect.x, rect.y)
    };
};

var polarToRect = function(polar) {
    return {
        x: polar.r * Math.cos(polar.a),
        y: polar.r * Math.sin(polar.a)
    };
};

var flipRadialHeading = function(heading) {
    if(heading < Math.PI) { 
        return heading + Math.PI; 
    }

    return heading - Math.PI;
};

var updateVelocity = function(car) {
    //TODO:  work out spinning and flipping....

    var DRAG_FACTOR = 0.75;
    var POWER_FACTOR = 1;
    var FULL_THROTTLE = 100;
    var THROTTLE_FACTOR = 5;
    
    //velocity is rectangular
    var rectVelocity = { x: car.velocity.x, y: car.velocity.z};
    var polarVelocity = rectToPolar({ x: car.velocity.x, y: car.velocity.z});
    var polarDrag = { a: flipRadialHeading(polarVelocity.a), r: (polarVelocity.r * DRAG_FACTOR) };
    var rectDrag = polarToRect(polarDrag);
    var polarThrust = { a: car.heading, r: (POWER_FACTOR * (car.throttle / FULL_THROTTLE) * THROTTLE_FACTOR) };
    var rectThrust = polarToRect(polarThrust);

    var newVelocity = {
        x: rectVelocity.x + rectDrag.x + rectThrust.x,
        y: rectVelocity.y + rectDrag.y + rectThrust.y
    };

    return {
        x: newVelocity.x,
        z: newVelocity.y,
        y: car.velocity.y
    }
};

var getPinLocation = function(car) {

    var pinOffset = polarToRect({ r: CAR_PIN_OFFSET, a: car.heading });
    console.log(car.heading);
    console.log(pinOffset);

    return { 
        x: car.mesh.position.x + pinOffset.x, 
        z: car.mesh.position.z + pinOffset.y 
    };
};

var getCurrentTile = function(track, pinLocation) {
    console.log(pinLocation);
    return {
        x: Math.floor((pinLocation.x - track.Origin.x) / TRACK_TILE_SIZE),  
        z: Math.floor((pinLocation.z - track.Origin.z) / TRACK_TILE_SIZE)    
    };
};

var getCenterOfTile = function(track, tile) {
    return {
        x: track.Origin.x + tile.x * TRACK_TILE_SIZE + STRAIGHT_TILE_OFFSET,
        z: track.Origin.z + tile.z * TRACK_TILE_SIZE + STRAIGHT_TILE_OFFSET
    };
};
        
var getCorrectAngle = function(tile, track, car) {
    //get reference point for tile
    //  for straight, is ??? from center of tile
    //  need to know orientation of tile
    //  for round is ??? from corner of tile
    //  need to know orientation of tile...
    //  also need to figure out if it is near or far lane from center of tile.
    

    //TODO: bounds check the tile...
    var tileSpec = track.Layout[tile.x][tile.z];
    if(tileSpec.type==="straight") {
        //measure from  middle of tile offset by LANE_OFFSET (0.1)
        // take the closest of a positive or negative offset.
        var tileCenter = getCenterOfTile(track, tile); 
        var carPosition = car.mesh.position;
        if(tileSpec.orientation === STRAIGHT_UP_DOWN) {
            var diff = car.mesh.position.z - tileCenter.z;
            var a = Math.sqrt(Math.pow(CAR_PIN_OFFSET, 2) - Math.pow(diff, 2));
            var blah = rectToPolar({ x: diff, y: a});
            return blah.a;
        } else {
            var diff = car.mesh.position.x - tileCenter.x;
            var a = Math.sqrt(Math.pow(CAR_PIN_OFFSET, 2) - Math.pow(diff, 2));
            var blah = rectToPolar({ x: a, y: diff });
            console.log(blah);
            return blah.a;
        }
    }
    if(tileSpec.type==="curve") {
    }

    return 0;
}

var updateCar = function(track, lane) {
    var car = track.Cars[lane];

    car.velocity = updateVelocity(car);

    //push the car forward at its current velocity
    car.mesh.position.x += car.velocity.x;
    car.mesh.position.z += car.velocity.z;
    
    
    var pinLocation = getPinLocation(car);
    //figure out what tile we are on
    var tile = getCurrentTile(track, pinLocation);
    var newHeading = getCorrectAngle(tile, track, car);

    //if angle needed to rotate back is greater than "critical" angle, send car flying
    //
    //rotate car to get pin back to track
    car.heading = newHeading;
};

if (BABYLON.Engine.isSupported()) {
    var canvas = document.getElementById("renderCanvas");
    var engine = new BABYLON.Engine(canvas, true);

    BABYLON.SceneLoader.Load("", "BlenderFiles/SlotCar.babylon", engine, function (newScene) {
	
        var car1 = _.find(newScene.meshes, function(mesh) { return mesh.name === "Car1"; });
        var car2 = _.find(newScene.meshes, function(mesh) { return mesh.name === "Car2"; });

        buildTrack(newScene, track.Layout, track.Origin);
        initCar(track, 2, car2); 
        initCar(track, 1, car1); 

        track.Cars[1].throttle = .005;
        updateCar(track, 2);
        //TODO: hide the "spare parts"
        
        newScene.executeWhenReady(function () {
		
            newScene.activeCamera.attachControl(canvas);

            engine.runRenderLoop(function() {
                //fiddle with cars here...
                updateCar(track, 1);
                //check for input maybe too...

                newScene.render();
            });
        });
    }, function (progress) {
        // To do: give progress feedback to user
    });
}
