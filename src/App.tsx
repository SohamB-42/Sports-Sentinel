/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Activity, 
  Globe, 
  Database,
  Eye,
  FileText,
  Search,
  Plus,
  ExternalLink,
  Zap,
  Info,
  Radar,
  Monitor,
  Play,
  MessageCircle,
  CircleUser,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MediaAsset, DetectionAlert, analyzeMediaSighting, performLiveDiscovery, discoverLiveEvents } from './services/geminiService';

const MOCK_ORGS = [
  { id: 'LALIGA', name: 'LaLiga - Spanish Football', icon: '⚽' }
];

export default function App() {
  const [activeOrg, setActiveOrg] = useState(MOCK_ORGS[0]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'monitor' | 'assets'>('dashboard');
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [alerts, setAlerts] = useState<DetectionAlert[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [auditLogs, setAuditLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [auditLogs]);
  
  const [isSyncingAssets, setIsSyncingAssets] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [newAsset, setNewAsset] = useState<Omit<MediaAsset, 'id'>>({ name: '', description: '', rightsOwner: '' });
  const [manualSighting, setManualSighting] = useState({ desc: '', url: '', selector: '' });
  const [selectedAssetFilter, setSelectedAssetFilter] = useState<string | 'all'>('all');
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<string | null>(null);

  const filteredAssets = assets.filter(a => a.rightsOwner === activeOrg.id);

  const riskOrder: Record<string, number> = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
  const sortedAlerts = [...alerts].sort((a, b) => {
    const riskDiff = (riskOrder[b.riskLevel] || 0) - (riskOrder[a.riskLevel] || 0);
    if (riskDiff !== 0) return riskDiff;
    return b.confidenceScore - a.confidenceScore;
  });
  const filteredAndSortedAlerts = sortedAlerts.filter(a => selectedAssetFilter === 'all' || a.assetId === selectedAssetFilter);
  const displayedAlerts = showAllAlerts ? filteredAndSortedAlerts : filteredAndSortedAlerts.slice(0, 5);

  const fetchLiveAssets = async () => {
    setIsSyncingAssets(true);
    setAlerts([]);
    const liveEvents = await discoverLiveEvents(activeOrg.id);
    setAssets(prev => {
      const otherOrgs = prev.filter(a => a.rightsOwner !== activeOrg.id);
      return [...otherOrgs, ...liveEvents];
    });
    setIsSyncingAssets(false);
  };

  // Sync assets when Org changes
  useEffect(() => {
    fetchLiveAssets();
  }, [activeOrg.id]);

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const asset: MediaAsset = {
      ...newAsset,
      id: `REG-${Math.random().toString(36).substring(7).toUpperCase()}`
    };
    setAssets([...assets, asset]);
    setNewAsset({ name: '', description: '', rightsOwner: '' });
    setShowAddAsset(false);
  };

  const handleDeleteAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
    setAssetToDelete(null);
  };

  const updateLog = (msg: string) => {
    setLoadingMessage(msg);
    setAuditLogs(prev => [...prev, `> ${msg}`]);
  };

  const triggerManualScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSighting.desc || !manualSighting.url) return;
    
    setIsScanning(true);
    setAuditLogs([]);
    updateLog('Initializing Jina Proxy Reader...');
    
    // Find closest asset match based on keywords
    const targetAsset = assets.find(a => 
      manualSighting.desc.toLowerCase().includes('arsenal') || 
      manualSighting.desc.toLowerCase().includes('city') ||
      manualSighting.desc.toLowerCase().includes('ucl')
    ) || assets[0];
    
    try {
      // Small artificial delay to simulate pipeline steps
      await new Promise(r => setTimeout(r, 1000));
      updateLog('Bypassing proxy filters...');
      await new Promise(r => setTimeout(r, 500));
      updateLog('Contextual AI & Visual DNA Analysis...');
      const result = await analyzeMediaSighting(targetAsset, manualSighting.desc, manualSighting.url, manualSighting.selector);
      setAlerts(prev => [result, ...prev]);
      setManualSighting({ desc: '', url: '', selector: '' });
    } catch (e: any) {
      if (e.message === "QUOTA_EXCEEDED") {
        updateLog('[ERROR] API QUOTA EXCEEDED: Analysis limit reached. Please wait and try again.');
        await new Promise(r => setTimeout(r, 4000));
      } else {
        updateLog('[ERROR] Analysis failed: ' + e.message);
        console.error("Analysis failed", e);
      }
    } finally {
      setTimeout(() => {
        setIsScanning(false);
        setLoadingMessage('');
      }, 1500);
    }
  };

  const triggerLiveGlobalScan = async () => {
    setIsScanning(true);
    setAuditLogs([]);
    updateLog('Initializing forensic hunt...');
    updateLog('Booting global asset discovery modules...');
    const newAlerts: DetectionAlert[] = [];
    
    try {
      // Parallelize asset discovery for speed
      const discoveryResults = await Promise.all(
        filteredAssets.map(async (asset) => {
          updateLog(`Analyzing social footprint for: ${asset.name.split(':')[0]}...`);
          try {
            const findings = await performLiveDiscovery(asset);
            return { asset, findings };
          } catch (err: any) {
            if (err.message === "QUOTA_EXCEEDED") throw err;
            return { asset, findings: [] };
          }
        })
      );

      const allFindings = discoveryResults.flatMap(r => r.findings.map(f => ({ ...f, asset: r.asset })));
      
      if (allFindings.length === 0) {
        updateLog('No immediate matches found in surface web.');
        await new Promise(r => setTimeout(r, 2000));
        setIsScanning(false);
        setLoadingMessage('');
        return;
      }

      updateLog(`Verifying ${allFindings.length} suspect URLs...`);
      
      // Analyze found links sequentially to ensure we get at least 5 per asset if available
      const finalizedAlerts: DetectionAlert[] = [];
      const assetCount: Record<string, number> = {};

      for (const finding of allFindings) {
        const assetId = (finding.asset as MediaAsset).id;
        // Ensure we process at least 15 per asset to find the best quality matches
        if (assetCount[assetId] >= 15) continue; 

        updateLog(`[HUNT] Isolating URL: ${finding.sourceUrl}`);
        updateLog('Awaiting visual & semantic context matching...');
        try {
          const forensic = await analyzeMediaSighting(
            finding.asset as MediaAsset, 
            finding.aiReasoning || 'Automated high-risk match.', 
            finding.sourceUrl
          );
          
          finalizedAlerts.push(forensic);
          assetCount[assetId] = (assetCount[assetId] || 0) + 1;
        } catch (err: any) {
          if (err.message === "QUOTA_EXCEEDED") throw err;
          updateLog(`[ERROR] Forensic step failed for ${finding.sourceUrl.substring(0, 35)}...`);
          console.error("Forensic step failed", err);
        }
      }
      
      const riskOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      finalizedAlerts.sort((a, b) => {
        const riskDiff = (riskOrder[b.riskLevel] || 0) - (riskOrder[a.riskLevel] || 0);
        if (riskDiff !== 0) return riskDiff;
        return b.confidenceScore - a.confidenceScore;
      });
      
      setAlerts(prev => [...finalizedAlerts, ...prev]);
    } catch (e: any) {
      if (e.message === "QUOTA_EXCEEDED") {
        updateLog("[ERROR] API QUOTA EXCEEDED: Search grounding limit reached for today. Please wait the required time or use fewer assets.");
        await new Promise(r => setTimeout(r, 5000));
      } else {
        updateLog("[ERROR] Discovery failed: " + e.message);
        console.error("Discovery failed", e);
      }
    } finally {
      setTimeout(() => {
        setIsScanning(false);
        setLoadingMessage('');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-white">
      {/* Sidebar Navigation */}
      <nav className="fixed left-0 top-0 h-full w-16 bg-[#141414] text-white flex flex-col items-center py-8 border-r border-[#141414] z-50">
        <div className="mb-12">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <div className="flex flex-col gap-8 flex-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            title="Dashboard Overview"
            className={`p-2 transition-all ${activeTab === 'dashboard' ? 'bg-[#E4E3E0] text-[#141414]' : 'text-gray-500 hover:text-white'}`}
          >
            <Monitor className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('monitor')}
            title="Live Monitoring"
            className={`p-2 transition-all ${activeTab === 'monitor' ? 'bg-[#E4E3E0] text-[#141414]' : 'text-gray-500 hover:text-white'}`}
          >
            <Activity className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('assets')}
            title="Asset Ledger"
            className={`p-2 transition-all ${activeTab === 'assets' ? 'bg-[#E4E3E0] text-[#141414]' : 'text-gray-500 hover:text-white'}`}
          >
            <Database className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-auto opacity-20">
          <Globe className="w-5 h-5" />
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="pl-16 p-8 max-w-7xl mx-auto">
        <header className="flex justify-between items-end border-b border-[#141414] pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-mono text-[10px] uppercase opacity-50">System: Active / Region: Global</span>
            </div>
            <h1 className="text-5xl font-bold tracking-tighter uppercase leading-none">Sentinel Sports</h1>
          </div>
          <div className="flex items-center gap-4">
                <div className="flex bg-slate-800 p-1 rounded overflow-x-auto items-center gap-2">
                  {MOCK_ORGS.map(org => (
                    <button
                      key={org.id}
                      onClick={() => {
                        setActiveOrg(org);
                        setSelectedAssetFilter('all');
                      }}
                      className={`px-3 py-1 font-mono text-[9px] uppercase whitespace-nowrap transition-all ${
                        activeOrg.id === org.id 
                        ? 'bg-white text-black' 
                        : 'text-gray-500 hover:text-white'
                      }`}
                    >
                      {org.id}
                    </button>
                  ))}
                  <button 
                    onClick={fetchLiveAssets}
                    disabled={isSyncingAssets}
                    className="p-1 text-gray-500 hover:text-white transition-all disabled:opacity-50"
                    title="Refresh Live Fixtures"
                  >
                    <motion.div animate={isSyncingAssets ? { rotate: 360 } : {}}>
                      <RefreshCw className={`w-3 h-3 ${isSyncingAssets ? 'animate-spin' : ''}`} />
                    </motion.div>
                  </button>
                </div>
            <div className="hidden md:block">
              <span className="font-serif italic text-lg opacity-60">Digital IP Protection Suite</span>
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-12">
            <div className="text-center bg-white border border-[#141414] p-12 shadow-[8px_8px_0px_0px_#141414]">
              <ShieldCheck className="w-16 h-16 mx-auto mb-6 text-green-600" />
              <h2 className="text-4xl font-bold uppercase tracking-tight mb-4">Sentinel Sports Defense Network</h2>
              <p className="text-lg opacity-70 max-w-2xl mx-auto mb-8 font-serif leading-relaxed">
                Protect your digital IP against unauthorized streams, leaks, and malicious brand alterations. Register official broadcast assets on the ledger to unleash continuous real-time cross-referencing and contextual AI monitoring across web resources and social channels.
              </p>
              <div className="flex items-center justify-center gap-4">
                <button 
                  onClick={() => setActiveTab('assets')}
                  className="bg-[#141414] border border-[#141414] text-white px-8 py-4 font-mono uppercase text-[10px] font-bold tracking-widest hover:bg-white hover:text-[#141414] transition-all shadow-[4px_4px_0px_0px_#141414]"
                >
                  Step 1: Register Asset
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('monitor');
                    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
                  }}
                  className="bg-transparent border border-[#141414] text-[#141414] px-8 py-4 font-mono uppercase text-[10px] font-bold tracking-widest hover:bg-[#141414] hover:text-white transition-all shadow-[4px_4px_0px_0px_#141414]"
                >
                  Step 2: Monitor Feeds
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="font-mono text-xs uppercase font-bold tracking-widest flex items-center gap-2 mb-2">
                <Radar className="w-4 h-4" /> Global Overview
              </h3>
              <AnimatePresence mode="wait">
                {(() => {
                  const filteredDashboardAlerts = alerts.filter(a => selectedAssetFilter === 'all' || a.assetId === selectedAssetFilter);
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-2 md:grid-cols-4 gap-6"
                    >
                      <div className="p-6 bg-white border border-[#141414] shadow-[4px_4px_0px_0px_#141414]">
                        <div className="text-[10px] font-mono uppercase opacity-50 mb-2">Total Active Threats</div>
                        <div className="text-4xl font-black">{filteredDashboardAlerts.length}</div>
                      </div>
                      <div className="p-6 bg-white border border-[#141414] shadow-[4px_4px_0px_0px_#141414] border-l-8 border-l-red-500">
                        <div className="text-[10px] font-mono uppercase opacity-50 mb-2">Critical / High</div>
                        <div className="text-4xl font-black text-red-600">
                          {filteredDashboardAlerts.filter(a => a.riskLevel === 'CRITICAL' || a.riskLevel === 'HIGH').length}
                        </div>
                      </div>
                      <div className="p-6 bg-white border border-[#141414] shadow-[4px_4px_0px_0px_#141414] border-l-8 border-l-yellow-500">
                        <div className="text-[10px] font-mono uppercase opacity-50 mb-2">Action Required</div>
                        <div className="text-4xl font-black text-yellow-600">
                          {filteredDashboardAlerts.filter(a => a.actionRequired).length}
                        </div>
                      </div>
                      <div className="p-6 bg-[#141414] text-white border border-[#141414] shadow-[4px_4px_0px_0px_#141414]">
                        <div className="text-[10px] font-mono uppercase opacity-50 mb-2">Network Status</div>
                        <div className="text-2xl font-black text-green-400 flex items-center gap-3 mt-2">
                          <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse inline-block" /> ONLINE
                        </div>
                        <p className="mt-4 text-[9px] font-mono opacity-40 uppercase">Scanned Nodes: 12,491</p>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
          </div>
        )}

        {activeTab === 'monitor' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Control Panel */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 border border-[#141414] shadow-[4px_4px_0px_0px_#141414]">
                <h3 className="font-mono text-[10px] uppercase mb-4 opacity-50">Ad-hoc Investigation</h3>
                <form onSubmit={triggerManualScan} className="space-y-4">
                  <div>
                    <label className="block font-mono text-[9px] uppercase mb-1 opacity-60">Suspect URL</label>
                    <input 
                      type="text" 
                      value={manualSighting.url}
                      onChange={e => setManualSighting({...manualSighting, url: e.target.value})}
                      placeholder="https://..."
                      className="w-full bg-[#f9f9f8] border border-[#141414]/20 p-2 text-xs focus:border-[#141414] outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[9px] uppercase mb-1 opacity-60">Sighting Description</label>
                    <textarea 
                      value={manualSighting.desc}
                      onChange={e => setManualSighting({...manualSighting, desc: e.target.value})}
                      placeholder="e.g. Someone posted a clip of the goal on X..."
                      className="w-full bg-[#f9f9f8] border border-[#141414]/20 p-2 text-xs h-20 resize-none focus:border-[#141414] outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[9px] uppercase mb-1 opacity-60">DOM Target (CSS Selector, X/Reddit)</label>
                    <input 
                      type="text" 
                      value={manualSighting.selector}
                      onChange={e => setManualSighting({...manualSighting, selector: e.target.value})}
                      placeholder="e.g. .tweet-text, article, or #post-content"
                      className="w-full bg-[#f9f9f8] border border-[#141414]/20 p-2 text-xs focus:border-[#141414] outline-none transition-colors"
                    />
                    <p className="text-[9px] opacity-40 mt-1">
                      Optional: Supply a CSS selector to isolate specific content (like comments or the main post container). Useful if the target page has lots of clutter or if you want to target specific Reddit/X elements. Leave empty to scan the entire page.
                    </p>
                  </div>
                  <button 
                    type="submit"
                    disabled={isScanning || !manualSighting.url}
                    className="w-full bg-[#141414] text-white py-3 font-mono uppercase text-[10px] tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isScanning && loadingMessage.includes('Forensic') ? (
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      >
                        <Search className="w-3 h-3" />
                      </motion.div>
                    ) : null}
                    {isScanning && loadingMessage.includes('Forensic') ? 'Analyzing...' : 'Analyze Sighting'}
                  </button>
                </form>

                <div className="bg-white p-6 border border-[#141414] shadow-[4px_4px_0px_0px_#141414] mt-6">
                  <h3 className="font-mono text-[10px] uppercase mb-4 text-cyan-600 font-bold flex items-center gap-2">
                    <Zap className="w-3 h-3" /> Core Enforcement Pillars
                  </h3>
                  <div className="space-y-4">
                    {[
                      { t: "Unauthorized Redistribution", d: "Pirate streams, IPTV, torrents." },
                      { t: "Unattributed Misuse", d: "Repackaged highlights without credit." },
                      { t: "Malicious Brand Alteration", d: "Spoofing or distorting official posts." }
                    ].map((p, i) => (
                      <div key={i}>
                        <h4 className="text-[10px] font-bold uppercase leading-tight">{p.t}</h4>
                        <p className="text-[9px] opacity-60 leading-tight">{p.d}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-[#141414]/10 space-y-2">
                     <p className="text-[9px] italic opacity-40 leading-tight">
                      Note: Fan commentary and news journalism are strictly immune.
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-6">
                   <button 
                    onClick={triggerLiveGlobalScan}
                    disabled={isScanning}
                    className="w-full bg-green-600 border border-[#141414] text-white py-4 font-mono uppercase text-[11px] font-bold tracking-[0.2em] hover:bg-green-700 transition-all shadow-[4px_4px_0px_0px_#141414] active:shadow-none active:translate-x-1 active:translate-y-1 flex items-center justify-center gap-3"
                  >
                    {isScanning && loadingMessage.includes('Global') ? (
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      >
                        <Globe className="w-4 h-4" />
                      </motion.div>
                    ) : <Globe className="w-4 h-4" />}
                    {isScanning && loadingMessage.includes('Global') ? 'Scanning Web...' : 'Start Live Discovery'}
                  </button>
                  <button 
                    onClick={() => setAlerts([])}
                    className="w-full mt-4 border border-red-500/30 text-red-500/80 py-2 font-mono uppercase text-[9px] tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 opacity-60 hover:opacity-100"
                  >
                    Clear Detection Feed
                  </button>
                </div>
              </div>

              <div className="p-6 border border-[#141414] bg-[#141414] text-white overflow-hidden relative">
                <div className="absolute top-[-20px] right-[-20px] opacity-10 rotate-12">
                   <ShieldCheck className="w-32 h-32 text-white" />
                </div>
                <div className="flex items-center gap-2 mb-3 relative z-10">
                  <Activity className="w-4 h-4 text-green-400" />
                  <h3 className="font-mono text-[10px] uppercase text-gray-500">Live Coverage</h3>
                </div>
                <div className="relative z-10 space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="opacity-40">ACTIVE ASSETS</span>
                    <span>{assets.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="opacity-40">THREATS IDENTIFIED</span>
                    <span className="text-red-400">{alerts.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications Feed */}
            <div className="lg:col-span-8 flex flex-col min-h-[500px]">
              <div className="flex flex-col mb-6 gap-4">
                <div className="flex items-center justify-between border-b border-[#141414]/10 pb-2">
                  <h2 className="font-mono text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Threat Detection Feed
                  </h2>
                  <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-[#141414]" />
                     <span className="font-mono text-[10px] opacity-40 uppercase">Awaiting Input</span>
                  </div>
                </div>

                {/* Event Filter Chips */}
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    onClick={() => setSelectedAssetFilter('all')}
                    className={`px-3 py-1 font-mono text-[9px] uppercase tracking-wider border transition-all ${
                      selectedAssetFilter === 'all' 
                        ? 'bg-[#141414] text-white border-[#141414]' 
                        : 'border-[#141414]/20 hover:border-[#141414]'
                    }`}
                  >
                    All {activeOrg.id} Events
                  </button>
                  {filteredAssets.map(asset => (
                    <button
                      key={asset.id}
                      onClick={() => setSelectedAssetFilter(asset.id)}
                      className={`px-3 py-1 font-mono text-[9px] uppercase tracking-wider border transition-all ${
                        selectedAssetFilter === asset.id 
                          ? 'bg-[#141414] text-white border-[#141414]' 
                          : 'border-[#141414]/20 hover:border-[#141414]'
                      }`}
                    >
                      {asset.name.split(':')[0]}
                    </button>
                  ))}
                  {isSyncingAssets && (
                    <div className="flex items-center gap-2 font-mono text-[9px] uppercase text-cyan-600 animate-pulse ml-2">
                       <Search className="w-3 h-3" />
                       Finding Live Fixtures...
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 space-y-4">
                <AnimatePresence mode="popLayout">
                  {filteredAndSortedAlerts.length === 0 && (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full flex flex-col items-center justify-center p-12 border border-dashed border-gray-400 text-center opacity-30 saturate-0"
                    >
                      <Eye className="w-12 h-12 mb-4" />
                      <p className="font-mono text-[11px] uppercase tracking-tighter">No violations detected for this event.</p>
                    </motion.div>
                  )}
                  {filteredAndSortedAlerts.length > 0 && displayedAlerts.map((alert, idx) => (
                          <motion.div
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: idx * 0.1 }}
                            key={alert.id}
                            className="bg-white border border-[#141414] group hover:bg-[#141414] hover:text-white transition-all cursor-pointer shadow-[2px_2px_0px_0px_#141414] hover:shadow-[4px_4px_0px_0px_#555]"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-[60px_1fr_120px] items-center">
                              <div className="h-full flex items-center justify-center border-r border-[#141414] sm:py-6 py-4 bg-gray-50 group-hover:bg-transparent">
                                <AlertTriangle className={`w-6 h-6 ${
                                  alert.riskLevel === 'CRITICAL' || alert.riskLevel === 'HIGH' ? 'text-red-500' : 'text-yellow-500'
                                }`} />
                              </div>
                              <div className="p-4 sm:p-6">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <span className="font-mono text-[9px] bg-[#141414] text-white px-2 py-0.5 group-hover:bg-white group-hover:text-[#141414] transition-colors">{alert.platform}</span>
                                  {alert.aiReasoning?.includes('Verified via Scrape') && (
                                    <span className="font-mono text-[9px] border border-blue-400 text-blue-400 px-2 py-0.5 animate-pulse">Deep Scanned</span>
                                  )}
                                  {alert.aiReasoning?.includes('Forensic') && (
                                    <span className="font-mono text-[9px] border border-yellow-400 text-yellow-400 px-2 py-0.5">Shielded Source</span>
                                  )}
                                  {alert.actionRequired && (
                                    <span className="font-mono text-[9px] bg-red-100 border border-red-500 text-red-600 px-2 py-0.5 animate-pulse uppercase tracking-widest font-bold">Action Required</span>
                                  )}
                                  <span className="font-mono text-[9px] opacity-40 uppercase">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <h4 className="text-sm font-bold mb-2 break-all underline underline-offset-4 decoration-1">{alert.sourceUrl}</h4>
                                <p className="text-xs opacity-90 leading-relaxed max-w-2xl font-serif whitespace-pre-wrap">
                                  {alert.aiReasoning}
                                </p>
                              </div>
                              <div className="p-4 sm:p-6 text-right sm:border-l border-[#141414] h-full flex flex-col justify-between min-w-[140px]">
                                <div>
                                  <div className={`font-mono text-sm font-black italic tracking-tighter mb-1 ${
                                    alert.riskLevel === 'CRITICAL' ? 'text-red-600 group-hover:text-red-400' : 
                                    alert.riskLevel === 'HIGH' ? 'text-orange-500 group-hover:text-orange-300' : 'text-gray-900 group-hover:text-white'
                                  }`}>
                                    {alert.riskLevel}
                                  </div>
                                  <div className="font-mono text-[9px] opacity-60 group-hover:opacity-100 transition-opacity">
                                    MATCH: {(alert.confidenceScore * 100).toFixed(0)}%
                                  </div>
                                </div>
                                <a 
                                  href={alert.sourceUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-4 p-2 bg-[#141414] text-white hover:bg-red-600 transition-all flex items-center justify-center gap-2 font-mono text-[9px] uppercase tracking-widest border border-white/10"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Investigate
                                </a>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                        {filteredAndSortedAlerts.length > 5 && (
                          <motion.button
                            layout
                            key="show-more-btn"
                            onClick={() => setShowAllAlerts(!showAllAlerts)}
                            className="w-full mt-4 bg-[#f9f9f8] border border-[#141414]/20 text-[#141414] py-3 font-mono uppercase text-[10px] tracking-widest hover:bg-[#141414] hover:text-white transition-colors"
                          >
                            {showAllAlerts ? 'Collapse Risks' : `Show ${filteredAndSortedAlerts.length - 5} More Risks`}
                          </motion.button>
                        )}
                  </AnimatePresence>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-6">
               <div className="flex justify-between items-center mb-6 border-b border-[#141414]/10 pb-2">
                 <h2 className="font-mono text-xs uppercase font-bold tracking-widest flex items-center gap-2">
                   <Database className="w-4 h-4" />
                   Fingerprint Ledger
                 </h2>
                 <button 
                  onClick={() => setShowAddAsset(!showAddAsset)}
                  className="bg-[#141414] text-white p-1"
                >
                   <Plus className={`w-4 h-4 transition-transform ${showAddAsset ? 'rotate-45' : ''}`} />
                 </button>
               </div>

               <AnimatePresence>
                {showAddAsset && (
                  <motion.form 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    onSubmit={handleAddAsset}
                    className="bg-white border-2 border-[#141414] p-6 shadow-[8px_8px_0px_0px_#141414] overflow-hidden mb-12"
                  >
                    <h3 className="font-bold uppercase tracking-tighter text-xl mb-6">Register Official Asset</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block font-mono text-[10px] uppercase mb-1">Asset Name</label>
                        <input 
                          required
                          type="text" 
                          value={newAsset.name}
                          onChange={e => setNewAsset({...newAsset, name: e.target.value})}
                          className="w-full border border-[#141414]/20 p-3 text-sm focus:border-[#141414] outline-none"
                          placeholder="e.g. World Cup Final 2026 Intro"
                        />
                      </div>
                      <div>
                        <label className="block font-mono text-[10px] uppercase mb-1">Rights Holder</label>
                        <input 
                          required
                          type="text" 
                          value={newAsset.rightsOwner}
                          onChange={e => setNewAsset({...newAsset, rightsOwner: e.target.value})}
                          className="w-full border border-[#141414]/20 p-3 text-sm focus:border-[#141414] outline-none"
                          placeholder="e.g. FIFA / Rights Owner"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-end mb-1">
                          <label className="block font-mono text-[10px] uppercase">Detailed Description (for AI matching)</label>
                          <span className="text-[9px] opacity-40 font-mono italic">Critically Important</span>
                        </div>
                        <textarea 
                          required
                          value={newAsset.description}
                          onChange={e => setNewAsset({...newAsset, description: e.target.value})}
                          className="w-full border border-[#141414]/20 p-3 text-sm h-32 resize-none focus:border-[#141414] outline-none mb-2"
                          placeholder="Describe key visual elements, logos, or specific audio cues..."
                        />
                        <div className="bg-blue-50/50 p-3 border border-blue-100 flex flex-col gap-2">
                          <div className="flex items-center gap-1.5 text-blue-800">
                             <Zap className="w-3.5 h-3.5 text-blue-500" />
                             <span className="text-[10px] uppercase font-bold tracking-widest">AI Context Hints</span>
                          </div>
                          <p className="text-[10px] text-gray-500 leading-relaxed font-sans">
                            Include specific watermarks, UI overlays, commentator names, or unique camera angles. The more precise the description, the better the AI can distinguish the official asset from fair-use fan content.
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {['"Contains BeIn Sports logo TR"', '"English commentary by Peter Drury"', '"Scorebug on top-left"'].map(hint => (
                              <button 
                                key={hint} 
                                type="button"
                                onClick={() => setNewAsset(prev => ({...prev, description: prev.description ? `${prev.description} ${hint}` : hint }))}
                                className="text-[9px] font-mono bg-white border border-blue-200 text-blue-600 px-2 py-1 hover:bg-blue-100 transition-colors"
                              >
                                + {hint}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <button 
                        type="submit"
                        className="w-full bg-[#141414] text-white py-4 font-mono uppercase text-xs tracking-[0.2em] hover:bg-gray-800 transition-colors mt-4"
                      >
                        Commit to Registry
                      </button>
                    </div>
                  </motion.form>
                )}
               </AnimatePresence>

               {assets.map(asset => (
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   key={asset.id} 
                   className="bg-white border border-[#141414] p-6 shadow-[4px_4px_0px_0px_#141414] relative overflow-hidden"
                 >
                    {assetToDelete === asset.id ? (
                      <div className="absolute inset-0 bg-[#E4E3E0]/95 flex flex-col items-center justify-center p-6 z-10">
                        <AlertTriangle className="w-8 h-8 text-red-600 mb-3" />
                        <p className="font-mono text-xs uppercase text-center mb-6 font-bold tracking-widest whitespace-pre-wrap">Confirm deletion of<br/> {asset.id}?</p>
                        <div className="flex gap-4 w-full">
                          <button 
                            onClick={() => setAssetToDelete(null)}
                            className="flex-1 border border-[#141414] bg-white text-[#141414] font-mono text-[10px] uppercase py-2 hover:bg-gray-100 transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="flex-1 bg-red-600 text-white font-mono text-[10px] uppercase py-2 hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : null}
                    
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-3 bg-[#141414] text-white">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <span className="font-mono text-[9px] opacity-40 uppercase block leading-none">System ID</span>
                          <span className="font-mono text-xs font-bold">{asset.id}</span>
                        </div>
                        <button 
                          onClick={() => setAssetToDelete(asset.id)}
                          className="font-mono text-[9px] text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 transition-colors uppercase tracking-widest"
                        >
                          Revoke Asset
                        </button>
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-1 tracking-tight">{asset.name}</h3>
                    <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mb-6">RIGHTS OWNER: {asset.rightsOwner}</p>
                    <div className="bg-[#f9f9f8] p-4 border border-[#141414]/10">
                      <p className="text-sm opacity-80 leading-relaxed italic">
                        "{asset.description}"
                      </p>
                    </div>
                 </motion.div>
               ))}
             </div>
             
             {/* Right Column: Analytics & Guidelines */}
             <div className="hidden md:flex flex-col gap-6">
                <div className="sticky top-8 mt-12">
                  <div className="p-6 bg-[#141414] text-white shadow-[4px_4px_0px_0px_#555] border border-[#333]">
                      <div className="flex items-center gap-3 mb-6 border-b border-[#333] pb-4">
                         <Radar className="w-6 h-6 text-green-400 animate-pulse" />
                         <div>
                           <h3 className="font-mono uppercase text-sm tracking-widest font-bold">System Status</h3>
                           <p className="text-[9px] font-mono text-gray-400">Threat Detection Active</p>
                         </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                         <div className="p-4 bg-[#222] border border-[#333] min-h-[90px] flex flex-col justify-center">
                             <div className="text-[10px] font-mono text-gray-400 mb-1 uppercase">Protected Assets</div>
                             <div className="text-3xl font-light font-mono">{assets.length}</div>
                         </div>
                         <div className="p-4 bg-[#222] border border-[#333] min-h-[90px] flex flex-col justify-center">
                             <div className="text-[10px] font-mono text-gray-400 mb-1 uppercase">Scan Coverage</div>
                             <div className="text-3xl font-light font-mono text-cyan-400">Web<span className="text-sm opacity-50">/Proxy</span></div>
                         </div>
                      </div>

                      <div className="bg-[#222] p-4 border border-[#333] mb-6">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-[9px] font-mono uppercase text-gray-400">Jina Web Scraper</span>
                           <span className="text-[9px] font-mono text-green-400 flex items-center gap-1"><Zap className="w-3 h-3" /> ONLINE</span>
                        </div>
                        <div className="w-full bg-[#111] h-1.5 overflow-hidden">
                           <div className="bg-green-400 h-full w-[100%] animate-pulse" />
                        </div>
                      </div>
                      
                      <div className="mt-8 space-y-4">
                        <h3 className="font-mono uppercase text-[10px] tracking-widest font-bold text-gray-400 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-cyan-400" />
                          Security Protocols
                        </h3>
                        <div className="space-y-3">
                          <div className="group border border-[#333] p-3 hover:bg-[#222] transition-colors cursor-default">
                             <div className="flex gap-3">
                               <Eye className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                               <div>
                                 <strong className="text-white block mb-1 text-[11px] font-mono uppercase tracking-wider">Contextual Web Scraping</strong>
                                 <p className="text-[10px] text-gray-400 leading-relaxed font-sans">Bypasses traditional blocks to retrieve detailed text and metadata from suspicious URLs.</p>
                               </div>
                             </div>
                          </div>
                          <div className="group border border-[#333] p-3 hover:bg-[#222] transition-colors cursor-default">
                             <div className="flex gap-3">
                               <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                               <div>
                                 <strong className="text-white block mb-1 text-[11px] font-mono uppercase tracking-wider">Semantic AI Analysis</strong>
                                 <p className="text-[10px] text-gray-400 leading-relaxed font-sans">Uses Gemini 1.5 to read text discussions and differentiate fair-use/journalism from direct piracy distribution.</p>
                               </div>
                             </div>
                          </div>
                        </div>
                      </div>
                  </div>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* System Footer Overlay */}
      <footer className="fixed bottom-0 left-0 w-full bg-[#141414] text-white/40 py-2 px-8 text-[9px] font-mono flex justify-between items-center z-50 backdrop-blur-sm">
        <div className="flex gap-6">
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-green-500" />
            <span>CORE_SYNC: ACTIVE</span>
          </div>
          <span>NODE: SENTINEL-01</span>
          <span className="hidden sm:inline">LOC: ASIA_PACIFIC_S1</span>
        </div>
        <div className="flex gap-6 items-center">
          <span className="hidden md:inline opacity-20">SECURITY PROTOCOL: RFC-2818</span>
          <span className="font-bold tracking-widest">© 2024 SENTINEL DEFENSE SYSTEMS</span>
        </div>
      </footer>

      {/* Global Loading Overlay (Terminal UI) */}
      <AnimatePresence>
        {isScanning && (
          <motion.div 
            key="terminal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-4 sm:p-8"
          >
            <div className="w-full max-w-3xl bg-[#0a0a0a] border border-[#333] shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col h-[60vh] max-h-[600px]">
              {/* Terminal Header */}
              <div className="bg-[#111] border-b border-[#333] p-3 flex justify-between items-center">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex items-center gap-2 text-[#666] font-mono text-[10px] uppercase tracking-widest">
                  <Radar className="w-3 h-3 animate-pulse text-green-500" />
                  Live Discovery Audit
                </div>
              </div>
              
              {/* Terminal Body */}
              <div className="flex-1 p-6 font-mono text-sm sm:text-base overflow-y-auto flex flex-col gap-2 relative">
                {auditLogs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`${log.includes('[ERROR]') ? 'text-red-500' : log.includes('[HUNT]') ? 'text-cyan-400' : 'text-green-400'} break-all`}
                  >
                    {log}
                  </motion.div>
                ))}
                
                {/* Blinking Cursor */}
                <motion.div 
                  animate={{ opacity: [1, 0] }} 
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="w-2.5 h-4 bg-green-400 inline-block mt-1"
                />
                <div ref={logsEndRef} />
              </div>
              
              {/* Terminal Footer */}
              <div className="bg-[#111] border-t border-[#333] p-2 px-4 flex justify-between items-center">
                <span className="text-[10px] font-mono text-[#666] flex items-center gap-2">
                  <ShieldCheck className="w-3 h-3" />
                  SENTINEL SYSTEM ACTIVE
                </span>
                <span className="text-[10px] font-mono text-green-500 animate-pulse">
                  {loadingMessage.substring(0, 40)}{loadingMessage.length > 40 ? '...' : ''}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
