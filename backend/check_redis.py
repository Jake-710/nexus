import asyncio
import redis.asyncio as redis

async def check():
    r = redis.from_url('redis://redis:6379/0', decode_responses=True)
    print('Stream length:', await r.xlen('events:raw'))
    try:
        groups = await r.xinfo_groups('events:raw')
        print('Consumer groups:', groups)
    except Exception as e:
        print('No consumer group:', e)
    
    # Check pending messages
    try:
        pending = await r.xpending('events:raw', 'scoring_workers')
        print('Pending messages:', pending)
    except Exception as e:
        print('Pending check error:', e)
    
    await r.aclose()

asyncio.run(check())
