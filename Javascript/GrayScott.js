let U, V, dU, dV;
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
const rect = canvas.getBoundingClientRect();

const FInput = document.getElementById('FInput');
const kInput = document.getElementById('kInput');

function bindSlider(id, scale = 1000) {
  const input = document.getElementById(id + "Input");
  const label = document.getElementById(id + "Val");

  function update() {
    const val = input.value / scale;
    label.textContent = val.toFixed(3);
    return val;
  }

  input.addEventListener("input", update);
  update();

  return () => input.value / scale;
}

// usage
const getF  = bindSlider("F", 1000);
const getk  = bindSlider("k", 1000);


let Nx, Ny;
let C, dC;
let image, data;

let cellX = 0;
let cellY = 0;
let mousedown = 0;

const offscreen = document.createElement('canvas');
offscreen.width = Nx;
offscreen.height = Ny;
const offctx = offscreen.getContext('2d');


function idx(i, j) {
    return i * Ny + j;
}

function updateRD() {
  const Du = 0.2;
  const Dv = 0.1;
  const F = getF();
  const k = getk();

  for (let i = 0; i < Nx; i++) {
    for (let j = 0; j < Ny; j++) {

      const id = idx(i, j);

      const u = U[id];
      const v = V[id];

      const left  = (i > 0) ? idx(i-1, j) : id;
      const right = (i < Nx-1) ? idx(i+1, j) : id;
      const down  = (j > 0) ? idx(i, j-1) : id;
      const up    = (j < Ny-1) ? idx(i, j+1) : id;

      const lapU =
        U[left] + U[right] + U[up] + U[down] - 4*u;

      const lapV =
        V[left] + V[right] + V[up] + V[down] - 4*v;

      const uvv = u * v * v;

      dU[id] = Du * lapU - uvv + F * (1 - u);
      dV[id] = Dv * lapV + uvv - (F + k) * v;
    }
  }

  // apply updates
  for (let i = 0; i < Nx * Ny; i++) {
    U[i] += dU[i];
    V[i] += dV[i];
  }
}

function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    Nx = Math.floor(canvas.width / 2);
    Ny = Math.floor(canvas.height / 2);

    U = new Float32Array(Nx * Ny);
    V = new Float32Array(Nx * Ny);
    dU = new Float32Array(Nx * Ny);
    dV = new Float32Array(Nx * Ny);

    // initial condition
    for (let i = 0; i < Nx * Ny; i++) {
        U[i] = 1.0;
        V[i] = Math.random() * 0.1;
    }

    offscreen.width = Nx;
    offscreen.height = Ny;

    image = ctx.createImageData(Nx, Ny);
    data = image.data;
}
resize();
window.onresize = resize;

canvas.addEventListener('mousemove', function (event) {
    const rect = canvas.getBoundingClientRect();
    const widthFactor = window.innerWidth/rect.width;
    const heightFactor = window.innerHeight/rect.height;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    cellX = Math.round(x / rect.width * Nx);
    cellY = Math.round(y / rect.height * Ny);
});


canvas.addEventListener('mousedown', function (event) {
    mousedown = 1;
});
canvas.addEventListener('mouseup', function (event) {
    mousedown = 0;
});

function draw() {
    for (let i = 0; i < 5; i++) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const inject = 0.1;
      const rad = 4;

      if (mousedown) {
          const r = 4;

          for (let i = -r; i <= r; i++) {
              for (let j = -r; j <= r; j++) {
                  const x = cellX + i;
                  const y = cellY + j;

                  if (x > 0 && x < Nx-1 && y > 0 && y < Ny-1) {
                      V[idx(x, y)] += 0.2;
                      U[idx(x, y)] -= 0.05;

                      V[idx(x, y)] = Math.max(0, Math.min(1, V[idx(x, y)]));
                      U[idx(x, y)] = Math.max(0, Math.min(1, U[idx(x, y)]));
                  }
              }
          }
      }

      // --- UPDATE STEP ---
      updateRD();

      // --- RENDER STEP ---
      for (let i = 0; i < Nx; i++) {
          for (let j = 0; j < Ny; j++) {
          const k = j * Nx + i;
          const p = 4 * k;

          const r = 255 * V[idx(i,j)] * 2;
          const b = 255 * U[idx(i,j)];

          data[p] = r;
          data[p + 1] = 40;
          data[p + 2] = b;
          data[p + 3] = 255;
          }
      }

      // Draw once
      offctx.putImageData(image, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(draw);
}
draw();