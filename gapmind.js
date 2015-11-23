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


var defs = svg.append("defs");

var filter = defs.append("filter")
   .attr("id", "glow");

filter.append("feGaussianBlur")
   .attr("stdDeviation", 2.5)
   .attr("result", "coloredBlur")

var femerge = filter.append("feMerge")

femerge.append("feMergeNode")
   .attr("in", "coloredBlur")
femerge.append("feMergeNode")
   .attr("in", "SourceGraphic")

// Make a white background rectangle
svg.append("rect")
    .attr("class","backgroundRect")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .attr("fill","white");


// Add in the cursor circle at 0,0 with 0 radius
  // We add it first so that it appears behind the targets
  svg.append("circle")
    .attr("id","cursorCircle")
    .attr("class","hidden")
    .attr("cx",0)
    .attr("cy",0)
    .attr("r",0)
    .attr("fill","lightgray");

  // Add in cursorMorph circle  at 0,0 with 0 radius
  // We add it first so that it appears behind the targets
  svg.append("circle")
    .attr("id","cursorMorphCircle")
    .attr("class","hidden")
    .attr("cx",0)
    .attr("cy",0)
    .attr("r",0)
    .attr("fill","lightgray");

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
    .attr("y", 26)
    .attr("dy", ".75em")
    .attr("transform", "rotate(-90)")
    .text("life expectancy (years)");

var mouseOn;

// Add the year label; the value is set on transition.
var label = svg.append("text")
    .attr("class", "year label")
    .attr("text-anchor", "end")
    .attr("y", height - 24)
    .attr("x", width)
    .text(1800);
var dots = svg.append("svg:g")
    .attr("class", "dots");

var cells;

cells = svg.append("svg:g")
     .attr("id", "cells");

var target_acquisition_method = "voronoi";

// Modified from http://mbostock.github.io/d3/talk/20111116/airports.html
var voronoi_checkbox = d3.selectAll("input[type=checkbox]").on("change", show_acquisition_on_chart);

function show_acquisition_on_chart() {
      cells.classed("voronoi", this.checked);
      if (this.checked) {
         d3.select("#cursorCircle").attr("class", null);
         d3.select("#cursorMorphCircle").attr("class", null);
       } else {
          d3.select("#cursorCircle").attr("class", "hidden");
          d3.select("#cursorMorphCircle").attr("class", "hidden");
       }
}

// Load the data.
d3.json("nations.json", function(nations) {

  // A bisector since many nation's data is sparsely-defined.
  var bisect = d3.bisector(function(d) { return d[0]; });
  // Add a dot per nation. Initialize the data at 1800, and set the colors.
  dots = d3.select(".dots")
    .selectAll(".dot")
      .data(interpolateData(1800))
    .enter().append("circle")
      .attr("class", "dot")
      .style("fill", function(d) { return colorScale(color(d)); })
      .call(position)
      .sort(order)
      .on('mouseover', function(d,i) {
	  create_info_text(i);
          mouseOn = d.name;
          highlight(this);
      })
      .on('mouseout', function(d) {
          mouseOn = undefined;
          unhighlight();
      });


  // Add an overlay for the year label.
  var box = label.node().getBBox();

  var overlay;

  add_overlay();

  // Start a transition that interpolates the data based on year.
  svg.transition()
      .duration(30000)
      .ease("linear")
      .tween("year", tweenYear)
      .each("end", enableInteraction);


  var polygons = make_polygons();
  
  make_cells();

   d3.selectAll('input[name="tas"]').on("change", target_acquisition_change);

  // Positions the dots based on data.
  function position(dot) {
    dot.attr("cx", function(d) { return xScale(x(d)); })
        .attr("cy", function(d) { return yScale(y(d)); })
        .attr("r", function(d) { return radiusScale(radius(d)); })
        .attr("countryName", function(d) { return d.name;})
        .attr("population", function(d) { return d.population;})
        .attr("lifeExpectancy", function(d) { return d.lifeExpectancy;})
        .attr("income", function(d) { return d.income;})
        .attr("region", function(d) { return d.region;});
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
      redo_voronoi();
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
    dots.data(interpolateData(year), key).call(position).sort(order);
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

// Modified from http://mbostock.github.io/d3/talk/20111116/airports.html

  function add_overlay() {
    overlay = svg.append("rect")
        .attr("class", "overlay")
        .attr("x", box.x)
        .attr("y", box.y)
        .attr("width", box.width)
        .attr("height", box.height)
        .on("mouseover", enableInteraction);
  }

  function redo_voronoi() {
     var polygons = make_polygons();
     d3.selectAll(".cell")
        .attr("d", function(d, i) { return "M" + polygons[i].join("L") + "Z"; });
   }

   svg.on("mousemove", function() {
     if (target_acquisition_method === "bubbleCursor") {
        // Modified from Bubble cursor example: http://bl.ocks.org/magrawala/9716298
           capturedTargetIdx = getTargetCapturedByBubbleCursor(d3.mouse(this),dots[0]);
           var selectedNode = d3.select(dots[0][capturedTargetIdx]);
      
           if (typeof mouseOn === "undefined") {
              create_info_text(capturedTargetIdx);
              highlight(dots[0][capturedTargetIdx]);
           }
      
      }
    });



  function make_cells() {
     if (target_acquisition_method === "voronoi") {
       cells.selectAll("path")
           .data(interpolateData(1800))
          .enter().append("svg:path")
	      .sort(order)
              .attr("class", "cell")
              .attr("id", function(d,i) {return d.name})
              .attr("d", function(d, i) { return "M" + polygons[i].join("L") + "Z"; })
              .on("mouseover", function(d, i) { 
                    create_info_text(i);
                    highlight(dots[0][i]); 
                  })
               .on('mouseout', function(d) {
                    unhighlight();
                });
     }
  }

   function target_acquisition_change() {
      target_acquisition_method = d3.selectAll('input[name="tas"]:checked').node().value;
      if (target_acquisition_method === "voronoi") {
          cells = svg.append("svg:g")
              .attr("id", "cells");
          make_cells();
          redo_voronoi();
          d3.select("#voronoi_checkbox").attr("class", null);
          d3.select("#bubbleCursor_checkbox").attr("class", "hidden");
          d3.select("#cursorCircle").attr("class", "hidden");
          d3.select("#cursorMorphCircle").attr("class", "hidden");
          overlay.remove();
          add_overlay();
	  // Is there a d3 way to do this?
          if (document.getElementById("voronoi_checkbox").getElementsByClassName("target_acquisition_method")[0].checked) {
	      cells.attr("class", "voronoi");
	  }
      } else {
          if (document.getElementById("bubbleCursor_checkbox").getElementsByClassName("target_acquisition_method")[0].checked) {
              d3.select("#cursorCircle").attr("class", null);
              d3.select("#cursorMorphCircle").attr("class", null);
	  } else {
              d3.select("#cursorCircle").attr("class", "hidden");
              d3.select("#cursorMorphCircle").attr("class", "hidden");
	  }
          cells.remove();
          d3.select("#bubbleCursor_checkbox").attr("class", null);
          d3.select("#voronoi_checkbox").attr("class", "hidden");
      }
    }

});
   svg.on("mouseout", function() {
     if (target_acquisition_method === "bubbleCursor") {
        unhighlight(); 

        svg.select("#cursorCircle")
	    	  .attr("cx",0)
	  	  .attr("cy",0)
	  	  .attr("r",0);

        svg.select("#cursorMorphCircle")
		  .attr("cx",0)
	  	  .attr("cy",0)
	  	  .attr("r",0);
      }
    });

function create_info_text(node){
    country = d3.select(dots[0][node]);

    country_name_elem = d3.select("#country_name");
    pci_elem = d3.select("#pci");
    population_elem = d3.select("#population");
    life_expectancy_elem = d3.select("#life_expectancy");
    continent_color = country.style('fill');
    country_name_elem.attr('style', "background-color:"+continent_color);

    country_name_elem.text(country.attr('countryName'));
    pci_elem.text(" Income Per Capita: " + numeral(Number(country.attr('income'))).format('$0,0.00'));
    population_elem.text(" Population: " + numeral(Number(country.attr('population'))).format('0,0'));
    life_expectancy_elem.text(" Life Expectancy: " + numeral(Number(country.attr('lifeExpectancy'))).format('0,0.00'));
}

function highlight(node) {
     // Dim all but the captured target
     svg.selectAll(".dot") .attr("opacity",.4);
     svg.selectAll(".dot") .attr("filter",null);
     d3.select(node) .attr('filter', "url(#glow)");
     d3.select(node) .attr('opacity', 2);
}

function unhighlight() {
     svg.selectAll(".dot") .attr("opacity",1);
     svg.selectAll(".dot") .attr("filter",null);
}

function make_polygons() {
   var vertices = [];
   dots[0].forEach(function(d,i) {
       vertices[i] = [d3.select(d).attr('cx'), d3.select(d).attr('cy')]
   });
   // Calculate voronoi polygons for the year.
   return d3.geom.voronoi()
           .clipExtent([[0, 0], [width, height]])(vertices);
}

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
        containDists.push(currDist+Number(targetRadius));
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
    if (cursorRadius < 0) { cursorRadius = 0; }

    svg.select("#cursorCircle")
        .attr("cx",mouse[0])
        .attr("cy",mouse[1])
        .attr("r",cursorRadius);

    if(cursorRadius < containDists[currMinIdx]) {
      currTarget = d3.select(targets[currMinIdx]);
      var morphRadius =  Number(currTarget.attr('r')) + 5;
      svg.select("#cursorMorphCircle")
         .attr("cx", currTarget.attr('cx'))
         .attr("cy", currTarget.attr('cy'))
         .attr("r", morphRadius);

    } else {
      svg.select("#cursorMorphCircle")
          .attr("cx",0)
          .attr("cy",0)
          .attr("r",0);
    }

    return currMinIdx;
}
