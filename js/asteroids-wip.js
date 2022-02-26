(function(root) {
    let sky;
  
    // URL params / settings
    const MAX_LDS = 10;
    
    // Bounding box calcs
    const height = window.innerHeight;
    const width = document.querySelector('#sky').clientWidth;
  
    // Globals
    const LUNAR_DISTANCE = 384400; // km
    const AU_TO_LD = 389.577688525899
    const dateParser = d3.timeParse('%Y-%b-%d %H:%M')
    const date = Date.now()
  
    // Setup Scales
    const lunar_distance_scale = d3.scaleLinear()
        .domain([0, MAX_LDS * LUNAR_DISTANCE])
        .range([10, height - 50]);
    const time_scale = d3.scaleTime()
        .domain([d3.timeYear.offset(date, -1),  d3.timeYear.offset(date, 1)])
        .range([0, width]);
    const size_scale = d3.scaleLog()
        .domain([30, 17])
        .range([0.5, 4]);
  
    function draw() {
      sky = d3.select("#sky");
      sky.attr("height", height);
  
      drawNeos();
    }
  
    function drawNeos() {
      fetch('http://d33bz6js14grvw.cloudfront.net/asteroids-data-15-lds4.json')
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
  
  
          return Promise.resolve(data.map(asteroid => {
            return {
              ldMinimum: asteroid.dist_min * AU_TO_LD,
              ldNominal: asteroid.dist * AU_TO_LD,
              closeApproach: dateParser(asteroid.cd),
              h: asteroid.h,
              name: asteroid.fullname.trim()
            }
          }).filter(row => row.ldNominal <= MAX_LDS + 0.5))
        })
      .then(function(rows, errors) {
        const asteroids = sky.append("g").attr("class", "asteroids");
        asteroids.selectAll("asteroid")
          .data(rows)
          .enter()
            .append("ellipse")
            .attr("ry", function(d) {
              return 2;// size_scale(d.h);
            })
            .attr("rx", function(d) {
              return 2;// size_scale(d.h) - (Math.random() *.3);
            })
            .attr("cy", function(d) {
              return lunar_distance_scale(d.ldNominal * LUNAR_DISTANCE)
            })
            .attr("cx", function(d) {
              return time_scale(d.closeApproach);
            });
      });
    }
  
    draw();
  })(window)
  
  
