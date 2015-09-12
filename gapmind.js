// Various accessors that specify the four dimensions of data to visualize.
function x(d) { return d.income; }
function y(d) { return d.lifeExpectancy; }
function radius(d) { return d.population; }
function color(d) { return d.region; }
function key(d) { return d.name; }


// Distance funciton from the Bubble Cursor example: http://bl.ocks.org/magrawala/9716298
function distance(ptA,ptB) {
    var diff = [ptB[0]-ptA[0],ptB[1]-ptA[1]];
    return Math.sqrt(diff[0]*diff[0] + diff[1]*diff[1]);
}

// Chart dimensions.
var margin = {top: 19.5, right: 19.5, bottom: 19.5, left: 39.5},
    width = 960 - margin.right,
    height = 500 - margin.top - margin.bottom;

// Various scales. These domains make assumptions of data, naturally.
var xScale = d3.scale.log().domain([300, 1e5]).range([0, width]),
    yScale = d3.scale.linear().domain([10, 85]).range([height, 0]),
    radiusScale = d3.scale.sqrt().domain([0, 5e8]).range([0, 40]),
    colorScale = d3.scale.category10();

// The x & y axes.
var xAxis = d3.svg.axis().orient("bottom").scale(xScale).ticks(12, d3.format(",d")),
    yAxis = d3.svg.axis().scale(yScale).orient("left");

// Create the SVG container and set the origin.
var svg = d3.select("#chart").append("svg:svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Make a white background rectangle
svg.append("rect")
    .attr("class","backgroundRect")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .attr("fill","white");

// Add the x-axis.
svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

// Add the y-axis.
svg.append("g")
    .attr("class", "y axis")
    .call(yAxis);

// Add an x-axis label.
svg.append("text")
    .attr("class", "x label")
    .attr("text-anchor", "end")
    .attr("x", width)
    .attr("y", height - 6)
    .text("income per capita, inflation-adjusted (dollars)");


// Add a y-axis label.
svg.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "end")
    .attr("y", 6)
    .attr("dy", ".75em")
    .attr("transform", "rotate(-90)")
    .text("life expectancy (years)");

var mouseOn;

// Add the label for the counrty name.
var info_label = svg.append("text")
    .attr("class", "country_label")
    .attr("y", 0)
    .attr("x", 30);

// Add the year label; the value is set on transition.
var label = svg.append("text")
    .attr("class", "year label")
    .attr("text-anchor", "end")
    .attr("y", height - 24)
    .attr("x", width)
    .text(1800);

var cells = svg.append("svg:g")
    .attr("id", "cells");

// From http://mbostock.github.io/d3/talk/20111116/airports.html
d3.select("input[type=checkbox]").on("change", function() {
  cells.classed("voronoi", this.checked);
});

// Load the data.
d3.json("nations.json", function(nations) {

  // A bisector since many nation's data is sparsely-defined.
  var bisect = d3.bisector(function(d) { return d[0]; });
 

  // Add a dot per nation. Initialize the data at 1800, and set the colors.
  var dot = svg.append("g")
      .attr("class", "dots")
    .selectAll(".dot")
      .data(interpolateData(1800))
    .enter().append("circle")
      .attr("class", "dot")
      .style("fill", function(d) { return colorScale(color(d)); })
      .attr("countryName", function(d) { return d.name;})
      .call(position)
      .sort(order)
      .on('mouseover', function(d) {
          info_label.text(d.name);
          mouseOn = d.name;
      })
      .on('mouseout', function(d) {
          mouseOn = undefined;
      })

  // Add a title.
  dot.append("title")
      .text(function(d) { return d.name; });

  // Add an overlay for the year label.
  var box = label.node().getBBox();

  var overlay = svg.append("rect")
        .attr("class", "overlay")
        .attr("x", box.x)
        .attr("y", box.y)
        .attr("width", box.width)
        .attr("height", box.height)
        .on("mouseover", enableInteraction);

  // Start a transition that interpolates the data based on year.
  svg.transition()
      .duration(30000)
      .ease("linear")
      .tween("year", tweenYear)
      .each("end", enableInteraction);

  // Positions the dots based on data.
  function position(dot) {
    dot.attr("cx", function(d) { return xScale(x(d)); })
        .attr("cy", function(d) { return yScale(y(d)); })
        .attr("r", function(d) { return radiusScale(radius(d)); });
  }
  

  // Defines a sort order so that the smallest dots are drawn on top.
  function order(a, b) {
    return radius(b) - radius(a);
  }

  // After the transition finishes, you can mouseover to change the year.
  function enableInteraction() {
    var yearScale = d3.scale.linear()
        .domain([1800, 2009])
        .range([box.x + 10, box.x + box.width - 10])
        .clamp(true);

    // Cancel the current transition, if any.
    svg.transition().duration(0);

    overlay
        .on("mouseover", mouseover)
        .on("mouseout", mouseout)
        .on("mousemove", mousemove)
        .on("touchmove", mousemove);

    function mouseover() {
      label.classed("active", true);
    }

    function mouseout() {
      label.classed("active", false);
    }

    function mousemove() {
      displayYear(yearScale.invert(d3.mouse(this)[0]));
    }
  }

  // Tweens the entire chart by first tweening the year, and then the data.
  // For the interpolated data, the dots and label are redrawn.
  function tweenYear() {
    var year = d3.interpolateNumber(1800, 2009);
    return function(t) { displayYear(year(t)); };
  }

  // Updates the display to show the specified year.
  function displayYear(year) {
    dot.data(interpolateData(year), key).call(position).sort(order);
    label.text(Math.round(year));
  }

  // Interpolates the dataset for the given (fractional) year.
  function interpolateData(year) {
    return nations.map(function(d) {
      return {
        name: d.name,
        region: d.region,
        income: interpolateValues(d.income, year),
        population: interpolateValues(d.population, year),
        lifeExpectancy: interpolateValues(d.lifeExpectancy, year)
      };
    });
  }

  // Finds (and possibly interpolates) the value for the specified year.
  function interpolateValues(values, year) {
    var i = bisect.left(values, year, 0, values.length - 1),
        a = values[i];
    if (i > 0) {
      var b = values[i - 1],
          t = (year - a[0]) / (b[0] - a[0]);
      return a[1] * (1 - t) + b[1] * t;
    }
    return a[1];
  }

// Modified  from http://mbostock.github.io/d3/talk/20111116/airports.html
  var vertices = [];
  dot[0].forEach(function(d,i) {vertices[i] = [d3.select(d).attr('cx'), d3.select(d).attr('cy')]});
  // Calculate voronoi polygons for the initial year.
  var polygons = d3.geom.voronoi(vertices);
    var g = cells.selectAll("g")
      .data(interpolateData(1800))
      .enter().append("svg:g");

    g.append("svg:path")
        .attr("class", "cell")
        .attr("d", function(d, i) { return "M" + polygons[i].join("L") + "Z"; });

  //Handle mousemove events
  svg.on("mousemove", function() {
     dot[0].forEach(function(d,i) {vertices[i] = [d3.select(d).attr('cx'), d3.select(d).attr('cy')]});
     var polygons = d3.geom.voronoi(vertices);
     d3.selectAll(".cell")
        .attr("d", function(d, i) { return "M" + polygons[i].join("L") + "Z"; });

     // Modified from Bubble cursor example: http://bl.ocks.org/magrawala/9716298
     var capturedTargetIdx = getTargetCapturedByBubbleCursor(d3.mouse(this),dot[0]);
     var selectedName = d3.select(dot[0][capturedTargetIdx]).attr('countryName');
     // Dim all but the captured target
     svg.selectAll(".dot") .attr("opacity",.7);
     d3.select(dot[0][capturedTargetIdx]) .attr('opacity', 1);

     //updateOpacity(capturedTargetIdx,dot[0]);
     if (typeof mouseOn === "undefined")
        info_label.text(selectedName);
      
      // Update the fillcolor of the targetcircles
      //updateTargetsFill(capturedTargetIdx,clickTarget);
  });
});

//function updateOpacity(capturedTargetIdx, allDots) {
     //allDots.each
     //svg.selectAll(".dot")
        //.attr("opacity", function(d,i) { if (i === capturedTargetIdx) { return 1 } return .5});
//}

// To the End - Modified from Bubble cursor example: http://bl.ocks.org/magrawala/9716298
function getTargetCapturedByBubbleCursor(mouse,targets) {
     //Compute distances from mouse to center, outermost, innermost
     //of each target and find currMinIdx and secondMinIdx;
    var mousePt = [mouse[0],mouse[1]];
    var dists=[], containDists=[], intersectDists=[];
    var currMinIdx = 0;
    for (var idx =0; idx < targets.length; idx++) {
        var targetPt = [d3.select(targets[idx]).attr('cx'), d3.select(targets[idx]).attr('cy')];
        var currDist = distance(mousePt,targetPt);
        dists.push(currDist);

        targetRadius =  d3.select(targets[idx]).attr('r')
        containDists.push(currDist+targetRadius);
        intersectDists.push(currDist-targetRadius);

        if(intersectDists[idx] < intersectDists[currMinIdx]) {
            currMinIdx = idx;
              
        } 
    }
      
    // Find secondMinIdx
    var secondMinIdx = (currMinIdx+1)%targets.length;
    for (var idx =0; idx < targets.length; idx++) {
      if (idx != currMinIdx && 
          intersectDists[idx] < intersectDists[secondMinIdx]) {
          secondMinIdx = idx;
      }
    }

    var cursorRadius = Math.min(containDists[currMinIdx], intersectDists[secondMinIdx]);

    svg.select(".cursorCircle")
        .attr("cx",mouse[0])
        .attr("cy",mouse[1])
        .attr("r",cursorRadius);

    if(cursorRadius < containDists[currMinIdx]) {
      svg.select(".cursorMorphCircle")
          //.attr("cx",targets[currMinIdx][0][0])
          //.attr("cy",targets[currMinIdx][0][1])
          .attr("r",targets[currMinIdx][1]+5);
    } else {
      //svg.select(".cursorMorphCircle")
          //.attr("cx",0)
          //.attr("cy",0)
          //.attr("r",0);
    }

    return currMinIdx;
}
