# Wheel timing and waiting regression

From repository root:

```
node checks/wheel-timing-20261115/engine.cjs
node checks/wheel-timing-20261115/compile-ui.cjs
npm run build
npm run start -- --port 3021
# In another terminal, with Python Playwright and Chromium installed:
python checks/wheel-timing-20261115/ui.py
```

The UI check runs two isolated seats against the real app bundle with a local reducer-backed room fixture. It subtracts five seconds from delivered spin timestamps to reproduce a slow response, then checks that NO stays disabled during the local animation. It also checks partner waiting status and returning from suggestions without implied approval. Screenshots are written under /downloads. Set BASE to check another deployment's bundle. This is not a live-storage or physical-phone test.
