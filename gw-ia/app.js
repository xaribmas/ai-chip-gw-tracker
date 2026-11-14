"use strict";

var DATA_URL = "data/datos.json";
var nf = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

function fmt(n) { return nf.format(n); }

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

/* Cálculos puros: se pueden probar en Node sin navegador. */
function calcular(datos) {
  var porProveedor = {};
  datos.proveedores.forEach(function (p) { porProveedor[p.id] = { total: 0, partes: [] }; });
  var totalesJugador = {};
  datos.jugadores.forEach(function (j) {
    var suma = 0, hayNumero = false;
    Object.keys(j.celdas).forEach(function (pid) {
      var c = j.celdas[pid];
      if (typeof c.gw === "number") {
        suma += c.gw;
        hayNumero = true;
        if (porProveedor[pid]) {
          porProveedor[pid].total += c.gw;
          porProveedor[pid].partes.push({ nombre: j.nombre, gw: c.gw });
        }
      }
    });
    totalesJugador[j.id] = hayNumero ? suma : null;
  });
  var total = 0;
  Object.keys(porProveedor).forEach(function (k) { total += porProveedor[k].total; });
  var nvidia = porProveedor.nvidia ? porProveedor.nvidia.total : 0;
  return {
    porProveedor: porProveedor,
    totalesJugador: totalesJugador,
    total: total,
    nvidia: nvidia,
    resto: total - nvidia,
    pctNvidia: total > 0 ? (nvidia / total) * 100 : 0
  };
}

if (typeof module !== "undefined") { module.exports = { calcular: calcular }; }

/* Interfaz: solo en navegador. */
if (typeof document !== "undefined") {
  var datos = null;
  var charts = [];
  var timer = null;

  var $ = function (id) { return document.getElementById(id); };

  function colorDe(pid) {
    var p = datos.proveedores.filter(function (x) { return x.id === pid; })[0];
    return p ? p.color : "#888780";
  }

  function pintarLeyenda() {
    $("leyenda").innerHTML = datos.proveedores.map(function (p) {
      return '<span><i style="background:' + esc(p.color) + '"></i>' + esc(p.nombre) + "</span>";
    }).join("") + "<span>Barra = GW (escala 0 a " + esc(datos.escala_barra_gw) + ")</span>";
  }

  function pintarMatriz(calc) {
    var escala = datos.escala_barra_gw || 10;
    var cab = "<tr><th>Jugador</th>" + datos.proveedores.map(function (p) {
      return "<th>" + esc(p.nombre) + "</th>";
    }).join("") + "<th>Total publicado</th></tr>";
    var filas = datos.jugadores.map(function (j) {
      var celdas = datos.proveedores.map(function (p) {
        var c = j.celdas[p.id];
        if (!c) { return '<td><span class="nd">—</span></td>'; }
        if (c.gw == null) {
          return '<td><span class="nd">n/d</span>' + (c.nota ? '<span class="s">' + esc(c.nota) + "</span>" : "") + "</td>";
        }
        var w = Math.max(0, Math.min(100, (c.gw / escala) * 100));
        return '<td><span class="v">' + fmt(c.gw) + " GW</span>" +
          (c.nota ? '<span class="s">' + esc(c.nota) + "</span>" : "") +
          '<div class="b" style="background:' + esc(p.color) + ";width:" + w + '%"></div></td>';
      }).join("");
      var t = calc.totalesJugador[j.id];
      var tot = t == null ? '<span class="nd">n/d</span>' : '<span class="v">' + fmt(t) + " GW</span>";
      if (j.extra) { tot += '<span class="s">' + esc(j.extra) + "</span>"; }
      return "<tr><td>" + esc(j.nombre) + "</td>" + celdas + "<td>" + tot + "</td></tr>";
    }).join("");
    $("matriz").innerHTML = cab + filas;
    $("pie-matriz").textContent = "n/d = sin GW publicados. “—” = sin acuerdo conocido.";
  }

  function pintarBarras(calc) {
    $("tarjetas").innerHTML =
      '<div><small>Total publicado</small><b>' + fmt(calc.total) + " GW</b></div>" +
      '<div><small>Nvidia</small><b>' + fmt(calc.nvidia) + " GW · " + Math.round(calc.pctNvidia) + " %</b></div>" +
      '<div><small>Resto de proveedores</small><b>' + fmt(calc.resto) + " GW · " + Math.round(100 - calc.pctNvidia) + " %</b></div>";

    var ordenados = datos.proveedores.slice().sort(function (a, b) {
      return calc.porProveedor[b.id].total - calc.porProveedor[a.id].total;
    });
    var max = Math.max.apply(null, ordenados.map(function (p) { return calc.porProveedor[p.id].total; })) || 1;
    $("barras").innerHTML = ordenados.map(function (p) {
      var d = calc.porProveedor[p.id];
      var partes = d.partes.slice().sort(function (a, b) { return b.gw - a.gw; })
        .map(function (x) { return esc(x.nombre) + " " + fmt(x.gw); }).join(" + ");
      return '<div class="r"><div class="rl">' + esc(p.nombre_barras || p.nombre) +
        '<span class="rs">' + (partes || "sin datos") + "</span></div>" +
        '<div class="tr"><div class="br" style="width:' + (d.total / max) * 100 + "%;background:" + esc(p.color) + '"></div></div>' +
        '<div class="vv">' + fmt(d.total) + "</div></div>";
    }).join("");

    var pn = calc.pctNvidia, pr = 100 - pn;
    $("vs").innerHTML =
      '<div style="width:' + pn + "%;background:" + esc(colorDe("nvidia")) + '">Nvidia ' + Math.round(pn) + " %</div>" +
      '<div style="width:' + pr + '%;background:#8fb8ea">Resto ' + Math.round(pr) + " %</div>";
    $("pie-barras").textContent = "Suma de los GW con cifra publicada. Los n/d no cuentan, así que Nvidia puede estar infravalorada.";
  }

  function pintarTendencias() {
    charts.forEach(function (c) { c.destroy(); });
    charts = [];
    var css = getComputedStyle(document.documentElement);
    var ink2 = css.getPropertyValue("--ink2").trim() || "#52514e";
    var line = css.getPropertyValue("--line").trim() || "#e1e0d9";
    var cont = $("tendencias");
    cont.innerHTML = datos.tendencias.map(function (t) {
      return '<div class="tend"><h3>' + esc(t.titulo) + '</h3><div class="cw"><canvas id="t-' + esc(t.id) +
        '" role="img" aria-label="' + esc(t.titulo) + '"></canvas></div>' +
        (t.nota ? '<p class="nota-t">' + esc(t.nota) + "</p>" : "") +
        '<p class="nota-t">Eje X: ' + esc(t.eje_x || "") + "</p></div>";
    }).join("");
    datos.tendencias.forEach(function (t) {
      var ctx = document.getElementById("t-" + t.id);
      var sets = t.series.map(function (s) {
        var col = s.color || colorDe(s.proveedor);
        return {
          label: s.nombre, data: s.datos, borderColor: col, backgroundColor: col,
          borderWidth: 2, borderDash: s.guiones || [], stepped: !!s.escalon, spanGaps: true,
          pointRadius: 4, pointBackgroundColor: col, pointBorderColor: "#ffffff", pointBorderWidth: 2, tension: 0
        };
      });
      charts.push(new Chart(ctx, {
        type: "line",
        data: { labels: t.etiquetas, datasets: sets },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          plugins: {
            legend: { position: "bottom", labels: { boxWidth: 14, boxHeight: 2, color: ink2, font: { size: 12 } } },
            tooltip: { callbacks: { label: function (c) { return c.dataset.label + ": " + fmt(c.parsed.y) + " GW"; } } }
          },
          scales: {
            y: { min: 0, max: t.max_y, title: { display: true, text: "GW", color: ink2 }, ticks: { color: ink2 }, grid: { color: line } },
            x: { ticks: { color: ink2, autoSkip: false }, grid: { display: false } }
          }
        }
      }));
    });
  }

  function pintarFuentes() {
    $("fuentes").innerHTML = (datos.fuentes || []).map(function (f) {
      return '<li><a href="' + esc(f.url) + '" target="_blank" rel="noopener noreferrer">' + esc(f.titulo) + "</a></li>";
    }).join("");
  }

  function render() {
    var calc = calcular(datos);
    $("nota-general").textContent = (datos.nota_general || "") + " Datos actualizados: " + datos.actualizado + ".";
    pintarLeyenda();
    pintarMatriz(calc);
    pintarBarras(calc);
    pintarTendencias();
    pintarFuentes();
  }

  function estado(msg, error) {
    var e = $("estado");
    e.textContent = msg;
    e.className = "est" + (error ? " err" : "");
  }

  function cargar() {
    return fetch(DATA_URL + "?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) { throw new Error("HTTP " + r.status); }
        return r.json();
      })
      .then(function (d) {
        var cambio = !datos || JSON.stringify(d) !== JSON.stringify(datos);
        datos = d;
        if (cambio) { render(); }
        estado("Leído a las " + new Date().toLocaleTimeString("es-ES"), false);
      })
      .catch(function (e) {
        estado("No se pudo leer data/datos.json (" + e.message + "). Si abres el archivo con doble clic, sírvelo con un servidor local.", true);
      });
  }

  function programar() {
    if (timer) { clearInterval(timer); timer = null; }
    if ($("auto").checked) {
      timer = setInterval(cargar, parseInt($("intervalo").value, 10) * 1000);
    }
  }

  $("recargar").addEventListener("click", cargar);
  $("auto").addEventListener("change", programar);
  $("intervalo").addEventListener("change", programar);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { if (datos) { pintarTendencias(); } });

  cargar().then(programar);
}
