import {test,expect} from '@playwright/test';

async function clearBlockingUi(page){
  for(let i=0;i<5;i++){
    const story=page.locator('#storyModal:not(.hidden) .story-choice').first();
    if(await story.count())await story.click();
    await page.waitForTimeout(140);
    const modifier=page.locator('#modifierModal:not(.hidden) .event-choice').first();
    if(await modifier.count())await modifier.click();
    await page.waitForTimeout(100);
  }
}

test.beforeEach(async({page})=>{
  await page.route('**/api/telemetry',route=>route.fulfill({status:204,body:''}));
  await page.addInitScript(()=>localStorage.clear());
});

test('core run survives milestone, awakening, death and reload',async({page})=>{
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));

  await page.goto('/?test=1');
  await page.waitForFunction(()=>window.PF_TEST&&window.PF_INVARIANTS);
  await clearBlockingUi(page);

  let guard=0;
  while(guard++<40){
    const state=await page.evaluate(()=>window.PF_TEST.state());
    if(state.pending.length)break;
    await page.evaluate(()=>window.PF_TEST.killEnemy());
    await page.waitForTimeout(60);
    await clearBlockingUi(page);
  }

  const pending=await page.evaluate(()=>window.PF_TEST.state().pending.length);
  expect(pending).toBeGreaterThan(0);

  await page.waitForSelector('#powerModal.active');
  await page.waitForTimeout(600);
  const cards=page.locator('#powerChoices .power-choice');
  expect(await cards.count()).toBeGreaterThanOrEqual(3);

  const powersBefore=await page.evaluate(()=>window.PF_TEST.state().powers.length);
  await cards.first().click();
  await page.waitForFunction(()=>window.PF_TEST.state().pending.length===0);
  const afterChoice=await page.evaluate(()=>window.PF_TEST.state());
  expect(afterChoice.powers.length).toBe(powersBefore+1);
  expect(afterChoice.screen).toBe('gameScreen');

  const defeat=await page.evaluate(()=>window.PF_TEST.defeatPlayer());
  expect(defeat.after).toBe(defeat.before);
  expect(defeat.hp).toBeGreaterThan(0);

  const invariantResult=await page.evaluate(()=>window.PF_TEST.invariants());
  expect(invariantResult.summary.ok).toBeTruthy();

  const beforeReload=await page.evaluate(()=>window.PF_TEST.state());
  expect(await page.evaluate(()=>window.PF_TEST.save())).toBeTruthy();
  await page.reload();
  await page.waitForFunction(()=>window.PF_TEST);
  await clearBlockingUi(page);
  const afterReload=await page.evaluate(()=>window.PF_TEST.state());

  expect(afterReload.stage).toBe(beforeReload.stage);
  expect(afterReload.powers).toEqual(beforeReload.powers);
  expect(pageErrors).toEqual([]);
});
