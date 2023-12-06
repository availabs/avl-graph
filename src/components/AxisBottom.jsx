import React from "react"

import { select as d3select } from "d3-selection"
import { transition as d3transition } from "d3-transition"
import { axisBottom as d3AxisBottom } from "d3-axis"

export const AxisBottom = props => {
  const {
    adjustedWidth, adjustedHeight, type = "band",
    domain, scale, format, ticks, tickValues,
    secondary, label, margin, tickDensity = 2,
    showGridLines = true,
    gridLineOpacity = 0.25, axisColor = "currentColor", axisOpacity = 1
  } = props;

  const ref = React.useRef();

  React.useEffect(() => {
    if (ref.current) {
      renderAxisBottom({
        ref: ref.current,
        adjustedWidth, adjustedHeight, type,
        domain, scale, format, ticks, tickValues,
        secondary, label, margin, tickDensity,
        showGridLines, gridLineOpacity, axisColor, axisOpacity
      });
    }
  }, [adjustedWidth, adjustedHeight, type,
      domain, scale, format, ticks, tickValues,
      secondary, label, margin, tickDensity,
      showGridLines, gridLineOpacity, axisColor, axisOpacity]
  );

  return <g ref={ ref }/>;
}

const renderAxisBottom = ({ ref,
                    adjustedWidth, adjustedHeight, type,
                    domain, scale, format, ticks, tickValues,
                    secondary, label, margin, tickDensity,
                    showGridLines, gridLineOpacity, axisColor, axisOpacity }) => {

  const { left, top, bottom } = margin;

  if (!tickValues && (type === "band")) {
    const ticks = Math.ceil(adjustedWidth / 100 * tickDensity),
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

  const axisBottom = d3AxisBottom(scale)
    .tickFormat(format);

  if (tickValues) {
    axisBottom.tickValues(tickValues);
  }
  else if (ticks) {
    axisBottom.ticks(ticks);
  }

  const transition = d3transition().duration(1000);

  const animatedGroup = d3select(ref)
    .selectAll("g.animated-group")
    .data(["animated-group"])
    .join(
      enter => enter.append("g")
        .attr("class", "animated-group")
        .call(enter =>
          enter.style("transform", `translate(${ left }px, ${ adjustedHeight + top }px)`)
        ),
      update => update
        .call(
          update => update.transition(transition)
            .style("transform", `translate(${ left }px, ${ adjustedHeight + top }px)`)
        ),
      exit => exit
        .call(exit =>
          exit.transition(transition)
            .remove()
        )
    );

  const group = animatedGroup.selectAll("g.axis-group")
    .data(domain.length ? ["axis-group"] : [])
    .join(
      enter => enter.append("g")
        .attr("class", "axis-group")
        .call(enter =>
          enter.style("transform", `scale(0, 0)`)
            .transition(transition)
              .style("transform", "scale(1, 1)")
        ),
      update => update
        .call(update =>
          update.transition(transition)
            .style("transform", "scale(1, 1)")
        ),
      exit => exit
        .call(exit =>
          exit.transition(transition)
            .style("transform", `scale(0, 0)`)
          .remove()
        )
    );

  group.selectAll("g.axis")
    .data(domain.length ? ["axis-bottom"] : [])
      .join("g")
        .attr("class", "axis axis-bottom")
        .classed("secondary", secondary)
        .transition(transition)
        .call(axisBottom)
        .select(".domain")
        .attr("stroke", axisColor)
        .attr("opacity", axisOpacity);

  group.selectAll("text.axis-label")
    .data(domain.length && Boolean(label) ? [label] : [])
      .join("text")
        .attr("class", "axis-label axis-label-bottom")
        .style("transform", `translate(${ adjustedWidth * 0.5 }px, ${ bottom - 9 }px)`)
        .attr("text-anchor", "middle")
				.attr("fill", "currentColor")
        .attr("font-size", "1rem")
        .text(d => d);

    const show = (type === "linear") && showGridLines && Boolean(scale) && Boolean(domain.length);

    const gridLines = group.selectAll("line.grid-line"),
      numGridLines = gridLines.size(),
      numTicks = show ? scale.ticks(ticks).length : 0;

    const gridEnter = numGridLines && (numGridLines < numTicks) ?
        scale(domain[1] * 1.5) : scale(domain[0]);

    const gridExit = show ? (0 === domain[0] && 0 === domain[1]) ? 0 : scale(domain[1] * 1.5) : 0;

    gridLines
      .data(show ? scale.ticks(ticks) : [])
      .join(
        enter => enter.append("line")
          .attr("class", "grid-line")
          .attr("x1", gridEnter)
          .attr("x2", gridEnter)
          .attr("y1", 0)
          .attr("y2", -adjustedHeight)
          .attr("stroke", "currentColor")
          .attr("stroke-opacity", gridLineOpacity)
            .call(enter => enter
              .transition(transition)
                .attr("x1", d => scale(d) + 0.5)
                .attr("x2", d => scale(d) + 0.5)
            ),
        update => update
          .call(update => update
            .attr("stroke", "currentColor")
            .attr("stroke-opacity", gridLineOpacity)
            .transition(transition)
              .attr("y2", -adjustedHeight)
              .attr("x1", d => scale(d) + 0.5)
              .attr("x2", d => scale(d) + 0.5)
          ),
        exit => exit
          .call(exit => exit
            .transition(transition)
              .attr("x1", gridExit)
              .attr("x2", gridExit)
            .remove()
          )
      );
}
