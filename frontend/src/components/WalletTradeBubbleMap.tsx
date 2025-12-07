"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "@/lib/api";
import type { WalletGraphNode, WalletGraphEdge, WalletGraphResponse } from "@/lib/types";
import { truncateAddress, formatCurrency } from "@/lib/utils";

// react-force-graph needs to be dynamically imported to avoid SSR issues
const ForceGraph2D = dynamic(() => import("react-force-graph").then((mod) => mod.ForceGraph2D), {
  ssr: false,
});

interface WalletTradeBubbleMapProps {
  poolId: number;
}

interface GraphNode extends WalletGraphNode {
  label: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: (WalletGraphEdge & { __id?: string })[];
}

const MIN_RADIUS = 6;
const RADIUS_SCALE = 6;
const HEIGHT = 480;

function riskToColor(risk: number): string {
  const r = Math.max(0, Math.min(1, risk));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  // green -> yellow -> red
  if (r <= 0.5) {
    const t = r / 0.5;
    const g = 0x22;
    const yR = 0xea;
    const yG = 0xb3;
    const yB = 0x08;
    const rR = lerp(0x22, yR, t);
    const rG = lerp(0xc5, yG, t);
    const rB = lerp(0x5e, yB, t);
    return `rgb(${rR}, ${rG}, ${rB})`;
  }
  const t = (r - 0.5) / 0.5;
  const rR = lerp(0xea, 0xef, t);
  const rG = lerp(0xb3, 0x44, t);
  const rB = lerp(0x08, 0x44, t);
  return `rgb(${rR}, ${rG}, ${rB})`;
}

function computeRadius(volume: number): number {
  const v = Math.max(volume, 0);
  return MIN_RADIUS + Math.log(v + 1) * RADIUS_SCALE;
}

export function WalletTradeBubbleMap({ poolId }: WalletTradeBubbleMapProps) {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [meta, setMeta] = useState<WalletGraphResponse["meta"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(900);

  // track container width for responsiveness
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width) {
          setWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchGraph = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getPoolWalletGraph(poolId);
        if (cancelled) return;

        const nodes: GraphNode[] = data.nodes.map((n) => ({
          ...n,
          label: truncateAddress(n.id),
        }));
        const links = data.edges.map((e, idx) => ({ ...e, __id: `${e.source}-${e.target}-${idx}` }));

        setGraph({ nodes, links });
        setMeta(data.meta);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load wallet graph");
        setGraph(null);
        setMeta(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchGraph();
    return () => {
      cancelled = true;
    };
  }, [poolId]);

  const hasData = graph && graph.nodes.length > 0;

  const forceData = useMemo(() => {
    if (!graph) return { nodes: [], links: [] } as GraphData;
    return graph;
  }, [graph]);

  if (loading) {
    return (
      <div className="flex h-[300px] items-center justify-center" ref={containerRef}>
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-600" ref={containerRef}>{error}</div>;
  }

  if (!hasData) {
    return (
      <div className="text-sm text-gray-600" ref={containerRef}>
        No trade data available for this pool yet. Try syncing pools/metrics or pick another pool.
      </div>
    );
  }

  return (
    <div className="w-full" ref={containerRef}>
      <div className="flex items-center justify-between mb-3 text-sm text-gray-600">
        <div>Nodes: {graph?.nodes.length ?? 0} · Edges: {graph?.links.length ?? 0}</div>
        {meta && (
          <div className="text-xs text-gray-500">
            Total volume: {formatCurrency(meta.total_volume)} · Trades: {meta.total_trades}
          </div>
        )}
      </div>
      <ForceGraph2D
        width={width}
        height={HEIGHT}
        graphData={forceData}
        nodeRelSize={4}
        nodeLabel={(node) => {
          const n = node as GraphNode;
          return `${n.id}\nVolume: ${formatCurrency(n.volume)}\nTrades: ${n.trades}`;
        }}
        nodeVal={(node) => computeRadius((node as GraphNode).volume)}
        nodeCanvasObject={(node, ctx) => {
          const n = node as GraphNode & { x?: number; y?: number };
          const radius = computeRadius(n.volume);
          ctx.beginPath();
          ctx.arc(n.x || 0, n.y || 0, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = riskToColor(n.risk);
          ctx.fill();
          ctx.font = "10px Inter, system-ui, sans-serif";
          ctx.fillStyle = "white";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const label = n.label.length > 10 ? `${n.label.slice(0, 10)}…` : n.label;
          ctx.fillText(label, n.x || 0, (n.y || 0));
        }}
        linkColor={() => "rgba(148, 163, 184, 0.6)"}
        linkWidth={(link) => Math.max(1, Math.log(((link as WalletGraphEdge).volume || 1) + 1))}
        cooldownTicks={120}
        enableNodeDrag={false}
      />
    </div>
  );
}
