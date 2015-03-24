(function(root) {

    //drawGuideLines("guide-light", [0.42, 0.58]);
  var sky, height, width;
  var lunar_distance_scale, time_scale, size_scale, hmag_scale;
  var LUNAR_DISTANCE, MAX_LDS;
  var offsetTop, offsetBottom;
  function draw() {
    sky = d3.select("#sky");
    var header_height = document.getElementById("metadata").offsetHeight + document.getElementById("ticks").offsetHeight;
    var window_height = window.innerHeight;
    height = window_height - header_height - 25;
    width = ~~sky.style("width").replace("px", "");
    sky.attr("height", height);

    offsetTop = 40;
    offsetBottom = 40;

    LUNAR_DISTANCE = 384400; //km
    MAX_LDS = 15;

    lunar_distance_scale = d3.scale.linear()
      .domain([0, MAX_LDS * LUNAR_DISTANCE])
      .range([10, height - 50]);

    var date = new Date();
    time_scale = d3.time.scale()
      .domain([d3.time.year.offset(date, 1),  d3.time.year.offset(date, -1)])
      .rangeRound([width, 0]);

    size_scale = d3.scale.log()
      .domain([30, 17])
      .range([0.5, 4]);

    hmag_scale = d3.scale.linear()
    .domain([30, 29,  28,   27,   26, 25,  24, 23, 22,   21,  20,  19, 18])
    .range([4.5, 6.5, 11.5, 17.5, 27, 42.5, 65, 90, 170,  210, 330, 670, 1000]);

    drawGuideLines("guide-light", 4);
    drawGuideLines("guide-light", 8);
    drawRulers();
    drawTimeAxis();
    drawEarthAndMoon();
    drawNeos();
    setupControls();
  }

/*

CA DistanceMinimum(LD/AU): "3.6/0.0094"
CA DistanceNominal(LD/AU): "3.7/0.0094"
Close-Approach (CA) Date (TDB)YYYY-mmm-DD HH:MM ± D_HH:MM: "2015-Mar-19 06:53 ±"
H(mag): "25.4"
Nsigma: "2.68e+03"
Object: "(2015 FK)"
Vinfinity(km/s): "6.98"
Vrelative(km/s): "7.02"
*/
  function drawNeos() {
    d3.csv("data/future.csv")
    .row(function(d) {
      if ( d["Object"] === "") return;
      return {
        ldMinimum: +(d["CA DistanceMinimum(LD/AU)"].split("/")[0]),
        ldNominal: +(d["CA DistanceNominal(LD/AU)"].split("/")[0]),
        closeApproach: moment(d["Close-Approach (CA) Date (TDB)YYYY-mmm-DD HH:MM ± D_HH:MM"].split("±")[0].trim(), "YYYY-MMMM-DD HH:mm"),
        h: +d["H(mag)"],
        name: d["Object"]
      }
    })
    .get(function(errors, rows) {

      rows = rows.filter(function(row) {
        return row.ldNominal <= MAX_LDS + 0.5;
      });

      var asteroids = sky.append("g").attr("class", "asteroids");
      asteroids.selectAll("asteroid")
        .data(rows)
        .enter()
          .append("ellipse")
          .attr("class", function(d) {
            d.el = this;
            var className = '';
            if ( d.h < 21 ) {
              className += " huge";
            }
            else if ( d.h < 24.5 ) {
              className += " big";
            }
            else if ( d.h > 28 ) {
              className += " small";
            }

            if (new RegExp('\(' + d.closeApproach._d.getFullYear() + '.*\)').test(d.name)) {
              className += " new";
            }

            return className += " asteroid";
          })
          .attr("ry", function(d) {
            return size_scale(d.h);
          })
          .attr("rx", function(d) {
            return size_scale(d.h) - (Math.random() *.3);
          })
          .attr("cy", function(d) {
            return lunar_distance_scale(d.ldNominal * LUNAR_DISTANCE)
          })
          .attr("cx", function(d) {
            return time_scale(d.closeApproach._d);
          })
          .attr("transform", function(d) {
            if ( Math.random() * 2 > 1)
            return "rotate(34, " + [time_scale(d.closeApproach._d), lunar_distance_scale(d.ldNominal * LUNAR_DISTANCE)].join(",") + ")";
          });

      var bigOnes = rows.filter(function(val) { return val.h < 21 });
      asteroids.selectAll('ruler-label')
        .data(bigOnes)
        .enter()
          .append('text')
          .attr("class", "ruler-label")
          .text(function(d) {
            try {
              return /\((.*)\)/.exec(d.name)[1];
            }
            catch(e) {
              return d.name;
            }
          })
          .attr('x', function(d) {
            return time_scale(d.closeApproach._d) - 110; 
          })
          .attr('y', function(d) {
            return lunar_distance_scale(d.ldNominal * LUNAR_DISTANCE) + 20;
          })
          .attr('foo', function(d) {
            drawLabelLine(asteroids, d3.select(this).node(), d3.select(d.el).node())
          });

      asteroids.selectAll("asteroid-rings")
        .data(rows)
        .enter()
          .append("circle")
          .attr("class", function(d) {
            d.ringEl = this;
            var className = 'asteroid-rings';
            if ( d.h < 21 ) {
               className += " asteroid-rings-huge";
            }
            else if ( d.h <= 24.5 ) {
              className += " asteroid-rings-big";
            }

            if (new RegExp('\(' + d.closeApproach._d.getFullYear() + '.*\)').test(d.name)) {
              className += " asteroid-rings-new";
            }


            return className;
          })
          .attr("r", 30)
          .attr("cx", function(d) {
            return time_scale(d.closeApproach._d)
          })
          .attr("cy", function(d) {
            return lunar_distance_scale(d.ldNominal * LUNAR_DISTANCE)
          });

      drawVoronoi(rows);
    });
  }

  function setupControls() {
    document.querySelector('input[name=show-big]').addEventListener('change', function(e) {
      document.body.classList.toggle('show-rings-big');
    });
    document.querySelector('input[name=show-huge]').addEventListener('change', function(e) {
      document.body.classList.toggle('show-rings-huge');
    });
    document.querySelector('input[name=show-onlight]').addEventListener('change', function(e) {
      document.body.classList.toggle('onlight');
    });
    document.querySelector('input[name=show-new]').addEventListener('change', function(e) {
      document.body.classList.toggle('show-rings-new');
    });
  }

  function drawEarthAndMoon() {
    var earthAndMoon = sky.append("g").attr("class", "earth-and-moon");

    var earth = earthAndMoon.append("circle")
      .attr("class", "earth")
      .attr("r", 12)
      .attr("cx", width / 2)
      .attr("cy", 0)

    var earthLabel = earthAndMoon.append("text")
      .attr("class", "ruler-label")
      .text("Earth")
      .attr("x", width / 2 + 90)
      .attr("y", 40)

    drawLabelLine(earthAndMoon, earthLabel.node(), earth.node(), true);

    var moon = earthAndMoon.append("circle")
      .attr("class", "moon")
      .attr("r", 3.5)
      .attr("cx", width / 2)
      .attr("cy", lunar_distance_scale(LUNAR_DISTANCE))   

    var moonLabel = earthAndMoon.append("text")
      .attr("class", "ruler-label")
      .text("Moon")
      .attr("x", width / 2 + 83)
      .attr("y", lunar_distance_scale(LUNAR_DISTANCE) + 35)

    drawLabelLine(earthAndMoon, moonLabel.node(), moon.node(), true);

    earthAndMoon.append("circle")
      .attr("class", "moon-orbit")
      .attr("r", lunar_distance_scale(LUNAR_DISTANCE))
      .attr("cx", width / 2)
      .attr("cy", 0);  
  }

  function drawGuideLines(classname, months) {
    var date = new Date();
    var guides = sky.append("g");

    guides.selectAll("guide")
      .data([time_scale(d3.time.month.offset(date, -1 * months)), time_scale(d3.time.month.offset(date, months))])
      .enter()
        .append("line")
          .attr("x1", function(d) {
            return d;
          })
          .attr("y1", offsetTop)
          .attr("x2", function(d) {
            return d;
          })
          .attr("y2", height - offsetBottom)
          .attr("class", classname);

    return;
    guides.append("text")
      .attr("class", "ruler-label ")
      .text(function() {
        return 'Will pass ' + moment(d3.time.month.offset(data, months)).fromNow();
      })
      .attr("x", function() {
        return time_scale(d3.time.month.offset(date, months))
      })
      .attr("y", offsetTop - 10)

  }

  function drawLabelLine(container, elStart, elEnd, onRightSide) {
    container.append("path")
      .attr("class", "label-line")
      .attr("d", function() {
        var multiplyer = 1;
        if ( onRightSide === true ) {
          multiplyer = -1;
        }
        var elStartBox = elStart.getBBox();
        var elEndBox = elEnd.getBBox();
        var step1 = (elStartBox.x + (multiplyer * (elStartBox.width + 3))) + "," + (elStartBox.y + (elStartBox.height / 2));
        var step2 = (elStartBox.x + (multiplyer * elStartBox.width + 25)) + "," + (elStartBox.y + (elStartBox.height / 2));
        var step3 = (elEndBox.x + (elEndBox.width / 2) - 3) + "," + (elEndBox.y + elEndBox.height + 3);
        if ( onRightSide === true ) {
          return ["M", step2, "L", step1, "L", step3].join("");
        }
        return ["M", step1, "L", step2, "L", step3].join("");
      });
  }

  function drawRulers() {
    var range = d3.range(1, MAX_LDS + 1);

    var rulerGroup = sky.append("g");

    rulerGroup.selectAll("ruler")
      .data(range)
      .enter()
        .append("line")
          .attr("class", "ruler")
          .attr("x1", function(d) {
            if ( d % 5 === 0 || d === 1 ) {
              return width / 2 - 65.5;
            }

            return width / 2 - 10;
          })
          .attr("y1", function(d) {
            return lunar_distance_scale(LUNAR_DISTANCE * d);
          })
          .attr("x2", function(d) {
            if ( d % 5 === 0 || d === 1) {
              return width / 2 + 65.5;
            }

            return width / 2 + 10;
          })
          .attr("y2", function(d) {
            return lunar_distance_scale(LUNAR_DISTANCE * d);
          });

    rulerGroup.selectAll("ruler-label")
      .data(range.filter(function(d) { return d % 5 === 0 || d === 1}))
      .enter()
        .append("text")
          .text(function(d) {
            if ( d === 1 ) {
              return d + " Lunar Distance (LD)"; //, or about " + LUNAR_DISTANCE.toLocaleString() + "km from Earth";
            }
            if ( d === MAX_LDS ) {
              return d + " LDs, or about " + (LUNAR_DISTANCE * d).toLocaleString() + "km from Earth";
            }
            return d + " LDs";
          })
          .attr("class", "ruler-label")
          .attr("x", width / 2 + 85)
          .attr("y", function(d) {
            return lunar_distance_scale(LUNAR_DISTANCE * d) + 3;
          });
  }

  function drawTimeAxis() {

    var data = [-8, -4, 0, 4, 8];
    var date = new Date();

    d3.select('#ticks')
      .selectAll('ticks')    
      .data(data)
      .enter()
        .append("div")
        .attr("class", "ticks")
        .text(function(d) {
          if ( d === 0 ) return "Approaching this week";
          if ( d === d3.max(data) ) return "Approaching in " + d + " months";
          if ( d < 0 ) {
            return Math.abs(d) + " months ago";
          }

          return "In " + d + " months";
        })
        .style("left", function(d) {
          var offset = 50;
          if ( d === 0 || d === d3.max(data) ) offset = 88;

          return time_scale(d3.time.month.offset(date, d)) - offset + "px"
        })


    return;
    var xAxis = d3.svg.axis()
        .scale(time_scale)
        .orient("top")
        .ticks(d3.time.months, 3)
        .tickSize(10, 0)
        .tickPadding(5)
        .tickFormat(function(d) {
          return d3.time.format("%b %Y")
        });

    sky.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0, 10)")
        .call(xAxis)
      .selectAll(".tick text")
        .style("text-anchor", "start")
        .attr("x", 6)
        .attr("y", 0);
  }

  function drawVoronoi(data) {

    var popover = d3.select("#popover");

    var voronoi = d3.geom.voronoi()
      .x(function(d) {return time_scale(d.closeApproach._d) })
      .y(function(d) { return lunar_distance_scale(d.ldNominal * LUNAR_DISTANCE) })
      .clipExtent([[-1, -1], [width+1, height+1]]);


    var voronoiGroup = sky.append("g")
      .attr("class", "voronoi");

    voronoiGroup.selectAll("path")
      .data(voronoi(data))
    .enter().append("path")
      .attr("d", function(d) { 
        if ( !d || d.length < 2) {
         return null;
        }
        return "M" + d.join("L") + "Z";
     })
    .datum(function(d) { 
      return d && d.point;
     })
    .on("mouseenter", function(d) {
      popover.select("#name").text('Asteroid ' + d.name);

      var approachPrefix = 'Passed Earth on ';
      var distancePrefix = 'It came within ';
      if (d.closeApproach._d > new Date()) {
        approachPrefix = 'Approaches Earth on ';
        distancePrefix = 'It will come within ';
      }
      popover.select("#approach").text(approachPrefix + ' ' + d.closeApproach.format('MMMM Do YYYY') + '.')
      popover.select("#minimum").html(distancePrefix + '<strong>' + d.ldMinimum + ' LDs</strong>, and it\'s')
      popover.select("#size").text(hmag_scale(d.h).toFixed(1) + ' meters.');
      popover.select("#h").text(d.h);
      var popEl = popover[0][0];
      popEl.style.top = d.el.getBBox().y + 100 + 'px';

      if (d.el.cx.baseVal.value > width / 2 ) {
        popEl.style.left = d.el.getBBox().x - 200 + 'px';
      }
      else {
        popEl.style.left = d.el.getBBox().x + 20 + 'px';
      }
      popEl.style.display = 'block';
      d.ringEl.style.display = 'block';
    })
    .on("mouseout", function(d) {
      d.ringEl.style.display = 'none';
    });

    d3.select('#metadata').on('mouseenter', function() {
      popover[0][0].style.display = 'none';
    });
    d3.select('#sky').on('mouseenter', function() {
      popover[0][0].style.display = 'block';
    });

  }

  draw();
  // window.addEventListener('resize', function() {
  //   document.getElementById('ticks').innerHTML = '';
  //   var viz = document.getElementById('viz');
  //   Array.prototype.forEach.call(viz.children, function(child) { viz.removeChild(child) });
  //   viz.innerHTML = '';
  //   var svg = document.createElement('svg');
  //   svg.setAttribute('id', 'sky');
  //   viz.appendChild(svg)
  //   draw();
  // });
  //important stuff
  new K('http://www.freeasteroids.org/');
 

})(window)