(function(root) {
  var sky = d3.select("#sky");
  var header_height = document.getElementById("metadata").offsetHeight + document.getElementById("ticks").offsetHeight;
  var window_height = window.innerHeight;

  var height = window_height - header_height - 25;
  sky.attr("height", height);

  var width = ~~sky.style("width").replace("px", "");

  var offsetTop = 40;
  var offsetBottom = 40;

  var LUNAR_DISTANCE = 384400; //km
  var MAX_LDS = 10;

  var lunar_distance_scale = d3.scale.linear()
    .domain([0, MAX_LDS * LUNAR_DISTANCE])
    .range([10, height - 50]);

  var date = new Date();
  var time_scale = d3.time.scale()
    .domain([ d3.time.year.offset(date, -1), d3.time.year.offset(date, 1)])
    .rangeRound([width, 0]);

  var size_scale = d3.scale.log()
    .domain([30, 17])
    .range([0.5, 4]);

  var hmag_scale = d3.scale.linear()
    .domain([30, 29,  28,   27,   26, 25,  24, 23, 22,   21,  20,  19, 18])
    .range([4.5, 6.5, 11.5, 17.5, 27, 42.5, 65, 90, 170,  210, 330, 670, 1000]);

  root.lunar_distance_scale = lunar_distance_scale;
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
            if ( d.h < 21 ) {
              return "asteroid huge";
            }
            if ( d.h < 24.5 ) {
              return "asteroid big";
            }
            if ( d.h > 28 ) {
              return "asteroid small";
            }

            return "asteroid";
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
            if ( d.h < 21 ) {
              return "asteroid-rings-huge asteroid-rings"
            }
            if ( d.h <= 24.5 ) {
              return "asteroid-rings-big asteroid-rings";
            }
            return "asteroid-rings";
          })
          .attr("r", 40)
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
    })
    document.querySelector('input[name=show-widget]').addEventListener('change', function(e) {
      document.body.classList.toggle('show-widget');
    })
  }

  function drawEarthAndMoon() {
    var earthAndMoon = sky.append("g").attr("class", "earth-and-moon");

    var earth = earthAndMoon.append("circle")
      .attr("class", "earth")
      .attr("r", 10)
      .attr("cx", width / 2)
      .attr("cy", 0)

    var earthLabel = earthAndMoon.append("text")
      .attr("class", "ruler-label")
      .text("Earth")
      .attr("x", width / 2 - 90)
      .attr("y", 40)

    drawLabelLine(earthAndMoon, earthLabel.node(), earth.node());

    var moon = earthAndMoon.append("circle")
      .attr("class", "moon")
      .attr("r", 3)
      .attr("cx", width / 2)
      .attr("cy", lunar_distance_scale(LUNAR_DISTANCE))   

    var moonLabel = earthAndMoon.append("text")
      .attr("class", "ruler-label")
      .text("Moon")
      .attr("x", width / 2 - 83)
      .attr("y", lunar_distance_scale(LUNAR_DISTANCE) + 35)

    drawLabelLine(earthAndMoon, moonLabel.node(), moon.node());

    earthAndMoon.append("circle")
      .attr("class", "moon-orbit")
      .attr("r", lunar_distance_scale(LUNAR_DISTANCE))
      .attr("cx", width / 2)
      .attr("cy", 0);  
  }

  function drawGuideLines(classname, months) {
    var data = new Date();
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

  function drawLabelLine(container, elStart, elEnd) {
    container.append("path")
      .attr("class", "label-line")
      .attr("d", function() {
        var elStartBox = elStart.getBBox();
        var elEndBox = elEnd.getBBox();
        var step1 = "M" + (elStartBox.x + elStartBox.width + 3) + "," + (elStartBox.y + (elStartBox.height / 2));
        var step2 = "L" + (elStartBox.x + elStartBox.width + 25) + "," + (elStartBox.y + (elStartBox.height / 2));
        var step3 = "L" + (elEndBox.x + (elEndBox.width / 2) - 3) + "," + (elEndBox.y + elEndBox.height + 3);
        return [step1, step2, step3].join("");
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
              return width / 2 - 17.5;
            }

            return width / 2 - 10;
          })
          .attr("y1", function(d) {
            return lunar_distance_scale(LUNAR_DISTANCE * d);
          })
          .attr("x2", function(d) {
            if ( d % 5 === 0 || d === 1) {
              return width / 2 + 17.5;
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
          .attr("text-anchor", "end")
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
          .attr("x", width / 2 - 35)
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
      popover.select("#name").text(d.name);
      popover.select("#approach").text(d.closeApproach.fromNow())
      popover.select("#minimum").text(d.ldMinimum + ' LDs')
      popover.select("#nominal").text(d.ldNominal + ' LDs')
      popover.select("#size").text(hmag_scale(d.h).toFixed(2) + ' meters');
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

  //drawGuideLines("guide-light", [0.42, 0.58]);
  drawGuideLines("guide-light", 4);
  drawGuideLines("guide-light", 8);
  drawRulers();
  drawTimeAxis();
  drawEarthAndMoon();
  drawNeos();
  setupControls();

  //important stuff
  var easter_egg = new Konami('http://www.freeasteroids.org/');
 

})(window)