(function(){
  const criminalNames=[
    ['Street Mugger','brawler'],['Knife Runner','speed'],['Crew Enforcer','brawler'],['Illegal Augment','tech'],
    ['Heavy Hitter','tank'],['Psychoactive Dealer','psychic'],['Ghost Burglar','phase'],['Plasma Thief','energy'],
    ['Biohacker','regen'],['Contract Bruiser','brawler'],['Rooftop Runner','speed'],['Armoured Robber','tank']
  ];
  const eliteNames=[
    ['Brickhouse','tank'],['Deadeye','psychic'],['Volt','energy'],['Ghost','phase'],
    ['Razor','speed'],['Blackwire','tech'],['The Surgeon','regen'],['Knucklebone','brawler']
  ];
  const bosses={
    75:{name:'The Null Warden',icon:'Ã˜',hp:10.5,damage:2.1,speed:.9,trait:'Power suppression field'},
    100:{name:'Atlas Breaker',icon:'A',hp:16,damage:2.6,speed:.85,trait:'Planet-class strength'},
    150:{name:'Chronarch',icon:'C',hp:24,damage:3.1,speed:.72,trait:'Temporal assault'},
    200:{name:'The Living Engine',icon:'E',hp:36,damage:3.7,speed:.82,trait:'Adaptive armour'},
    300:{name:'World-Eater Spawn',icon:'W',hp:55,damage:4.4,speed:.76,trait:'Cosmic hunger'},
    500:{name:'The Pale Star',icon:'STAR',hp:90,damage:5.3,speed:.70,trait:'Reality pressure'},
    750:{name:'Crown of Nothing',icon:'VOID',hp:145,damage:6.2,speed:.64,trait:'Void sovereignty'},
    1000:{name:'THE FIRST POWER',icon:'ORIGIN',hp:240,damage:7.5,speed:.58,trait:'Origin-class entity'},
    1200:{name:'THE POWER THIEF',icon:'THIEF',hp:330,damage:8.4,speed:.55,trait:'Power theft'}
  };
  const factions=[
    {min:1,name:'Dockside Crew'},
    {min:31,name:'Blackwire Syndicate'},
    {min:76,name:'Augmented Crime Ring'},
    {min:126,name:'Apex Mercenaries'},
    {min:201,name:'Global Insurgency'},
    {min:301,name:'Offworld Raiders'},
    {min:501,name:'Void Cult'},
    {min:751,name:'Origin Remnants'}
  ];
  function factionFor(stage){return [...factions].reverse().find(f=>stage>=f.min)?.name||factions[0].name}
  window.PF_ENEMIES={
    get(stage){
      stage=Math.max(1,Math.min(10000,Number(stage)||1));
      const wall=bosses[stage];
      if(wall){
        const scale=Math.pow(1.035,Math.min(stage-1,4000));
        return {name:wall.name,icon:wall.icon,boss:true,elite:false,wall:true,trait:wall.trait,faction:'MILESTONE THREAT',maxHp:Math.round((52+stage*4.2)*scale*wall.hp),damage:(4.5+stage*.52)*Math.pow(1.018,Math.min(stage-1,4000))*wall.damage,attackMs:1300*wall.speed};
      }
      const elite=stage%10===0;
      const source=elite?eliteNames:criminalNames;
      const pick=source[Math.floor((stage-1)/(elite?10:3))%source.length];
      const [name,type]=pick;
      const scale=Math.pow(1.033,Math.min(stage-1,4000));
      return {
        name:elite?'ELITE • '+name:name,
        icon:'',
        boss:false,
        elite,
        wall:false,
        trait:type,
        faction:factionFor(stage),
        maxHp:Math.round((42+stage*3.2)*scale*(elite?2.75:1)),
        damage:(3.6+stage*.38)*Math.pow(1.016,Math.min(stage-1,4000))*(elite?1.55:1),
        attackMs:Math.max(520,1400-stage*2.2)*(elite?.90:1)
      };
    },
    factionFor,
    isWallBoss(stage){return !!bosses[stage]},
    nextWallBoss(stage){const all=Object.keys(bosses).map(Number).sort((a,b)=>a-b);return all.find(x=>x>=stage)||null}
  };
})();

