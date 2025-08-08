import React, { useEffect, useMemo, useState } from 'react';
import { 
  Home, Search, MessageCircle, FileText, Settings, 
  TestTube, BarChart3, Play, Download, Send, 
  RotateCcw, Filter, Calendar, Clock, TrendingUp,
  MapPin, Users, CheckCircle, XCircle, Shield,
  Eye, Save, RefreshCw, Zap, Target
} from 'lucide-react';
import { api } from '../lib/api';

type ListingType = 'rent' | 'sale' | 'both';

type Listing = {
  id: string | number;
  address: string;
  price: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  type: 'rent' | 'sale';
  owner?: string;
  status?: 'ready' | 'sent' | 'failed' | 'blocked' | string;
  redFlag?: string;
};

type MessageLog = {
  id: string | number;
  address: string;
  owner: string;
  type: 'rent' | 'sale';
  status: 'sent' | 'failed' | 'blocked' | string;
  date: string;
};

const ZillowDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [listingMode, setListingMode] = useState<ListingType>('both'); // rent, sale, both
  const [autoMessage, setAutoMessage] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  // Sample data
  const [scraperStats, setScraperStats] = useState({
    lastRun: '2 hours ago',
    totalListings: 47,
    messagesSentToday: 12,
    isRunning: false
  });
  const [listings, setListings] = useState<Listing[]>([]);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [zipInput, setZipInput] = useState<string>('');
  const [filters, setFilters] = useState<{ alreadyRented: boolean; noAgents: boolean; duplicatePhotos: boolean }>({
    alreadyRented: true,
    noAgents: true,
    duplicatePhotos: true,
  });
  const [messageDrafts, setMessageDrafts] = useState<Record<string | number, string>>({});

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initial data load: settings, listings, logs
  useEffect(() => {
    (async () => {
      try {
        const settings = await api.getSettings().catch(() => null);
        if (settings) {
          if (settings?.propertyType && ['rent', 'sale', 'both'].includes(settings.propertyType)) {
            setListingMode(settings.propertyType as ListingType);
          }
          if (typeof settings?.autoMessages === 'boolean') {
            setAutoMessage(Boolean(settings.autoMessages));
          }
        }
      } catch {}
      try {
        const listResp = await api.getListings();
        if (Array.isArray(listResp?.listings)) setListings(listResp.listings as Listing[]);
      } catch {}
      try {
        const logsResp = await api.getLogs();
        if (Array.isArray(logsResp?.logs)) setLogs(logsResp.logs as MessageLog[]);
      } catch {}
    })();
  }, []);

  const sidebarItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'scraper', icon: Search, label: 'Scraper' },
    { id: 'messages', icon: MessageCircle, label: 'Messages' },
    { id: 'logs', icon: FileText, label: 'Logs' },
    { id: 'settings', icon: Settings, label: 'Settings' },
    { id: 'test', icon: TestTube, label: 'Test Mode' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  ];

  const ListingModeToggle = ({ className = "" }) => (
    <div className={`flex bg-gray-900 rounded-full p-1 ${className}`}>
      {[
        { id: 'rent', label: '🏠 Rent', color: 'from-blue-500 to-cyan-500' },
        { id: 'sale', label: '🏡 Sale', color: 'from-green-500 to-emerald-500' },
        { id: 'both', label: '🔁 Both', color: 'from-purple-500 to-pink-500' }
      ].map(mode => (
        <button
          key={mode.id}
          onClick={async () => {
            const next = mode.id as ListingType;
            setListingMode(next);
            try { await api.setPropertyType(next); } catch {}
          }}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
            listingMode === mode.id
              ? `bg-gradient-to-r ${mode.color} text-white shadow-lg`
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );

  const StatusBadge = ({ status, type = 'message' }) => {
    const configs = {
      message: {
        sent: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle },
        failed: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle },
        blocked: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: Shield },
        ready: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Target }
      }
    };
    
    const config = configs[type][status];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </span>
    );
  };

  const DashboardContent = () => (
    <div className="space-y-6">
      {/* Header with Mode Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Dashboard Overview
        </h1>
        <ListingModeToggle />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Last Run', value: scraperStats.lastRun, icon: Clock, color: 'from-blue-500 to-cyan-500' },
          { title: 'Total Listings', value: scraperStats.totalListings, icon: Home, color: 'from-green-500 to-emerald-500' },
          { title: 'Messages Today', value: scraperStats.messagesSentToday, icon: MessageCircle, color: 'from-purple-500 to-pink-500' },
          { title: 'Success Rate', value: '78%', icon: TrendingUp, color: 'from-orange-500 to-red-500' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300">
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${stat.color} p-3 mb-4`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-gray-400 text-sm font-medium">{stat.title}</h3>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Scraper Controls</h3>
          <div className="space-y-4">
            <button 
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center disabled:opacity-60"
              disabled={isBusy}
              onClick={async () => {
                setIsBusy(true);
                setScraperStats(prev => ({ ...prev, isRunning: true }));
                try {
                  await api.runScraper({ propertyType: listingMode, zipCodes: zipInput ? [zipInput] : undefined, filters: {
                    alreadyRented: filters.alreadyRented, noAgents: filters.noAgents, duplicatePhotos: filters.duplicatePhotos
                  }});
                  const listResp = await api.getListings();
                  if (Array.isArray(listResp?.listings)) setListings(listResp.listings as Listing[]);
                  setScraperStats(prev => ({ ...prev, lastRun: 'just now' }));
                } catch {}
                setScraperStats(prev => ({ ...prev, isRunning: false }));
                setIsBusy(false);
              }}
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${scraperStats.isRunning ? 'animate-spin' : ''}`} />
              {scraperStats.isRunning ? 'Running...' : 'Re-Run Scraper'}
            </button>
            
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <span className="text-gray-300">Auto Messages</span>
              <button
                onClick={async () => {
                  const next = !autoMessage;
                  setAutoMessage(next);
                  try { await api.saveSettings({ autoMessages: next }); } catch {}
                }}
                className={`w-12 h-6 rounded-full transition-all duration-300 ${
                  autoMessage ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform duration-300 ${
                  autoMessage ? 'translate-x-6' : 'translate-x-0.5'
                } mt-0.5`} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Activity Feed</h3>
          <div className="space-y-3 max-h-40 overflow-y-auto">
            {[
              'Messaged owner at 123 Oak St (FRBO)',
              'Messaged owner at 456 Pine Ave (FSBO)',
              'Detected red flag: already rented',
              'Skipped duplicate listing'
            ].map((activity, idx) => (
              <div key={idx} className="flex items-center text-sm text-gray-300 p-2 bg-gray-800/50 rounded">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mr-3" />
                {activity}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const ScraperContent = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Zillow Scraper</h1>
        <ListingModeToggle />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Search Controls</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter city or zip code..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-cyan-500 focus:outline-none"
              value={zipInput}
              onChange={(e) => setZipInput(e.target.value)}
            />
            
            <div className="space-y-3">
              <label className="flex items-center text-gray-300">
                <input type="checkbox" className="mr-3 text-cyan-500" checked={filters.alreadyRented} onChange={(e)=>setFilters(v=>({ ...v, alreadyRented: e.target.checked }))} />
                Auto-skip Listings w/ "Already Rented"
              </label>
              <label className="flex items-center text-gray-300">
                <input type="checkbox" className="mr-3 text-cyan-500" checked={filters.noAgents} onChange={(e)=>setFilters(v=>({ ...v, noAgents: e.target.checked }))} />
                Auto-skip Listings w/ "No Agents"
              </label>
              <label className="flex items-center text-gray-300">
                <input type="checkbox" className="mr-3 text-cyan-500" checked={filters.duplicatePhotos} onChange={(e)=>setFilters(v=>({ ...v, duplicatePhotos: e.target.checked }))} />
                Auto-skip Listings w/ duplicate photos
              </label>
            </div>

            <div className="flex gap-3">
              <button className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center disabled:opacity-60" disabled={isBusy}
                onClick={async ()=>{
                  setIsBusy(true);
                  try { await api.runScraper({ propertyType: listingMode, zipCodes: zipInput ? [zipInput] : undefined, filters });
                    const listResp = await api.getListings();
                    if (Array.isArray(listResp?.listings)) setListings(listResp.listings as Listing[]);
                  } catch {}
                  setIsBusy(false);
                }}
              >
                <Search className="w-5 h-5 mr-2" />
                Start Search
              </button>
              <button className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center disabled:opacity-60" disabled={isBusy}
                onClick={async ()=>{
                  setIsBusy(true);
                  try { await api.runScraper({ propertyType: listingMode, filters });
                    const listResp = await api.getListings();
                    if (Array.isArray(listResp?.listings)) setListings(listResp.listings as Listing[]);
                  } catch {}
                  setIsBusy(false);
                }}
              >
                <Download className="w-5 h-5 mr-2" />
                Scrape Latest
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Recent Listings</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {listings.map(listing => (
              <div key={listing.id} className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">{listing.address}</p>
                  <p className="text-gray-400 text-sm">{listing.price}{listing.beds ? ` • ${listing.beds} bed` : ''} {listing.owner ? ` • ${listing.owner}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    listing.type === 'rent' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    {listing.type.toUpperCase()}
                  </span>
                  {listing.status && <StatusBadge status={listing.status} />}
                  <button
                    className="ml-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs font-medium py-1 px-3 rounded-lg transition-all duration-300 flex items-center"
                    onClick={async ()=>{
                      try { await api.sendMessage({ listing }); } catch {}
                    }}
                  >
                    <Send className="w-3 h-3 mr-1" /> Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const [showSendAllModal, setShowSendAllModal] = useState(false);
  const [sendAllResults, setSendAllResults] = useState<any[]>([]);
  const [isSendingAll, setIsSendingAll] = useState(false);

  // Mock function to simulate batch sending
  const handleSendAllMessages = async () => {
    setIsSendingAll(true);
    try {
      const resp = await api.sendBatch({ propertyType: listingMode === 'both' ? 'both' : listingMode, maxMessages: 10 });
      const results = Array.isArray(resp?.results) ? resp.results : resp;
      if (Array.isArray(results)) setSendAllResults(results);
    } catch {}
    setIsSendingAll(false);
    setShowSendAllModal(false);
  };

  const MessagesContent = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-white">Messages</h1>
        <div className="flex gap-3">
          <ListingModeToggle className="hidden sm:flex" />
          <button 
            onClick={() => setShowSendAllModal(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 flex items-center shadow-lg hover:shadow-purple-500/25"
          >
            <Zap className="w-5 h-5 mr-2" />
            Send All Messages
          </button>
        </div>
      </div>

      {/* Batch Results Display */}
      {sendAllResults.length > 0 && (
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <CheckCircle className="w-6 h-6 mr-2 text-green-400" />
            Batch Send Results
          </h3>
          <div className="space-y-3">
            {sendAllResults.map((result, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center">
                  {result.status === 'sent' ? (
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400 mr-3" />
                  )}
                  <span className="text-white font-medium">{result.address}</span>
                  <span className={`ml-3 px-2 py-1 rounded text-xs font-medium ${
                    result.type === 'rent' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    {result.type === 'rent' ? 'Rent' : 'Sale'}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-medium ${
                    result.status === 'sent' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {result.status === 'sent' ? '✅ Sent' : '❌ Failed'}
                  </span>
                  {result.reason && (
                    <p className="text-xs text-gray-400">{result.reason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Smart Filters Info */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
          <Filter className="w-5 h-5 mr-2 text-cyan-400" />
          Smart Filters Applied
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            'Skips already messaged addresses',
            'Skips flagged/red listings',
            'Skips listings with missing message links',
            'Respects daily message limit from settings'
          ].map((filter, idx) => (
            <div key={idx} className="flex items-center text-gray-300">
              <div className="w-2 h-2 bg-cyan-400 rounded-full mr-3" />
              {filter}
            </div>
          ))}
        </div>
      </div>
      
      <div className="grid gap-6">
        {listings.filter(l => !l.status || l.status === 'ready').map(listing => (
          <div key={listing.id} className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white">{listing.address}</h3>
                <p className="text-gray-400">Owner: {listing.owner} • {listing.price} • {listing.type.toUpperCase()}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                listing.type === 'rent' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
              }`}>
                {listing.type === 'rent' ? 'FRBO' : 'FSBO'}
              </span>
            </div>
            
            <textarea
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-cyan-500 focus:outline-none mb-4"
              rows={4}
              value={messageDrafts[listing.id] ?? ''}
              onChange={(e)=> setMessageDrafts(prev => ({ ...prev, [listing.id]: e.target.value }))}
              placeholder={`Hi ${listing.owner ?? ''}, I'm interested in ${listing.type === 'rent' ? 'renting' : 'purchasing'} your property at ${listing.address}...`}
            />
            
            <div className="flex gap-3">
              <button className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 flex items-center justify-center"
                onClick={async ()=>{
                  const message = messageDrafts[listing.id] ?? '';
                  try { await api.sendMessage({ listing, message }); } catch {}
                }}
              >
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </button>
              <button className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 flex items-center"
                onClick={async ()=>{
                  try {
                    const resp = await api.regenerateMessage({ listingId: listing.id });
                    const text = resp?.message || '';
                    setMessageDrafts(prev => ({ ...prev, [listing.id]: text }));
                  } catch {}
                }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Regenerate
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Send All Confirmation Modal */}
      {showSendAllModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Send All Messages</h3>
            <div className="space-y-4 mb-6">
              <p className="text-gray-300">
                Ready to send messages to all filtered listings for <strong>{listingMode}</strong> properties?
              </p>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-white mb-2">API Configuration:</h4>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>Endpoint: <code className="text-cyan-400">POST /api/message/send-batch</code></div>
                  <div>Property Type: <code className="text-cyan-400">{listingMode}</code></div>
                  <div>Smart Templates: <code className="text-cyan-400">true</code></div>
                  <div>Max Count: <code className="text-cyan-400">10</code> (from settings)</div>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-yellow-400 text-sm">
                  ⚠️ This will send messages to all eligible listings. Make sure your message templates are ready!
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowSendAllModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSendAllMessages}
                disabled={isSendingAll}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 flex items-center justify-center"
              >
                {isSendingAll ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Send All
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const LogsContent = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Message Logs</h1>
        <button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 flex items-center"
          onClick={async ()=>{ try { await api.exportLogsToSheets(); } catch {} }}
        >
          <Download className="w-4 h-4 mr-2" />
          Export to Sheets
        </button>
      </div>

      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-gray-300 font-medium">Address</th>
                <th className="px-6 py-4 text-left text-gray-300 font-medium">Owner</th>
                <th className="px-6 py-4 text-left text-gray-300 font-medium">Type</th>
                <th className="px-6 py-4 text-left text-gray-300 font-medium">Status</th>
                <th className="px-6 py-4 text-left text-gray-300 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(msg => (
                <tr key={msg.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                  <td className="px-6 py-4 text-white">{msg.address}</td>
                  <td className="px-6 py-4 text-gray-300">{msg.owner}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      msg.type === 'rent' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                      {msg.type === 'rent' ? 'FRBO' : 'FSBO'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={msg.status} />
                  </td>
                  <td className="px-6 py-4 text-gray-400">{msg.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const [settingsForm, setSettingsForm] = useState({
    zillowEmail: '',
    zillowPassword: '',
    googleSheetUrl: '',
    minBedrooms: '',
    maxPrice: '',
    dailyMessageLimit: '',
    timeWindow: '',
    redFlag: true,
    defaultType: 'both' as ListingType,
    testMode: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const s = await api.getSettings();
        if (s) {
          setSettingsForm(prev => ({
            ...prev,
            zillowEmail: s.zillowEmail ?? '',
            zillowPassword: '',
            googleSheetUrl: s.googleSheetUrl ?? '',
            minBedrooms: s.minBedrooms?.toString?.() ?? '',
            maxPrice: s.maxPrice?.toString?.() ?? '',
            dailyMessageLimit: s.dailyMessageLimit?.toString?.() ?? '',
            timeWindow: s.timeWindow ?? '',
            redFlag: Boolean(s.redFlag ?? true),
            defaultType: (s.propertyType as ListingType) || 'both',
            testMode: Boolean(s.testMode ?? false),
          }));
        }
      } catch {}
    })();
  }, []);

  const SettingsContent = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Settings</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Zillow Credentials</h3>
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Zillow Email"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-cyan-500 focus:outline-none"
                value={settingsForm.zillowEmail}
                onChange={(e)=> setSettingsForm(v=>({ ...v, zillowEmail: e.target.value }))}
              />
              <input
                type="password"
                placeholder="Password (optional)"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-cyan-500 focus:outline-none"
                value={settingsForm.zillowPassword}
                onChange={(e)=> setSettingsForm(v=>({ ...v, zillowPassword: e.target.value }))}
              />
            </div>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Google Sheets</h3>
            <input
              type="url"
              placeholder="Google Sheet URL for logs"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-cyan-500 focus:outline-none"
              value={settingsForm.googleSheetUrl}
              onChange={(e)=> setSettingsForm(v=>({ ...v, googleSheetUrl: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Default Search Mode</h3>
            <ListingModeToggle />
          </div>

          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Filters</h3>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="Max Price"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-cyan-500 focus:outline-none"
                value={settingsForm.maxPrice}
                onChange={(e)=> setSettingsForm(v=>({ ...v, maxPrice: e.target.value }))}
              />
              <input
                type="number"
                placeholder="Min Bedrooms"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-cyan-500 focus:outline-none"
                value={settingsForm.minBedrooms}
                onChange={(e)=> setSettingsForm(v=>({ ...v, minBedrooms: e.target.value }))}
              />
              <label className="flex items-center text-gray-300">
                <input type="checkbox" className="mr-3 text-cyan-500" checked={settingsForm.redFlag} onChange={(e)=> setSettingsForm(v=>({ ...v, redFlag: e.target.checked }))} />
                Auto-detect Red Flags
              </label>
            </div>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Scheduler</h3>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="Messages per day (e.g. 5)"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-cyan-500 focus:outline-none"
                value={settingsForm.dailyMessageLimit}
                onChange={(e)=> setSettingsForm(v=>({ ...v, dailyMessageLimit: e.target.value }))}
              />
              <input
                type="text"
                placeholder="Time range (e.g. 10am-6pm)"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-cyan-500 focus:outline-none"
                value={settingsForm.timeWindow}
                onChange={(e)=> setSettingsForm(v=>({ ...v, timeWindow: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 flex items-center"
          onClick={async ()=>{
            try {
              await api.saveSettings({
                zillowEmail: settingsForm.zillowEmail,
                zillowPassword: settingsForm.zillowPassword || undefined,
                googleSheetUrl: settingsForm.googleSheetUrl,
                minBedrooms: settingsForm.minBedrooms ? Number(settingsForm.minBedrooms) : undefined,
                maxPrice: settingsForm.maxPrice ? Number(settingsForm.maxPrice) : undefined,
                dailyMessageLimit: settingsForm.dailyMessageLimit ? Number(settingsForm.dailyMessageLimit) : undefined,
                timeWindow: settingsForm.timeWindow,
                redFlag: settingsForm.redFlag,
                propertyType: settingsForm.defaultType,
                testMode: settingsForm.testMode,
              });
            } catch {}
          }}
        >
          <Save className="w-5 h-5 mr-2" />
          Save Settings
        </button>
      </div>
    </div>
  );

  const TestModeContent = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Test Mode</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Simulation Controls</h3>
          <div className="space-y-4">
            <button className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center">
              <Play className="w-5 h-5 mr-2" />
              Simulate Message Flow
            </button>
            <button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center">
              <Eye className="w-5 h-5 mr-2" />
              Preview Generated Message
            </button>
          </div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Sample Output</h3>
          <div className="bg-gray-800 rounded-lg p-4 text-gray-300 font-mono text-sm">
            Testing message to Sarah at 123 Oak St...<br/>
            ✅ Message generated<br/>
            ✅ Red flags checked<br/>
            🔍 Simulating send...<br/>
            ✅ Test complete - ready for production
          </div>
        </div>
      </div>
    </div>
  );

  const AnalyticsContent = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Messages/Day', value: '15.3', trend: '+12%', color: 'from-blue-500 to-cyan-500' },
          { title: 'Response Rate', value: '23%', trend: '+5%', color: 'from-green-500 to-emerald-500' },
          { title: 'Top Zip', value: '78731', trend: 'Austin', color: 'from-purple-500 to-pink-500' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${stat.color} p-3 mb-4`}>
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-gray-400 text-sm font-medium">{stat.title}</h3>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
            <p className="text-green-400 text-sm mt-1">{stat.trend}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Smart Suggestions</h3>
        <div className="space-y-3">
          {[
            '🎯 Try FSBO listings in South Austin - 34% higher response rate',
            '⏰ Best messaging time: 11am-2pm on weekdays',
            '📍 Expand search to Cedar Park - low competition detected',
            '💡 Personalized messages get 2.3x more responses'
          ].map((suggestion, idx) => (
            <div key={idx} className="flex items-center p-3 bg-gray-800/50 rounded-lg">
              <Zap className="w-5 h-5 text-yellow-400 mr-3 flex-shrink-0" />
              <span className="text-gray-300">{suggestion}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardContent />;
      case 'scraper': return <ScraperContent />;
      case 'messages': return <MessagesContent />;
      case 'logs': return <LogsContent />;
      case 'settings': return <SettingsContent />;
      case 'test': return <TestModeContent />;
      case 'analytics': return <AnalyticsContent />;
      default: return <DashboardContent />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white font-['Space_Grotesk',sans-serif]">
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full bg-gray-900/90 backdrop-blur-sm border-r border-gray-800 z-50 transition-all duration-300 ${
        isMobile ? (sidebarCollapsed ? '-translate-x-full' : 'w-64') : (sidebarCollapsed ? 'w-16' : 'w-64')
      }`}>
        <div className="p-6">
          <div className="flex items-center mb-8">
            {!sidebarCollapsed && (
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Zillow Assistant
                </h2>
                <p className="text-xs text-gray-400">FRBO + FSBO Ready</p>
              </div>
            )}
          </div>

          <nav className="space-y-2">
            {sidebarItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-300 group ${
                    activeTab === item.id
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-3'} ${
                    activeTab === item.id ? 'text-cyan-400' : 'group-hover:text-white'
                  }`} />
                  {!sidebarCollapsed && (
                    <span className="font-medium">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Collapse Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-6 w-6 h-6 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-300"
        >
          <div className={`w-2 h-2 border-t border-r border-gray-400 transform transition-transform duration-300 ${
            sidebarCollapsed ? 'rotate-45' : '-rotate-135'
          }`} />
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobile && !sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Main Content */}
      <div className={`transition-all duration-300 ${
        isMobile ? 'ml-0' : (sidebarCollapsed ? 'ml-16' : 'ml-64')
      }`}>
        {/* Mobile Header */}
        {isMobile && (
          <div className="bg-gray-900/90 backdrop-blur-sm border-b border-gray-800 p-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
            >
              <div className="w-4 h-3 flex flex-col justify-between">
                <div className="w-full h-0.5 bg-current" />
                <div className="w-full h-0.5 bg-current" />
                <div className="w-full h-0.5 bg-current" />
              </div>
            </button>
            <h1 className="text-lg font-bold text-white">Zillow Assistant</h1>
            <div className="w-8" />
          </div>
        )}

        <div className="p-6 min-h-screen">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ZillowDashboard;
