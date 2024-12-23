let basePoints = [];
const points = 300;
let pointList = [];
let video;
let noiseTime = 0;

const globalConfidence = 0.1;

const mountainPeakWidth = 20;
const mountainBaseWidth = 200;

let mountains = [];
let centers = [];

const maxPoints = 300;
const historySize = 50;

const defaultPeakMultiplier = 3;
const plainsMultiplier = 0.1;

let targetPeakMultiplier = defaultPeakMultiplier;

let peakMultiplier = defaultPeakMultiplier;

const maxUsers = 5;

function preload() {
  // Load the bodyPose model
  //bodyPose = ml5.bodyPose({ flipped: true });
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  for (let i = 1; i <= maxPoints; i++) {
    basePoints[i - 1] = ((i - 1) * width) / maxPoints;
  }
  setHorizontalPoints();

  video = createCapture({ flipped: true, video: true, audio: false });
  video.size(windowWidth, windowHeight);
  video.hide();
  //bodyPose.detectStart(video, gotPoses);
  textSize(40);
  textAlign(LEFT, TOP);
}

function draw() {
  centers = [];
  for (let k = 0; k < quantity; k++) {
    centers.push(k*width/quantity);
  }
  if(mouseX > 100 && mouseX < width - 100) {
    centers.push(mouseX);
  }
  
  
  background("white");
  noStroke();
  //History
  // for (let i = mountains.length - 1; i >= 0; i--) {
  //   fill(
  //     lerpColor(color("rgb(134,142,255)"), color("white"), i / (height / 100))
  //   );
  //   beginShape();
  //   let mountain = mountains[i];
  //   for (let rock of mountain) {
  //     // When frameCount hits 50, reset mountain position to its base height
  //     if (frameCount % 50 == 0) {
  //       vertex(rock.x, rock.y - 30 * (i+1));
  //     } else {
  //       // frameCount % 50 / 50: creates smooth 0-1 transition over 50 frames
  //       vertex(rock.x, rock.y - 30 * (i) - 30 * (frameCount % 50) / 50);
  //     }
  //   }
  //   vertex(width * 2, height);
  //   vertex(0, height);
  //   endShape(CLOSE);
  // }

  //Current
  let currentMountain = [];

  //Dynamic sizing attributes for the mountains
  //Depending on how many people are present, the max and min sizes
  //of the mountains are set, to avoid overflowing the canvas.
  //When people leave, the dynamic size updates smoothly
  targetPeakMultiplier = defaultPeakMultiplier/constrain(centers.length*0.6,1, maxUsers);
  
  let peakAdjustmentSpeed = map(targetPeakMultiplier - peakMultiplier, 0, defaultPeakMultiplier, 0, 0.08);

  peakMultiplier += peakAdjustmentSpeed;

  //Go through each horizontal point
  for (let i = 0; i < pointList.length; i++) {
    
    //Set the base, the texture of the terrain with no mountains
    let base = plainsMultiplier;

    //Go through each person
    centers.forEach(center => {
      //Calculate how much to raise the current point vertically,
      //depending on how close the person is to it.
      base += map(
        abs(dist(pointList[i], 0, center, 0)),
        mountainPeakWidth,
        mountainBaseWidth,
        peakMultiplier,
        0,
        true
      );
    });

    //The y for the current point starts at height (bottom of canvas)
    //a noise value is subtracted to create a terrain. This terrain is 
    //multiplied by the base value, which raises it depending on the position
    //of each person 
    let y = height - noise(i * 0.005 + noiseTime) * base;
    //Finally, this calculated y is amplified to be more visible
    y = map(y, height, height - defaultPeakMultiplier, height + 1, 0);

    stroke(lerpColor('#00D6C4', '#9051FF', i/pointList.length));
    strokeWeight(8);
    if (i > 0) {  // Skip first point
      // Draw outline by connecting current point to previous point
      // Creates a continuous line that forms the mountain's outline 
      line(pointList[i], y, currentMountain[i-1].x, currentMountain[i-1].y);
    }
    line(pointList[i], height, pointList[i], y);
    noStroke();
    
    currentMountain.push({
      x: pointList[i],
      y: y,
    });
  }

  // if (frameCount % 50 == 0) {
  //   mountains.unshift(currentMountain);
  //   mountains = mountains.splice(0, historySize);
  //   setHorizontalPoints();
  // }

  //
  // for (let j = 0; j < centers.length; j++) {
  //   stroke('green');
  //   line(centers[j],0, centers[j], height);
  // }

  //Show fps for debugging
  text("FPS: " + round(frameRate()) +" Q: " + quantity, 20, 20);
}

function keyReleased() {
  setHorizontalPoints();
}

let quantity = 0;

function mouseReleased() {
  quantity++;
}

function setHorizontalPoints() {
  noiseTime += 1;
  pointList = [];
  for (let i = 0; i < points; i++) {
    pointList[i] = noise(i * 2 + noiseTime) * width;
  }
  pointList = pointList.concat(basePoints);
  pointList.sort(function (a, b) {
    return a - b;
  });
}

function gotPoses(results) {
  // Save the output to the poses variable
  poses = results;

  centers = [];
  //Run through poses and get the centers
  for (let i = 0; i < poses.length; i++) {
    let person = poses[i];
    let center = false;
    if (person.nose.confidence > globalConfidence) {
      center = person.nose.x;
    } else if (
      person.right_eye.confidence > globalConfidence &&
      person.left_eye.confidence > globalConfidence
    ) {
      center = person.right_eye.x - person.left_eye.x;
      const person_span = person.right_eye.x - person.left_eye.x;
      center = person.left_eye.x + person_span / 2;
    } else if (
      person.right_shoulder.confidence > globalConfidence &&
      person.left_shoulder.confidence > globalConfidence
    ) {
      center = person.right_shoulder.x - person.left_shoulder.x;
      const person_span = person.right_shoulder.x - person.left_shoulder.x;
      center = person.left_shoulder.x + person_span / 2;
    } else {
      let minX = Infinity;
      let maxX = -Infinity;
      person.keypoints.forEach((keypoint) => {
        if (keypoint.confidence > 0.1) {
          minX = min(minX, keypoint.x);
          maxX = max(maxX, keypoint.x);
        }
      });
      const person_span = maxX - minX;
      center = minX + person_span / 2;
    }

    if (center !== false) {
      centers.push(center);
    }
  }
}
