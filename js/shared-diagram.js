/* ============================================================
   ML Zoo — Shared Scatter + Neighborhood Diagram for Instance-Based Models
   Reusable D3 visualization for instance-based regression models.
   Includes neighbor highlighting, radius circles, and query points.
   ============================================================ */
(function () {
    'use strict';

    var svg, g, width, height, xScale, yScale, zoom;
    var config = {};
    var margin = { top: 20, right: 30, bottom: 45, left: 55 };

    function init(containerSelector, cfg) {
        config = cfg || {};
        var container = document.querySelector(containerSelector);
        if (!container) return;

        width  = config.width  || container.clientWidth || 800;
        height = config.height || 380;

        svg = d3.select(containerSelector)
            .append('svg')
            .attr('viewBox', '0 0 ' + width + ' ' + height)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('width', '100%')
            .style('max-height', height + 'px');

        // Clip path
        svg.append('defs')
            .append('clipPath')
            .attr('id', 'plot-clip')
            .append('rect')
            .attr('x', margin.left)
            .attr('y', margin.top)
            .attr('width', width - margin.left - margin.right)
            .attr('height', height - margin.top - margin.bottom);

        g = svg.append('g').attr('clip-path', 'url(#plot-clip)');

        var xDomain = config.xDomain || [0, 10];
        var yDomain = config.yDomain || [0, 10];

        xScale = d3.scaleLinear().domain(xDomain).range([margin.left, width - margin.right]);
        yScale = d3.scaleLinear().domain(yDomain).range([height - margin.bottom, margin.top]);

        // Grid lines
        var xGrid = svg.append('g')
            .attr('transform', 'translate(0,' + (height - margin.bottom) + ')')
            .call(d3.axisBottom(xScale).ticks(8).tickSize(-(height - margin.top - margin.bottom)).tickFormat(''))
            .attr('opacity', 0.08);
        xGrid.select('.domain').remove();

        var yGrid = svg.append('g')
            .attr('transform', 'translate(' + margin.left + ',0)')
            .call(d3.axisLeft(yScale).ticks(6).tickSize(-(width - margin.left - margin.right)).tickFormat(''))
            .attr('opacity', 0.08);
        yGrid.select('.domain').remove();

        // Axes
        var axisColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted') || '#6e7681';

        svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', 'translate(0,' + (height - margin.bottom) + ')')
            .call(d3.axisBottom(xScale).ticks(8))
            .selectAll('text,line,path')
            .attr('stroke', axisColor).attr('fill', axisColor);

        svg.append('g')
            .attr('class', 'y-axis')
            .attr('transform', 'translate(' + margin.left + ',0)')
            .call(d3.axisLeft(yScale).ticks(6))
            .selectAll('text,line,path')
            .attr('stroke', axisColor).attr('fill', axisColor);

        // Axis labels
        if (config.xLabel) {
            svg.append('text')
                .attr('x', width / 2).attr('y', height - 5)
                .attr('text-anchor', 'middle')
                .attr('fill', axisColor).attr('font-size', '12px')
                .text(config.xLabel);
        }
        if (config.yLabel) {
            svg.append('text')
                .attr('x', -height / 2).attr('y', 15)
                .attr('transform', 'rotate(-90)')
                .attr('text-anchor', 'middle')
                .attr('fill', axisColor).attr('font-size', '12px')
                .text(config.yLabel);
        }

        // Zoom
        zoom = d3.zoom()
            .scaleExtent([0.5, 5])
            .on('zoom', function (event) {
                g.attr('transform', event.transform);
            });
        svg.call(zoom);
    }

    /* ---------- Draw data points ---------- */

    function drawPoints(points, opts) {
        opts = opts || {};
        var color = opts.color || config.accentColor || '#f778ba';
        var radius = opts.radius || 5;

        g.selectAll('.data-point').remove();

        var pts = g.selectAll('.data-point')
            .data(points)
            .enter()
            .append('circle')
            .attr('class', 'data-point')
            .attr('cx', function (d) { return xScale(d.x); })
            .attr('cy', function (d) { return yScale(d.y); })
            .attr('r', 0)
            .attr('fill', function (d) { return d.color || color; })
            .attr('opacity', 0.75)
            .attr('stroke', function (d) { return d.color || color; })
            .attr('stroke-width', 1.5);

        // Animate in
        pts.transition()
            .duration(400)
            .delay(function (d, i) { return i * 30; })
            .attr('r', radius);

        // Tooltip
        pts.on('mouseover', function (event, d) {
                d3.select(this).attr('r', radius + 3).attr('opacity', 1);
                showTooltip(event, d);
            })
            .on('mouseout', function () {
                d3.select(this).attr('r', radius).attr('opacity', 0.75);
                hideTooltip();
            });
    }

    /* ---------- Draw prediction curve ---------- */

    function drawCurve(curvePoints, opts) {
        opts = opts || {};
        g.selectAll('.fit-curve').remove();

        var lineGen = d3.line()
            .x(function (d) { return xScale(d.x); })
            .y(function (d) { return yScale(d.y); })
            .curve(d3.curveLinear);

        var path = g.append('path')
            .attr('class', 'fit-curve')
            .attr('d', lineGen(curvePoints))
            .attr('fill', 'none')
            .attr('stroke', opts.color || config.accentColor || '#f778ba')
            .attr('stroke-width', opts.width || 2.5)
            .attr('opacity', 0);

        // Animate draw
        var totalLen = path.node().getTotalLength();
        path.attr('stroke-dasharray', totalLen + ' ' + totalLen)
            .attr('stroke-dashoffset', totalLen)
            .attr('opacity', opts.opacity || 0.85)
            .transition()
            .duration(800)
            .attr('stroke-dashoffset', 0);
    }

    /* ---------- Draw residual lines ---------- */

    function drawResiduals(points, predictFn, opts) {
        opts = opts || {};
        g.selectAll('.residual-line').remove();

        g.selectAll('.residual-line')
            .data(points)
            .enter()
            .append('line')
            .attr('class', 'residual-line')
            .attr('x1', function (d) { return xScale(d.x); })
            .attr('y1', function (d) { return yScale(d.y); })
            .attr('x2', function (d) { return xScale(d.x); })
            .attr('y2', function (d) { return yScale(d.y); })
            .attr('stroke', opts.color || '#f85149')
            .attr('stroke-width', 1.2)
            .attr('stroke-dasharray', '4 2')
            .attr('opacity', 0.6)
            .transition()
            .duration(400)
            .delay(function (d, i) { return i * 40; })
            .attr('y2', function (d) { return yScale(predictFn(d.x)); });
    }

    /* ---------- Draw neighborhood circle (radius) ---------- */

    function drawNeighborhood(queryX, queryY, radius, opts) {
        opts = opts || {};
        g.selectAll('.neighborhood-circle').remove();

        // Convert radius from data-space to pixel-space (use x-axis scale)
        var pxCenter = xScale(queryX);
        var pxEdge   = xScale(queryX + radius);
        var pxRadius = Math.abs(pxEdge - pxCenter);

        var circle = g.append('circle')
            .attr('class', 'neighborhood-circle')
            .attr('cx', xScale(queryX))
            .attr('cy', yScale(queryY))
            .attr('r', 0)
            .attr('fill', opts.fillColor || 'rgba(247,120,186,0.08)')
            .attr('stroke', opts.strokeColor || '#f778ba')
            .attr('stroke-width', opts.strokeWidth || 1.5)
            .attr('stroke-dasharray', opts.dashArray || '6 3')
            .attr('opacity', 0);

        circle.transition()
            .duration(500)
            .attr('r', pxRadius)
            .attr('opacity', opts.opacity || 0.7);
    }

    /* ---------- Draw neighbor links (lines from query to neighbors) ---------- */

    function drawNeighborLinks(queryX, queryY, neighbors, opts) {
        opts = opts || {};
        g.selectAll('.neighbor-link').remove();

        g.selectAll('.neighbor-link')
            .data(neighbors)
            .enter()
            .append('line')
            .attr('class', 'neighbor-link')
            .attr('x1', xScale(queryX))
            .attr('y1', yScale(queryY))
            .attr('x2', xScale(queryX))
            .attr('y2', yScale(queryY))
            .attr('stroke', opts.color || '#f778ba')
            .attr('stroke-width', opts.width || 1.2)
            .attr('stroke-dasharray', opts.dashArray || '3 2')
            .attr('opacity', 0)
            .transition()
            .duration(400)
            .delay(function (d, i) { return i * 60; })
            .attr('x2', function (d) { return xScale(d.x); })
            .attr('y2', function (d) { return yScale(d.y); })
            .attr('opacity', opts.opacity || 0.5);
    }

    /* ---------- Draw query point (highlighted, draggable) ---------- */

    function drawQueryPoint(queryX, queryY, opts) {
        opts = opts || {};
        g.selectAll('.query-point').remove();
        g.selectAll('.query-label').remove();

        var qColor = opts.color || '#ffa657';
        var qRadius = opts.radius || 8;

        // Outer glow ring
        g.append('circle')
            .attr('class', 'query-point query-point-glow')
            .attr('cx', xScale(queryX))
            .attr('cy', yScale(queryY))
            .attr('r', qRadius + 4)
            .attr('fill', 'none')
            .attr('stroke', qColor)
            .attr('stroke-width', 2)
            .attr('opacity', 0.3);

        // Main query dot
        var qDot = g.append('circle')
            .attr('class', 'query-point query-point-main')
            .attr('cx', xScale(queryX))
            .attr('cy', yScale(queryY))
            .attr('r', qRadius)
            .attr('fill', qColor)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('opacity', 0.95)
            .attr('cursor', 'grab');

        // Label
        g.append('text')
            .attr('class', 'query-label')
            .attr('x', xScale(queryX) + qRadius + 6)
            .attr('y', yScale(queryY) - qRadius - 2)
            .attr('fill', qColor)
            .attr('font-size', '11px')
            .attr('font-weight', '600')
            .text(opts.label || 'query');

        // Drag behaviour
        if (opts.onDrag) {
            var drag = d3.drag()
                .on('start', function () { d3.select(this).attr('cursor', 'grabbing'); })
                .on('drag', function (event) {
                    var newX = xScale.invert(event.x);
                    var newY = yScale.invert(event.y);
                    // Clamp to domain
                    var xd = config.xDomain || [0, 10];
                    var yd = config.yDomain || [0, 10];
                    newX = Math.max(xd[0], Math.min(xd[1], newX));
                    newY = Math.max(yd[0], Math.min(yd[1], newY));
                    opts.onDrag(newX, newY);
                })
                .on('end', function () { d3.select(this).attr('cursor', 'grab'); });
            qDot.call(drag);
        }
    }

    /* ---------- Highlight neighbor points ---------- */

    function highlightNeighbors(neighborIndices, opts) {
        opts = opts || {};
        var highlightColor = opts.color || '#ffa657';
        var highlightRadius = opts.radius || 7;

        // Reset all points to default
        g.selectAll('.data-point')
            .attr('stroke-width', 1.5)
            .attr('r', 5)
            .attr('opacity', 0.75);

        // Highlight neighbors
        g.selectAll('.data-point')
            .filter(function (d, i) { return neighborIndices.indexOf(i) !== -1; })
            .attr('stroke', highlightColor)
            .attr('stroke-width', 2.5)
            .attr('r', highlightRadius)
            .attr('opacity', 1);
    }

    /* ---------- Tooltip ---------- */

    var tooltipEl = null;

    function showTooltip(event, d) {
        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.style.cssText = 'position:fixed;padding:6px 10px;background:rgba(0,0,0,.8);' +
                'color:#fff;font-size:12px;border-radius:4px;pointer-events:none;z-index:999;';
            document.body.appendChild(tooltipEl);
        }
        tooltipEl.textContent = '(' + d.x.toFixed(2) + ', ' + d.y.toFixed(2) + ')';
        tooltipEl.style.left = event.clientX + 12 + 'px';
        tooltipEl.style.top = event.clientY - 28 + 'px';
        tooltipEl.style.display = 'block';
    }

    function hideTooltip() {
        if (tooltipEl) tooltipEl.style.display = 'none';
    }

    /* ---------- Clear & reset ---------- */

    function clear() {
        if (g) g.selectAll('.data-point,.fit-curve,.residual-line,.neighborhood-circle,.neighbor-link,.query-point,.query-label').remove();
    }

    function resetZoom() {
        if (svg && zoom) svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
    }

    /* ---------- Public API ---------- */

    window.MLZoo = window.MLZoo || {};
    window.MLZoo.diagram = {
        init: init,
        drawPoints: drawPoints,
        drawCurve: drawCurve,
        drawResiduals: drawResiduals,
        drawNeighborhood: drawNeighborhood,
        drawNeighborLinks: drawNeighborLinks,
        drawQueryPoint: drawQueryPoint,
        highlightNeighbors: highlightNeighbors,
        clear: clear,
        resetZoom: resetZoom,
        getScales: function () { return { x: xScale, y: yScale }; },
        getGroup: function () { return g; },
        getSvg: function () { return svg; }
    };
})();
