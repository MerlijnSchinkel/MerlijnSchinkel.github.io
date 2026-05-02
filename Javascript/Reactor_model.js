function updateStatevar(model) {
    // Obtain variables
    const { N, Nc, dx, L } = model.geometry;
    var { v, k, n, dHr, Cp } = model.physics;
    var { dt } = model.time;
    var { U, dU, U_in} = model.stateVariable;

    v = getvel();
    U_in[Nc-1] = getTin();

    // Calculate Courant number
    const Co = v*dt/dx;
    if (Co != 0.5) {
        dt = 0.5*dx/v
        model.time.dt = dt;
    }

    // Update state-variable
    dU[0] = -2*v*dt/dx * (U[0] - U_in[0]) - k[0]*dt*Math.pow(U[0], n[0]);
    dU[N] = -2*v*dt/dx * (U[N] - U_in[1]) + k[0]*dt*Math.pow(U[0], n[0]) - k[1]*dt*Math.pow(U[N], n[1]);
    dU[2*N] = -2*v*dt/dx * (U[2*N] - U_in[2]) + k[1]*dt*Math.pow(U[N], n[1]);
    dU[3*N] = -2*v*dt/dx * (U[3*N] - U_in[3]) + k[0]*dt*Math.pow(U[0], n[0])*dHr[0]/(1000*Cp) - k[1]*dt*Math.pow(U[N], n[1])*dHr[1]/(1000*Cp);
    for (let i = 1; i < N-1; i++) {
        dU[i] = -v*dt/dx * (U[i] - U[i-1]) - k[0]*dt*Math.pow(U[i], n[0]);
        dU[i+N] = -v*dt/dx * (U[i+N] - U[i-1+N]) + k[0]*dt*Math.pow(U[i], n[0]) - k[1]*dt*Math.pow(U[i+N], n[1]);
        dU[i+2*N] = -v*dt/dx * (U[i+2*N] - U[i-1+2*N]) + k[1]*dt*Math.pow(U[i+N], n[1]);
        dU[i+3*N] = -v*dt/dx * (U[i+3*N] - U[i-1+3*N]) + k[0]*dt*Math.pow(U[i], n[0])*dHr[0]/(1000*Cp) - k[1]*dt*Math.pow(U[i+N], n[1])*dHr[1]/(1000*Cp);
    }
    dU[N-1] = -v*dt/dx * (U[N-1] - U[N-2]) - k[0]*dt*Math.pow(U[N-1], n[0]);
    dU[2*N-1] = -v*dt/dx * (U[2*N-1] - U[2*N-2]) + k[0]*dt*Math.pow(U[N-1], n[0]) - k[1]*dt*Math.pow(U[2*N-1], n[1]);
    dU[3*N-1] = -v*dt/dx * (U[3*N-1] - U[3*N-2]) + k[1]*dt*Math.pow(U[2*N-1], n[1]);
    dU[4*N-1] = -v*dt/dx * (U[4*N-1] - U[4*N-2]) + k[0]*dt*Math.pow(U[N-1], n[0])*dHr[0]/(1000*Cp) - k[1]*dt*Math.pow(U[2*N-1], n[1])*dHr[1]/(1000*Cp);

    U = U.map((val, i) => val + dU[i]);
    model.stateVariable.U = U;
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
// usage
const getvel  = bindSlider("vel", 1000);
const getTin  = bindSlider("temp", 1);



window.onload = function () {
    // Obtain canvas and context
    const canvas = document.getElementById('myCanvas');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    const Tcanvas = document.getElementById('tempCanvas');
    const Tctx = Tcanvas.getContext('2d');
    const Trect = Tcanvas.getBoundingClientRect();

    // Resize window if necessary
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        Tcanvas.width = window.innerWidth;
        Tcanvas.height = window.innerHeight;
    }
    resize();
    window.onresize = resize;


    // DEFINE VARIABLES
    // Geometry
    const N = 1000;
    const Nc = 4;
    const L = 10;
    const dx = L/N;
    var dt = 0.2;

    // Physics
    var v = 1e-2;
    var k = [1e-2, 1e-3];
    var n = [2, 1];
    var dHr = [1e9, -1e9];
    var Cp = 4.18e3;
    
    // State variables
    var U = new Float32Array(Nc*N).fill(0);
    var dU = new Float32Array(Nc*N).fill(0)
    var U_in = [1, 0, 0, 293];

    // Add variables to model
    var model = {
        geometry: { N, Nc, dx, L },
        physics: { v, k, n, dHr, Cp },
        time: { dt },
        stateVariable: { U, dU, U_in }
    };


    // Draw results and update state variable again
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        Tctx.clearRect(0, 0, Tcanvas.width, Tcanvas.height);
        updateStatevar(model);

        var {U, U_old, U_in} = model.stateVariable;
        const scale = canvas.width / N;
        const Tscale = Tcanvas.width / N;

        let prevX = 0;
        let TprevX = 0;

        for (let i = 0; i < N; i++) {
            const nextX = Math.round((i + 1) * scale);
            const TnextX = Math.round((i + 1) * Tscale);

            const width = nextX - prevX;
            const Twidth = TnextX - TprevX;

            const b = 255*Math.max(0, Math.min(1, U[i]));
            const r = 255*Math.max(0, Math.min(1, U[i+N]));
            const g = 255*Math.max(0, Math.min(1, U[i+2*N]));
            const T = Math.max(0, Math.min(255, U[i+3*N]-273.15));

            console.log(T);

            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(prevX, 0, width, canvas.height);

            Tctx.fillStyle = `rgb(${T},0,${255-T})`;
            Tctx.fillRect(TprevX, 0, Twidth, Tcanvas.height);

            prevX = nextX;
            TprevX = TnextX;
        };
        requestAnimationFrame(draw);
    };
    draw();
}
