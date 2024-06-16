import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
//@ts-ignore
import * as d3 from "d3";
import tree from "./tree.json";

//@ts-ignore
function parseNewick(a){
  for(var e=[],r={},s=a.split(/\s*(;|\(|\)|,|:)\s*/),t=0;t<s.length;t++) {
    var n=s[t];
    switch(n) {
      case"(":
        var c={};
        //@ts-ignore
        r.branchset=[c];
        e.push(r);
        r=c;
        break;
      case",":
        var c={};
        // @ts-ignore
        e[e.length-1].branchset.push(c);
        r=c;
        break;
      case")":
        //@ts-ignore
        r=e.pop();
        break;
      case":":
        break;
      default:
        var h=s[t-1];
        ")"==h||"("==h||","==h 
          //@ts-ignore
          ? r.name=n
          //@ts-ignore
          : ":"==h && (r.length=parseFloat(n))
    }
  }
  return r
}

const outerRadius = 477;
const width = 954;
const innerRadius = 307;

function setRadius(d: any, y0: any, k: any) {
  d.radius = (y0 += d.data.length) * k;
  if (d.children) d.children.forEach((d: any) => setRadius(d, y0, k));
}

// Compute the maximum cumulative length of any node in the tree.
function maxLength(d: any) {
  return d.data.length + (d.children ? d3.max(d.children, maxLength) : 0);
}

const color = d3.scaleOrdinal()
    .domain(["Reference Set"])
    .range(d3.schemeCategory10)

// Set the color of each node by recursively inheriting.
function setColor(d: any) {
  var name = d.data.name;
  // @ts-ignore
  d.color = color.domain().indexOf(name) >= 0 ? color(name) : d.parent ? d.parent.color : null;
  if (d.children) d.children.forEach(setColor);
}

const cluster = d3.cluster()
    .size([360, innerRadius])
    .separation((a: any, b: any) => 1)

function linkExtensionConstant(d: any) {
  return linkStep(d.target.x, d.target.y, d.target.x, innerRadius);
}

function linkStep(startAngle: number, startRadius: number, endAngle: number, endRadius: number) {
  const c0 = Math.cos(startAngle = (startAngle - 90) / 180 * Math.PI);
  const s0 = Math.sin(startAngle);
  const c1 = Math.cos(endAngle = (endAngle - 90) / 180 * Math.PI);
  const s1 = Math.sin(endAngle);
  return "M" + startRadius * c0 + "," + startRadius * s0
      + (endAngle === startAngle ? "" : "A" + startRadius + "," + startRadius + " 0 0 " + (endAngle > startAngle ? 1 : 0) + " " + startRadius * c1 + "," + startRadius * s1)
      + "L" + endRadius * c1 + "," + endRadius * s1;
}

function linkConstant(d: any) {
  return linkStep(d.source.x, d.source.y, d.target.x, d.target.y);
}

function linkVariable(d: any) {
  return linkStep(d.source.x, d.source.radius, d.target.x, d.target.radius);
}

function linkExtensionVariable(d: any) {
  return linkStep(d.target.x, d.target.radius, d.target.x, innerRadius);
}

const legend = (svg: any) => {
  const g = svg
    .selectAll("g")
    .data(color.domain())
    .join("g")
      .attr("transform", (d: any, i: any) => `translate(${-outerRadius},${-outerRadius + i * 20})`);

  g.append("rect")
      .attr("width", 18)
      .attr("height", 18)
      .attr("fill", color);

  g.append("text")
      .attr("x", 24)
      .attr("y", 9)
      .attr("dy", "0.35em")
      .text((d: any) => d);
}

function buildChart(data: any) {

  function update(checked: any) {
    const t = d3.transition().duration(750);
    linkExtension.transition(t).attr("d", checked ? linkExtensionVariable : linkExtensionConstant);
    link.transition(t).attr("d", checked ? linkVariable : linkConstant);
  }

  function mouseovered(active: boolean) {
    return function(event: any, d: any) {
      // @ts-ignore
      d3.select(this).classed("label--active", active);
      d3.select(d.linkExtensionNode).classed("link-extension--active", active).raise();
      do {
        d3.select(d.linkNode).classed("link--active", active).raise();
      } while (d = d.parent);
    };
  }

  const root = d3.hierarchy(data, (d: any) => d.branchset)
      .sum((d: any) => d.branchset ? 0 : 1)
      .sort((a: any, b: any) => (a.value - b.value) || d3.ascending(a.data.length, b.data.length));
  //@ts-ignore
  cluster(root);
  //@ts-ignore
  setRadius(root, root.data.length = 0, innerRadius / maxLength(root));
  //@ts-ignore
  setColor(root);

  // todo(dant): Is this necessary? Without I end up duplicating because the useEffect triggersa
  //   a double render
  d3.select("#phy-tree-cont").selectAll("*").remove();
  const svg = d3.select('#phy-tree-cont').append("svg")
    .attr("viewBox", [-outerRadius, -outerRadius, width, width])
    .attr("font-family", "sans-serif")
    .attr("font-size", 10);

  //@ts-ignore
  svg.append("g").call(legend);

  svg.append("style").text(`

  .link--active {
    stroke: #000 !important;
    stroke-width: 1.5px;
  }
  
  .link-extension--active {
    stroke-opacity: .6;
  }
  
  .label--active {
    font-weight: bold;
  }
  
  `);

  const linkExtension = svg.append("g")
    .attr("fill", "none")
    .attr("stroke", "#000")
    .attr("stroke-opacity", 0.25)
  .selectAll("path")
  .data(root.links().filter((d: any) => !d.target.children))
  .join("path")
    //@ts-ignore
    .each(function(d: any) { d.target.linkExtensionNode = this; })
    .attr("d", linkExtensionConstant);

  const link = svg.append("g")
    .attr("fill", "none")
    .attr("stroke", "#000")
  .selectAll("path")
  .data(root.links())
  .join("path")
    //@ts-ignore
    .each(function(d) { d.target.linkNode = this; })
    .attr("d", linkConstant)
    .attr("stroke", (d: any) => d.target.color);

  svg.append("g")
    .selectAll("text")
    .data(root.leaves())
    .join("text")
      .attr("dy", ".31em")
      .attr("transform", (d: any) => `rotate(${d.x - 90}) translate(${innerRadius + 4},0)${d.x < 180 ? "" : " rotate(180)"}`)
      .attr("text-anchor", (d: any) => d.x < 180 ? "start" : "end")
      .text((d: any) => d.data.name.replace(/_/g, " "))
      .on("mouseover", mouseovered(true))
      .on("mouseout", mouseovered(false));

}

function App() {

  useEffect(() => {
    const { newick } = tree;
    const data = parseNewick(newick);
    const node = buildChart(data);
  }, []);

  return (
    <div id='phy-tree-cont'>
    </div>
  );
}

export default App;
