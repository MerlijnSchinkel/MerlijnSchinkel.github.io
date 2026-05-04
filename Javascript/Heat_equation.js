function updateT2D(T, dT, lambda, dx, dy, dt) {
    const Fox = lambda * dt / (dx * dx);
    const Foy = lambda * dt / (dy * dy);

    bc[0] = parseFloat(Tin1.value);
    bc[3] = parseFloat(Tin2.value);
    bc[2] = parseFloat(Tin3.value);
    bc[1] = parseFloat(Tin4.value);

    text1.innerHTML = bc[0];
    text2.innerHTML = bc[3];
    text3.innerHTML = bc[2];
    text4.innerHTML = bc[1];

    for (let i = 0; i < Nx; i++) {
        for (let j = 0; j < Ny; j++) {
            const center = T[idx(i,j)];

            const Tl = (i > 0)    ? T[idx(i-1,j)] : bc[0];
            const Tr = (i < Nx-1) ? T[idx(i+1,j)] : bc[2];
            const Td = (j > 0)    ? T[idx(i,j-1)] : bc[1];
            const Tu = (j < Ny-1) ? T[idx(i,j+1)] : bc[3];

            const lap =
                (Tl - 2*center + Tr) / (dx*dx) +
                (Td - 2*center + Tu) / (dy*dy);

            dT[idx(i,j)] = lambda * dt * lap;
        }
    }

    return dT;
}

function idx(i, j) {
    return j*Nx + i;
}

const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
const rect = canvas.getBoundingClientRect();
const Tin1 = document.getElementById('Tin1');
const Tin2 = document.getElementById('Tin2');
const Tin3 = document.getElementById('Tin3');
const Tin4 = document.getElementById('Tin4');
const text1 = document.getElementById('text1');
const text2 = document.getElementById('text2');
const text3 = document.getElementById('text3');
const text4 = document.getElementById('text4');

let Nx, Ny, dx, dy;
let T, dT;
let image, data;

let cellX = 0;
let cellY = 0;
let mousedown = 0;

let lambda = 1.9e-2;
let dt = 60;
let time = 0;
let bc = [20, 40, 20, 40];

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

    dx = canvas.width/Nx;
    dy = canvas.height/Ny;

    T = new Float32Array(Nx * Ny).fill(20);
    dT = new Float32Array(Nx * Ny);

    offscreen.width = Nx;
    offscreen.height = Ny;

    image = ctx.createImageData(Nx, Ny);
    data = image.data;
}
resize()
window.onresize = resize;


function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const inject = 0.1;
    const rad = 4;

    // --- UPDATE STEP ---
    dT = updateT2D(T, dT, lambda, dx, dy, dt);
    for (let i = 0; i < Nx; i++) {
        for (let j = 0; j < Ny; j++) {
            T[idx(i,j)] += dT[idx(i,j)];
        }
    }

    // --- RENDER STEP ---
    for (let i = 0; i < Nx; i++) {
        for (let j = 0; j < Ny; j++) {
        const k = j*Nx + i;
        const p = 4 * k;

        const val = Math.max(0, Math.min(40, T[idx(i, j)]))/40;
        const r = 255*val;

        data[p] = r;
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
    