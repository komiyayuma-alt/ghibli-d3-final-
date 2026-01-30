const margin = {top: 30, right: 20, bottom: 46, left: 56};
const width = 920, height = 500;

const wrap = d3.select("#chart").style("position","relative");

const svg = wrap.append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`);

const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const innerW = width - margin.left - margin.right;
const innerH = height - margin.top - margin.bottom;

const tooltip = d3.select("body").append("div")
  .attr("class","tooltip")
  .style("opacity", 0);

d3.csv("./data/ghibli.csv", d3.autoType).then(data => {
  const directors = Array.from(new Set(data.map(d=>d.director))).sort(d3.ascending);
  const color = d3.scaleOrdinal()
    .domain(directors)
    .range(d3.schemeTableau10);

  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.duration_min)).nice()
    .range([0, innerW]);

  const y = d3.scaleLinear()
    .domain([d3.min(data, d => d.imdb_rating) - 0.3, d3.max(data, d => d.imdb_rating) + 0.3]).nice()
    .range([innerH, 0]);

  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(8));

  g.append("g").call(d3.axisLeft(y));

  g.append("text")
    .attr("x", innerW/2)
    .attr("y", innerH + 40)
    .attr("text-anchor","middle")
    .attr("fill","#6b7280")
    .attr("font-size",12)
    .text("上映時間（分）");

  g.append("text")
    .attr("x", -innerH/2)
    .attr("y", -42)
    .attr("transform","rotate(-90)")
    .attr("text-anchor","middle")
    .attr("fill","#6b7280")
    .attr("font-size",12)
    .text("評価（IMDb想定）");

  // legend
  const legend = g.append("g").attr("transform", `translate(${innerW-240},0)`);
  directors.slice(0,10).forEach((name,i)=>{
    const row = legend.append("g").attr("transform",`translate(0,${i*18})`);
    row.append("circle").attr("r",5).attr("cx",0).attr("cy",0).attr("fill",color(name));
    row.append("text").attr("x",10).attr("y",4).attr("font-size",11).attr("fill","#374151").text(name);
  });

  g.selectAll("circle.point")
    .data(data)
    .join("circle")
    .attr("class","point")
    .attr("cx", d => x(d.duration_min))
    .attr("cy", d => y(d.imdb_rating))
    .attr("r", 6)
    .attr("fill", d => color(d.director))
    .attr("opacity", 0.85)
    .on("mousemove", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(
          `<div style="font-weight:700; margin-bottom:4px;">${d.title}</div>
           <div>Year: ${d.year}</div>
           <div>Director: ${d.director}</div>
           <div>Duration: ${d.duration_min} min</div>
           <div>Rating: ${d.imdb_rating}</div>`
        );
      const pad = 14;
      tooltip
        .style("left", (event.pageX + pad) + "px")
        .style("top", (event.pageY + pad) + "px");
    })
    .on("mouseleave", () => tooltip.style("opacity", 0));

});
