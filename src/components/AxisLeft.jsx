import React from "react"

import { select as d3select } from "d3-selection"
import { transition as d3transition } from "d3-transition"
import { axisLeft as d3AxisLeft } from "d3-axis"

export const AxisLeft = props => {
  const {
    adjustedWidth, adjustedHeight, showGridLines = true,
    gridLineOpacity = 0.25, axisColor = "currentColor", axisOpacity = 1,
    domain, scale, format, type = "linear",
    secondary, label, margin, ticks = 10, tickValues, tickDensity = 8
  } = props;

  const ref = React.useRef();

  React.useEffect(() => {
    if (ref.current) {
      renderAxisLeft(ref.current,
        adjustedWidth, adjustedHeight,
        domain, scale, type, format,
        secondary, label, margin,
        ticks, tickValues, showGridLines, gridLineOpacity,
        axisColor, axisOpacity, tickDensity
      );
    }
  }, [adjustedWidth, adjustedHeight, showGridLines,
      domain, scale, type, format,
      secondary, label, margin, ticks, tickValues,
      gridLineOpacity, axisColor, axisOpacity, tickDensity]
  );

  return <g ref={ ref }/>;
}

const renderAxisLeft = (ref,
                        adjustedWidth, adjustedHeight,
                        domain, scale, type, format,
                        secondary, label, margin,
                        ticks, tickValues, showGridLines, gridLineOpacity,
                        axisColor, axisOpacity, tickDensity) => {

  const { left, top } = margin;

  if (!tickValues && (type === "band")) {
    const ticks = Math.ceil(adjustedHeight / 100 * tickDensity),
      mod = Math.ceil(domain.length / ticks),
      halfMod = Math.floor(mod * 0.5);

    tickValues = domain.filter((d, i) =>
      (mod === 1 || (i > 0)) &&
      (mod === 1 || (i < (domain.length - 1))) &&
      !((i - halfMod) % mod)
    );
  }
  else if (!tickValues && (type === "ordinal")) {
    const density = 100 / tickDensity;
    let tick = 0;
    tickValues = [];

    for (let i = 0; i < domain.length; ++i) {
      if (i > 0) {
        tick += scale(domain[i]) - scale(domain[i - 1]);
      }
      if (!tickValues.length && (tick >= density * 0.5)) {
        tickValues.push(domain[i]);
        tick = 0;
      }
      else if (tick >= density) {
        tickValues.push(domain[i]);
        tick = 0;
      }
    }
  }

  const axisLeft = d3AxisLeft(scale)
    .tickFormat(format);

  if (tickValues) {
    axisLeft.tickValues(tickValues);
  }
  else if (ticks) {
    axisLeft.ticks(ticks);
  }

  const transition = d3transition().duration(1000);

  const animatedGroup = d3select(ref)
    .selectAll("g.animated-group")
    .data(["animated-group"])
    .join(
      enter => enter.append("g")
        .attr("class", "animated-group")
        .call(enter =>
          enter.style("transform", `translate(${ left }px, ${ top }px)`)
        ),
      update => update
        .call(
          update => update.transition(transition)
            .style("transform", `translate(${ left }px, ${ top }px)`)
        ),
      exit => exit
        .call(exit =>
          exit.transition(transition)
            .style("transform", `translate(${ left }px, ${ top }px)`)
          .remove()
        )
    );

  const group = animatedGroup.selectAll("g.axis-group")
    .data(domain.length ? ["axis-group"] : [])
      .join(
        enter => enter.append("g")
          .attr("class", "axis-group")
          .call(enter =>
            enter
              .style("transform", `translateY(${ adjustedHeight }px) scale(0, 0)`)
              .transition(transition)
                .style("transform", "translateY(0px) scale(1, 1)")
          ),
        update => update
          .call(update =>
            update.transition(transition)
              .style("transform", "translateY(0px) scale(1, 1)")
          ),
        exit => exit
          .call(exit =>
            exit.transition(transition)
              .style("transform", `translateY(${ adjustedHeight }px) scale(0, 0)`)
            .remove()
          )
      );

  group.selectAll("g.axis")
    .data(domain.length ? ["axis-left"] : [])
    .join("g")
      .attr("class", "axis axis-left")
        .classed("secondary", secondary)
        .transition(transition)
        .call(axisLeft)
        .call(g => g.selectAll(".tick line")
                    .attr("stroke", "currentColor")
                    .attr("stroke-opacity", gridLineOpacity)
        )
        .select(".domain")
          .attr("stroke", axisColor)
          .attr("opacity", axisOpacity);

  group.selectAll("text.axis-label")
    .data(domain.length && Boolean(label) ? [label] : [])
    .join("text")
      .attr("class", "axis-label axis-label-left")
      .style("transform",
        `translate(${ -left + 20 }px, ${ adjustedHeight * 0.5 }px) rotate(-90deg)`
      )
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .attr("font-size", "1rem")
      .text(d => d);

  const show = (type === "linear") && showGridLines && scale && domain.length;

  const gridLines = group.selectAll("line.grid-line"),
    numGridLines = gridLines.size(),
    numTicks = show ? scale.ticks(ticks).length : 0,

    gridEnter = show ? numGridLines && (numGridLines < numTicks) ?
      scale(domain[1] * 1.5) : scale(domain[1]) : 0,

    gridExit = show ? scale(domain[1] * 1.5) : adjustedHeight;

  gridLines
    .data(show ? scale.ticks(ticks) : [])
    .join(
      enter => enter.append("line")
        .attr("class", "grid-line")
        .attr("x1", 0)
        .attr("x2", adjustedWidth)
        .attr("y1", gridEnter)
        .attr("y2", gridEnter)
        .attr("stroke", "currentColor")
        .attr("stroke-opacity", gridLineOpacity)
          .call(enter => enter
            .transition(transition)
              .attr("y1", d => scale(d) + 0.5)
              .attr("y2", d => scale(d) + 0.5)
          ),
      update => update
        .call(update => update
          .attr("stroke", "currentColor")
          .attr("stroke-opacity", gridLineOpacity)
          .transition(transition)
            .attr("x2", adjustedWidth)
            .attr("y1", d => scale(d) + 0.5)
            .attr("y2", d => scale(d) + 0.5)
        ),
      exit => exit
        .call(exit => exit
          .transition(transition)
            .attr("y1", gridExit)
            .attr("y2", gridExit)
          .remove()
        )
    );
}
