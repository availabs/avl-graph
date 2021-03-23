import React from "react"

import * as d3 from "d3"

export const AxisBottom = props => {
  const {
    adjustedWidth, adjustedHeight,
    domain, scale, format,
    secondary, label, margin, tickDensity = 2
  } = props;

  const ref = React.useRef();

  React.useEffect(() => {
    if (ref.current) {
      renderAxisBottom(ref.current,
        adjustedWidth, adjustedHeight,
        domain, scale, format,
        secondary, label, margin, tickDensity
      );
    }
  }, [adjustedWidth, adjustedHeight,
      domain, scale, format,
      secondary, label, margin, tickDensity]
  );

  return <g ref={ ref }/>;
}

const renderAxisBottom = (ref,
                    adjustedWidth,
                    adjustedHeight,
                    domain, scale, format,
                    secondary, label,
                    margin, tickDensity) => {

  const { left, top, bottom } = margin;

  const ticks = Math.ceil(adjustedWidth / 100 * tickDensity),
    mod = Math.ceil(domain.length / ticks),
    halfMod = Math.floor(mod * 0.5),

    tickValues = domain.filter((d, i) =>
      (mod === 1 || (i > 0)) &&
      (mod === 1 || (i < (domain.length - 1))) &&
      !((i - halfMod) % mod)
    );

  const axisBottom = d3.axisBottom(scale)
    .tickValues(tickValues)
    .tickFormat(format);

  const transition = d3.transition().duration(1000);

  const animatedGroup = d3.select(ref)
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
        .call(axisBottom);

  group.selectAll("text.axis-label")
    .data(domain.length && Boolean(label) ? [label] : [])
      .join("text")
        .attr("class", "axis-label axis-label-bottom")
        .style("transform", `translate(${ adjustedWidth * 0.5 }px, ${ bottom - 9 }px)`)
        .attr("text-anchor", "middle")
				.attr("fill", "currentColor")
        .attr("font-size", "1rem")
        .text(d => d);
}
