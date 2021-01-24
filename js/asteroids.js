(function(root) {
  let sky;

  const offsetTop = 40;
  const offsetBottom = 40;

  // URL params / settings
  const ldParam = parseInt(getParameterByName('lds'), 10)
  const MAX_LDS = isNaN(ldParam) ? 15 : ldParam;
  
  // Bounding box calcs
  const header_height = document.getElementById("metadata").offsetHeight + document.getElementById("ticks").offsetHeight;
  const window_height = window.innerHeight;
  const height = window_height - header_height - 25;
  const width = document.querySelector('#sky').clientWidth;

  // Globals
  const LUNAR_DISTANCE = 384400; // km
  const AU_TO_LD = 389.577688525899
  const dateParser = d3.timeParse('%Y-%b-%d %H:%M')
  const date = new Date();

  // Setup Scales
  const lunar_distance_scale = d3.scaleLinear()
      .domain([0, MAX_LDS * LUNAR_DISTANCE])
      .range([10, height - 50]);
  const time_scale = d3.scaleTime()
      .domain([d3.timeYear.offset(date, 1),  d3.timeYear.offset(date, -1)])
      .rangeRound([width, 0]);
  const size_scale = d3.scaleLog()
      .domain([30, 17])
      .range([0.5, 4]);
  const hmag_scale = d3.scaleLinear()
    .domain([30, 29,  28,   27,   26, 25,  24, 23, 22,   21,  20,  19, 18])
    .range([4.5, 6.5, 11.5, 17.5, 27, 42.5, 65, 90, 170,  210, 330, 670, 1000]);

  function draw() {
    sky = d3.select("#sky");
    sky.attr("height", height);

    drawGuideLines("guide-light", 4);
    drawGuideLines("guide-light", 8);
    drawRulers();
    drawTimeAxis();
    drawEarthAndMoon();
    drawNeos();
    setupControls();
  }

  function drawNeos() {
    const max = new Date();
    const min = new Date();
    const fmt = d3.timeFormat('%Y-%m-%d')
    max.setUTCFullYear( max.getUTCFullYear() + 1)
    min.setUTCFullYear( min.getUTCFullYear() - 1)
    fetch(`https://ssd-api.jpl.nasa.gov/cad.api?www=1&nea-comet=Y&dist-max=${MAX_LDS + 1}LD&fullname=true&date-min=${fmt(min)}&date-max=${fmt(max)}&h-max=27`)
      .then(function (s) {
        return s.json()
      })
      .then(function(r) {
        const zipObject = (props, values) => {
          return props.reduce((prev, prop, i) => {
            return Object.assign(prev, { [prop]: values[i] });
          }, {});
        }

        const data = r.data.map(function(asteroid) {
          return zipObject(r.fields, asteroid)
        })


        return Promise.resolve(data.map(function(asteroid) {
          return {
            ldMinimum: asteroid.dist_min * AU_TO_LD,
            ldNominal: asteroid.dist * AU_TO_LD,
            closeApproach: dateParser(asteroid.cd),
            h: asteroid.h,
            name: asteroid.fullname.trim()
          }
        }))
      })
    .then(function(rows, errors) {
      rows = rows.filter(function(row) {
        return row.ldNominal <= MAX_LDS + 0.5;
      });

      const asteroids = sky.append("g").attr("class", "asteroids");
      asteroids.selectAll("asteroid")
        .data(rows)
        .enter()
          .append("ellipse")
          .attr("class", function(d) {
            d.el = this;
            let className = '';
            if ( d.h < 21 ) {
              className += " huge";
            }
            else if ( d.h < 24.5 ) {
              className += " big";
            }
            else if ( d.h > 28 ) {
              className += " small";
            }

            // assume asteroids named "XF (2020)" were discovered in 2020.
            if (new RegExp('\(' + d.closeApproach.getFullYear() + '.*\)').test(d.name)) {
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
            return time_scale(d.closeApproach);
          })
          .attr("transform", function(d) {
            if ( Math.random() * 2 > 1)
            return "rotate(34, " + [time_scale(d.closeApproach), lunar_distance_scale(d.ldNominal * LUNAR_DISTANCE)].join(",") + ")";
          });

      const bigOnes = rows.filter(function(val) { return val.h < 21 });
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
            return time_scale(d.closeApproach) - 110;
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
            let className = 'asteroid-rings';
            if ( d.h < 21 ) {
               className += " asteroid-rings-huge";
            }
            else if ( d.h <= 24.5 ) {
              className += " asteroid-rings-big";
            }

            if (new RegExp('\(' + d.closeApproach.getFullYear() + '.*\)').test(d.name)) {
              className += " asteroid-rings-new";
            }


            return className;
          })
          .attr("r", 30)
          .attr("cx", function(d) {
            return time_scale(d.closeApproach)
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

    if (getParameterByName('show-huge-rocks') == 'true') {
      document.body.classList.add('show-rings-huge')
      document.querySelector('input[name=show-huge]').checked = true
    }
  }

  function drawEarthAndMoon() {
    const earthAndMoon = sky.append("g").attr("class", "earth-and-moon");

    const earth = earthAndMoon.append("circle")
      .attr("class", "earth")
      .attr("r", 12)
      .attr("cx", width / 2)
      .attr("cy", 0)

    const earthLabel = earthAndMoon.append("text")
      .attr("class", "ruler-label")
      .text("Earth")
      .attr("x", width / 2 + 90)
      .attr("y", 40)

    drawLabelLine(earthAndMoon, earthLabel.node(), earth.node(), true);

    const moon = earthAndMoon.append("circle")
      .attr("class", "moon")
      .attr("r", 3.5)
      .attr("cx", width / 2)
      .attr("cy", lunar_distance_scale(LUNAR_DISTANCE))

    const moonLabel = earthAndMoon.append("text")
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
    const guides = sky.append("g");

    guides.selectAll("guide")
      .data([time_scale(d3.timeMonth.offset(date, -1 * months)), time_scale(d3.timeMonth.offset(date, months))])
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
  }

  function drawLabelLine(container, elStart, elEnd, onRightSide) {
    container.append("path")
      .attr("class", "label-line")
      .attr("d", function() {
        const multiplyer = onRightSide ? -1 : 1
        const elStartBox = elStart.getBBox();
        const elEndBox = elEnd.getBBox();
        const step1 = (elStartBox.x + (multiplyer * (elStartBox.width + 3))) + "," + (elStartBox.y + (elStartBox.height / 2));
        const step2 = (elStartBox.x + (multiplyer * elStartBox.width + 25)) + "," + (elStartBox.y + (elStartBox.height / 2));
        const step3 = (elEndBox.x + (elEndBox.width / 2) - 3) + "," + (elEndBox.y + elEndBox.height + 3);
        if ( onRightSide === true ) {
          return ["M", step2, "L", step1, "L", step3].join("");
        }
        return ["M", step1, "L", step2, "L", step3].join("");
      });
  }

  function drawRulers() {
    const range = d3.range(1, MAX_LDS + 1);

    const rulerGroup = sky.append("g");

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
    const data = [-8, -4, 0, 4, 8];
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
          let offset = 50;
          if ( d === 0 || d === d3.max(data) ) offset = 88;

          return time_scale(d3.timeMonth.offset(date, d)) - offset + "px"
        })
  }

  function drawVoronoi(data) {
    const popover = d3.select("#popover");
    const voronoi = d3.voronoi()
      .x(function(d) {return time_scale(d.closeApproach) })
      .y(function(d) { return lunar_distance_scale(d.ldNominal * LUNAR_DISTANCE) })
      .extent([[-1, -1], [width+1, height+1]]);
    const voronoiGroup = sky.append("g")
      .attr("class", "voronoi");

    voronoiGroup.selectAll("path")
      .data(voronoi.polygons(data))
    .enter().append("path")
      .attr("d", function(d) {
        if ( !d || d.length < 2) {
         return null;
        }
        return "M" + d.join("L") + "Z";
     })
    .on("mouseenter", function(evt, {data}) {
      popover.select("#name").text('Asteroid ' + data.name);
      let approachPrefix = 'Passed Earth on ';
      let distancePrefix = 'It came within ';
      if (data.closeApproach > new Date()) {
        approachPrefix = 'Approaches Earth on ';
        distancePrefix = 'It will come within ';
      }
      popover.select("#approach").text(approachPrefix + ' ' + data.closeApproach.toLocaleDateString() + '.')
      popover.select("#minimum").html(distancePrefix + '<strong>' + data.ldNominal.toFixed(1) + ' LDs</strong>, and its')
      popover.select("#size").text(hmag_scale(data.h).toFixed(1) + ' meters.');
      popover.select("#h").text(data.h);
      const popEl = popover._groups[0][0]
      popEl.style.top = data.el.getBBox().y + 100 + 'px';

      if (data.el.cx.baseVal.value > width / 2 ) {
        popEl.style.left = data.el.getBBox().x - 200 + 'px';
      }
      else {
        popEl.style.left = data.el.getBBox().x + 20 + 'px';
      }
      popEl.style.display = 'block';
      data.ringEl.style.display = 'block';
    })
    .on("mouseout", function(evt, {data}) {
      data.ringEl.style.display = 'none';
    });

    d3.select('#metadata').on('mouseenter', function() {
      popover._groups[0][0].style.display = 'none';
    });
    d3.select('#sky').on('mouseenter', function() {
      popover._groups[0][0].style.display = 'block';
    });

  }

  draw();
  //important stuff
  new K('http://www.freeasteroids.org/');
})(window)

function getParameterByName(name) {
    const searchParams = new URLSearchParams(window.location.search)
    return searchParams.get(name);
}
