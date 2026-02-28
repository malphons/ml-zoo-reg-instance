/* ============================================================
   Radius Neighbors Regressor — Data & Configuration
   Regression data with varying density, radius-based predictions,
   and radius circle visualization data.
   ============================================================ */
(function () {
    'use strict';

    // Seeded pseudo-random number generator
    var seed = 99;
    function pseudoRandom() {
        seed = (seed * 16807 + 0) % 2147483647;
        return (seed - 1) / 2147483646;
    }

    // Generate data with varying density
    // Dense cluster at low x, sparser at high x
    var points = [];
    var N = 35;

    // Dense region: x in [0.5, 4] — about 20 points
    for (var i = 0; i < 20; i++) {
        var x = 0.5 + (i / 19) * 3.5;
        var noise = (pseudoRandom() - 0.5) * 1.6;
        var y = 1.5 * Math.sin(x * 1.2) + 0.4 * x + 2.5 + noise;
        points.push({
            x: Math.round(x * 100) / 100,
            y: Math.round(y * 100) / 100
        });
    }

    // Sparse region: x in [5, 9.5] — about 15 points
    for (var j = 0; j < 15; j++) {
        var x2 = 5 + (j / 14) * 4.5;
        var noise2 = (pseudoRandom() - 0.5) * 2.0;
        var y2 = 1.5 * Math.sin(x2 * 1.2) + 0.4 * x2 + 2.5 + noise2;
        points.push({
            x: Math.round(x2 * 100) / 100,
            y: Math.round(y2 * 100) / 100
        });
    }

    // Sort by x for curve generation
    points.sort(function (a, b) { return a.x - b.x; });

    // Euclidean distance in 1D
    function dist(a, b) {
        return Math.abs(a - b);
    }

    // Radius-based prediction for a given x value and radius
    function radiusPredict(qx, radius) {
        var neighbors = [];
        for (var i = 0; i < points.length; i++) {
            if (dist(qx, points[i].x) <= radius) {
                neighbors.push(points[i]);
            }
        }
        if (neighbors.length === 0) return null; // No neighbors within radius
        var sum = 0;
        for (var k = 0; k < neighbors.length; k++) {
            sum += neighbors[k].y;
        }
        return sum / neighbors.length;
    }

    // Get all neighbors within a given radius
    function getRadiusNeighbors(qx, radius) {
        var result = [];
        for (var i = 0; i < points.length; i++) {
            var d = dist(qx, points[i].x);
            if (d <= radius) {
                result.push({ idx: i, x: points[i].x, y: points[i].y, d: d });
            }
        }
        result.sort(function (a, b) { return a.d - b.d; });
        return result;
    }

    // Count neighbors at each x for a given radius
    function neighborCount(qx, radius) {
        var count = 0;
        for (var i = 0; i < points.length; i++) {
            if (dist(qx, points[i].x) <= radius) count++;
        }
        return count;
    }

    // Generate prediction curves for different radius values
    var radiusValues = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
    var predictionCurves = {};
    var xMin = 0.3, xMax = 9.7;
    var numSteps = 120;

    radiusValues.forEach(function (r) {
        var curve = [];
        var lastValid = null;
        for (var s = 0; s <= numSteps; s++) {
            var xq = xMin + (s / numSteps) * (xMax - xMin);
            var yq = radiusPredict(xq, r);
            if (yq !== null) {
                lastValid = yq;
                curve.push({
                    x: Math.round(xq * 100) / 100,
                    y: Math.round(yq * 100) / 100,
                    count: neighborCount(xq, r)
                });
            } else {
                // Gap: no neighbors in range — push null marker
                curve.push({
                    x: Math.round(xq * 100) / 100,
                    y: null,
                    count: 0
                });
            }
        }
        predictionCurves[r] = curve;
    });

    // Default parameters
    var defaultRadius = 1.5;
    var defaultQueryX = 3.0;
    var defaultPrediction = radiusPredict(defaultQueryX, defaultRadius);
    var defaultNeighbors = getRadiusNeighbors(defaultQueryX, defaultRadius);

    // Compute RMSE for a given radius (leave-one-out)
    function computeRMSE(radius) {
        var sse = 0;
        var counted = 0;
        for (var i = 0; i < points.length; i++) {
            var neighbors = [];
            for (var j = 0; j < points.length; j++) {
                if (j !== i && dist(points[i].x, points[j].x) <= radius) {
                    neighbors.push(points[j]);
                }
            }
            if (neighbors.length === 0) continue;
            var pred = 0;
            for (var m = 0; m < neighbors.length; m++) {
                pred += neighbors[m].y;
            }
            pred /= neighbors.length;
            sse += Math.pow(points[i].y - pred, 2);
            counted++;
        }
        return counted > 0 ? Math.sqrt(sse / counted) : Infinity;
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
        radiusValues: radiusValues,
        predictionCurves: predictionCurves,
        defaultRadius: defaultRadius,
        defaultQueryX: defaultQueryX,
        defaultQueryY: defaultPrediction,
        defaultNeighbors: defaultNeighbors,
        getRadiusNeighbors: getRadiusNeighbors,
        radiusPredict: radiusPredict,
        neighborCount: neighborCount,
        computeRMSE: computeRMSE,
        stats: {
            n: points.length,
            rmse_r1_5: Math.round(computeRMSE(1.5) * 1000) / 1000
        }
    };
})();
