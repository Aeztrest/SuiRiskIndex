"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { apiClient } from "@/lib/api";
import type { PoolSummary } from "@/lib/types";
import { getIdentityLevel } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

// Node representation used for the bubble map
interface PoolNode extends d3.SimulationNodeDatum {
  id: number;
  label: string;
  dex: string;
  tvlUsd: number;
  riskScore: number;
  capturedAt?: string | null;
}

interface HoverState {
  node: PoolNode;
  x: number;
  y: number;
}

const DEFAULT_WIDTH = 900;
const DEFAULT_HEIGHT = 450;

export function PoolsBubbleMap() {
  const [summary, setSummary] = useState<PoolSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<HoverState | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);

  // Resize observer to keep the SVG responsive
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width) {
          setWidth(entry.contentRect.width);
        }
      }
    });

    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  // Fetch summary data once
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getPoolsSummary();
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load pool summary");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  // Transform API response to nodes for the simulation
  const nodes: PoolNode[] = useMemo(() => {
    return summary.map((p) => {
      const tvl = p.metric?.tvl_usd ?? 0;
      const riskScore = p.metric?.risk_score ?? 100;
      const token0 = p.token0 ?? "?";
      const token1 = p.token1 ?? "?";
      const label = `${token0} / ${token1}`;

      return {
        id: p.id,
        label,
        dex: p.dex_name,
        tvlUsd: tvl,
        riskScore,
        capturedAt: p.metric?.captured_at ?? null,
        x: width / 2,
        y: DEFAULT_HEIGHT / 2,
      } as PoolNode;
    });
  }, [summary, width]);

  // Build layout using d3-force
  const layoutNodes = useMemo<(PoolNode & { radius: number; color: string })[]>(() => {
    if (nodes.length === 0) return [];

    const minTVL = Math.min(...nodes.map((n) => n.tvlUsd), 0);
    const maxTVL = Math.max(...nodes.map((n) => n.tvlUsd), 1);

    const radiusScale = d3
      .scaleSqrt()
      .domain([Math.max(0, minTVL), maxTVL || 1])
      .range([10, 70]);

    const colorScale = d3
      .scaleLinear<string>()
      .domain([0, 50, 100])
      .range(["#22c55e", "#eab308", "#ef4444"]);

    const simNodes = nodes.map((n) => ({ ...n }));

    const simulation = d3
      .forceSimulation(simNodes)
      .force("charge", d3.forceManyBody().strength(5))
      .force("center", d3.forceCenter(width / 2, DEFAULT_HEIGHT / 2))
      .force(
        "collision",
        d3.forceCollide<PoolNode>().radius((d) => Math.max(radiusScale(d.tvlUsd || 0), 10) + 4)
      )
      .stop();

    for (let i = 0; i < 200; i += 1) {
      simulation.tick();
    }

    return simNodes.map((n) => ({
      ...n,
      radius: Math.max(radiusScale(n.tvlUsd || 0), 10),
      color: colorScale(n.riskScore ?? 100),
    }));
  }, [nodes, width]);

  const height = DEFAULT_HEIGHT;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-[300px] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        </div>
      );
    }

    if (error) {
      return <div className="text-sm text-red-600">{error}</div>;
    }

    if (layoutNodes.length === 0) {
      return <div className="text-sm text-gray-600">No pool metrics available yet. Sync metrics to see the bubble map.</div>;
    }

    return (
      <div className="relative" ref={containerRef}>
        <svg
          role="img"
          aria-label="Pool bubble map"
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full"
        >
          {layoutNodes.map((node) => (
            <g
              key={node.id}
              transform={`translate(${node.x},${node.y})`}
              onMouseEnter={(e) =>
                setHovered({
                  node,
                  x: e.clientX,
                  y: e.clientY,
                })
              }
              onMouseMove={(e) =>
                setHovered({
                  node,
                  x: e.clientX,
                  y: e.clientY,
                })
              }
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              <circle
                r={(node as any).radius}
                fill={(node as any).color}
                className="transition-opacity duration-150 hover:opacity-80"
              />
              <text
                textAnchor="middle"
                dy={4}
                className="pointer-events-none select-none text-xs fill-white font-semibold"
              >
                {node.label.length > 12 ? `${node.label.slice(0, 12)}…` : node.label}
              </text>
            </g>
          ))}
        </svg>

        {hovered && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg"
            style={{ left: hovered.x - 40, top: hovered.y - 80 }}
          >
            <div className="text-xs text-gray-500">{hovered.node.dex}</div>
            <div className="text-sm font-semibold text-gray-900">{hovered.node.label}</div>
            <div className="text-sm text-gray-700">
              TVL: <span className="font-medium">{formatCurrency(hovered.node.tvlUsd)}</span>
            </div>
            <div className="text-sm text-gray-700">
              Risk: <span className="font-medium">{hovered.node.riskScore ?? 100}</span>
              {" "}({getIdentityLevel(hovered.node.riskScore ?? 100)})
            </div>
            {hovered.node.capturedAt && (
              <div className="text-xs text-gray-500 mt-1">Captured: {hovered.node.capturedAt}</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return <div>{renderContent()}</div>;
}
