import asyncio, sys, os, subprocess, shutil
from playwright.async_api import async_playwright
page, el, dur, still, tag = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
FPS=30
out=f'/tmp/claude-0/mcpm/render/{tag}'
shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1300,'height':1800}, device_scale_factor=2)
        await pg.goto(f'http://localhost:8821/{page}', wait_until='networkidle'); await pg.wait_for_timeout(1000)
        await pg.evaluate("document.fonts.ready")
        await pg.evaluate("Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))")
        box=await pg.query_selector('#'+el)
        n=int(round(dur*FPS))
        for i in range(n):
            await pg.evaluate(f"MMX('{el}', {i/FPS})")
            await box.screenshot(path=f'{out}/f{i:04d}.png')
        await pg.evaluate(f"MMX('{el}', {still})"); await pg.wait_for_timeout(100)
        await box.screenshot(path=f'{out}/still.png')
        await b.close()
asyncio.run(main())
