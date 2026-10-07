import {test,expect} from '@playwright/test';

async function clearBlockingUi(page){
  for(let i=0;i<4;i++){
    const changed=await page.evaluate(()=>{
      let did=false;
      if(window.PF_TEST?.resolveStory?.())did=true;
      if(window.PF_TEST?.resolveModifier?.())did=true;
      return did
    });
    if(!changed)break;
    await page.waitForTimeout(60)
  }
}

test.beforeEach(async({page,context})=>{
  await context.route('**/api/telemetry',route=>route.fulfill({status:204,body:''}));
  await page.addInitScript(()=>{
    if(!sessionStorage.getItem('pf_test_storage_ready')){
      localStorage.clear();
      sessionStorage.setItem('pf_test_storage_ready','1');
    }
  });
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
    await page.waitForTimeout(25);
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


test('hidden utility screens do not keep repainting the battlefield',async({page,context})=>{
  await context.route('**/api/telemetry',route=>route.fulfill({status:204,body:''}));
  await page.addInitScript(()=>{
    if(!sessionStorage.getItem('pf_test_storage_ready')){
      localStorage.clear();
      sessionStorage.setItem('pf_test_storage_ready','1');
    }
  });

  await page.goto('/?test=1');
  await page.waitForFunction(()=>window.PF_TEST&&window.PF_HUD_RUNTIME);
  await clearBlockingUi(page);

  await page.click('#settingsCornerBtn');
  await expect(page.locator('#settingsScreen')).toHaveClass(/active/);

  const before=await page.evaluate(()=>window.PF_HUD_RUNTIME());
  await page.waitForTimeout(1400);
  const after=await page.evaluate(()=>window.PF_HUD_RUNTIME());

  expect(after.skippedHidden).toBeGreaterThan(before.skippedHidden);
  expect(after.renderCount-before.renderCount).toBeLessThanOrEqual(1);
  expect(after.loadoutRebuilds-before.loadoutRebuilds).toBe(0);

  await page.click('#backFromSettingsBtn');
  await page.waitForTimeout(220);
  const returned=await page.evaluate(()=>window.PF_HUD_RUNTIME());
  expect(returned.renderCount).toBeGreaterThan(after.renderCount);
});
