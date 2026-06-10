import type { AppConfig } from './types';

export interface NichePreset {
    id: string;
    name: string;
    emoji: string;
    description: string;
    suggestedSearch: string;
    config: Partial<AppConfig>;
}

export const NICHE_PRESETS: NichePreset[] = [
    {
        id: 'magnetengine',
        name: 'MagnetEngine Outreach',
        emoji: '🧲',
        description: 'Sell MagnetEngine to agency owners, coaches, and consultants',
        suggestedSearch: 'agency owner, SMMA, coach, consultant, freelancer, digital marketing, growth',
        config: {
            businessName: 'MagnetEngine',
            businessNiche: 'AI-powered Instagram lead generation and outreach automation',
            targetAudience: 'Agency owners, SMMA founders, coaches, consultants, and freelancers who do cold Instagram outreach',
            valueProposition: 'We automate your entire Instagram outreach — finding leads, writing personalized DMs, and sending them automatically — so your calendar fills without manual prospecting.',
            dmTone: 'casual',
            includeKeywords: ['agency', 'founder', 'coach', 'consultant', 'SMMA', 'freelancer', 'marketing', 'growth', 'entrepreneur', 'CEO'],
            excludeKeywords: ['bot', 'giveaway', 'follow for follow', 'f4f', 'crypto', 'NFT', 'MLM', 'dropship'],
            minFollowers: 1000,
            maxFollowers: 500000,
            systemPrompt: `You are writing cold Instagram DMs on behalf of MagnetEngine — an AI-powered outreach platform for agencies, coaches, and consultants.

YOUR AUDIENCE: Agency owners, SMMA founders, coaches, consultants, and freelancers who currently do Instagram outreach manually and waste hours on prospecting every week.

VALUE PROPOSITION: MagnetEngine automates their entire outreach system — finding qualified leads, writing a unique personalized DM for each one, and sending them with human-like timing — so their calendar fills automatically without manual work.

TONE: Casual and direct — entrepreneur to entrepreneur. Like a peer who spotted something interesting about their work.

RULES:
- 2–3 sentences max. Short is better.
- Reference something specific from their profile (their niche, offer, audience, or how they talk about their work).
- End with a soft curiosity question about their current outreach or client acquisition process.
- NEVER mention "AI", "automation", or "software" in the opener — just spark curiosity.
- Sound like a real person, not a salesperson.
- Output ONLY the raw DM text. No quotes, no labels, no markdown.`,
        },
    },
    {
        id: 'smma',
        name: 'SMMA / Social Media Agency',
        emoji: '📱',
        description: 'Target business owners who need social media management',
        suggestedSearch: 'smma, social media agency, digital marketing agency, agency owner',
        config: {
            businessNiche: 'Social media marketing agency',
            targetAudience: 'Small to mid-size business owners with 2k–300k Instagram followers who post inconsistently or run ads without a clear strategy',
            valueProposition: 'We manage your social media end-to-end — content, engagement, and paid ads — so you can focus on running your business while we grow your audience and generate leads.',
            dmTone: 'casual',
            includeKeywords: ['business', 'entrepreneur', 'founder', 'CEO', 'owner'],
            excludeKeywords: ['bot', 'giveaway', 'follow for follow', 'spam'],
            minFollowers: 2000,
            maxFollowers: 300000,
            systemPrompt: `You are writing cold DMs for a social media marketing agency targeting small business owners.

VALUE PROPOSITION: We manage social media end-to-end — content, engagement, and paid ads — so owners can focus on their business while we grow their audience and generate leads.

TONE: Casual and conversational, like a fellow entrepreneur reaching out.

RULES:
- 2–3 sentences max. Short and punchy.
- Reference something specific from their profile (their niche, business type, or content style).
- End with a soft curiosity question — not a pitch.
- No "I hope this finds you well." Sound like a real person.
- Output ONLY the raw DM text. No quotes, no labels, no markdown.`,
        },
    },
    {
        id: 'coach',
        name: 'Online Coach',
        emoji: '🎯',
        description: 'Target coaches and people selling transformation',
        suggestedSearch: 'online coach, life coach, business coach, fitness coach, mindset coach',
        config: {
            businessNiche: 'Online coaching (fitness, life, or business)',
            targetAudience: 'People who coach or want to start coaching — posting about personal growth, transformation, fitness, or entrepreneurship with 1k–150k followers',
            valueProposition: 'We help coaches go from struggling to get clients to a full roster within 90 days using our proven Instagram DM system.',
            dmTone: 'friendly',
            includeKeywords: ['coach', 'coaching', 'mentor', 'transformation', 'mindset', 'fitness'],
            excludeKeywords: ['bot', 'giveaway', 'MLM', 'network marketing'],
            minFollowers: 1000,
            maxFollowers: 150000,
            systemPrompt: `You are writing cold DMs for a coaching business targeting aspiring or active online coaches.

VALUE PROPOSITION: We help coaches build a full client roster within 90 days using a proven Instagram outreach system.

TONE: Friendly and warm — one coach speaking to another.

RULES:
- 2–3 sentences max.
- Reference their coaching niche, transformation journey, or a specific topic they post about.
- Ask a genuine curiosity question at the end — don't pitch.
- Avoid generic compliments ("Love your content!"). Be specific.
- Output ONLY the raw DM text. No quotes, no labels, no markdown.`,
        },
    },
    {
        id: 'ecommerce',
        name: 'E-commerce Brand',
        emoji: '🛍️',
        description: 'Target DTC brand owners selling products online',
        suggestedSearch: 'ecommerce brand, online store, DTC brand, product founder, shopify store',
        config: {
            businessNiche: 'E-commerce / DTC brand growth',
            targetAudience: 'Founders of direct-to-consumer product brands in fashion, beauty, wellness, or lifestyle niches with 3k–500k followers',
            valueProposition: 'We help e-commerce brands convert their Instagram following into paying customers without increasing ad spend.',
            dmTone: 'professional',
            includeKeywords: ['brand', 'founder', 'ecommerce', 'shop', 'store', 'product'],
            excludeKeywords: ['dropship', 'affiliate', 'giveaway', 'bot'],
            minFollowers: 3000,
            maxFollowers: 500000,
            systemPrompt: `You are writing cold DMs for an e-commerce growth agency targeting DTC brand founders.

VALUE PROPOSITION: We help e-commerce brands convert their Instagram following into paying customers without increasing ad spend.

TONE: Professional but approachable — peer-to-peer founder energy.

RULES:
- 2–3 sentences max.
- Reference their product category, brand aesthetic, or a specific item you noticed.
- End with a question about their current conversion or growth challenge.
- No "I was scrolling and came across your page." Be direct.
- Output ONLY the raw DM text. No quotes, no labels, no markdown.`,
        },
    },
    {
        id: 'realestate',
        name: 'Real Estate',
        emoji: '🏠',
        description: 'Target agents, investors, and property professionals',
        suggestedSearch: 'real estate agent, property investor, realtor, real estate wholesaler',
        config: {
            businessNiche: 'Real estate investment or brokerage',
            targetAudience: 'Real estate agents, wholesalers, and investors who post about deals, properties, or market insights with 500–200k followers',
            valueProposition: 'We help real estate professionals generate 5–10 qualified leads per week using organic Instagram outreach.',
            dmTone: 'professional',
            includeKeywords: ['real estate', 'realtor', 'property', 'investor', 'agent', 'wholesaler'],
            excludeKeywords: ['bot', 'giveaway', 'MLM'],
            minFollowers: 500,
            maxFollowers: 200000,
            systemPrompt: `You are writing cold DMs for a real estate lead generation service targeting agents and investors.

VALUE PROPOSITION: We help real estate professionals generate 5–10 qualified leads per week through Instagram outreach.

TONE: Professional and direct — real estate professionals respect straightforwardness.

RULES:
- 2–3 sentences max.
- Reference their market, deal type, or investment focus.
- Ask a specific question about their lead generation approach or current market.
- Skip generic openers. Get to the point.
- Output ONLY the raw DM text. No quotes, no labels, no markdown.`,
        },
    },
    {
        id: 'freelance-dev',
        name: 'Freelance Dev / Design',
        emoji: '💻',
        description: 'Target businesses that need websites or design work',
        suggestedSearch: 'startup founder, small business owner, entrepreneur, CEO, solopreneur',
        config: {
            businessNiche: 'Freelance web development or design',
            targetAudience: 'Startup founders and small business owners who have an online presence but an outdated or missing website, with 500–100k followers',
            valueProposition: 'We build high-converting websites for service businesses in 2–3 weeks at a fixed price — no agencies, no bloat.',
            dmTone: 'casual',
            includeKeywords: ['founder', 'startup', 'business', 'entrepreneur', 'CEO', 'solopreneur'],
            excludeKeywords: ['bot', 'giveaway', 'influencer', 'content creator'],
            minFollowers: 500,
            maxFollowers: 100000,
            systemPrompt: `You are writing cold DMs for a freelance web developer or design studio targeting founders and business owners.

VALUE PROPOSITION: We build high-converting websites for service businesses in 2–3 weeks at a fixed price.

TONE: Casual and direct — developer to founder energy.

RULES:
- 2–3 sentences max.
- Reference their business type or what their online presence suggests.
- Ask about their website or conversion challenge specifically.
- Sound like a smart freelancer, not a corporate agency.
- Output ONLY the raw DM text. No quotes, no labels, no markdown.`,
        },
    },
    {
        id: 'course-creator',
        name: 'Course Creator',
        emoji: '🎓',
        description: 'Target experts with knowledge to productize into a course',
        suggestedSearch: 'course creator, online course, digital product, skool community, educator',
        config: {
            businessNiche: 'Online courses and digital education',
            targetAudience: 'Content creators and experts in education, finance, or skill-based niches who have knowledge to share but haven\'t productized it — 5k–200k followers',
            valueProposition: 'We help experts turn their knowledge into a $5k–$20k/month course business — from idea to first sale in 60 days.',
            dmTone: 'friendly',
            includeKeywords: ['creator', 'educator', 'teacher', 'expert', 'knowledge', 'course', 'skool'],
            excludeKeywords: ['bot', 'spam', 'giveaway', 'MLM'],
            minFollowers: 5000,
            maxFollowers: 500000,
            systemPrompt: `You are writing cold DMs for a course creation and launch service targeting content creators and subject-matter experts.

VALUE PROPOSITION: We help experts turn their knowledge into a $5k–$20k/month course business — from idea to first sale in 60 days.

TONE: Friendly and peer-to-peer — one creator speaking to another.

RULES:
- 2–3 sentences max.
- Reference their specific area of expertise or the audience they serve.
- Ask a curious question about whether they've considered monetizing their knowledge.
- Don't assume they haven't tried. Be curious, not condescending.
- Output ONLY the raw DM text. No quotes, no labels, no markdown.`,
        },
    },
    {
        id: 'b2b-consultant',
        name: 'B2B Consultant',
        emoji: '💼',
        description: 'Target decision-makers at growing B2B companies',
        suggestedSearch: 'CEO, founder, managing director, business consultant, agency owner, operations',
        config: {
            businessNiche: 'B2B consulting or professional services',
            targetAudience: 'CEOs, managing directors, and founders of 5–100 person companies who post about business growth, operations, or leadership with 1k–100k followers',
            valueProposition: 'We help B2B companies add $50k–$200k in annual revenue by fixing the biggest leaks in their sales and operations.',
            dmTone: 'professional',
            includeKeywords: ['CEO', 'founder', 'director', 'managing', 'business', 'consulting'],
            excludeKeywords: ['bot', 'influencer', 'lifestyle', 'MLM'],
            minFollowers: 1000,
            maxFollowers: 100000,
            systemPrompt: `You are writing cold DMs for a B2B consulting firm targeting business owners and C-level executives.

VALUE PROPOSITION: We help B2B companies add $50k–$200k in annual revenue by identifying and fixing the biggest leaks in their sales and operations.

TONE: Professional and peer-level — executive to executive.

RULES:
- 2–3 sentences max.
- Reference their industry, company size, or a specific business challenge they've posted about.
- End with a high-value question, not a pitch.
- No small talk. These people are busy.
- Output ONLY the raw DM text. No quotes, no labels, no markdown.`,
        },
    },
    {
        id: 'video-agency',
        name: 'Video / Content Agency',
        emoji: '🎬',
        description: 'Target brands and businesses needing video production',
        suggestedSearch: 'brand, marketing manager, content director, media company, marketing agency',
        config: {
            businessNiche: 'Video production and content creation agency',
            targetAudience: 'Brand managers, marketing directors, and business owners who post regularly but have low production quality or engagement — 2k–500k followers',
            valueProposition: 'We produce scroll-stopping short-form video content for brands — scripted, filmed, and posted — at a flat monthly rate.',
            dmTone: 'bold',
            includeKeywords: ['brand', 'marketing', 'content', 'media', 'creative'],
            excludeKeywords: ['bot', 'giveaway', 'spam', 'follow for follow'],
            minFollowers: 2000,
            maxFollowers: 500000,
            systemPrompt: `You are writing cold DMs for a video production and content agency targeting brands and marketing professionals.

VALUE PROPOSITION: We produce scroll-stopping short-form video content for brands — scripted, filmed, and posted — at a flat monthly rate.

TONE: Bold and confident — creative industry energy.

RULES:
- 2–3 sentences max.
- Lead with a specific observation about their content (posting frequency, style, or untapped potential).
- Ask a pointed question about their content goals.
- Sound like a fellow creative who spotted a gap, not a salesperson.
- Output ONLY the raw DM text. No quotes, no labels, no markdown.`,
        },
    },
];
