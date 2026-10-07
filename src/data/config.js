window.PF_CONFIG = {
  saveVersion: 3,
  startingStats: {
    maxHp: 100,
    damage: 8,
    attackMs: 1000,
    crit: 0.05,
    regen: 0,
    armor: 0,
    dodge: 0
  },
  powerMilestones: [10,30,50,125,175,225,275,350,450,600],
  wallBosses: [75,100,150,200,300,500,750,1000],
  worlds: [
    {min:1,name:'City',className:'world-city'},
    {min:101,name:'Global Crisis',className:'world-global'},
    {min:251,name:'Planetary',className:'world-planetary'},
    {min:501,name:'Cosmic',className:'world-cosmic'}
  ],
  storyStages: [1,30,75,100,200],
  soulTree: [
    {id:'might',name:'Eternal Might',icon:'STR',branch:'CORE',desc:'+1.5% permanent damage per rank. No practical rank ceiling.',baseCost:2,max:9999},
    {id:'fortune',name:'Soul Fortune',icon:'C',branch:'CORE',desc:'+2% coin gain per rank. Built for thousands of ranks.',baseCost:2,max:9999},
    {id:'survival',name:'Enduring Spark',icon:'HP',branch:'CORE',desc:'+1.5% starting HP per rank. No practical rank ceiling.',baseCost:2,max:9999},
    {id:'instinct',name:'Killer Instinct',icon:'CRT',branch:'CORE',desc:'+0.15% starting crit per rank, with diminishing returns near the cap.',baseCost:3,max:9999},
    {id:'foundation',name:'Hero Foundation',icon:'ATR',branch:'CORE',desc:'+1% to all starting attributes per rank. Scales almost endlessly.',baseCost:4,max:9999},
    {id:'choice',name:'Expanded Awakening',icon:'DNA',branch:'MUTATION',desc:'+1 power offered at every awakening per rank',baseCost:14,max:4},
    {id:'reroll',name:'Mutation Rerolls',icon:'RNG',branch:'MUTATION',desc:'+1 reroll available for every awakening per rank',baseCost:18,max:4},
    {id:'starting_choice',name:'Genesis Selection',icon:'GEN',branch:'MUTATION',desc:'Begin each normal run with a free power awakening. Higher ranks improve its minimum rarity.',baseCost:45,max:3},
    {id:'mastery_training',name:'Mastery Training',icon:'MST',branch:'MUTATION',desc:'Unlock permanent Power Mastery. Rank 1 trains one-power runs; later ranks let up to 5 powers train together.',baseCost:40,max:5},
    {id:'mastery_potency',name:'Mastery Potency',icon:'AMP',branch:'TRANSCENDENCE',desc:'Small near-infinite multiplier to bonuses granted by permanent Power Mastery.',baseCost:18,max:9999},
    {id:'power_memory',name:'Power Memory',icon:'MEM',branch:'MUTATION',desc:'Permanent power slot. The cost becomes vicious at high ranks.',baseCost:30,max:999},
    {id:'patrol_compression',name:'Threat Compression',icon:'XP',branch:'MOMENTUM',desc:'Reduces patrol enemies required to advance a stage.',baseCost:20,max:3},
    {id:'overkill',name:'Overkill Transfer',icon:'OVR',branch:'MOMENTUM',desc:'Excess damage carries into the next enemy. Each rank increases the amount preserved.',baseCost:28,max:8},
    {id:'bossbane',name:'Bossbane',icon:'BOS',branch:'MOMENTUM',desc:'+2% boss damage per rank. Designed for enormous investment.',baseCost:3,max:9999},
    {id:'autobuy',name:'Combat Automation',icon:'TEC',branch:'AUTOMATION',desc:'Automatically buys the cheapest affordable attribute each second',baseCost:25,max:1},
    {id:'soul_echo',name:'Soul Echo',icon:'SOUL',branch:'AUTOMATION',desc:'Each rank adds a small starting-coin echo based on highest stage.',baseCost:8,max:9999},
    {id:'mastery_amp',name:'Mastery Resonance',icon:'MAS',branch:'TRANSCENDENCE',desc:'Each rank slightly increases damage gained from mastered duplicate powers.',baseCost:12,max:9999},
    {id:'deep_build',name:'Power Density',icon:'PWR',branch:'TRANSCENDENCE',desc:'Every 5 active powers gain +0.5% damage per rank. Built for huge ranks.',baseCost:15,max:9999}
  ]
};

