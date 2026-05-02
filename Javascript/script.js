window.onload = function () {
    const h1 = document.getElementById('title');
    
    // Obtain canvas and context
    const canvas = document.getElementById('myCanvas');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    // Resize window if necessary
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.onresize = resize;

    
    // Define variables
    const Nx = 1000;
    const Nc = 1;
    const Lx = 10;
    const dt = 0.2;
    const v = 1e-2;
    const D = 1e-4;
    const k = 4e-2;
    const n = 2;
    var x_f, x_c, dx, A, V, jac, res, jac_react, jactri;
    var C = Array(Nc*Nx).fill(0);
    var C_old = C;
    var C_in = 1;

    var model = {
        grid: { x_f, x_c, Nx, dx, Nc },
        physics: { v, D, k, n },
        geometry: { Lx, A, V },
        time: { dt },
        concentration: { C, C_old, C_in },
        solver: { jac, res, jac_react, jactri }
    };

    let cell = 0;
    let mousedown = 0;

    // Track mouse movements
    canvas.addEventListener('mousemove', function (event) {
        const rect = canvas.getBoundingClientRect();
        const widthFactor = window.innerWidth/rect.width;
        const heightFactor = window.innerHeight/rect.height;

        const x = (event.clientX - rect.left)*2;
        const y = (canvas.height - event.clientY)*2;
        
        cell = Math.round(0.5 * y / rect.height * Nx);
    });

    // Track mouse click down
    canvas.addEventListener('mousedown', function (event) {
        mousedown = 1;
    });

    // Track mouse click up
    canvas.addEventListener('mouseup', function (event) {
        mousedown = 0;
    });


    // START MODEL
    // Calculate dimensions and jacobian
    discretizeSlab(model);
    jacobianTridiag(model);

    // Draw results and calculate model again
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (mousedown == 1) {
            if (cell > 1 && cell < Nx - 2) {
                model.concentration.C[cell-2] = 1;
                model.concentration.C[cell-1] = 1;
                model.concentration.C[cell] = 1;
                model.concentration.C[cell+1] = 1;
                model.concentration.C[cell+2] = 1;
            };
        };
        newtonStep(model);

        var {C, C_old, C_in} = model.concentration;
        const scale = canvas.height / Nx;

        let prevY = canvas.height;

        for (let i = 0; i < Nx; i++) {
            const nextY = canvas.height - Math.round((i + 1) * scale);
            const height = nextY - prevY;

            const r = Math.max(0, Math.min(1, C[i]));
            ctx.fillStyle = `rgba(40,0,255,${r})`;

            ctx.fillRect(0, prevY, canvas.width, height);

            prevY = nextY;
        };
        requestAnimationFrame(draw);
    };
    draw();
};
