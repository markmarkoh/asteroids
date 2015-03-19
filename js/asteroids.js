(function(root) {
  var sky = d3.select("#sky");
  var width = ~~sky.style("width").replace("px", "");
  var height = ~~sky.style("height").replace("px", "");

  var offsetTop = 20;
  var offsetBottom = 20;

  var LUNAR_DISTANCE = 384400; //km
  var MAX_LDS = 20;

  var lunar_distance_scale = d3.scale.linear()
    .domain([0, MAX_LDS * LUNAR_DISTANCE])
    .range([10, height - 50]);

  var date = new Date();
  var time_scale = d3.time.scale()
    .domain([ d3.time.year.offset(date, -1), d3.time.year.offset(date, 1)])
    .rangeRound([0, width]);

  var size_scale = d3.scale.linear()
    .domain([30, 0])
    .range([2, 5]);

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
    d3.csv("/data/future.csv")
    .row(function(d) {
      if ( d["Object"] === "") return;
      return {
        ldMinimum: +(d["CA DistanceMinimum(LD/AU)"].split("/")[0]),
        ldNominal: +(d["CA DistanceNominal(LD/AU)"].split("/")[0]),
        closeApproach: moment(d["Close-Approach (CA) Date (TDB)YYYY-mmm-DD HH:MM ± D_HH:MM"].split("±")[0].trim(), "YYYY-MMMM-DD HH:mm"),
        h: ~~d["H(mag)"],
        name: d["Object"]
      }
    })
    .get(function(errors, rows) {
      var asteroids = sky.append("g").attr("class", "asteroids");
      asteroids.selectAll("asteroid")
        .data(rows)
        .enter()
          .append("circle")
          .attr("class", "asteroid")
          .attr("r", function(d) {
            return size_scale(d.h);
          })
          .attr("cy", function(d) {
            return lunar_distance_scale(d.ldNominal * LUNAR_DISTANCE)
          })
          .attr("cx", function(d) {
            return time_scale(d.closeApproach._d);
          })

    });
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

    drawLabelLine(earthAndMoon, earthLabel, earth);

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

    drawLabelLine(earthAndMoon, moonLabel, moon);

    earthAndMoon.append("circle")
      .attr("class", "moon-orbit")
      .attr("r", lunar_distance_scale(LUNAR_DISTANCE))
      .attr("cx", width / 2)
      .attr("cy", 0);  
  }

  function drawGuideLines(classname, distances) {
    sky.append("g").selectAll("guide")
      .data(distances)
      .enter()
        .append("line")
          .attr("x1", function(d) {
            return d * width;
          })
          .attr("y1", offsetTop)
          .attr("x2", function(d) {
            return d * width;
          })
          .attr("y2", height - offsetBottom)
          .attr("class", classname);
  }

  function drawLabelLine(container, elStart, elEnd) {
    container.append("path")
      .attr("class", "label-line")
      .attr("d", function() {
        var elStartBox = elStart.node().getBBox();
        var elEndBox = elEnd.node().getBBox();
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
          .attr("x", width / 2 + 35)
          .attr("y", function(d) {
            return lunar_distance_scale(LUNAR_DISTANCE * d) + 3;
          });
  }

  //drawGuideLines("guide", [0.42, 0.58]);
  //drawGuideLines("guide-light", [0.25, 0.75]);
  drawRulers();
  drawEarthAndMoon();
  drawNeos();

})(window)