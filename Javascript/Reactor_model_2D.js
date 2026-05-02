let Nx, Ny, Lx, Ly;


function idx(i, j) {
    return i + j*Nx;
}

function updateStatevar(model) {
    // Obtain variables
    const { Nx, Ny, dx, dy, Lx, Ly } = model.geometry;
    var { v, kr, n, D } = model.physics;
    var { dt } = model.time;
    var { U, dU, U_in} = model.stateVariable;
    
    v_max = getvel();
    var v = new Float32Array(Ny).fill(0);
    for (let i = 0; i < Ny; i++) {
        v[i] = v_max*(1-Math.pow((i-Math.floor(Ny/2))/(Math.floor(Ny/2)), 2));
    }
    D = [getdiff(), getdiff()];
    kr = getkr();

    // Update state-variable
    dU.fill(0);
    for (let i = 0; i < Nx; i++) {
        for (let j = 0; j < Ny; j++) {
            // Axial
            if (i == 0) {
                dU[idx(i,j)] += -v[j]*dt/dx * (U[idx(i,j)] - U_in) - 
                kr*dt*U[idx(i,j)] +
                D[0]*dt/Math.pow(dx, 2) * (U[idx(i+1,j)] - 3*U[idx(i,j)] + U_in);
            }
            else if (i == Nx-1) {
                dU[idx(i,j)] += -v[j]*dt/dx * (U[idx(i,j)] - U[idx(i-1,j)]) - 
                kr*dt*U[idx(i,j)] + 
                D[0]*dt/Math.pow(dx, 2) * (-U[idx(i,j)] + U[idx(i-1,j)]);
            }
            else {
                dU[idx(i,j)] += -v[j]*dt/dx * (U[idx(i,j)] - U[idx(i-1,j)]) - 
                kr*dt*U[idx(i,j)] + 
                D[0]*dt/Math.pow(dx, 2) * (U[idx(i+1,j)] - 2*U[idx(i,j)] + U[idx(i-1,j)]);
            }
            
            // Radial
            if (j == 0) {
                dU[idx(i,j)] += D[1]*dt/Math.pow(dy, 2) * (U[idx(i,j+1)] - U[idx(i,j)]);
            }
            else if (j == Ny-1) {
                dU[idx(i,j)] += D[1]*dt/Math.pow(dy, 2) * (-U[idx(i,j)] + U[idx(i,j-1)]);
            }
            else {
                dU[idx(i,j)] += D[1]*dt/Math.pow(dy, 2) * (U[idx(i,j+1)] - 2*U[idx(i,j)] + U[idx(i,j-1)]);
            }
        }
    }

    return dU
}

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
function binddiffSlider(id) {
  const input = document.getElementById(id + "Input");
  const label = document.getElementById(id + "Val");

  function update() {
    var val = 0;
    if (input.value != 0) {
        val = Math.pow(10, input.value-9);
        label.textContent = `1e${input.value-9}`;
    }
    else {
        label.textContent = `0`;
    }
    return val;
  }

  input.addEventListener("input", update);
  update();

  return () => Math.pow(10, input.value-9);
}

// usage
const getvel  = bindSlider("vel", 100);
const getdiff  = binddiffSlider("diff");
const getkr  = bindSlider("kr", 100);


window.onload = function () {
    // Obtain canvas and context
    const canvas = document.getElementById('myCanvas');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    let image, data;
    let cellX = 0;
    let cellY = 0;
    let mousedown = 0;

    const offscreen = document.createElement('canvas');
    offscreen.width = Nx;
    offscreen.height = Ny;
    const offctx = offscreen.getContext('2d');


    // Resize window if necessary
    function resize() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        Lx = 10;
        Ly = 10*canvas.height/canvas.width;
        Nx = Math.floor(canvas.width / 2);
        Ny = Math.floor(canvas.height / 2);

        U = new Float32Array(Nx * Ny).fill(0);
        dU = new Float32Array(Nx * Ny).fill(0);

        offscreen.width = Nx;
        offscreen.height = Ny;

        image = ctx.createImageData(Nx, Ny);
        data = image.data;
    }
    resize();
    window.onresize = resize;


    // DEFINE VARIABLES
    // Geometry
    const dx = Lx/Nx;
    const dy = Ly/Ny;
    const dt = 1e-2;

    // Physics
    const v_max = 0.5;
    var v = new Float32Array(Ny).fill(0);
    for (let i = 0; i < Ny; i++) {
        v[i] = v_max*(1-Math.pow((i-Math.floor(Ny/2))/(Math.floor(Ny/2)), 2));
    }

    const D = [1e-6, 1e-6];
    const kr = 0.5;
    const n = 2;

    // State variables
    var U_in = 1;

    // Add variables to model
    var model = {
        geometry: { Nx, Ny, dx, dy, Lx, Ly },
        physics: { v, kr, n, D },
        time: { dt },
        stateVariable: { U, dU, U_in }
    };

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // --- UPDATE STEP ---
        dU = updateStatevar(model);
        for (let i = 0; i < Nx; i++) {
            for (let j = 0; j < Ny; j++) {
                U[idx(i, j)] += dU[idx(i, j)];
            }
        }

        // --- RENDER STEP ---
        for (let i = 0; i < Nx; i++) {
            for (let j = 0; j < Ny; j++) {
            const k = j * Nx + i;
            const p = 4 * k;

            const val = Math.max(0, Math.min(1, U[idx(i, j)]));
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
}
