

var TRACK_TILE_SIZE = 1.5;
var STRAIGHT_TILE_OFFSET = 0.75;
var LANE_OFFSET = 0.1;
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

/*
    Layout: [[buildCurve(CURVE_DOWN_RIGHT), buildStraight(STRAIGHT_LEFT_RIGHT), buildCurve(CURVE_DOWN_LEFT)],
             [buildCurve(CURVE_UP_RIGHT), buildStraight(STRAIGHT_LEFT_RIGHT), buildCurve(CURVE_UP_LEFT)]],
             */
var track = {
    Layout: [[buildCurve(CURVE_DOWN_RIGHT), buildStraight(STRAIGHT_LEFT_RIGHT), buildCurve(CURVE_DOWN_LEFT)],
             [buildCurve(CURVE_UP_RIGHT), buildStraight(STRAIGHT_LEFT_RIGHT), buildCurve(CURVE_UP_LEFT)]],
    /*
    Layout: [[buildStraight(STRAIGHT_LEFT_RIGHT), buildStraight(STRAIGHT_LEFT_RIGHT), buildCurve(CURVE_DOWN_LEFT)],
             [buildCurve(CURVE_UP_RIGHT), buildStraight(STRAIGHT_LEFT_RIGHT), buildCurve(CURVE_UP_LEFT)]],
             */
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
}

var rectToPolar = function(rect) {
    var x = 0 - rect.x;
    var y = rect.y;
    return {
        r: Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)),
        a: Math.atan2(y, x)
    };
};

var polarToRect = function(polar) {
    return {
        x: 0 - polar.r * Math.cos(polar.a),
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
    var POWER_FACTOR = 0.51;
    var FULL_THROTTLE = 100;
    var THROTTLE_FACTOR = 0.3;
    
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

    return { 
        x: car.mesh.position.x + pinOffset.x, 
        z: car.mesh.position.z + pinOffset.y 
    };
};

var getCurrentTile = function(track, pinLocation) {
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

var getCenterOfArc = function(tileCenter, tileSpec) {
    var offset = TRACK_TILE_SIZE / 2;

    if(tileSpec.orientation === CURVE_DOWN_LEFT) {
        return { x: tileCenter.x + offset, z: tileCenter.z - offset };
    }

    if(tileSpec.orientation === CURVE_UP_LEFT) {
        return { x: tileCenter.x - offset, z: tileCenter.z - offset };
    }
    
    if(tileSpec.orientation === CURVE_UP_RIGHT) {
        return { x: tileCenter.x - offset, z: tileCenter.z + offset };
    }

    if(tileSpec.orientation === CURVE_DOWN_RIGHT) {
        return { x: tileCenter.x + offset, z: tileCenter.z + offset };
    }
};
        
var getDistanceAndDiffs = function(a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    return {distance: Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)),
            dx: dx,
            dy: dy
    };
}
var getDistance = function(a, b) {
    return getDistanceAndDiffs(a, b).distance;
}

var getTargetPinDistance = function(current) {
    if(current > STRAIGHT_TILE_OFFSET) {
        return STRAIGHT_TILE_OFFSET + LANE_OFFSET;
    }
    return STRAIGHT_TILE_OFFSET - LANE_OFFSET;
}

var getCircleIntersections = function(p1, p2) {
    //Thanks mathforum: http://mathforum.org/library/drmath/view/51836.html
    var carToCenter = getDistanceAndDiffs(p1, p2);

    var a = p1.x;
    var b = p1.y;
    var c = p2.x;
    var d = p2.y;
    var r = p1.r;
    var s = p2.r;
    var e = carToCenter.dx;
    var f = carToCenter.dy;
    var p = carToCenter.distance;
    var k = (Math.pow(p,2) + Math.pow(r,2) - Math.pow(s,2))/(2 * p);

    var x1 = a + e * k / p + (f/p) * Math.sqrt(Math.pow(r,2) - Math.pow(k,2));
    var y1 = b + f * k / p - (e/p) * Math.sqrt(Math.pow(r,2) - Math.pow(k,2));

    var x2 = a + e * k / p - (f/p) * Math.sqrt(Math.pow(r,2) - Math.pow(k,2));
    var y2 = b + f * k / p + (e/p) * Math.sqrt(Math.pow(r,2) - Math.pow(k,2));
    
    return { i1: { x: x1, y: y1 }, i2: { x: x2, y: y2}};
}

var findClosest = function(pin, intersections) {
    var diff1 = getDistance({x: pin.x, y: pin.z}, intersections.i1);
    var diff2 = getDistance({x: pin.x, y: pin.z}, intersections.i2);
    if(diff1 < diff2) {
        return intersections.i1;
    }
    return intersections.i2;
}

var getCorrectAngle = function(tile, track, car) {
    var tileSpec = track.Layout[tile.x][tile.z];
    if(tileSpec.type==="straight") {
        var tileCenter = getCenterOfTile(track, tile); 
        var carPosition = car.mesh.position;
        if(tileSpec.orientation === STRAIGHT_UP_DOWN) {
            var diff = car.mesh.position.z - tileCenter.z;
            if(diff < 0) {
                diff += 0.1;
            } else {
                diff -= 0.1;
            }
            //var a = Math.sqrt(Math.pow(CAR_PIN_OFFSET, 2) - Math.pow(diff, 2));
            var currentA = polarToRect({r:CAR_PIN_OFFSET, a:car.heading});
            var blah = rectToPolar({ x: currentA.x , y: diff}); //TODO: if it is wonky check this first.
            return blah.a;
        } else {
            var diff = tileCenter.x - car.mesh.position.x;
            if(diff < 0) {
                diff += 0.1;
            } else {
                diff -= 0.1;
            }
            //var a = Math.sqrt(Math.pow(CAR_PIN_OFFSET, 2) - Math.pow(diff, 2));
            var currentA = polarToRect({r:CAR_PIN_OFFSET, a:car.heading});
            var blah = rectToPolar({ x: diff, y: currentA.y });
            return blah.a;
        }
    }
    if(tileSpec.type==="curve") {
        var tileCenter = getCenterOfTile(track, tile);
        var arcCenter = getCenterOfArc(tileCenter, tileSpec);
        
        var pinLocation = getPinLocation(car);
        var pinToCenterDistance = getDistance({x: arcCenter.x, y: arcCenter.z},
                                              {x: pinLocation.x, y: pinLocation.z});

        var targetDistance = getTargetPinDistance(pinToCenterDistance);
        
        var intersections = getCircleIntersections(
                {x: arcCenter.x, y: arcCenter.z, r: targetDistance},
                {x: car.mesh.position.x, y: car.mesh.position.z, r: CAR_PIN_OFFSET});

        var closestIntersection = findClosest(pinLocation, intersections);

        var rectStuff = { x: closestIntersection.x - car.mesh.position.x,
                          y: closestIntersection.y - car.mesh.position.z};
        var polarStuff = rectToPolar(rectStuff);

        return polarStuff.a;
    }

    return 0;
}

var updateCar = function(track, lane) {
    var car = track.Cars[lane];

    car.velocity = updateVelocity(car);

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
    car.mesh.rotation.y = newHeading;
};

if (BABYLON.Engine.isSupported()) {
    var canvas = document.getElementById("renderCanvas");
    var engine = new BABYLON.Engine(canvas, true);

    BABYLON.SceneLoader.Load("", "BlenderFiles/SlotCar.babylon", engine, function (newScene) {
	
        var car1 = _.find(newScene.meshes, function(mesh) { return mesh.name === "Car1"; });
        var car2 = _.find(newScene.meshes, function(mesh) { return mesh.name === "Car2"; });

        buildTrack(newScene, track.Layout, track.Origin);
        initCar(track, 1, car1); 
        initCar(track, 2, car2); 

        track.Cars[1].throttle = 0;
        track.Cars[2].throttle = 0;
        updateCar(track, 2);
        
        //TODO: hide the "spare parts"
        var keyHandler = function(event) {
            console.log("Keydown: " + event.keyCode);

            switch(event.keyCode) {
                case 65: //a
                    track.Cars[1].throttle = 0;
                    break;
                case 83: //s
                    track.Cars[1].throttle = 30;
                    break;
                case 68: //d
                    track.Cars[1].throttle = 60;
                    break;
                case 70: //f
                    track.Cars[1].throttle = 100;
                    break;

                case 74: //j
                    track.Cars[2].throttle = 0;
                    break;
                case 75: //k
                    track.Cars[2].throttle = 30;
                    break;
                case 76: //l
                    track.Cars[2].throttle = 60;
                    break;
                case 186: //;
                    track.Cars[2].throttle = 100;
                    break;
            }
        }

        window.addEventListener("keydown", keyHandler);
        
        newScene.executeWhenReady(function () {
		
            newScene.activeCamera.attachControl(canvas);

            engine.runRenderLoop(function() {
                //fiddle with cars here...
                updateCar(track, 1);
                updateCar(track, 2);
                //check for input maybe too...

                newScene.render();
            });
        });
    }, function (progress) {
        // To do: give progress feedback to user
    });
}

