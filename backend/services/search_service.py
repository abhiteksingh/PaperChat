from ddgs import DDGS
from interfaces import ISearchService
from fastapi.concurrency import run_in_threadpool
import logging

logger = logging.getLogger(__name__)

class DDGSearchService(ISearchService):
    async def web_search(self, query: str) -> str:
        def _search():
            try:
                with DDGS() as ddgs:
                    results = list(
                        ddgs.text(
                            query,
                            max_results=5
                        )
                    )
                return "\n\n".join(
                    result["body"]
                    for result in results
                )
            except Exception as e:
                logger.error(f"DuckDuckGo search failed: {e}")
                return ""
        
        return await run_in_threadpool(_search)
