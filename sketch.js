let basePoints = [];
const points = 300;
let pointList = [];
let video;
let noiseTime = 0;

const globalConfidence = 0.1;

const mountainPeakWidth = 20;
const mountainBaseWidth = 200;

let mountains = [];

const maxPoints = 300;
const historySize = 50;

function preload() {
  // Load the bodyPose model
  bodyPose = ml5.bodyPose({ flipped: true });
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  for (let i = 1; i <= maxPoints; i++) {
    basePoints[i - 1] = ((i - 1) * width) / maxPoints;
  }
  setHorizontalPoints();

  video = createCapture({ flipped: true });
  video.size(windowWidth, windowHeight);
  video.hide();
  bodyPose.detectStart(video, gotPoses);
}

function draw() {
  background("white");
  textSize(40);
  textAlign(LEFT, TOP);
  text("FPS: " + round(frameRate()), 20, 20);
  noStroke();
  //History
  for (let i = mountains.length - 1; i >= 0; i--) {
    fill(
      lerpColor(color("rgb(134,142,255)"), color("white"), i / (height / 100))
    );
    beginShape();
    let mountain = mountains[i];
    for (let rock of mountain) {
      vertex(rock.x, rock.y - 30 * (i + 1));
    }
    vertex(width * 2, height);
    vertex(0, height);
    endShape(CLOSE);
  }

  //Current
  fill("black");
  let currentMountain = [];
  //beginShape();
  for (let i = 0; i < pointList.length; i++) {
    let base = 0.1;
    let y = 1;

    if (centers.length == 1) {
      base = map(
        abs(dist(pointList[i], 0, centers[0], 0)),
        mountainPeakWidth,
        mountainBaseWidth,
        3,
        0.1,
        true
      );
      
    } else if (centers.length == 2) {

      let baseA = map(
        abs(dist(pointList[i], 0, centers[0], 0)),
        mountainPeakWidth,
        mountainBaseWidth,
        3,
        0.1,
        true
      );
      
      let baseB = map(
        abs(dist(pointList[i], 0, centers[1], 0)),
        mountainPeakWidth,
        mountainBaseWidth,
        2,
        0.07,
        true
      );
      
      base = baseA + baseB;
    }
    
    y =
      (noise(i * 0.005 + 500 + noiseTime) * -height * base) / 2 + height * 1.1;

    //vertex(pointList[i], y);
    stroke(lerpColor('#00D6C4', '#9051FF', i/pointList.length));
    strokeWeight(8);
    line(pointList[i], height, pointList[i], y);
    noStroke();
    
    currentMountain.push({
      x: pointList[i],
      y: y,
    });
  }
  //vertex(width * 2, height);
  //vertex(0, height);
  //endShape(CLOSE);

  if (frameCount % 50 == 0) {
    mountains.unshift(currentMountain);
    mountains = mountains.splice(0, historySize);
    setHorizontalPoints();
  }

  // for (let j = 0; j < centers.length; j++) {
  //   stroke('green');
  //   line(centers[j],0, centers[j], height);
  // }
}

function setHorizontalPoints() {
  noiseTime += 5;
  pointList = [];
  for (let i = 0; i < points; i++) {
    pointList[i] = noise(i * 2 + noiseTime) * width;
  }
  pointList = pointList.concat(basePoints);
  pointList.sort(function (a, b) {
    return a - b;
  });
}

let centers = [];

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
