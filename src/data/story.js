(function(){
  window.PF_STORY={
    1:{id:'awakening',speaker:'UNKNOWN VOICE',portrait:'?',text:'You wake in a city that is already falling apart. Something inside you feels wrong — or powerful. A voice breaks through your phone.',choices:[
      {text:'“Tell me what happened to me.”',sub:'Scientific route',flag:'curious',effect:s=>{s.storyDamageBonus*=1.02}},
      {text:'“Who do I need to fight?”',sub:'Aggressive route • +5% run damage',flag:'aggressive',effect:s=>{s.storyDamageBonus*=1.05}},
      {text:'“Can this be reversed?”',sub:'Control route • +5% max HP',flag:'control',effect:s=>{s.maxHp*=1.05;s.hp*=1.05}}
    ]},
    30:{id:'contact',speaker:'DR. MIRA VALE',portrait:'M',text:'“Your cells are rewriting themselves around stress. Every fight is teaching your body new rules. That should be impossible.”',choices:[
      {text:'“Then help me control it.”',sub:'+8% regen effectiveness this run',flag:'mira_trust',effect:s=>{s.regen*=1.08}},
      {text:'“I don’t need control.”',sub:'+8% damage this run',flag:'independent',effect:s=>{s.damageMult*=1.08}},
      {text:'“Who else knows?”',sub:'Unlocks extra lore later',flag:'conspiracy',effect:s=>{s.storyCoinBonus*=1.05}}
    ]},
    75:{id:'warden',speaker:'THE NULL WARDEN',portrait:'Ø',text:'“You are not a person with powers. You are an uncontrolled event. I was built to end events.”',choices:[
      {text:'“Come and try.”',sub:'+10% boss damage for this fight',flag:'defiant',effect:s=>{s.tempBossBonus*=1.10}},
      {text:'“Who built you?”',sub:'Gain +8% crit for this fight',flag:'investigate',effect:s=>{s.crit+=.08}},
      {text:'Say nothing.',sub:'+10% dodge for this fight',flag:'silent',effect:s=>{s.dodge+=.10}}
    ]},
    100:{id:'atlas',speaker:'DR. MIRA VALE',portrait:'M',text:'“Whatever you were at the start of this, you aren’t that anymore. The question is whether you’re becoming a protector… or the next disaster.”',choices:[
      {text:'“I decide what I become.”',sub:'+5% all-round combat efficiency',flag:'self_defined',effect:s=>{s.damageMult*=1.05;s.maxHp*=1.05;s.hp*=1.05}},
      {text:'“Then point me at the disaster.”',sub:'+12% boss damage this run',flag:'protector',effect:s=>{s.tempBossBonus*=1.12}},
      {text:'“Maybe they should be afraid.”',sub:'+15% damage, −8% max HP',flag:'menace',effect:s=>{s.damageMult*=1.15;s.maxHp*=.92;s.hp=Math.min(s.hp,s.maxHp)}}
    ]},
    200:{id:'engine',speaker:'THE LIVING ENGINE',portrait:'E',text:'“Pattern recognised. You accumulate contradictions and call them powers. I call them instability.”',choices:[
      {text:'“Instability works.”',sub:'Random-looking, reliable +12% damage',flag:'chaos',effect:s=>{s.damageMult*=1.12}},
      {text:'“Then adapt faster.”',sub:'+12% attack speed',flag:'challenge',effect:s=>{s.attackMs*=.88}},
      {text:'“I’m still human.”',sub:'+12% max HP and regen',flag:'human',effect:s=>{s.maxHp*=1.12;s.hp*=1.12;s.regen+=.005}}
    ]}
  };
})();

