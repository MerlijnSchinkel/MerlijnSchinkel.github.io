function updateConc2D(dC, D, dx, dy, dt) {
    dC.fill(0);
    const Fox = D*dt/Math.pow(dx, 2);
    const Foy = D*dt/Math.pow(dy, 2);
    console.log(Fox, Foy);

    for (let i = 0; i < Nx; i++) {
        for (let j = 0; j < Ny; j++) {

        const center = C[idx(i, j)];

        const left  = (i > 0)     ? C[idx(i-1, j)] : center;
        const right = (i < Nx-1)  ? C[idx(i+1, j)] : center;
        const down  = (j > 0)     ? C[idx(i, j-1)] : center;
        const up    = (j < Ny-1)  ? C[idx(i, j+1)] : center;

        dC[idx(i, j)] =
            Fox * (right - 2*center + left) +
            Foy * (up - 2*center + down);
        }
    }
    return dC
}

function idx(i, j) {
    return i * Ny + j;
}

const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
const rect = canvas.getBoundingClientRect();

let Nx, Ny;
let C, dC;
let image, data;

let cellX = 0;
let cellY = 0;
let mousedown = 0;

let D = 1;
let dt = 0.25;
const d = 1;

const offscreen = document.createElement('canvas');
offscreen.width = Nx;
offscreen.height = Ny;
const offctx = offscreen.getContext('2d');

// Resize window if necessary
function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    Nx = Math.floor(canvas.width / 4);
    Ny = Math.floor(canvas.height / 4);

    C = new Float32Array(Nx * Ny);
    dC = new Float32Array(Nx * Ny);

    offscreen.width = Nx;
    offscreen.height = Ny;

    image = ctx.createImageData(Nx, Ny);
    data = image.data;
}
resize()
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const inject = 0.1;
    const rad = 4;

    if (mousedown == 1) {
        for (let i = -rad; i <= rad; i++) {
            for (let j = -rad; j <= rad; j++) {
                const x = cellX + i;
                const y = cellY + j;

                if (x > 0 && x < Nx - 1 && y > 0 && y < Ny - 1) {
                    C[idx(x, y)] += inject;
                }
            }
        }
    }

    // --- UPDATE STEP ---
    dC = updateConc2D(dC, D, d, d, dt);
    for (let i = 1; i < Nx - 1; i++) {
        for (let j = 1; j < Ny - 1; j++) {
        C[idx(i, j)] += dC[idx(i, j)];
        }
    }

    // --- RENDER STEP ---
    for (let i = 0; i < Nx; i++) {
        for (let j = 0; j < Ny; j++) {
        const k = j * Nx + i;
        const p = 4 * k;

        const val = Math.max(0, Math.min(1, C[idx(i, j)]));
        const r = 255 * val;

        data[p] = 40 + (r / 255 * 215);
        data[p + 1] = 0;
        data[p + 2] = 255 - r;
        data[p + 3] = 255;
        }
    }

    // Draw once
    offctx.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);

    requestAnimationFrame(draw);
}
draw();
    