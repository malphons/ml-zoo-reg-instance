/* ============================================================
   kNN Regressor — Data & Configuration
   1D nonlinear regression dataset with kNN predictions for
   various k values and neighbor connections for a query point.
   ============================================================ */
(function () {
    'use strict';

    // Seeded pseudo-random number generator
    var seed = 73;
    function pseudoRandom() {
        seed = (seed * 16807 + 0) % 2147483647;
        return (seed - 1) / 2147483646;
    }

    // Generate nonlinear data: y = 2*sin(x) + 0.3*x + noise
    var points = [];
    var N = 30;
    for (var i = 0; i < N; i++) {
        var x = 0.3 + (i / (N - 1)) * 9.4;
        var noise = (pseudoRandom() - 0.5) * 2.0;
        var y = 2 * Math.sin(x) + 0.3 * x + 3 + noise;
        points.push({
            x: Math.round(x * 100) / 100,
            y: Math.round(y * 100) / 100
        });
    }

    // Euclidean distance in 1D
    function dist(a, b) {
        return Math.abs(a - b);
    }

    // kNN prediction for a given x value and k
    function knnPredict(qx, k) {
        // Compute distances and sort
        var indexed = points.map(function (p, idx) {
            return { idx: idx, x: p.x, y: p.y, d: dist(qx, p.x) };
        });
        indexed.sort(function (a, b) { return a.d - b.d; });

        // Take k nearest
        var neighbors = indexed.slice(0, k);
        var sum = 0;
        for (var j = 0; j < neighbors.length; j++) {
            sum += neighbors[j].y;
        }
        return sum / k;
    }

    // Generate prediction curves for different k values
    var kValues = [1, 3, 5, 7, 10, 15];
    var predictionCurves = {};
    var xMin = 0.3, xMax = 9.7;
    var numSteps = 120;

    kValues.forEach(function (k) {
        var curve = [];
        for (var s = 0; s <= numSteps; s++) {
            var xq = xMin + (s / numSteps) * (xMax - xMin);
            var yq = knnPredict(xq, k);
            curve.push({
                x: Math.round(xq * 100) / 100,
                y: Math.round(yq * 100) / 100
            });
        }
        predictionCurves[k] = curve;
    });

    // Default query point
    var defaultQueryX = 5.0;
    var defaultK = 5;

    // Get k nearest neighbors for a query point
    function getNeighbors(qx, k) {
        var indexed = points.map(function (p, idx) {
            return { idx: idx, x: p.x, y: p.y, d: dist(qx, p.x) };
        });
        indexed.sort(function (a, b) { return a.d - b.d; });
        return indexed.slice(0, k);
    }

    // Precompute neighbors for default query
    var defaultNeighbors = getNeighbors(defaultQueryX, defaultK);
    var defaultPrediction = knnPredict(defaultQueryX, defaultK);

    // Compute RMSE for a given k (leave-one-out style estimate)
    function computeRMSE(k) {
        var sse = 0;
        for (var i = 0; i < points.length; i++) {
            // For LOO, predict using all points except i
            var indexed = [];
            for (var j = 0; j < points.length; j++) {
                if (j !== i) {
                    indexed.push({ x: points[j].x, y: points[j].y, d: dist(points[i].x, points[j].x) });
                }
            }
            indexed.sort(function (a, b) { return a.d - b.d; });
            var neighbors = indexed.slice(0, k);
            var pred = 0;
            for (var m = 0; m < neighbors.length; m++) {
                pred += neighbors[m].y;
            }
            pred /= k;
            sse += Math.pow(points[i].y - pred, 2);
        }
        return Math.sqrt(sse / points.length);
    }

    window.MLZoo = window.MLZoo || {};
    window.MLZoo.modelData = {
        config: {
            width: 800,
            height: 380,
            xDomain: [0, 10],
            yDomain: [0, 10],
            accentColor: '#f778ba',
            xLabel: 'Feature (x)',
            yLabel: 'Target (y)'
        },
        points: points,
        kValues: kValues,
        predictionCurves: predictionCurves,
        defaultK: defaultK,
        defaultQueryX: defaultQueryX,
        defaultQueryY: defaultPrediction,
        defaultNeighbors: defaultNeighbors,
        getNeighbors: getNeighbors,
        knnPredict: knnPredict,
        computeRMSE: computeRMSE,
        stats: {
            n: N,
            rmse_k5: Math.round(computeRMSE(5) * 1000) / 1000
        }
    };
})();
