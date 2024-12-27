/* --------------------------------------------------------------
 * Variables 
 * -------------------------------------------------------------*/

//Make true to see debugging view
const debugging = true;

//Make mountains with the mouse or with ml5
const mode = 'body'; //Either 'mouse' or 'body'

//Basic structure of horizontal points distibuted evenly across the canvas width
let basePoints = [];

//How many basepoints to generate;
const maxPoints = 300;

//How many generative horizontal points to generate in each layer
const points = 300;

//Array that holds all the horizontal points of the current layer,
//including both the basePoints and randomly generated ones
let pointList = [];

//Incremental parameter for the noise() function
let noiseTime = 0;

//History array containing arrays of x and y coordinates for each
//vertex of every mountain. Most recent to oldest.
let mountains = [];

//How many mountains to save in history
const historySize = 35;

//How wide is the peak of each mountain
const mountainPeakWidth = 20;

//How wide is the base of each mountain
const mountainBaseWidth = 200;

//Define the maximum height of the mountain
const maxMountainHeight = window.innerHeight*0.6;

//How vertically distant to draw each mountain in the history
const mountainGap = 30;

//Sets the speed. How many frames before the history advances one mountainGap.
const framesToRecord = 50;

//Used in the dynamic multiplier algorithm. How much taller is the peak vs the rest
const defaultPeakMultiplier = 1;

//Used in the dynamic multiplier algorithm. How much shorter to make the plains.
const plainsMultiplier = -0.2;

//This value gets updated instantly when new users are detected.
let targetPeakMultiplier = defaultPeakMultiplier;

//This value is a smoothed version of the targetPeakMultiplier.
let peakMultiplier = defaultPeakMultiplier;

//Used to cap the erotion of the peak multiplier. If we allow the
//peak multiplier to be divided by an indefinite number of users,
//when many users are present, the peak multiplier will become too small.
//This value protects us from that scenario.
const maxUsers = 5;

//Camera input
let video;

//Minimum confidence level for the ml5 readings to be used
const globalConfidence = 0.1;

//Array that holds the center x position of each person detected
let centers = [];

function preload() {
  if(mode == 'body'){
    // Load the bodyPose model
    bodyPose = ml5.bodyPose({ flipped: true });
  }
}

function setup() {
  const p5canvas = createCanvas(windowWidth, windowHeight);
  p5canvas.id('p5canvas');

  for (let i = 1; i <= maxPoints; i++) {
    basePoints[i - 1] = ((i - 1) * width) / maxPoints;
  }
  setHorizontalPoints();

  if(mode == 'body'){
    video = createCapture({ flipped: true, video: true, audio: false });
    video.size(windowWidth, windowHeight);
    video.hide();
    bodyPose.detectStart(video, gotPoses);
  }

  textSize(40);
  textAlign(LEFT, TOP);
}

function draw() {
  if(mode == 'mouse') {
    centers = [];
    //Only if the mouse is over the sketch
    if( window.p5canvas.matches(':hover') ){
      centers = [mouseX];
    }
  }
  
  background("white");
  noStroke();
  
  /* --------------------------------------------------------------
  * History
  * -------------------------------------------------------------*/
  for (let i = mountains.length - 1; i >= 0; i--) {
    //In this cycle of animation, what color does this mountain start with
    const colorStart = lerpColor(color("rgb(82, 93, 247)"), color("white"), i/(historySize - 1));
    //In this cycle of animation, what color does this mountain end with
    const colorEnd = lerpColor(color("rgb(82, 93, 247)"), color("white"), (i+1)/(historySize - 1));

    //When hitting end of animation, set the mountain as its end color,
    //which will now be its start color at the end of this draw when a 
    //new mountain is added and this one moves back in history
    if (frameCount % framesToRecord == 0) {
      fill( colorEnd );
    } else {
      //Else, smoothly color it depending on its animation frame
      fill(
        lerpColor(
          colorStart,
          colorEnd,
          (frameCount % framesToRecord)/framesToRecord
        )
      );
    }
    
    beginShape();
    let mountain = mountains[i];
    for (let rock of mountain) {
      // When frameCount hits end of animation, draw each mountain position one gap
      // above, which will be the starting point as soon as the
      // new mountain is added to the history at the end of this draw
      if (frameCount % framesToRecord == 0) {
        vertex(rock.x, rock.y - mountainGap*(i+1));
      } else {
        //ex: frameCount % 50 / 50: creates smooth 0-1 transition over 50 frames
        vertex(rock.x, rock.y - mountainGap*(i) - mountainGap*(frameCount % framesToRecord) / framesToRecord);
      }
    }
    vertex(width * 2, height);
    vertex(0, height);
    endShape(CLOSE);
  }

  /* --------------------------------------------------------------
  * Current Mountain
  * -------------------------------------------------------------*/
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
    y = map(y, height, height - defaultPeakMultiplier, height - 1, height - maxMountainHeight);

    //Gradient for the current mountain
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

  if (frameCount % framesToRecord == 0) {
    mountains.unshift(currentMountain);
    mountains = mountains.splice(0, historySize);
    setHorizontalPoints();
  }

  if(debugging) {
    showDebugger();
  }
}

function keyReleased() {
  if (key === ' ') {
    saveCanvas();
  }
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

function showDebugger() {
  stroke('lime');
  strokeWeight(1);
  for (let j = 0; j < centers.length; j++) {
    line(centers[j],0, centers[j], height);
  }

  //Show fps for debugging
  noStroke();
  fill('black');
  text("FPS: " + round(frameRate()), 20, 20);
}