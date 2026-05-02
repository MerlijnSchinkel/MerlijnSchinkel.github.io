function makeArr(startValue, stopValue, cardinality) {
    var arr = [];
    var step = (stopValue - startValue) / (cardinality - 1);
    for (var i = 0; i < cardinality; i++) {
        arr.push(startValue + (step * i));
    }
    return arr;
};


function discretizeSlab(model) {
    // Obtain variables from model
    var { x_f, x_c, Nx, dx, Nc } = model.grid;
    var { Lx, A, V } = model.geometry;
    const Ly = 1;

    // Calculate cell dimensions
    dx = Lx / Nx;
    x_f = makeArr(0, Lx, Nx+1);
    x_c = math.dotDivide(math.add(x_f.slice(0, -1), x_f.slice(1)), 2);

    // Calculate area and volume
    A = math.multiply(Lx*Ly, Array(Nx+1).fill(1));
    V = math.multiply(Lx*Ly*dx, Array(Nx).fill(1));
    
    // Add results to model variables
    model.grid = { x_f, x_c, Nx, dx, Nc };
    model.geometry = { Lx, A, V };
};


function jacobianTridiag(model) {
    const {v, D} = model.physics;
    const {A, V} = model.geometry;
    const {Nx, dx} = model.grid;
    const {dt} = model.time;

    const a = new Float32Array(Nx); // Lower
    const b = new Float32Array(Nx); // Main
    const c = new Float32Array(Nx); // Upper

    // First cell
    b[0] = 1/dt + v*A[1]/V[0] + (D*A[1]+2*D*A[0])/(dx*V[0]);
    c[0] = -D/dx * A[1]/V[0];

    // Interior cells
    for (let i = 1; i < Nx-1; i++) {
        a[i] = -v*A[i]/V[i] - D/dx * A[i]/V[i];
        b[i] = 1/dt + v*A[i+1]/V[i] + (D*A[i]+D*A[i+1])/(dx*V[i]);
        c[i] = -D/dx * A[i+1]/V[i];
    }

    // Last cell
    a[Nx-1] = -v*A[Nx-2]/V[Nx-1] - D/dx * A[Nx-2]/V[Nx-1];
    b[Nx-1] = 1/dt + v*A[Nx-1]/V[Nx-1] + D/dx * A[Nx-2]/V[Nx-1];

    model.solver.jactri = {a, b, c};
};


function jacobian(model) {
    // Obtain variables from model
    const {v, D, k, n} = model.physics;
    const {Lx, A, V} = model.geometry;
    const {x_f, x_c, Nx, dx, Nc} = model.grid;
    const {dt} = model.time;
    var {jac, res, jac_react} = model.solver;

    // Assign jacobian
    jac = Array.from({ length: Nx*Nc }, () => Array(Nx*Nc).fill(0));

    // First cell
    jac[0][0] = 1/dt + v*A[1]/V[0] + (D*A[1]+2*D*A[0]) / (dx*V[0]);
    jac[0][1] = -D/dx * A[1]/V[0];
    
    // Interior cells
    for (let i = 1; i < Nx-1; i++) {
        jac[i][i-1] = -v*A[i]/V[i] - D/dx * A[i]/V[i];
        jac[i][i] = 1/dt + v*A[i+1]/V[i] + (D*A[i]+D*A[i+1]) / (dx*V[i]);
        jac[i][i+1] = -D/dx * A[i+1]/V[i];
    };

    // Last cell
    jac[Nx-1][Nx-2] = -v*A[Nx-2]/V[Nx-1] - D/dx * A[Nx-2]/V[Nx-1];
    jac[Nx-1][Nx-1] = 1/dt + v*A[Nx-1]/V[Nx-1] + D/dx * A[Nx-2]/V[Nx-1];

    // Return values to model
    model.solver.jac = jac;
};


function residual(model) {
    // Obtain variables from model
    const {v, D, k, n} = model.physics;
    const {Lx, A, V} = model.geometry;
    const {x_f, x_c, Nx, dx, Nc} = model.grid;
    const {C, C_old, C_in} = model.concentration;
    const {dt} = model.time;
    var {jac, res, jac_react} = model.solver;

    // Assign residual
    res = Array(Nx*Nc).fill(0);

    // First cell
    res[0] = (C[0]-C_old[0])/dt + (v*C[0]*A[1] - v*C_in*A[0])/V[0] - 
    (D/dx*(C[1]-C[0])*A[1] - 2*D/dx*(C[0]-C_in)*A[0])/V[0] + k*C[0]**n;

    // Interior cells
    for (let i = 1; i < Nx-1; i++) {
        res[i] = (C[i]-C_old[i])/dt + (v*C[i]*A[i+1] - v*C[i-1]*A[i])/V[i] - 
        (D/dx*(C[i+1]-C[i])*A[i+1] - D/dx*(C[i]-C[i-1])*A[i])/V[i] + k*C[i]**n;
    };

    // Last cell
    res[Nx-1] = (C[Nx-1]-C_old[Nx-1])/dt + (v*C[Nx-1]*A[Nx-1] - v*C[Nx-2]*A[Nx-2])/V[Nx-1] + 
    D/dx*(C[Nx-1]-C[Nx-2])*A[Nx-2]/V[Nx-1] + k*C[Nx-1]**n;
    
    // Return values to model
    model.solver.res = res;
};


function kinetics(model) {
    const Nx = model.grid.Nx;
    const Nc = model.grid.Nc;
    var jac_react = model.solver.jac_react;
    var C = model.concentration.C;
    var k = model.physics.k;
    var n = model.physics.n;

    // Fill jac_react
    jac_react = Array.from({ length: Nx*Nc }, () => Array(Nx*Nc).fill(0));

    for (let i = 0; i < model.grid.Nx; i++) {
        jac_react[i][i] = -k*n * C[i]**n;
    };
    model.solver.jac_react = jac_react;
};


function newtonStep(model, tol=1e-6, max_it=10) {
    let {C, C_old, C_in} = model.concentration;
    const k = model.physics.k;
    const n = model.physics.n;
    
    C_old = C.slice();

    var it = 0;
    var error_x = 2*tol;
    var error_f = 2*tol;

    while ((error_x > tol || error_f > tol) && (it < max_it)) {
        model.concentration.C = C;

        // Calculate residual
        residual(model);
        let res = model.solver.res;

        // Make RHS negative
        const resneg = res.map(x => -x);
        
        const {a, b, c} = model.solver.jactri;

        // copy b because we modify it
        const bb = Float32Array.from(b);

        // add reaction
        for (let i = 0; i < bb.length; i++) {
            bb[i] += k*n * Math.pow(C[i], n-1);
        }

        // solve
        const dd = Float32Array.from(resneg);
        const dC = solveTridiagonal(a, bb, c, dd);

        // // Combine reaction jac and jac
        // const jacsolve = math.add(jac, jac_react);

        // // Solve system and flatten result
        // const dC = math.lusolve(jacsolve, resneg).map(row => row[0]);

        // Update solution
        C = C.map((val, i) => val + dC[i]);

        // Errors
        error_x = Math.max(...dC.map(x => Math.abs(x)));
        error_f = Math.max(...res.map(x => Math.abs(x)));
        it++;
    };
    model.concentration = {C, C_old, C_in};
};


function solveTridiagonal(a, b, c, d) {
    const n = d.length;

    // forward sweep
    for (let i = 1; i < n; i++) {
        const m = a[i] / b[i-1];
        b[i] -= m * c[i-1];
        d[i] -= m * d[i-1];
    }

    // back substitution
    const x = new Float32Array(n);
    x[n-1] = d[n-1] / b[n-1];

    for (let i = n-2; i >= 0; i--) {
        x[i] = (d[i] - c[i]*x[i+1]) / b[i];
    }

    return x;
}


function updateConc2DDiff(C, D, Nx, Ny, dx, dy, dt) {
    
    for (let i = 1; i < Nx-2; i++) {
        for (let j = 1; j < Ny-2; j++) {

        }
    }
}
