import { Lead, AppConfig } from './types';

export const filterUtils = {
    // Filter leads based on config
    filterLeads(leads: Lead[], config: AppConfig): Lead[] {
        return leads.filter(lead => {
            // Follower count filter
            if (lead.followers < config.minFollowers || lead.followers > config.maxFollowers) {
                return false;
            }

            // Account type filter
            if (config.accountType === 'public' && lead.isPrivate) {
                return false;
            }
            if (config.accountType === 'private' && !lead.isPrivate) {
                return false;
            }

            // Keyword filters
            const leadText = `${lead.name} ${lead.handle} ${lead.bio || ''}`.toLowerCase();

            // Exclude keywords (if any match, exclude)
            if (config.excludeKeywords.length > 0) {
                const hasExcluded = config.excludeKeywords.some(keyword =>
                    leadText.includes(keyword.toLowerCase())
                );
                if (hasExcluded) return false;
            }

            // Include keywords (if list is not empty, at least one must match)
            if (config.includeKeywords.length > 0) {
                const hasIncluded = config.includeKeywords.some(keyword =>
                    leadText.includes(keyword.toLowerCase())
                );
                if (!hasIncluded) return false;
            }

            return true;
        });
    },

    // Calculate dashboard statistics
    calculateStats(leads: Lead[]) {
        const totalLeads = leads.length;
        const dmsSent = leads.filter(l => l.dmSent).length;
        const repliedCount = leads.filter(l => l.replied).length;
        const responseRate = dmsSent > 0 ? (repliedCount / dmsSent) * 100 : 0;
        const wonDeals = leads.filter(l => l.status === 'won');
        const revenue = wonDeals.reduce((sum, l) => sum + (l.dealValue || 0), 0);
        const funnelEfficiency = totalLeads > 0 ? (wonDeals.length / totalLeads) * 100 : 0;

        return {
            totalLeads,
            dmsSent,
            responseRate: Math.round(responseRate * 10) / 10,
            revenue,
            funnelEfficiency: Math.round(funnelEfficiency * 10) / 10,
        };
    },
};
