import { useEffect, useRef, useState } from 'react';

function ConceptGraph3D({ chatId, chats, messages, workspaceType }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);

  // Load dynamic concept tree from backend API
  useEffect(() => {
    let active = true;
    const fetchTree = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/chats/${chatId}/concept-tree`);
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        
        if (!active) return;
        
        if (data.nodes && data.nodes.length > 0) {
          const numNodes = data.nodes.length;
          const positionedNodes = data.nodes.map((node, i) => {
            // Evenly distribute nodes on a 3D sphere surface
            const phi = Math.acos(-1 + (2 * i) / numNodes);
            const theta = Math.sqrt(numNodes * Math.PI) * phi;
            const r = 70; // sphere radius
            
            return {
              id: node.id,
              x: r * Math.sin(phi) * Math.cos(theta),
              y: r * Math.sin(phi) * Math.sin(theta),
              z: r * Math.cos(phi),
              projX: 0,
              projY: 0,
              projRadius: 0,
              label: node.label,
              page: node.page,
              text: node.text
            };
          });
          
          nodesRef.current = positionedNodes;
          edgesRef.current = data.edges || [];
          return;
        }
      } catch (err) {
        console.error("Concept tree fetch failed, falling back to mock topics:", err);
      }
      
      // Fallback mock topics if fetch fails or is empty
      if (!active) return;
      
      let topics = [
        { label: "Document Abstract", page: 1, text: "The abstract summarizes the document overview and core thesis statements." },
        { label: "Introduction", page: 2, text: "Section 1 provides historical context and initial research directives." },
        { label: "Core Content", page: 3, text: "Detailed discussion of systems implementation, parameters, and algorithms." },
        { label: "Results & Testing", page: 4, text: "Experimental outcomes showing performance graphs and score tables." },
        { label: "Summary Outline", page: 5, text: "Final summary outlining core conclusions, references, and next steps." }
      ];
      
      const numNodes = topics.length;
      const fallbackNodes = topics.map((topic, i) => {
        const phi = Math.acos(-1 + (2 * i) / numNodes);
        const theta = Math.sqrt(numNodes * Math.PI) * phi;
        const r = 70;
        
        return {
          id: i,
          x: r * Math.sin(phi) * Math.cos(theta),
          y: r * Math.sin(phi) * Math.sin(theta),
          z: r * Math.cos(phi),
          projX: 0,
          projY: 0,
          projRadius: 0,
          label: topic.label,
          page: topic.page,
          text: topic.text
        };
      });
      
      const fallbackEdges = [];
      for (let i = 0; i < fallbackNodes.length; i++) {
        fallbackEdges.push({ source: i, target: (i + 1) % fallbackNodes.length });
        if (i > 1) {
          fallbackEdges.push({ source: i, target: (i + 2) % fallbackNodes.length });
        }
      }
      
      nodesRef.current = fallbackNodes;
      edgesRef.current = fallbackEdges;
    };
    
    fetchTree();
    return () => {
      active = false;
    };
  }, [chatId, chats, workspaceType, messages]);

  // Handle WebGL/Canvas rendering loops
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Set colors based on workspaceType
    const themeColors = {
      study: '#4C8DFF',
      audit: '#FF4C4C',
      insight: '#3ECF8E',
      career: '#FFB04C',
      chat: '#4C8DFF'
    };
    const accentColor = themeColors[workspaceType] || '#4C8DFF';

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.fillStyle = '#161616';
      ctx.fillRect(0, 0, width, height);

      // Rotate nodes slowly in 3D
      const angleY = 0.004;
      const angleX = 0.0025;
      const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX), sinX = Math.sin(angleX);

      nodesRef.current.forEach(node => {
        // Y-axis rotation
        const x1 = node.x * cosY - node.z * sinY;
        const z1 = node.z * cosY + node.x * sinY;

        // X-axis rotation
        const y2 = node.y * cosX - z1 * sinX;
        const z2 = z1 * cosX + node.y * sinX;

        node.x = x1;
        node.y = y2;
        node.z = z2;

        // Project 3D to 2D screen coordinates
        const focalLength = 300;
        const scale = focalLength / (focalLength + node.z);
        node.projX = width / 2 + node.x * scale;
        node.projY = height / 2 + node.y * scale;
        node.projRadius = 8 * scale;
      });

      // Draw edges (lines between nodes)
      ctx.lineWidth = 1;
      edgesRef.current.forEach(edge => {
        const source = nodesRef.current[edge.source];
        const target = nodesRef.current[edge.target];

        if (source && target) {
          // Fade lines based on depth (Z coordinate)
          const avgZ = (source.z + target.z) / 2;
          const opacity = Math.max(0.1, 1 - (avgZ + 80) / 160);

          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.15})`;
          ctx.beginPath();
          ctx.moveTo(source.projX, source.projY);
          ctx.lineTo(target.projX, target.projY);
          ctx.stroke();
        }
      });

      // Draw nodes
      nodesRef.current.forEach(node => {
        // Fade nodes based on depth
        const opacity = Math.max(0.2, 1 - (node.z + 80) / 160);

        // Draw outer glow if hovered
        if (hoveredNode && hoveredNode.id === node.id) {
          ctx.fillStyle = `${accentColor}1A`;
          ctx.beginPath();
          ctx.arc(node.projX, node.projY, node.projRadius * 2.2, 0, 2 * Math.PI);
          ctx.fill();
        }

        // Draw node dot
        const grad = ctx.createRadialGradient(
          node.projX - node.projRadius * 0.3, 
          node.projY - node.projRadius * 0.3, 
          1, 
          node.projX, 
          node.projY, 
          node.projRadius
        );
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.3, accentColor);
        grad.addColorStop(1, '#0A0A0A');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(node.projX, node.projY, node.projRadius, 0, 2 * Math.PI);
        ctx.fill();

        // Draw subtle borders
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Draw labels for closer nodes
        if (node.z < 30) {
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.95})`;
          ctx.font = '500 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`p.${node.page} ${node.label}`, node.projX + node.projRadius + 4, node.projY + 3);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [workspaceType, hoveredNode]);

  // Resize canvas based on container
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Find node under mouse
    let found = null;
    nodesRef.current.forEach(node => {
      const dx = node.projX - mouseX;
      const dy = node.projY - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < node.projRadius * 2) {
        found = node;
      }
    });

    setHoveredNode(found);
  };

  const handleMouseClick = () => {
    if (hoveredNode) {
      setSelectedNode(hoveredNode);
    }
  };

  // Trigger HTML5 Drag & Drop
  const handleDragStart = (e) => {
    if (hoveredNode) {
      // Set concept data payload
      e.dataTransfer.setData("application/json", JSON.stringify({
        page: hoveredNode.page,
        header: hoveredNode.label,
        text: hoveredNode.text
      }));

      // Set custom drag image or style
      e.dataTransfer.effectAllowed = "copy";
    } else {
      e.preventDefault(); // Don't drag background
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="w-[300px] bg-[#161616] border-l border-[#2A2A2A] h-full flex flex-col relative"
    >
      <div className="p-4 border-b border-[#2A2A2A] select-none">
        <h3 className="font-display text-xs font-medium text-white tracking-wide">3D Concept Graph</h3>
        <p className="text-[10px] text-[#9A9A9A] mt-1 leading-relaxed">
          Drag nodes to input bar to scope conversations.
        </p>
      </div>

      {/* Canvas container */}
      <div className="flex-1 min-h-0 relative">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onClick={handleMouseClick}
          onDragStart={handleDragStart}
          draggable={hoveredNode !== null}
          className={`w-full h-full ${hoveredNode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
        />

        {/* Selected Node Metadata popover */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 right-4 bg-[#0A0A0A] border border-[#2A2A2A] p-4 rounded-xl shadow-2xl animate-fade-in text-[10px] flex flex-col gap-2 z-10">
            <div className="flex justify-between items-center border-b border-[#2A2A2A] pb-1.5">
              <span className="font-semibold text-white truncate max-w-[65%]">{selectedNode.label}</span>
              <span className="bg-[#4C8DFF]/15 border border-[#4C8DFF]/20 text-[#4C8DFF] px-1.5 py-0.2 rounded font-mono text-[9px]">p.{selectedNode.page}</span>
            </div>
            <p className="text-zinc-400 leading-relaxed italic">"{selectedNode.text}"</p>
            <button 
              onClick={() => setSelectedNode(null)} 
              className="text-[9px] font-semibold text-[#9A9A9A] hover:text-white mt-1 text-right transition cursor-pointer"
            >
              ✕ Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConceptGraph3D;
