import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { MetricsGrid } from './components/dashboard/MetricsGrid';
import { ConversionChart } from './components/dashboard/ConversionChart';
import { AIAnalyst } from './components/dashboard/AIAnalyst';
import { LeadTable } from './components/crm/LeadTable';
import { LeadManagementPanel } from './components/crm/LeadManagementPanel';
import { LeadsPreviewTable } from './components/crm/LeadsPreviewTable';
import { KanbanBoard } from './components/pipeline/KanbanBoard';
import { RevenueCalculator } from './components/calculator/RevenueCalculator';
import { SettingsPanel } from './components/settings/SettingsPanel';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import { storage } from './lib/storage';
import { filterUtils } from './lib/filters';
import { aiAPI } from './lib/api';
import { Lead, AppConfig, DashboardStats } from './lib/types';

const App: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [config, setConfig] = useState<AppConfig>(storage.getConfig());
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    dmsSent: 0,
    responseRate: 0,
    revenue: 0,
    funnelEfficiency: 0,
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Load leads from storage on mount
  useEffect(() => {
    const savedLeads = storage.getLeads();
    setLeads(savedLeads);
  }, []);

  // Update filtered leads and stats when leads or config change
  useEffect(() => {
    const filtered = filterUtils.filterLeads(leads, config);
    setFilteredLeads(filtered);
    setStats(filterUtils.calculateStats(filtered));
    storage.setLeads(leads);
  }, [leads, config]);

  const handleImport = (newLeads: Lead[]) => {
    // Merge with existing leads (avoid duplicates by ID)
    const existingIds = new Set(leads.map(l => l.id));
    const uniqueNewLeads = newLeads.filter(l => !existingIds.has(l.id));
    setLeads([...leads, ...uniqueNewLeads]);
  };

  const handleUpdateLead = (id: string, updates: Partial<Lead>) => {
    setLeads(leads.map(lead => lead.id === id ? { ...lead, ...updates } : lead));
  };

  const handleUpdateConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    storage.setConfig(newConfig);
  };

  const handleGenerateDMs = async () => {
    console.log('Starting DM generation...');
    console.log('Total leads:', leads.length);
    console.log('Filtered leads:', filteredLeads.length);

    const apiKeys = storage.getAPIKeys();
    const apiKey = apiKeys[config.selectedAIProvider];

    if (!apiKey) {
      alert(`Please set your ${config.selectedAIProvider.toUpperCase()} API key in Settings first.`);
      return;
    }

    const leadsToProcess = filteredLeads.filter(l => !l.dmSent);
    console.log('Leads to process:', leadsToProcess.length);

    if (leadsToProcess.length === 0) {
      alert('No leads without DMs found.');
      return;
    }

    setIsGenerating(true);
    const updatedLeads = [...leads];
    const dmDate = new Date().toISOString();
    let successCount = 0;

    for (const lead of leadsToProcess.slice(0, 5)) {
      try {
        console.log(`Generating DM for ${lead.name}...`);
        const dm = await aiAPI.generateDM(
          config.selectedAIProvider,
          apiKey,
          lead,
          config.systemPrompt
        );

        const leadIndex = updatedLeads.findIndex(l => l.id === lead.id);
        console.log(`Found lead at index ${leadIndex}`);

        if (leadIndex !== -1) {
          updatedLeads[leadIndex] = {
            ...updatedLeads[leadIndex],
            dmSent: true,
            dmContent: dm,
            dmDate: dmDate,
          };
          successCount++;
          console.log(`Updated lead: ${lead.name}`);
        }
      } catch (error) {
        console.error(`Error generating DM for ${lead.name}:`, error);
        alert(`Error generating DM for ${lead.name}: ${error}`);
      }
    }

    console.log('Updating leads state with', updatedLeads.length, 'leads');
    setLeads(updatedLeads);
    setIsGenerating(false);

    if (successCount > 0) {
      alert(`DM generation complete! ${successCount} leads processed. Check the CRM page to see them.`);
    } else {
      alert('DM generation failed. Please check your API key and try again.');
    }
  };

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <div className="flex min-h-screen bg-[#0B0F19]">
            <Sidebar />
            <main className="flex-1 ml-64 overflow-auto">
              <Routes>
                <Route
                  path="/dashboard"
                  element={
                    <div className="p-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                      </div>
                      <MetricsGrid stats={stats} />
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                          <ConversionChart />
                        </div>
                        <AIAnalyst stats={stats} />
                      </div>
                    </div>
                  }
                />
                <Route
                  path="/leads"
                  element={
                    <div className="p-8 space-y-6">
                      <div>
                        <h1 className="text-3xl font-bold text-white">Leads</h1>
                        <p className="text-zinc-500 mt-1">Import, filter, and generate AI DMs</p>
                      </div>

                      <LeadManagementPanel
                        onImportLeads={handleImport}
                        allLeads={leads}
                        filteredLeads={filteredLeads}
                        onGenerateDMs={handleGenerateDMs}
                        isGenerating={isGenerating}
                        config={config}
                      />

                      {/* Preview of filtered leads */}
                      <div>
                        <div className="mb-4">
                          <h2 className="text-xl font-semibold text-white">
                            {filteredLeads.length === leads.length ? 'All Imported Leads' : 'Filtered Leads'}
                          </h2>
                          <p className="text-sm text-zinc-500 mt-1">
                            Ready to generate DMs for {filteredLeads.filter(l => !l.dmSent).length} leads
                          </p>
                        </div>
                        <LeadsPreviewTable leads={filteredLeads} />
                      </div>
                    </div>
                  }
                />
                <Route
                  path="/crm"
                  element={
                    <div className="p-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h1 className="text-3xl font-bold text-white">CRM</h1>
                          <p className="text-zinc-500 mt-1">Track DMs and follow-ups</p>
                        </div>
                        <div className="px-4 py-2 bg-emerald-600/10 border border-emerald-600/20 rounded-xl">
                          <span className="text-sm text-emerald-400 font-medium">
                            {leads.filter(l => l.dmSent).length} Leads with DMs
                          </span>
                        </div>
                      </div>

                      <LeadTable
                        leads={leads.filter(l => l.dmSent)}
                        onUpdateLead={handleUpdateLead}
                      />
                    </div>
                  }
                />
                <Route
                  path="/pipeline"
                  element={
                    <div className="p-8 space-y-6">
                      <div>
                        <h1 className="text-3xl font-bold text-white">Pipeline</h1>
                        <p className="text-zinc-500 mt-1">Drag leads across stages</p>
                      </div>
                      <KanbanBoard leads={filteredLeads} onUpdateLead={handleUpdateLead} />
                    </div>
                  }
                />
                <Route path="/calculator" element={<div className="p-8"><RevenueCalculator /></div>} />
                <Route
                  path="/settings"
                  element={
                    <div className="p-8">
                      <h1 className="text-3xl font-bold text-white mb-6">Settings</h1>
                      <SettingsPanel config={config} onUpdateConfig={handleUpdateConfig} />
                    </div>
                  }
                />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>
          </div>
        }
      />
    </Routes>
  );
};

export default App;
