const marginX =5 ;
const marginY = 5;

let forceField;
let movers;
let moverIndex = 0;

function setup() {
  //noiseSeed(0);
  //randomSeed(0);

  const canvas = createCanvas(windowWidth, windowHeight);
	canvas.style.touchAction = 'none';
  pixelDensity(2);
  frameRate(60);
  colorMode(HSB, 100, 240, 100, 360);

  const baseFlow = p5.Vector.fromAngle(random(TWO_PI)).mult(random(0.1, 0.6));
  forceField = new Array(width * height).fill().map((_) => [baseFlow.x, baseFlow.y]);
  
  const minSideLen = min(width,height);
  
  const seed = random(970);
  for (let kk = 5; kk--; ) {
    randomSeed(seed);
    
    // Add circular flow
    for (let t = 10; t--; ) {
      const dir = p5.Vector.fromAngle(random(TWO_PI));
      dir.mult(random(1)**2*minSideLen * 0.7+ minSideLen * 0.2);
      addCircularFlowField(
        random(1) ** 10 * minSideLen*2 + minSideLen*0.5,
        width / 3 + dir.x,
        height / 3 + dir.y,
        (random(1) > 0.5));
    }
    
    // limit forces to magnitude of 1
    forceField = forceField.map(([fx, fy]) => {
      const d = sqrt(fx ** 2 + fy ** 2);
      return [d > 1 ? fx / d : fx, d > 1 ? fy / d : fy];
    });

    // Relax flow field
    forceField = relaxFlowField(forceField);
  }
  
  // Do some extra relaxation
  forceField = relaxFlowField(forceField,3);

  movers = [];

  background(0);
}

function draw() {
  const coordScale = 0.0005;
  let moveScale = 0.5;
  const moveLimit = 2;
  const forceScale = -0.12;

  if (pmouseX == mouseX || pmouseY == mouseY && movers.length < 5000) {
    for (let t = 5; t--; ) {
      const x = mouseX + random(-1, 1) * 20;
      const y = mouseY + random(-1, 1) * 20;
      movers.unshift(createParticle(x, y));
    }
  }

  let maxWhile = 1;

  maxWhile = 100;
  while (movers.length && movers[movers.length - 1][PARTICLE_INDEX.life] > movers[movers.length - 1][PARTICLE_INDEX.maxLife] && maxWhile-- > 0) {
    movers.pop();
  }

  movers = movers.map((mover) => {
    const [x, y, vx, vy, huu, i, radius, life, maxLife] = mover;

    if (life > maxLife) {
      return mover;
    }

    const t = life / maxLife;

    const glow = i % 41 === 0;

    const fadeIn = constrain(map(t, 0, 0.1, 0, 1), 0, 1);
    const fadeOut = constrain(map(t, 0.1, 1, 1, 0), 0, 1);

    strokeWeight(radius * fadeIn * fadeOut);
    moveScale = 0.5;
    const forceFieldIndex = (x | 0) + (y | 0) * width;
    let [fx, fy] = forceField[forceFieldIndex] || [1, 0];
    if (x < 0 || x > width || y < 0 || y > height) {
      fx = 1;
      fy = 0;
    }
    const _huu = abs(createVector(fx, fy).heading());
    const vel = createVector(fx * moveScale, fy * moveScale)
      .limit(moveLimit)
      .mult(5)
      .mult(i % 2 === 0 ? -1 : 1);
    if (
      x > marginX &&
      x < width - marginX &&
      y > marginY &&
      y < height - marginY
    ) {
      const huuhuu = i % 11 === 0 ? 0 : 1;
      stroke(
        (huu * 30 + 30 + huuhuu * 150 + frameCount / 100) % 360,
        glow ? 20 : (90 + ((i * 777.77) % 50)) * (1 - huu) ** 2,
        glow ? 100 : (120 - ((i * 333) % 70)) * (1 - huu * 0.85) - _huu * 20
      );
      line(x, y, x + vel.x, y + vel.y);
    }

    return createParticle(
      x + vel.x,
      y + vel.y,
      vx * 0.75 + fx * forceScale,
      vy * 0.75 + fy * forceScale,
      huu,
      i,
      radius,
      life + 1,
      maxLife
    );
  });
}

const PARTICLE_INDEX = [
  'x',
  'y',
  'vx',
  'vy',
  'groupId',
  'id',
  'radius',
  'life',
  'maxLife',
].reduce((key, index, obj) => (obj[key] = index), {});

function createParticle(x, y, vx, vy, groupId, id, radius, life, maxLife) {
  return [
    x, // x
    y, // y
    vx || 0, // velocity x
    vy || 0, // velocity y
    groupId === undefined ? random(2) | 0 : groupId, // group identifier
    id === undefined ? moverIndex++ : id, // identifier (running number)
    radius === undefined ? random(1, 5) : radius, // size
    life === undefined ? 0 : life, // life
    maxLife === undefined ? random(60, 320) : maxLife, // Time to live
  ];
}

function addCircularFlowField(radius, x, y, dir = 1) {
  const cr = radius;
  const cOffX = floor(x);
  const cOffY = floor(y);
  for (let cy = 0; cy < cr * 2; cy++) {
    for (let cx = 0; cx < cr * 2; cx++) {
      const centeredX = cx - cr;
      const centeredY = cy - cr;
      const offnx = (cOffX + centeredX) | 0;
      const offny = (cOffY + centeredY) | 0;
      if (offnx > 0 && offnx < width && offny > 0 && offny < height) {
        const sqrtD = centeredX ** 2 + centeredY ** 2;
        if (sqrtD < cr ** 2) {
          const d = sqrt(sqrtD);
          const dt = d / cr;
          const nx = centeredX / d;
          const ny = centeredY / d;
          const forceFieldIndex = offnx + offny * width;
          if (forceFieldIndex >= 0 && forceFieldIndex < forceField.length) {
            const [fx, fy] = forceField[forceFieldIndex];
            const nfx = fx - ny * (1 - dt) * dir;
            const nfy = fy + nx * (1 - dt) * dir;
            //const nfd = 1 - (1 - sqrt(nfx ** 2 + nfy ** 2)) ** 100;
            forceField[forceFieldIndex] = [nfx, nfy];
          }
        }
      }
    }
  }
}

function relaxFlowField(flowField, times=1){
  let _flowField = flowField;
  for(let t=times; t--;){
    _flowField = _flowField.map(([fx, fy], index) => {
        const x = index % width;
        const y = floor(index / width);
        if (y === 0 || y === height - 1 || x === 0 || x === width + 1) {
          return [fx, fy];
        }
        const up = forceField[index - width];
        const right = forceField[index + 1];
        const down = forceField[index + width];
        const left = forceField[index - 1];

        const newForce = createVector(
          fx * 0.5 +
            up[0] * 0.100 +
            right[0] * 0.100 +
            down[0] * 0.100 +
            left[0] * 0.100,
          fy * 0.5 +
            up[1] * 0.125 +
            right[1] * 0.125 +
            down[1] * 0.125 +
            left[1] * 0.125
        ).normalize();
       return [newForce.x, newForce.y];
    });
  }
  return _flowField;                             
}

function keyPressed(){
  save("img_" + month() + '-' + day() + '_' + hour() + '-' + minute() + '-' + second() + ".jpg");
}