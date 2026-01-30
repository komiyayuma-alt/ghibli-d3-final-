const margin = {top: 30, right: 20, bottom: 54, left: 64};
const width = 980, height = 520;

const svg = d3.select("#chart")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`);

const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const innerW = width - margin.left - margin.right;
const innerH = height - margin.top - margin.bottom;

const tooltip = d3.select("body").append("div")
  .attr("class","tooltip")
  .style("opacity", 0);

const statusEl = d3.select("#status");
const tableBody = d3.select("#table tbody");

const xSelect = document.getElementById("xSelect");
const yearMinEl = document.getElementById("yearMin");
const yearMaxEl = document.getElementById("yearMax");
const directorWrap = document.getElementById("directorFilters");

function clampYears(){
  const minV = +yearMinEl.value;
  const maxV = +yearMaxEl.value;
  if(minV > maxV){
    // swap to keep consistent
    yearMinEl.value = maxV;
    yearMaxEl.value = minV;
  }
}

function fmtMoney(musd){
  if(musd == null || Number.isNaN(musd)) return "-";
  return `$${musd}M`;
}

d3.csv("./data/ghibli.csv", d3.autoType).then(data => {
  const minYear = d3.min(data, d=>d.year);
  const maxYear = d3.max(data, d=>d.year);
  yearMinEl.min = minYear; yearMinEl.max = maxYear; yearMinEl.value = minYear;
  yearMaxEl.min = minYear; yearMaxEl.max = maxYear; yearMaxEl.value = maxYear;

  const directors = Array.from(new Set(data.map(d=>d.director))).sort(d3.ascending);

  // director filter checkboxes
  const directorState = new Map(directors.map(d=>[d,true]));
  directors.forEach(name => {
    const pill = document.createElement("label");
    pill.className = "pill";
    pill.innerHTML = `<input type="checkbox" checked data-dir="${name}"/> <span>${name}</span>`;
    directorWrap.appendChild(pill);
  });
  directorWrap.addEventListener("change", (e)=>{
    const cb = e.target;
    if(cb && cb.matches("input[type=checkbox][data-dir]")){
      directorState.set(cb.dataset.dir, cb.checked);
      render();
    }
  });

  const color = d3.scaleOrdinal().domain(directors).range(d3.schemeTableau10);

  // axes groups
  const xAxisG = g.append("g").attr("transform", `translate(0,${innerH})`);
  const yAxisG = g.append("g");

  // axis labels
  const xLabel = g.append("text")
    .attr("x", innerW/2)
    .attr("y", innerH + 46)
    .attr("text-anchor","middle")
    .attr("fill","#6b7280")
    .attr("font-size",12);

  g.append("text")
    .attr("x", -innerH/2)
    .attr("y", -50)
    .attr("transform","rotate(-90)")
    .attr("text-anchor","middle")
    .attr("fill","#6b7280")
    .attr("font-size",12)
    .text("評価（IMDb想定）");

  // brush
  const brushLayer = g.append("g").attr("class","brush");
  let brushedSet = null; // Set of titles

  const xScale = d3.scaleLinear().range([0, innerW]);
  const yScale = d3.scaleLinear().range([innerH, 0]);

  function getXAccessor(key){
    if(key === "duration_min") return d => d.duration_min;
    if(key === "worldwide_gross_musd") return d => d.worldwide_gross_musd;
    if(key === "year") return d => d.year;
    return d => d.duration_min;
  }

  function labelForX(key){
    if(key === "duration_min") return "上映時間（分）";
    if(key === "worldwide_gross_musd") return "世界興収（百万$）";
    if(key === "year") return "公開年";
    return "x";
  }

  function applyFilters(){
    clampYears();
    const yMin = +yearMinEl.value;
    const yMax = +yearMaxEl.value;
    const activeDirs = new Set(directors.filter(d => directorState.get(d)));

    return data.filter(d => d.year >= yMin && d.year <= yMax && activeDirs.has(d.director));
  }

  function updateTable(rows){
    const sliced = rows.slice(0, 30);
    const tr = tableBody.selectAll("tr").data(sliced, d=>d.title);
    tr.exit().remove();

    const enter = tr.enter().append("tr");
    enter.append("td");
    enter.append("td");
    enter.append("td");
    enter.append("td");
    enter.append("td");

    const merged = enter.merge(tr);
    merged.select("td:nth-child(1)").text(d=>d.title);
    merged.select("td:nth-child(2)").text(d=>d.year);
    merged.select("td:nth-child(3)").text(d=>d.director);
    merged.select("td:nth-child(4)").text(d=>d.imdb_rating);
    merged.select("td:nth-child(5)").text(d=>fmtMoney(d.worldwide_gross_musd));
  }

  function render(){
    const key = xSelect.value;
    const xAcc = getXAccessor(key);

    const filtered = applyFilters();

    // y domain fixed by filtered data
    yScale.domain([d3.min(filtered, d=>d.imdb_rating)-0.3, d3.max(filtered, d=>d.imdb_rating)+0.3]).nice();

    // x domain
    xScale.domain(d3.extent(filtered, xAcc)).nice();

    xAxisG.call(d3.axisBottom(xScale).ticks(8).tickFormat(key === "year" ? d3.format("d") : undefined));
    yAxisG.call(d3.axisLeft(yScale));

    xLabel.text(labelForX(key));

    statusEl.text(`表示中：${filtered.length}件　（年：${yearMinEl.value}〜${yearMaxEl.value} / 監督：チェックされたもの）`);

    // points
    const pts = g.selectAll("circle.pt").data(filtered, d=>d.title);

    pts.exit().remove();

    const enter = pts.enter().append("circle")
      .attr("class","pt")
      .attr("r", 6)
      .attr("opacity", 0.85)
      .on("mousemove", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(
            `<div style="font-weight:700; margin-bottom:4px;">${d.title}</div>
             <div>Year: ${d.year}</div>
             <div>Director: ${d.director}</div>
             <div>Duration: ${d.duration_min} min</div>
             <div>Gross: ${fmtMoney(d.worldwide_gross_musd)}</div>
             <div>Rating: ${d.imdb_rating}</div>`
          );
        const pad = 14;
        tooltip
          .style("left", (event.pageX + pad) + "px")
          .style("top", (event.pageY + pad) + "px");
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));

    enter.merge(pts)
      .attr("fill", d => color(d.director))
      .attr("cx", d => xScale(xAcc(d)))
      .attr("cy", d => yScale(d.imdb_rating))
      .attr("stroke", d => (brushedSet && brushedSet.has(d.title)) ? "#111827" : "none")
      .attr("stroke-width", 1.5);

    // brush behavior
    const brush = d3.brush()
      .extent([[0,0],[innerW, innerH]])
      .on("brush end", (event) => {
        const sel = event.selection;
        if(!sel){
          brushedSet = null;
          updateTable(filtered);
          g.selectAll("circle.pt").attr("stroke","none");
          return;
        }
        const [[x0,y0],[x1,y1]] = sel;
        const picked = filtered.filter(d => {
          const cx = xScale(xAcc(d));
          const cy = yScale(d.imdb_rating);
          return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
        });
        brushedSet = new Set(picked.map(d=>d.title));
        updateTable(picked);
        g.selectAll("circle.pt")
          .attr("stroke", d => brushedSet.has(d.title) ? "#111827" : "none")
          .attr("stroke-width", 1.5);
      });

    brushLayer.call(brush);

    // default table when no brush
    if(!brushedSet) updateTable(filtered);
  }

  // wire controls
  xSelect.addEventListener("change", ()=>{ brushedSet=null; render(); });
  yearMinEl.addEventListener("input", ()=>{ brushedSet=null; render(); });
  yearMaxEl.addEventListener("input", ()=>{ brushedSet=null; render(); });

  render();
});
