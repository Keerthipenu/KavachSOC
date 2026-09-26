import React, { useState, useMemo } from 'react';
import { 
  Network, User, Monitor, Terminal, Server, Database, Globe, 
  ZoomIn, ZoomOut, RotateCcw, ShieldAlert, Info, X, ExternalLink, Activity
} from 'lucide-react';
import { AttackGraphData, AttackNode, AttackEdge } from '../types';

interface AttackGraphProps {
  graphData: AttackGraphData | null;
  onSelectEvent?: (eventId: string) => void;
  height?: string;
}

export const AttackGraph: React.FC<AttackGraphProps> = ({
  graphData,
  onSelectEvent,
  height = 'h-[480px]',
}) => {
  const [selectedNode, setSelectedNode] = useState<AttackNode | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Calculate coordinates for nodes based on type and sequence
  const layout = useMemo(() => {
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      return { nodesWithPos: [], width: 900, height: 420 };
    }

    const nodes = graphData.nodes;
    const typeOrder: Record<string, number> = {
      ip: 0,
      account: 1,
      endpoint: 2,
      process: 3,
      server: 4,
      database: 5,
    };

    // Group nodes by column based on node type
    const columns: Record<number, AttackNode[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };

    nodes.forEach((n) => {
      let colIdx = typeOrder[n.node_type] ?? 2;
      // If ip is internal destination (e.g. 10.0.0.50 or destination), shift to right
      if (n.node_type === 'ip' && (n.label.startsWith('10.') || n.label.startsWith('203.'))) {
        colIdx = 4;
      }
      if (n.node_type === 'endpoint' && n.label.includes('server')) {
        colIdx = 4;
      }
      columns[colIdx].push(n);
    });

    const activeColIndices = Object.keys(columns)
      .map(Number)
      .filter((idx) => columns[idx].length > 0)
      .sort((a, b) => a - b);

    const totalCols = Math.max(activeColIndices.length, 3);
    const canvasWidth = 900;
    const canvasHeight = 420;
    const paddingX = 90;
    const colSpacing = (canvasWidth - paddingX * 2) / (totalCols - 1 || 1);

    const positions = new Map<string, { x: number; y: number }>();

    activeColIndices.forEach((colIdx, visualCol) => {
      const colNodes = columns[colIdx];
      const x = paddingX + visualCol * colSpacing;
      const rowSpacing = canvasHeight / (colNodes.length + 1);

      colNodes.forEach((node, rowIdx) => {
        const y = rowSpacing * (rowIdx + 1);
        positions.set(node.id, { x, y });
      });
    });

    const nodesWithPos = nodes.map((node) => ({
      ...node,
      pos: positions.get(node.id) || { x: 450, y: 210 },
    }));

    return { nodesWithPos, width: canvasWidth, height: canvasHeight };
  }, [graphData]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  const getNodeIcon = (type: string, label: string) => {
    if (type === 'ip') {
      return label.startsWith('10.') ? <Server className="w-4 h-4" /> : <Globe className="w-4 h-4" />;
    }
    if (type === 'account') return <User className="w-4 h-4" />;
    if (type === 'endpoint') {
      return label.toLowerCase().includes('server') ? <Server className="w-4 h-4" /> : <Monitor className="w-4 h-4" />;
    }
    if (type === 'process') return <Terminal className="w-4 h-4" />;
    if (type === 'database') return <Database className="w-4 h-4" />;
    return <Network className="w-4 h-4" />;
  };

  const getNodeColor = (type: string, label: string) => {
    if (type === 'ip' && !label.startsWith('10.')) {
      return { border: 'border-rose-500', bg: 'bg-rose-950/80', text: 'text-rose-400' };
    }
    if (type === 'process') {
      return { border: 'border-amber-500', bg: 'bg-amber-950/80', text: 'text-amber-400' };
    }
    if (type === 'account') {
      return { border: 'border-slate-600', bg: 'bg-slate-800/80', text: 'text-slate-300' };
    }
    if (label.toLowerCase().includes('server')) {
      return { border: 'border-rose-600', bg: 'bg-rose-950/90', text: 'text-rose-300' };
    }
    return { border: 'border-cyan-500', bg: 'bg-cyan-950/80', text: 'text-cyan-400' };
  };

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className={`w-full ${height} bg-[#111820] border border-slate-800 rounded-lg flex flex-col items-center justify-center text-slate-500 font-sans text-xs`}>
        <Network className="w-8 h-8 text-slate-600 mb-2 animate-pulse" />
        <span>No attack graph available. Ingest a threat scenario to reconstruct entity topology.</span>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${height} bg-[#0d1117] border border-slate-800 rounded-lg overflow-hidden flex flex-col select-none`}>
      {/* Controls Overlay */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-[#151b23]/90 backdrop-blur-sm p-1.5 rounded-lg border border-slate-800 font-sans text-xs">
        <button
          onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
          title="Zoom In"
          className="p-1.5 rounded text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
          title="Zoom Out"
          className="p-1.5 rounded text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          title="Reset View"
          className="p-1.5 rounded text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="h-4 w-[1px] bg-slate-700 mx-1" />
        <span className="text-[11px] text-slate-400 px-1">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Legend */}
      <div className="absolute top-3 right-3 z-20 hidden md:flex items-center gap-3 bg-[#151b23]/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-800 font-sans text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-500" /> Attacker / Target
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-500" /> User
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-cyan-400" /> Endpoint
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400" /> Process
        </span>
      </div>

      {/* Interactive SVG Canvas */}
      <div
        className="flex-1 w-full h-full cursor-grab active:cursor-grabbing soc-grid-bg relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          className="w-full h-full"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker
              id="arrow-cyan"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#4f7fb8" opacity="0.8" />
            </marker>
            <marker
              id="arrow-red"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#b74343" opacity="0.9" />
            </marker>
          </defs>

          <g
            transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
            transform-origin="center"
            className="transition-transform duration-75"
          >
            {/* Edges */}
            {graphData.edges.map((edge, idx) => {
              const srcNode = layout.nodesWithPos.find((n) => 
                n.id === edge.source || edge.source.endsWith(`:${n.id}`) || edge.source.includes(n.id)
              );
              const tgtNode = layout.nodesWithPos.find((n) => 
                n.id === edge.target || edge.target.endsWith(`:${n.id}`) || edge.target.includes(n.id)
              );
              if (!srcNode || !tgtNode) return null;

              const isSuspicious = edge.relationship.includes('service') || edge.relationship.includes('access') || edge.relationship.includes('connection');
              const midX = (srcNode.pos.x + tgtNode.pos.x) / 2;
              const midY = (srcNode.pos.y + tgtNode.pos.y) / 2 - 10;

              return (
                <g key={`edge-${idx}`}>
                  <path
                    d={`M ${srcNode.pos.x} ${srcNode.pos.y} Q ${midX} ${midY + 25} ${tgtNode.pos.x} ${tgtNode.pos.y}`}
                    stroke={isSuspicious ? '#b74343' : '#4f7fb8'}
                    strokeWidth="1.8"
                    strokeDasharray={isSuspicious ? '4,4' : 'none'}
                    strokeOpacity="0.75"
                    fill="none"
                    markerEnd={isSuspicious ? 'url(#arrow-red)' : 'url(#arrow-cyan)'}
                    className="hover:stroke-cyan-300 hover:stroke-width-3 transition-colors cursor-pointer"
                  />
                  {/* Edge label */}
                  <text
                    x={midX}
                    y={midY}
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="bg-black/80 px-1"
                  >
                    {edge.relationship.replace(/_/g, ' ')}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {layout.nodesWithPos.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const colors = getNodeColor(node.node_type, node.label);

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.pos.x}, ${node.pos.y})`}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(node);
                  }}
                >
                  {/* Selection ring */}
                  {isSelected && (
                    <circle
                      r="26"
                      fill="none"
                      stroke="#4f7fb8"
                      strokeWidth="2"
                      opacity="0.6"
                    />
                  )}

                  {/* Main Circle */}
                  <circle
                    r="20"
                    fill="#111820"
                    stroke={isSelected ? '#4f7fb8' : colors.text.replace('text-', '') === 'rose-400' ? '#b74343' : '#37414d'}
                    strokeWidth={isSelected ? '2.5' : '1.5'}
                    className="transition-colors duration-200 group-hover:scale-105"
                  />

                  {/* Icon wrapper */}
                  <foreignObject x="-10" y="-10" width="20" height="20" className="pointer-events-none">
                    <div className={`w-full h-full flex items-center justify-center ${colors.text}`}>
                      {getNodeIcon(node.node_type, node.label)}
                    </div>
                  </foreignObject>

                  {/* Node Label Below */}
                  <text
                    y="34"
                    fill={isSelected ? '#4f7fb8' : '#cbd5e1'}
                    fontSize="10"
                    fontWeight={isSelected ? '700' : '500'}
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="pointer-events-none"
                  >
                    {node.label}
                  </text>
                  <text
                    y="45"
                    fill="#64748b"
                    fontSize="8"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="pointer-events-none uppercase tracking-wider"
                  >
                    {node.node_type}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Node Inspector Side Panel */}
      {selectedNode && (
        <div className="absolute top-0 right-0 w-80 h-full bg-[#151b23]/95 backdrop-blur-md border-l border-slate-700/80 p-4 overflow-y-auto z-30 font-sans text-xs flex flex-col justify-between animate-in slide-in-from-right duration-200">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <Info className="w-4 h-4" />
                <span>NODE DETAILS</span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">LABEL & ENTITY</span>
                <span className="text-sm font-bold text-slate-100">{selectedNode.label}</span>
                <span className="text-[11px] text-cyan-400 block uppercase mt-0.5">
                  TYPE: {selectedNode.node_type}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase block">GRAPH ID</span>
                <span className="text-slate-400 text-[11px] break-all">{selectedNode.id}</span>
              </div>

              {selectedNode.timestamp && (
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">DETECTED AT</span>
                  <span className="text-slate-300">
                    {new Date(selectedNode.timestamp).toLocaleString()}
                  </span>
                </div>
              )}

              {/* MITRE Mapping */}
              {selectedNode.mitre_technique && (
                <div className="p-2.5 rounded bg-purple-950/30 border border-purple-800/40">
                  <span className="text-[10px] text-purple-300 uppercase font-semibold block mb-1">
                    MITRE ATT&CK LINKAGE
                  </span>
                  <div className="text-purple-200 font-bold text-[11px]">
                    {selectedNode.mitre_technique.technique_id} · {selectedNode.mitre_technique.technique_name}
                  </div>
                  <span className="text-[10px] text-purple-400 block mt-0.5">
                    Tactic: {selectedNode.mitre_technique.tactic}
                  </span>
                </div>
              )}

              {/* Evidence IDs */}
              <div>
                <span className="text-[10px] text-slate-500 uppercase block mb-1">
                  CORRELATED EVIDENCE ({selectedNode.evidence?.length || 0})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedNode.evidence || []).map((eid) => (
                    <button
                      key={eid}
                      onClick={() => onSelectEvent && onSelectEvent(eid)}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500 text-cyan-300 text-[10px] flex items-center gap-1 transition-colors"
                    >
                      <span>{eid}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center justify-between">
            <span>TOPOLOGY ENTITY</span>
            <span className="text-cyan-400">ACTIVE INTRUSION GRAPH</span>
          </div>
        </div>
      )}
    </div>
  );
};
