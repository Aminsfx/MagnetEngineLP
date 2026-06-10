import { Lead, AppConfig, DashboardStats } from './types';

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

    // Calculate dashboard statistics from the full lead list
    calculateStats(leads: Lead[]): DashboardStats {
        const totalLeads = leads.length;
        const approvedLeads = leads.filter(l => l.approved).length;
        const dmsSent = leads.filter(l => l.dmSent).length;
        const replied = leads.filter(l => l.replied).length;
        const positiveReplies = leads.filter(l => l.positiveReply).length;
        const booked = leads.filter(l => l.booked).length;
        const followedUp = leads.filter(l => l.followedUp).length;

        const replyRate = dmsSent > 0 ? (replied / dmsSent) * 100 : 0;
        const positiveReplyRate = replied > 0 ? (positiveReplies / replied) * 100 : 0;
        const bookingRate = positiveReplies > 0 ? (booked / positiveReplies) * 100 : 0;
        const followUpRate = dmsSent > 0 ? (followedUp / dmsSent) * 100 : 0;

        // Count distinct campaign IDs
        const activeCampaigns = new Set(
            leads.map(l => l.campaignId).filter(Boolean)
        ).size;

        return {
            totalLeads,
            approvedLeads,
            dmsSent,
            replyRate: Math.round(replyRate * 10) / 10,
            positiveReplyRate: Math.round(positiveReplyRate * 10) / 10,
            bookingRate: Math.round(bookingRate * 10) / 10,
            followUpRate: Math.round(followUpRate * 10) / 10,
            leadsContacted: dmsSent,
            activeCampaigns,
        };
    },
};
