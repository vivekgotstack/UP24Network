package com.up24.news.article.internal;

import com.up24.news.article.ArticleChanged;
import org.springframework.cache.CacheManager;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.event.TransactionalEventListener;
import java.util.List;

@Component
class ArticleCacheInvalidation {
    private final CacheManager caches;
    private final SharedArticleFeedCache sharedFeed;
    ArticleCacheInvalidation(CacheManager caches, SharedArticleFeedCache sharedFeed) {
        this.caches=caches;
        this.sharedFeed=sharedFeed;
    }
    public boolean readable() {
        return canReadCache();
    }
    static boolean canReadCache() {
        // A command transaction must see its own uncommitted writes, never an older cached view.
        return !TransactionSynchronizationManager.isActualTransactionActive()
                || TransactionSynchronizationManager.isCurrentTransactionReadOnly();
    }
    @EventListener void changed(ArticleChanged event) {
        // The transaction-aware cache manager applies these clears after commit.
        for (var name:List.of("article-feed","article-discovery","article-detail")) {
            var cache=caches.getCache(name);
            if (cache!=null) cache.clear();
        }
    }
    @TransactionalEventListener(fallbackExecution = true)
    void invalidateSharedFeed(ArticleChanged event) {
        sharedFeed.invalidate();
    }
}
