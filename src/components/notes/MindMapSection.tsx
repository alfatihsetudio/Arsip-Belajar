'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MindmapNode } from '@/lib/utils/flashcardHelper';

interface MindMapSectionProps {
  noteId: string;
  initialMindmap: MindmapNode | null;
  isGuest?: boolean;
}

export default function MindMapSection({ noteId, initialMindmap, isGuest = false }: MindMapSectionProps) {
  const [mindmap, setMindmap] = useState<MindmapNode | null>(initialMindmap);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ root: true });
  const router = useRouter();

  const handleGenerate = async () => {
    if (isGuest) {
      window.location.href = '/';
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/note/${noteId}/mindmap`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghasilkan peta pikiran');
      
      setMindmap(data.mindmap);
      setExpandedNodes({ root: true });
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleNode = (nodePath: string) => {
    if (isGuest) {
      window.location.href = '/';
      return;
    }
    setExpandedNodes(prev => ({
      ...prev,
      [nodePath]: !prev[nodePath]
    }));
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4 text-left">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center text-green-700">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">
            Interactive Mind Map
          </h2>
        </div>
        {mindmap && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="text-[10px] sm:text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            {generating ? 'Regenerating...' : 'Regenerate'}
          </button>
        )}
      </div>

      {!mindmap ? (
        <div className="py-10 max-w-sm mx-auto space-y-4 text-center">
          <svg className="mx-auto text-[var(--text-muted)]" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>
          <div>
            <h3 className="font-semibold text-xs sm:text-sm text-[var(--text-primary)]">Belum ada Peta Pikiran</h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
              Petakan bab pelajaran secara visual ke dalam pohon konsep terstruktur menggunakan AI.
            </p>
          </div>
          {error && <p className="text-[10px] text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-200">{error}</p>}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 mx-auto disabled:opacity-50 cursor-pointer"
          >
            {generating ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <span>Buat Peta Pikiran</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="py-2 pl-2">
          {/* Main Topic (Root Node) */}
          <div className="relative pl-6 border-l border-dashed border-gray-300">
            {/* Horizontal Line Connector */}
            <div className="absolute top-4 left-0 w-6 border-t border-dashed border-gray-300" />
            <div className="absolute top-2.5 -left-1.5 w-3 h-3 rounded-full bg-[var(--accent)]" />
            
            <div className="inline-block bg-[var(--accent)] text-[var(--accent-fg)] text-xs sm:text-sm font-extrabold px-3.5 py-2 rounded-xl shadow-sm mb-4">
              🎯 {mindmap.name}
            </div>

            {/* Level 2 Nodes (Children) */}
            {mindmap.children && mindmap.children.length > 0 && (
              <div className="space-y-4">
                {mindmap.children.map((child, i) => {
                  const path = `root-${i}`;
                  const isExpanded = expandedNodes[path] !== false; // expanded by default
                  
                  return (
                    <div key={path} className="relative pl-6 border-l border-dashed border-gray-300">
                      {/* Line connector to parent */}
                      <div className="absolute top-4 left-0 w-6 border-t border-dashed border-gray-300" />
                      <div className="absolute top-3 -left-1 w-2 h-2 rounded-full bg-green-500" />

                      {/* Concept Header */}
                      <div 
                        onClick={() => toggleNode(path)}
                        className="inline-flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-3)] px-3 py-1.5 rounded-xl cursor-pointer shadow-sm transition-colors text-left"
                      >
                        <span className="text-[10px] sm:text-xs font-bold text-[var(--text-primary)]">
                          {isExpanded ? '➖' : '➕'} {child.name}
                        </span>
                        {child.children && child.children.length > 0 && (
                          <span className="text-[8px] bg-green-100 text-green-700 px-1 py-0.25 rounded-md font-bold">
                            {child.children.length}
                          </span>
                        )}
                      </div>

                      {/* Level 3 Nodes (Grandchildren / Details) */}
                      {isExpanded && child.children && child.children.length > 0 && (
                        <div className="mt-2.5 pl-6 space-y-2 relative">
                          <div className="absolute top-0 bottom-3 left-0 w-0 border-l border-dotted border-gray-300" />
                          {child.children.map((grandchild, j) => (
                            <div key={j} className="relative pl-4 text-left">
                              {/* Horizontal connector to parent concept */}
                              <div className="absolute top-2.5 left-0 w-4 border-t border-dotted border-gray-300" />
                              <p className="text-[11px] text-[var(--text-secondary)] bg-white border border-[var(--border)] px-2.5 py-1.5 rounded-xl inline-block max-w-[88%] leading-relaxed shadow-sm">
                                💡 {grandchild.name}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
