import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir:'./tests',
  testMatch:'**/*.spec.mjs',
  timeout:30000,
  expect:{timeout:5000},
  fullyParallel:false,
  workers:1,
  retries:0,
  reporter:[['line'],['html',{open:'never'}]],
  use:{
    baseURL:'http://127.0.0.1:4173',
    trace:'retain-on-failure'
  },
  webServer:{
    command:'python3 -m http.server 4173',
    port:4173,
    reuseExistingServer:true
  },
  projects:[
    {name:'chromium',use:{...devices['Desktop Chrome']}},
    {name:'webkit',use:{...devices['iPhone 14']}}
  ]
});
